"use server"

import { tenantDb } from "@/lib/tenant-db";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Soft-delete: marks a document with deletedAt/deletedBy instead of removing it.
 * The document stays in Firestore until permanentlyDelete is called after the undo window.
 */
export async function softDelete(workspaceId: string, collection: string, docId: string, userId: string) {
    const db = tenantDb(workspaceId);
    const ref = db.doc(collection, docId);
    const doc = await ref.get();
    if (!doc.exists) return { success: false, error: "Document not found" };

    await ref.update({
        deletedAt: new Date(),
        deletedBy: userId,
    });

    return { success: true };
}

/**
 * Restore: removes the soft-delete markers so the item reappears.
 */
export async function restoreItem(workspaceId: string, collection: string, docId: string) {
    const db = tenantDb(workspaceId);
    const ref = db.doc(collection, docId);
    const doc = await ref.get();
    if (!doc.exists) return { success: false, error: "Document not found" };

    await ref.update({
        deletedAt: FieldValue.delete(),
        deletedBy: FieldValue.delete(),
    });

    return { success: true };
}

/**
 * Permanently delete a document from Firestore.
 * Called after the undo window has passed.
 */
export async function permanentlyDelete(workspaceId: string, collection: string, docId: string) {
    const db = tenantDb(workspaceId);
    const ref = db.doc(collection, docId);
    await ref.delete();
    return { success: true };
}
