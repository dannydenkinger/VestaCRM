"use server"

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createNotification } from "@/app/notifications/actions";
import { logAudit } from "@/lib/audit";
import { triggerSequence } from "@/lib/email-sequences";

// Shared timestamp serializer
function toISO(v: unknown): string | null {
    if (!v) return null;
    if (typeof v === "string") return v;
    if ((v as any)?.toDate) return (v as any).toDate().toISOString();
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "object" && v !== null && typeof (v as any)._seconds === "number") {
        return new Date((v as any)._seconds * 1000).toISOString();
    }
    return null;
}

export async function getContacts() {
    try {
        // Fetch contacts, opportunities, stages, and notes in parallel (avoid N+1)
        const [pipelinesSnap, snapshot, oppsSnap] = await Promise.all([
            adminDb.collection('pipelines').get(),
            adminDb.collection('contacts').orderBy('createdAt', 'desc').get(),
            adminDb.collection('opportunities').get(),
        ]);

        // Build stageId -> name map
        const stageNamesMap: Record<string, string> = {};
        for (const pDoc of pipelinesSnap.docs) {
            const stagesSnap = await pDoc.ref.collection('stages').get();
            stagesSnap.docs.forEach(sDoc => {
                stageNamesMap[sDoc.id] = sDoc.data().name || 'Unknown';
            });
        }

        // Group opportunities by contactId (in-memory join)
        const oppsByContact: Record<string, any[]> = {};
        for (const oppDoc of oppsSnap.docs) {
            const d = oppDoc.data();
            const contactId = d.contactId;
            if (!contactId) continue;
            if (!oppsByContact[contactId]) oppsByContact[contactId] = [];

            const o: Record<string, unknown> = { id: oppDoc.id, ...d };
            if (d.createdAt) o.createdAt = toISO(d.createdAt);
            if (d.updatedAt) o.updatedAt = toISO(d.updatedAt);
            if (d.stayStartDate) o.stayStartDate = toISO(d.stayStartDate);
            if (d.stayEndDate) o.stayEndDate = toISO(d.stayEndDate);
            if (d.unreadAt) o.unreadAt = toISO(d.unreadAt);
            if (d.lastSeenAt) o.lastSeenAt = toISO(d.lastSeenAt);
            if (d.claimedAt) o.claimedAt = toISO(d.claimedAt);
            if (d.pipelineStageId && stageNamesMap[d.pipelineStageId]) o.stageName = stageNamesMap[d.pipelineStageId];
            if (Array.isArray(d.stageHistory)) {
                o.stageHistory = d.stageHistory.map((entry: any) => ({
                    stageId: entry.stageId,
                    enteredAt: toISO(entry.enteredAt),
                }));
            }
            oppsByContact[contactId].push(o);
        }

        // Pre-fetch latest note per contact using collectionGroup (1 query instead of N)
        const latestNoteByContact: Record<string, any> = {};
        try {
            const allNotesSnap = await adminDb.collectionGroup('notes').orderBy('createdAt', 'desc').get();
            for (const nDoc of allNotesSnap.docs) {
                const contactId = nDoc.ref.parent.parent?.id;
                if (contactId && !latestNoteByContact[contactId]) {
                    const nd = nDoc.data();
                    latestNoteByContact[contactId] = {
                        id: nDoc.id,
                        content: nd.content,
                        contactId: nd.contactId,
                        createdAt: toISO(nd.createdAt),
                        updatedAt: toISO(nd.updatedAt),
                    };
                }
            }
        } catch {
            // Fallback: notes map stays empty
        }

        const contacts = snapshot.docs.map(doc => {
            const data = doc.data();

            // Format dates
            if (data.stayStartDate) {
                data.stayStartDate = data.stayStartDate.toDate ? data.stayStartDate.toDate().toISOString() : data.stayStartDate;
            }
            if (data.stayEndDate) {
                data.stayEndDate = data.stayEndDate.toDate ? data.stayEndDate.toDate().toISOString() : data.stayEndDate;
            }
            if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate().toISOString();
            if (data.updatedAt?.toDate) data.updatedAt = data.updatedAt.toDate().toISOString();

            const latestNote = latestNoteByContact[doc.id];

            return {
                id: doc.id,
                ...data,
                opportunities: oppsByContact[doc.id] || [],
                notes: latestNote ? [latestNote] : [],
                tags: data.tags || []
            };
        });

        return { success: true, contacts };
    } catch (error) {
        console.error("Failed to fetch contacts:", error);
        return { success: false, error: "Failed to fetch contacts" };
    }
}

