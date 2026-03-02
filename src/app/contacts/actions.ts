"use server"

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/app/notifications/actions";

export async function getContacts() {
    try {
        // Build stageId -> name map once for this request
        const stageNamesMap: Record<string, string> = {};
        const pipelinesSnap = await adminDb.collection('pipelines').get();
        for (const pDoc of pipelinesSnap.docs) {
            const stagesSnap = await pDoc.ref.collection('stages').get();
            stagesSnap.docs.forEach(sDoc => {
                stageNamesMap[sDoc.id] = sDoc.data().name || 'Unknown';
            });
        }

        const snapshot = await adminDb.collection('contacts').orderBy('createdAt', 'desc').get();
        const contacts = [];
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // Fetch related opportunities
            const oppsSnapshot = await adminDb.collection('opportunities')
                .where('contactId', '==', doc.id)
                .get();
            
            const opportunities = oppsSnapshot.docs.map(oppDoc => {
                const d = oppDoc.data();
                const o: Record<string, unknown> = { id: oppDoc.id, ...d };
                if (d.createdAt?.toDate) o.createdAt = d.createdAt.toDate().toISOString();
                if (d.updatedAt?.toDate) o.updatedAt = d.updatedAt.toDate().toISOString();
                if (d.pipelineStageId && stageNamesMap[d.pipelineStageId]) o.stageName = stageNamesMap[d.pipelineStageId];
                return o;
            });

            // Fetch latest note from subcollection
            const notesSnapshot = await doc.ref.collection('notes')
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
            
            const notes = notesSnapshot.docs.map(nDoc => {
                const nd = nDoc.data();
                const toISO = (v: unknown) => {
                    if (!v) return null;
                    if (typeof v === 'string') return v;
                    if ((v as any)?.toDate) return (v as any).toDate().toISOString();
                    return null;
                };
                return {
                    id: nDoc.id,
                    content: nd.content,
                    contactId: nd.contactId,
                    createdAt: toISO(nd.createdAt),
                    updatedAt: toISO(nd.updatedAt),
                };
            });

            // Format dates
            if (data.stayStartDate) {
                data.stayStartDate = data.stayStartDate.toDate ? data.stayStartDate.toDate().toISOString() : data.stayStartDate;
            }
            if (data.stayEndDate) {
                data.stayEndDate = data.stayEndDate.toDate ? data.stayEndDate.toDate().toISOString() : data.stayEndDate;
            }
            if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate().toISOString();
            if (data.updatedAt?.toDate) data.updatedAt = data.updatedAt.toDate().toISOString();

            contacts.push({
                id: doc.id,
                ...data,
                opportunities,
                notes,
                tags: data.tags || []
            });
        }

        return { success: true, contacts };
    } catch (error) {
        console.error("Failed to fetch contacts:", error);
        return { success: false, error: "Failed to fetch contacts" };
    }
}

export async function createNote(contactId: string, content: string) {
    try {
        await adminDb.collection('contacts').doc(contactId).collection('notes').add({
            content,
            contactId,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        revalidatePath("/contacts");
        return { success: true };
    } catch (error) {
        console.error("Failed to create note:", error);
        return { success: false, error: "Failed to create note" };
    }
}

function tsToISO(v: unknown): string | null {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if ((v as any)?.toDate) return (v as any).toDate().toISOString();
    return null;
}

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
                if ((k === 'stayStartDate' || k === 'stayEndDate') && val && typeof val === 'string') {
                    val = new Date(val).toISOString();
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

export async function getContactDetail(id: string) {
    try {
        const doc = await adminDb.collection('contacts').doc(id).get();
        if (!doc.exists) throw new Error("Contact not found");

        const data = doc.data() || {};
        
        // Fetch subcollections
        const [notesSnap, tasksSnap, messagesSnap, docsSnap, oppsSnap] = await Promise.all([
            doc.ref.collection('notes').orderBy('createdAt', 'desc').get(),
            doc.ref.collection('tasks').orderBy('dueDate', 'asc').get(),
            doc.ref.collection('messages').orderBy('createdAt', 'desc').get(),
            doc.ref.collection('documents').orderBy('createdAt', 'desc').get(),
            adminDb.collection('opportunities').where('contactId', '==', id).get()
        ]);

        const contact: any = {
            id: doc.id,
            ...data,
            notes: notesSnap.docs.map(d => {
                const nd = d.data();
                return { id: d.id, content: nd.content, contactId: nd.contactId, createdAt: tsToISO(nd.createdAt), updatedAt: tsToISO(nd.updatedAt) };
            }),
            tasks: tasksSnap.docs.map(d => {
                const td = d.data();
                return { id: d.id, ...td, dueDate: tsToISO(td.dueDate), createdAt: tsToISO(td.createdAt), updatedAt: tsToISO(td.updatedAt) };
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
                return { id: d.id, ...od, createdAt: tsToISO(od.createdAt), updatedAt: tsToISO(od.updatedAt) };
            }),
            tags: data.tags || [],
            formTracking: data.formTracking || null,
        };

        // Format dates
        if (contact.stayStartDate && contact.stayStartDate.toDate) contact.stayStartDate = contact.stayStartDate.toDate().toISOString();
        if (contact.stayEndDate && contact.stayEndDate.toDate) contact.stayEndDate = contact.stayEndDate.toDate().toISOString();
        if (contact.createdAt?.toDate) contact.createdAt = contact.createdAt.toDate().toISOString();
        if (contact.updatedAt?.toDate) contact.updatedAt = contact.updatedAt.toDate().toISOString();

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

        const batch = adminDb.batch();

        // Delete subcollections
        const subcollections = ['notes', 'tasks', 'messages', 'documents'];
        for (const col of subcollections) {
            const snap = await contactRef.collection(col).get();
            snap.docs.forEach(d => batch.delete(d.ref));
        }

        // Delete related opportunities
        const oppsSnap = await adminDb.collection('opportunities').where('contactId', '==', id).get();
        oppsSnap.docs.forEach(d => batch.delete(d.ref));

        batch.delete(contactRef);
        await batch.commit();

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
