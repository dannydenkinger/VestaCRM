"use server"

import { adminDb } from "@/lib/firebase-admin";

export async function getNotifications(limit: number = 20) {
    try {
        const snapshot = await adminDb.collection('notifications')
            .orderBy('isRead', 'asc')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt
        }));

        const unreadSnapshot = await adminDb.collection('notifications')
            .where('isRead', '==', false)
            .count()
            .get();

        return {
            success: true,
            notifications,
            unreadCount: unreadSnapshot.data().count || 0
        };
    } catch (error) {
        console.error("Failed to fetch notifications:", error);
        return { success: false, notifications: [], unreadCount: 0 };
    }
}

export async function markAsRead(id: string) {
    try {
        await adminDb.collection('notifications').doc(id).update({
            isRead: true
        });
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function markAllAsRead() {
    try {
        const unreadSnapshot = await adminDb.collection('notifications')
            .where('isRead', '==', false)
            .get();

        const batch = adminDb.batch();
        unreadSnapshot.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });

        await batch.commit();
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function createNotification(data: {
    title: string;
    message: string;
    type: string;
    linkUrl?: string;
    taskId?: string;
}) {
    try {
        await adminDb.collection('notifications').add({
            title: data.title,
            message: data.message,
            type: data.type,
            linkUrl: data.linkUrl || null,
            taskId: data.taskId || null,
            isRead: false,
            createdAt: new Date()
        });

        return { success: true };
    } catch (error) {
        console.error("Failed to create notification:", error);
        return { success: false };
    }
}
