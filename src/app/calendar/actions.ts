"use server"

import { adminDb } from "@/lib/firebase-admin";
import { createNotification } from "@/app/notifications/actions";
import { CalendarEvent } from "@/lib/calendar-sync";
import { getGoogleCalendarClient } from "@/lib/google-calendar";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getUnifiedEvents(days: number = 30): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    const session = await auth();
    if (!session?.user?.id) return [];

    // 1. Fetch External Calendars (Google OAuth)
    try {
        const calendar = await getGoogleCalendarClient(session.user.id);
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - days);

        let calendars: any[] = [];
        try {
            const calendarListResponse = await calendar.calendarList.list();
            calendars = calendarListResponse.data.items || [];
        } catch (e: any) {
            console.warn("User has not granted calendar.readonly scope yet. Falling back to primary only.");
            calendars = [{ id: "primary", summary: "Primary", backgroundColor: "#4285F4" }];
        }

        const eventPromises = calendars.map(async (cal) => {
            try {
                const response = await calendar.events.list({
                    calendarId: cal.id || "primary",
                    timeMin: timeMin.toISOString(),
                    maxResults: 100,
                    singleEvents: true,
                    orderBy: "startTime",
                });

                return (response.data.items || []).map(event => ({
                    id: event.id || Math.random().toString(),
                    title: event.summary || "Untitled Event",
                    start: new Date((event as any).start?.dateTime || (event as any).start?.date || ""),
                    end: new Date((event as any).end?.dateTime || (event as any).end?.date || ""),
                    description: event.description || "",
                    source: "GOOGLE" as const,
                    color: cal.backgroundColor || "#4285F4",
                    calendarId: cal.id,
                    calendarName: cal.summary || "Google Calendar",
                }));
            } catch (err: any) {
                console.warn(`Failed to fetch events for calendar ${cal.summary}`);
                return [];
            }
        });

        const nestedEvents = await Promise.all(eventPromises);
        const googleEvents = nestedEvents.flat();

        events.push(...googleEvents);
    } catch (error) {
        console.log("No active Google Calendar integration found or error fetching.");
    }

    // 2. Fetch CRM Stay Dates from Contacts (using Firebase)
    try {
        const contactsSnapshot = await adminDb.collection('contacts').get();
        const oppsSnapshot = await adminDb.collection('opportunities').get();
        
        // Map opportunities to contacts
        const oppsByContact: Record<string, string> = {};
        oppsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.contactId && !oppsByContact[data.contactId]) {
                oppsByContact[data.contactId] = doc.id;
            }
        });

        contactsSnapshot.forEach(doc => {
            const row = doc.data();
            // Need at least one date set
            if (!row.stayStartDate && !row.stayEndDate) return;

            const oppId = oppsByContact[doc.id];
            const navUrl = oppId ? `/pipeline?deal=${oppId}` : `/contacts/${doc.id}`;

            const start = row.stayStartDate?.toDate ? row.stayStartDate.toDate() : (row.stayStartDate ? new Date(row.stayStartDate) : null);
            const end = row.stayEndDate?.toDate ? row.stayEndDate.toDate() : (row.stayEndDate ? new Date(row.stayEndDate) : null);

            if (start) {
                events.push({
                    id: `checkin-${doc.id}`,
                    title: `Check-in: ${row.name || 'Unknown'}`,
                    start: start,
                    end: start,
                    source: "SYSTEM",
                    color: "#10B981",
                    navigationUrl: navUrl,
                });
            }
            
            if (end) {
                events.push({
                    id: `checkout-${doc.id}`,
                    title: `Check-out: ${row.name || 'Unknown'}`,
                    start: end,
                    end: end,
                    source: "SYSTEM",
                    color: "#EF4444",
                    navigationUrl: navUrl,
                });
            }
        });
    } catch (error) {
        console.error("Error fetching CRM stay dates from Firebase:", error);
    }

    // 3. Fetch Internal Tasks (using Firebase)
    try {
        const tasksSnapshot = await adminDb.collection('tasks')
            .where('completed', '==', false)
            .get();

        tasksSnapshot.forEach(doc => {
            const task = doc.data();
            if (task.dueDate) {
                const date = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
                events.push({
                    id: `task-${doc.id}`,
                    title: `Task: ${task.title}`,
                    start: date,
                    end: date,
                    source: "TASK",
                    color: "#F59E0B"
                });
            }
        });
    } catch (error) {
        console.error("Error fetching internal tasks from Firebase:", error);
    }

    return events;
}