/** Create a note on the contact. Notes added from an opportunity are also visible on the contact (GHL-style). */
export async function createNote(contactId: string, content: string, options?: { opportunityId?: string; source?: string }) {
    try {
        const data: Record<string, unknown> = {
            content,
            contactId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        if (options?.opportunityId) data.opportunityId = options.opportunityId;
        if (options?.source) data.source = options.source;
        await adminDb.collection('contacts').doc(contactId).collection('notes').add(data);
        revalidatePath("/contacts");
        revalidatePath("/pipeline");
        return { success: true };
    } catch (error) {
        console.error("Failed to create note:", error);
        return { success: false, error: "Failed to create note" };
    }
}

/** Convert any date-like value to ISO string for RSC serialization (plain objects + Timestamps). */
// Alias for backward compatibility within this file
const tsToISO = toISO;

export async function getNotes(contactId: string) {
    try {
        const notesSnapshot = await adminDb.collection('contacts').doc(contactId).collection('notes')
            .orderBy('createdAt', 'desc')
            .get();
            
        const notes = notesSnapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                content: d.content,
                contactId: d.contactId,
                createdAt: tsToISO(d.createdAt),
                updatedAt: tsToISO(d.updatedAt),
            };
        });
        
        return { success: true, notes };
    } catch (error) {
        console.error("Failed to fetch notes:", error);
        return { success: false, error: "Failed to fetch notes" };
    }
}

/** Delete a note and record a "note_deleted" event in the contact timeline (includes who deleted it). */
export async function deleteNote(contactId: string, noteId: string) {
    try {
        const session = await auth();
        const deletedByName = session?.user?.name ?? session?.user?.email ?? "Unknown user";
        const deletedById = (session?.user as any)?.id ?? null;

        const noteRef = adminDb.collection('contacts').doc(contactId).collection('notes').doc(noteId);
        const noteSnap = await noteRef.get();
        if (!noteSnap.exists) return { success: false, error: "Note not found" };

        const content = (noteSnap.data()?.content as string) || "";
        const contentPreview = content.slice(0, 120) + (content.length > 120 ? "…" : "");

        await noteRef.delete();
        await adminDb.collection('contacts').doc(contactId).collection('timeline').add({
            type: "note_deleted",
            noteId,
            contentPreview: contentPreview || null,
            deletedById,
            deletedByName,
            createdAt: new Date(),
        });

        revalidatePath("/contacts");
        revalidatePath("/pipeline");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete note:", error);
        return { success: false, error: "Failed to delete note" };
    }
}

export type TimelineItem =
    | { kind: "message"; id: string; type: string; direction?: string; content: string; createdAt: string }
    | { kind: "note"; id: string; content: string; createdAt: string }
    | { kind: "note_deleted"; id: string; noteId: string; contentPreview: string | null; deletedBy: string | null; createdAt: string };

/** Fetch contact timeline: messages + notes + timeline events (e.g. note_deleted), sorted by date desc. */
export async function getContactTimeline(contactId: string): Promise<{ success: boolean; timeline?: TimelineItem[]; error?: string }> {
    try {
        const contactRef = adminDb.collection('contacts').doc(contactId);
        const [notesSnap, messagesSnap, timelineSnap] = await Promise.all([
            contactRef.collection('notes').orderBy('createdAt', 'desc').get(),
            contactRef.collection('messages').orderBy('createdAt', 'desc').get(),
            contactRef.collection('timeline').orderBy('createdAt', 'desc').get(),
        ]);

        const items: TimelineItem[] = [];

        notesSnap.docs.forEach(d => {
            const data = d.data();
            items.push({
                kind: "note",
                id: d.id,
                content: data.content ?? "",
                createdAt: tsToISO(data.createdAt) ?? new Date().toISOString(),
            });
        });
        messagesSnap.docs.forEach(d => {
            const data = d.data();
            items.push({
                kind: "message",
                id: d.id,
                type: data.type ?? "MESSAGE",
                direction: data.direction,
                content: data.content ?? "",
                createdAt: tsToISO(data.createdAt) ?? new Date().toISOString(),
            });
        });
        timelineSnap.docs.forEach(d => {
            const data = d.data();
            if (data.type === "note_deleted") {
                items.push({
                    kind: "note_deleted",
                    id: d.id,
                    noteId: data.noteId ?? "",
                    contentPreview: data.contentPreview ?? null,
                    deletedBy: data.deletedByName ?? data.deletedById ?? null,
                    createdAt: tsToISO(data.createdAt) ?? new Date().toISOString(),
                });
            }
        });

        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return { success: true, timeline: items };
    } catch (error) {
        console.error("Failed to fetch contact timeline:", error);
        return { success: false, error: "Failed to fetch contact timeline" };
    }
}

