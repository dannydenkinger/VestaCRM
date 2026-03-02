"use server"

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function getContactDocuments(contactId: string) {
    try {
        const snapshot = await adminDb.collection('contacts').doc(contactId).collection('documents')
            .orderBy('createdAt', 'desc')
            .get();
            
        const documents = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt,
            updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate().toISOString() : doc.data().updatedAt
        }));
        
        return { success: true, documents };
    } catch (error) {
        console.error("Failed to fetch documents:", error);
        return { success: false, documents: [] };
    }
}

export async function addDocument(contactId: string, name: string, url: string, status: string = "LINK") {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        await adminDb.collection('contacts').doc(contactId).collection('documents').add({
            name,
            url,
            status,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        revalidatePath("/contacts");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to add document" };
    }
}

export async function updateDocumentStatus(contactId: string, id: string, status: string) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        await adminDb.collection('contacts').doc(contactId).collection('documents').doc(id).update({ 
            status,
            updatedAt: new Date()
        });

        revalidatePath("/contacts");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update document status" };
    }
}

export async function deleteDocument(contactId: string, id: string) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        await adminDb.collection('contacts').doc(contactId).collection('documents').doc(id).delete();

        revalidatePath("/contacts");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete document" };
    }
}
