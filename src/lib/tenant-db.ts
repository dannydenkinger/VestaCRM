/**
 * Tenant-scoped database helper for multi-tenant workspace isolation.
 *
 * Every server action / API route should use tenantDb(workspaceId) instead of
 * importing adminDb directly.  The helper auto-injects `workspaceId` on writes
 * and auto-filters on reads so tenant data can never leak across workspaces.
 *
 * Allowed direct adminDb usage:
 *  - src/lib/firebase-admin.ts  (exports it)
 *  - src/auth.ts                (global user lookup)
 *  - src/app/register/actions.ts (workspace creation)
 *  - migration scripts
 */

import { adminDb } from "@/lib/firebase-admin"
import type { CollectionReference, DocumentReference, Query } from "firebase-admin/firestore"

export function tenantDb(workspaceId: string) {
    if (!workspaceId) {
        throw new Error("workspaceId is required for tenant-scoped queries")
    }

    return {
        /** Query a collection filtered by workspaceId */
        collection(name: string): Query {
            return adminDb.collection(name).where("workspaceId", "==", workspaceId)
        },

        /** Raw collection ref — use for .doc() lookups or when you need the ref itself */
        collectionRef(name: string): CollectionReference {
            return adminDb.collection(name)
        },

        /** Direct document reference by ID */
        doc(collection: string, docId: string): DocumentReference {
            return adminDb.collection(collection).doc(docId)
        },

        /** Add a document with workspaceId automatically injected */
        async add(collection: string, data: Record<string, unknown>) {
            return adminDb.collection(collection).add({
                ...data,
                workspaceId,
            })
        },

        /** Settings document using workspace-prefixed ID convention */
        settingsDoc(settingsKey: string): DocumentReference {
            return adminDb.collection("settings").doc(`${workspaceId}_${settingsKey}`)
        },

        /** Access a subcollection under a parent document */
        subcollection(parentCollection: string, parentId: string, subName: string): CollectionReference {
            return adminDb.collection(parentCollection).doc(parentId).collection(subName)
        },

        /** Add to a subcollection with workspaceId (for collectionGroup query safety) */
        async addToSubcollection(
            parentCollection: string,
            parentId: string,
            subName: string,
            data: Record<string, unknown>,
        ) {
            return adminDb
                .collection(parentCollection)
                .doc(parentId)
                .collection(subName)
                .add({ ...data, workspaceId })
        },

        /** CollectionGroup query with tenant filter */
        collectionGroup(name: string): Query {
            return adminDb.collectionGroup(name).where("workspaceId", "==", workspaceId)
        },

        /** Batch helper — returns a Firestore batch for multi-doc writes */
        batch() {
            return adminDb.batch()
        },

        /** Get multiple docs by refs at once */
        async getAll(...refs: DocumentReference[]) {
            return adminDb.getAll(...refs)
        },

        /** The workspaceId this helper is scoped to */
        workspaceId,
    }
}

export type TenantDb = ReturnType<typeof tenantDb>