export async function createContact(data: any) {
    try {
        const { tags, ...otherData } = data;
        const newContactRef = adminDb.collection('contacts').doc();

        const contactData: any = {
            name: otherData.name ?? '',
            email: otherData.email ?? null,
            phone: otherData.phone ?? null,
            militaryBase: otherData.militaryBase ?? null,
            businessName: otherData.businessName ?? null,
            status: otherData.status || 'Lead',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        if (otherData.stayStartDate) contactData.stayStartDate = new Date(otherData.stayStartDate).toISOString();
        if (otherData.stayEndDate) contactData.stayEndDate = new Date(otherData.stayEndDate).toISOString();

        if (tags !== undefined) {
            contactData.tags = await Promise.all(tags.map(async (tagId: string) => {
                const tagDoc = await adminDb.collection('tags').doc(tagId).get();
                return { tagId, name: tagDoc.data()?.name, color: tagDoc.data()?.color };
            }));
        }

        await newContactRef.set(contactData);
        revalidatePath("/contacts");

        // Fire a notification for the team
        await createNotification({
            title: "New contact created",
            message: contactData.name || contactData.email || "New contact",
            type: "contact",
            linkUrl: "/contacts"
        });

        const session = await auth();
        if (session?.user) {
            logAudit({
                userId: (session.user as any).id || "",
                userEmail: session.user.email || "",
                userName: session.user.name || "",
                action: "create",
                entity: "contact",
                entityId: newContactRef.id,
                entityName: contactData.name || contactData.email || "",
            }).catch(() => {});
        }

        // Trigger new_contact email sequence
        if (contactData.email) {
            triggerSequence("new_contact", newContactRef.id, contactData.email, contactData.name).catch(() => {});
        }

        return { success: true, id: newContactRef.id };
    } catch (error) {
        console.error("Failed to create contact:", error);
        return { success: false, error: "Failed to create contact" };
    }
}

export async function updateContact(id: string, data: any) {
    try {
        const { tags, ...otherData } = data;
        const updateData: any = { updatedAt: new Date() };

        // Only include defined, non-undefined fields (Firestore rejects undefined)
        const allowedKeys = ['name', 'email', 'phone', 'militaryBase', 'businessName', 'status', 'stayStartDate', 'stayEndDate'];
        for (const k of allowedKeys) {
            if (otherData[k] !== undefined) {
                let val = otherData[k];
                if (k === 'stayStartDate' || k === 'stayEndDate') {
                    if (val == null || (typeof val === 'string' && !val.trim())) {
                        val = null;
                    } else if (typeof val === 'string') {
                        const d = new Date(val);
                        val = isNaN(d.getTime()) ? null : d.toISOString();
                    }
                }
                updateData[k] = val;
            }
        }

        if (tags !== undefined && Array.isArray(tags)) {
            updateData.tags = await Promise.all(tags.map(async (tagId: string) => {
                const tagDoc = await adminDb.collection('tags').doc(tagId).get();
                return { tagId, name: tagDoc.data()?.name, color: tagDoc.data()?.color };
            }));
        }

        await adminDb.collection('contacts').doc(id).update(updateData);
        revalidatePath("/contacts");
        return { success: true };
    } catch (error) {
        console.error("Failed to update contact:", error);
        return { success: false, error: "Failed to update contact" };
    }
}

/** Lightweight list for contact picker (e.g. pipeline "Add opportunity → Select existing contact"). */
export async function getContactsList() {
    try {
        const snapshot = await adminDb.collection('contacts').orderBy('createdAt', 'desc').limit(500).get();
        const contacts = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                name: d.name ?? "",
                email: d.email ?? "",
                phone: d.phone ?? "",
                militaryBase: d.militaryBase ?? ""
            };
        });
        return { success: true, contacts };
    } catch (error) {
        console.error("Failed to fetch contacts list:", error);
        return { success: false, contacts: [] };
    }
}

