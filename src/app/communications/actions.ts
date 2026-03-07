"use server"

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

export async function getConversations() {
    try {
        // Fetch all contacts
        const contactsSnap = await adminDb.collection('contacts').get();

        // Fetch latest message per contact in parallel (only 1 message each, not all)
        const conversationPromises = contactsSnap.docs.map(async (contactDoc) => {
            const contactId = contactDoc.id;
            const contactData = contactDoc.data();

            const latestSnap = await adminDb.collection('contacts').doc(contactId).collection('messages')
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();

            if (latestSnap.empty) return null;

            const latestMessage = latestSnap.docs[0].data();
            return {
                contactId,
                contactName: contactData.name,
                email: contactData.email,
                phone: contactData.phone,
                status: contactData.status,
                lastMessage: latestMessage.content,
                lastMessageType: latestMessage.type,
                lastMessageDirection: latestMessage.direction,
                lastMessageTime: latestMessage.createdAt?.toDate ? latestMessage.createdAt.toDate().toISOString() : latestMessage.createdAt,
            };
        });

        const results = await Promise.all(conversationPromises);
        const conversations = results.filter((c): c is NonNullable<typeof c> => c !== null);

        // Sort by most recent message
        conversations.sort((a, b) => {
            return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        });

        return { success: true, conversations };
    } catch (error) {
        console.error("Failed to fetch conversations:", error);
        return { success: false, conversations: [] };
    }
}

export async function getMessages(contactId: string) {
    try {
        const contactDoc = await adminDb.collection('contacts').doc(contactId).get();
        const contactData = contactDoc.data();

        const messagesSnap = await adminDb.collection('contacts').doc(contactId).collection('messages')
            .orderBy('createdAt', 'asc')
            .get();

        const messages = messagesSnap.docs.map(doc => {
            const m = doc.data();
            return {
                id: doc.id,
                ...m,
                createdAt: m.createdAt?.toDate ? m.createdAt.toDate().toISOString() : m.createdAt
            };
        });

        return {
            success: true,
            messages,
            contact: contactDoc.exists ? { id: contactDoc.id, name: contactData?.name, email: contactData?.email, phone: contactData?.phone, status: contactData?.status } : null
        };
    } catch (error) {
        console.error("Failed to fetch messages:", error);
        return { success: false, messages: [], contact: null };
    }
}

export async function sendMessage(contactId: string, type: string, content: string) {
    try {
        await adminDb.collection('contacts').doc(contactId).collection('messages').add({
            contactId,
            type,
            direction: "OUTBOUND",
            content,
            createdAt: new Date()
        });

        revalidatePath("/communications");
        revalidatePath("/contacts");
        return { success: true };
    } catch (error) {
        console.error("Failed to send message:", error);
        return { success: false, error: "Failed to send message" };
    }
}

export async function getAllContacts() {
    try {
        const snapshot = await adminDb.collection('contacts').orderBy('name', 'asc').get();
        const contacts = snapshot.docs.map(doc => {
            const c = doc.data();
            return {
                id: doc.id,
                name: c.name,
                email: c.email,
                phone: c.phone
            };
        });
        return { success: true, contacts };
    } catch (error) {
        return { success: false, contacts: [] };
    }
}