export async function createTask(data: {
    title: string;
    description?: string;
    dueDate?: Date;
    priority?: string;
    contactId?: string;
    opportunityId?: string;
    assigneeId?: string;
}) {
    const taskRef = await adminDb.collection('tasks').add({
        title: data.title,
        description: data.description || null,
        dueDate: data.dueDate ? data.dueDate : null,
        priority: data.priority || 'MEDIUM',
        contactId: data.contactId || null,
        opportunityId: data.opportunityId || null,
        assigneeId: data.assigneeId || null,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    return { id: taskRef.id };
}

export async function toggleTaskComplete(taskId: string, completed: boolean) {
    await adminDb.collection('tasks').doc(taskId).update({ 
        completed,
        updatedAt: new Date()
    });
    return { success: true };
}

export async function getTasks() {
    const tasksSnapshot = await adminDb.collection('tasks').orderBy('dueDate', 'asc').get();
    const tasks = [];
    
    // Simple caching for related entities
    const contactsMap: Record<string, any> = {};
    const usersMap: Record<string, any> = {};

    for (const doc of tasksSnapshot.docs) {
        const taskData = doc.data();
        let contactData = null;
        let assigneeData = null;

        if (taskData.contactId) {
            if (!contactsMap[taskData.contactId]) {
                const cDoc = await adminDb.collection('contacts').doc(taskData.contactId).get();
                if (cDoc.exists) contactsMap[taskData.contactId] = { id: cDoc.id, ...cDoc.data() };
            }
            contactData = contactsMap[taskData.contactId];
        }

        if (taskData.assigneeId) {
            if (!usersMap[taskData.assigneeId]) {
                const uDoc = await adminDb.collection('users').doc(taskData.assigneeId).get();
                if (uDoc.exists) usersMap[taskData.assigneeId] = { id: uDoc.id, ...uDoc.data() };
            }
            assigneeData = usersMap[taskData.assigneeId];
        }

        const dueDate = taskData.dueDate?.toDate ? taskData.dueDate.toDate() : (taskData.dueDate ? new Date(taskData.dueDate) : null);
        tasks.push({
            id: doc.id,
            ...taskData,
            title: taskData.title ?? 'Task',
            completed: taskData.completed ?? false,
            dueDate: dueDate ? dueDate.toISOString() : null,
            createdAt: taskData.createdAt?.toDate ? taskData.createdAt.toDate().toISOString() : taskData.createdAt,
            updatedAt: taskData.updatedAt?.toDate ? taskData.updatedAt.toDate().toISOString() : taskData.updatedAt,
            contact: contactData ? { id: contactData.id, name: contactData.name, email: contactData.email } : null,
            assignee: assigneeData ? { id: assigneeData.id, name: assigneeData.name } : null
        });
    }

    // Create reminder notifications for tasks due in next 24h (lazy, on fetch)
    try {
        const now = new Date();
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        for (const task of tasks) {
            if (task.completed || !task.dueDate) continue;
            const due = new Date(task.dueDate);
            if (due >= now && due <= in24h) {
                const existing = await adminDb.collection('notifications')
                    .where('taskId', '==', task.id)
                    .limit(1)
                    .get();
                if (existing.empty) {
                    await createNotification({
                        title: `Task due soon: ${task.title}`,
                        message: task.dueDate ? `Due ${new Date(task.dueDate).toLocaleString()}` : '',
                        type: 'checkin',
                        linkUrl: '/tasks',
                        taskId: task.id
                    });
                }
            }
        }
    } catch (e) {
        console.warn('Task reminder creation failed:', e);
    }

    return tasks;
}

export async function updateTask(taskId: string, data: {
    title?: string;
    description?: string;
    dueDate?: Date | null;
    priority?: string;
    completed?: boolean;
    contactId?: string | null;
    opportunityId?: string | null;
}) {
    const updateData: any = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.completed !== undefined) updateData.completed = data.completed;
    if (data.contactId !== undefined) updateData.contactId = data.contactId;
    if (data.opportunityId !== undefined) updateData.opportunityId = data.opportunityId;

    await adminDb.collection('tasks').doc(taskId).update(updateData);
    return { success: true };
}

export async function deleteTask(taskId: string) {
    await adminDb.collection('tasks').doc(taskId).delete();
    return { success: true };
}