export async function getContactDetail(id: string) {
    try {
        const doc = await adminDb.collection('contacts').doc(id).get();
        if (!doc.exists) throw new Error("Contact not found");

        const data = doc.data() || {};
        
        // Fetch subcollections (timeline = events like note_deleted)
        const [notesSnap, tasksSnap, messagesSnap, docsSnap, oppsSnap, timelineSnap] = await Promise.all([
            doc.ref.collection('notes').orderBy('createdAt', 'desc').limit(50).get(),
            doc.ref.collection('tasks').orderBy('dueDate', 'asc').get(),
            doc.ref.collection('messages').orderBy('createdAt', 'desc').limit(100).get(),
            doc.ref.collection('documents').orderBy('createdAt', 'desc').limit(50).get(),
            adminDb.collection('opportunities').where('contactId', '==', id).get(),
            doc.ref.collection('timeline').orderBy('createdAt', 'desc').limit(50).get(),
        ]);

        const contact: any = {
            id: doc.id,
            name: data.name ?? null,
            email: data.email ?? null,
            phone: data.phone ?? null,
            militaryBase: data.militaryBase ?? null,
            businessName: data.businessName ?? null,
            status: data.status ?? null,
            stayStartDate: tsToISO(data.stayStartDate),
            stayEndDate: tsToISO(data.stayEndDate),
            createdAt: tsToISO(data.createdAt),
            updatedAt: tsToISO(data.updatedAt),
            notes: notesSnap.docs.map(d => {
                const nd = d.data();
                return { id: d.id, content: nd.content, contactId: nd.contactId, createdAt: tsToISO(nd.createdAt), updatedAt: tsToISO(nd.updatedAt) };
            }),
            tasks: tasksSnap.docs.map(d => {
                const td = d.data();
                return { id: d.id, title: td.title, description: td.description, dueDate: tsToISO(td.dueDate), priority: td.priority, completed: td.completed, contactId: td.contactId, opportunityId: td.opportunityId, createdAt: tsToISO(td.createdAt), updatedAt: tsToISO(td.updatedAt) };
            }),
            messages: messagesSnap.docs.map(d => {
                const md = d.data();
                return { id: d.id, ...md, createdAt: tsToISO(md.createdAt), updatedAt: tsToISO(md.updatedAt) };
            }),
            documents: docsSnap.docs.map(d => {
                const dd = d.data();
                return { id: d.id, ...dd, createdAt: tsToISO(dd.createdAt), updatedAt: tsToISO(dd.updatedAt) };
            }),
            opportunities: oppsSnap.docs.map(d => {
                const od = d.data();
                return {
                    id: d.id,
                    contactId: od.contactId ?? null,
                    pipelineStageId: od.pipelineStageId ?? null,
                    name: od.name ?? null,
                    priority: od.priority ?? null,
                    opportunityValue: od.opportunityValue ?? null,
                    estimatedProfit: od.estimatedProfit ?? null,
                    source: od.source ?? null,
                    militaryBase: od.militaryBase ?? null,
                    notes: od.notes ?? null,
                    reasonForStay: od.reasonForStay ?? null,
                    specialAccommodationId: od.specialAccommodationId ?? null,
                    specialAccommodationLabels: Array.isArray(od.specialAccommodationLabels) ? od.specialAccommodationLabels : [],
                    unread: od.unread ?? false,
                    unreadAt: tsToISO(od.unreadAt),
                    lastSeenBy: od.lastSeenBy ?? null,
                    lastSeenAt: tsToISO(od.lastSeenAt),
                    stayStartDate: tsToISO(od.stayStartDate),
                    stayEndDate: tsToISO(od.stayEndDate),
                    assigneeId: od.assigneeId ?? null,
                    leadSourceId: od.leadSourceId ?? null,
                    tags: Array.isArray(od.tags) ? od.tags.map((t: any) => ({ tagId: t?.tagId ?? null, name: t?.name ?? null, color: t?.color ?? null })) : [],
                    createdAt: tsToISO(od.createdAt),
                    updatedAt: tsToISO(od.updatedAt),
                };
            }),
            timelineEvents: timelineSnap.docs.map(d => {
                const td = d.data();
                return {
                    id: d.id,
                    type: td.type ?? null,
                    noteId: td.noteId ?? null,
                    contentPreview: td.contentPreview ?? null,
                    deletedBy: td.deletedByName ?? td.deletedById ?? null,
                    createdAt: tsToISO(td.createdAt),
                };
            }),
            tags: data.tags || [],
            formTracking: data.formTracking || null,
        };

        return { success: true, contact };
    } catch (error) {
        console.error("Failed to fetch contact detail:", error);
        return { success: false, error: "Failed to fetch contact detail" };
    }
}

export async function updateFormTracking(contactId: string, data: any) {
    try {
        await adminDb.collection('contacts').doc(contactId).update({
            formTracking: data,
            updatedAt: new Date()
        });
        revalidatePath("/contacts");
        return { success: true };
    } catch (error) {
        console.error("Failed to update form tracking:", error);
        return { success: false, error: "Failed to update form tracking" };
    }
}

export async function deleteContact(id: string) {
    try {
        const contactRef = adminDb.collection('contacts').doc(id);
        const doc = await contactRef.get();
        if (!doc.exists) return { success: false, error: "Contact not found" };

        const contactName = doc.data()?.name || doc.data()?.email || "";
        const session = await auth();

        const batch = adminDb.batch();

        // Delete subcollections
        const subcollections = ['notes', 'tasks', 'messages', 'documents', 'timeline'];
        for (const col of subcollections) {
            const snap = await contactRef.collection(col).get();
            snap.docs.forEach(d => batch.delete(d.ref));
        }

        // Delete related opportunities
        const oppsSnap = await adminDb.collection('opportunities').where('contactId', '==', id).get();
        oppsSnap.docs.forEach(d => batch.delete(d.ref));

        batch.delete(contactRef);
        await batch.commit();

        if (session?.user) {
            logAudit({
                userId: (session.user as any).id || "",
                userEmail: session.user.email || "",
                userName: session.user.name || "",
                action: "delete",
                entity: "contact",
                entityId: id,
                entityName: contactName,
            }).catch(() => {});
        }

        revalidatePath("/contacts");
        revalidatePath("/pipeline");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete contact:", error);
        return { success: false, error: "Failed to delete contact" };
    }
}

export async function bulkDeleteContacts(ids: string[]) {
    try {
        for (const id of ids) {
            const res = await deleteContact(id);
            if (!res.success) return res;
        }
        return { success: true };
    } catch (error) {
        console.error("Failed to bulk delete contacts:", error);
        return { success: false, error: "Failed to delete contacts" };
    }
}

export async function bulkCreateContacts(contacts: any[]) {
    try {
        const batch = adminDb.batch();
        
        for (const contact of contacts) {
            const ref = adminDb.collection('contacts').doc();
            batch.set(ref, {
                name: contact.name || 'Unknown',
                email: contact.email || null,
                phone: contact.phone || null,
                militaryBase: contact.militaryBase || null,
                businessName: contact.businessName || null,
                status: contact.status || 'Lead',
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        await batch.commit();
        revalidatePath("/contacts");

        await createNotification({
            title: "Contacts Imported",
            message: `${contacts.length} contact${contacts.length !== 1 ? "s" : ""} imported successfully.`,
            type: "contact",
            linkUrl: "/contacts"
        });

        return { success: true, count: contacts.length };
    } catch (error) {
        console.error("Failed to bulk create contacts:", error);
        return { success: false, error: "Failed to import contacts" };
    }
}

/**
 * Find potential duplicate contacts by email or phone match.
 */
export async function findDuplicateContacts() {
    try {
        const snapshot = await adminDb.collection('contacts').get();
        const contacts = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || "",
            email: (doc.data().email || "").toLowerCase().trim(),
            phone: (doc.data().phone || "").replace(/\D/g, ""),
        }));

        const groups: Record<string, string[]> = {};

        // Group by email
        for (const c of contacts) {
            if (c.email) {
                const key = `email:${c.email}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(c.id);
            }
        }

        // Group by phone (normalized digits only)
        for (const c of contacts) {
            if (c.phone && c.phone.length >= 7) {
                const key = `phone:${c.phone}`;
                if (!groups[key]) groups[key] = [];
                if (!groups[key].includes(c.id)) groups[key].push(c.id);
            }
        }

        // Only return groups with 2+ contacts
        const duplicateSets: { matchType: string; matchValue: string; contactIds: string[] }[] = [];
        const seen = new Set<string>();

        for (const [key, ids] of Object.entries(groups)) {
            if (ids.length < 2) continue;
            const pairKey = ids.sort().join(",");
            if (seen.has(pairKey)) continue;
            seen.add(pairKey);

            const [type, value] = key.split(":", 2);
            duplicateSets.push({ matchType: type, matchValue: value, contactIds: ids });
        }

        return { success: true, duplicates: duplicateSets };
    } catch (error) {
        console.error("Failed to find duplicates:", error);
        return { success: false, error: "Failed to find duplicates" };
    }
}

/**
 * Merge secondaryId into primaryId. Moves all subcollections and opportunity references,
 * merges fields (primary wins unless empty), then deletes the secondary contact.
 */
export async function mergeContacts(primaryId: string, secondaryId: string, fieldOverrides?: Record<string, string>) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Not authenticated" };

        const primaryRef = adminDb.collection('contacts').doc(primaryId);
        const secondaryRef = adminDb.collection('contacts').doc(secondaryId);

        const [primarySnap, secondarySnap] = await Promise.all([primaryRef.get(), secondaryRef.get()]);
        if (!primarySnap.exists) return { success: false, error: "Primary contact not found" };
        if (!secondarySnap.exists) return { success: false, error: "Secondary contact not found" };

        const primary = primarySnap.data()!;
        const secondary = secondarySnap.data()!;

        // Merge fields: use override selections, else primary wins, else secondary
        const mergeFields = ['name', 'email', 'phone', 'militaryBase', 'businessName', 'status', 'stayStartDate', 'stayEndDate'];
        const merged: Record<string, unknown> = { updatedAt: new Date() };

        for (const field of mergeFields) {
            if (fieldOverrides && fieldOverrides[field]) {
                merged[field] = fieldOverrides[field] === 'secondary' ? (secondary[field] || primary[field]) : (primary[field] || secondary[field]);
            } else {
                merged[field] = primary[field] || secondary[field] || null;
            }
        }

        // Merge tags (union)
        const primaryTags = Array.isArray(primary.tags) ? primary.tags : [];
        const secondaryTags = Array.isArray(secondary.tags) ? secondary.tags : [];
        const tagIds = new Set(primaryTags.map((t: any) => t.tagId));
        const mergedTags = [...primaryTags];
        for (const t of secondaryTags) {
            if (!tagIds.has(t.tagId)) mergedTags.push(t);
        }
        merged.tags = mergedTags;

        // Merge formTracking (OR logic)
        const ft1 = primary.formTracking || {};
        const ft2 = secondary.formTracking || {};
        merged.formTracking = {
            homeownerLeaseSigned: ft1.homeownerLeaseSigned || ft2.homeownerLeaseSigned || false,
            termsConditionsSigned: ft1.termsConditionsSigned || ft2.termsConditionsSigned || false,
            paymentAuthSigned: ft1.paymentAuthSigned || ft2.paymentAuthSigned || false,
        };

        // Update primary contact
        await primaryRef.update(merged);

        // Move subcollections from secondary to primary
        const subcollections = ['notes', 'tasks', 'messages', 'documents', 'timeline'];
        for (const col of subcollections) {
            const snap = await secondaryRef.collection(col).get();
            for (const doc of snap.docs) {
                const data = doc.data();
                data.contactId = primaryId;
                await primaryRef.collection(col).add(data);
            }
        }

        // Reassign opportunities from secondary to primary
        const oppsSnap = await adminDb.collection('opportunities').where('contactId', '==', secondaryId).get();
        for (const doc of oppsSnap.docs) {
            await doc.ref.update({ contactId: primaryId, updatedAt: new Date() });
        }

        // Record merge in timeline
        await primaryRef.collection('timeline').add({
            type: 'contact_merged',
            mergedContactId: secondaryId,
            mergedContactName: secondary.name || secondary.email || 'Unknown',
            createdAt: new Date(),
        });

        // Delete secondary contact and its subcollections
        const batch = adminDb.batch();
        for (const col of subcollections) {
            const snap = await secondaryRef.collection(col).get();
            snap.docs.forEach(d => batch.delete(d.ref));
        }
        batch.delete(secondaryRef);
        await batch.commit();

        // Audit log
        logAudit({
            userId: (session.user as any).id || "",
            userEmail: session.user.email || "",
            userName: session.user.name || "",
            action: "update",
            entity: "contact",
            entityId: primaryId,
            entityName: (merged.name as string) || "",
            changes: {
                merge: { from: `Merged with ${secondary.name || secondaryId}`, to: "Completed" }
            },
        }).catch(() => {});

        revalidatePath("/contacts");
        revalidatePath("/pipeline");
        return { success: true };
    } catch (error) {
        console.error("Failed to merge contacts:", error);
        return { success: false, error: "Failed to merge contacts" };
    }
}
