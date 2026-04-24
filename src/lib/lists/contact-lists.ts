/**
 * Contact Lists — Instantly / GHL-style static lists of contacts you can
 * target with campaigns.
 *
 * Storage:
 *   contact_lists/{listId}                { workspaceId, name, ..., contactCount }
 *   contact_lists/{listId}/members/{cid}  { workspaceId, contactId, addedAt }
 *
 * contactCount is a cached counter maintained on add/remove. Accurate-enough
 * for UI; for authoritative counts at send time, call countMembers().
 */

import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import type { ContactList } from "@/types"

function tsToISO(ts: unknown): string {
    if (!ts) return new Date().toISOString()
    if (typeof (ts as { toDate?: () => Date }).toDate === "function") {
        return (ts as { toDate: () => Date }).toDate().toISOString()
    }
    if (ts instanceof Date) return ts.toISOString()
    return typeof ts === "string" ? ts : new Date().toISOString()
}

function mapList(id: string, data: Record<string, unknown>): ContactList {
    return {
        id,
        workspaceId: (data.workspaceId as string) ?? "",
        name: (data.name as string) ?? "",
        description: (data.description as string) ?? undefined,
        type: ((data.type as string) ?? "static") as "static" | "smart",
        contactCount: (data.contactCount as number) ?? 0,
        createdBy: (data.createdBy as string) ?? null,
        createdAt: tsToISO(data.createdAt),
        updatedAt: tsToISO(data.updatedAt),
    }
}

export async function listLists(workspaceId: string): Promise<ContactList[]> {
    if (!workspaceId) throw new Error("workspaceId required")
    const snap = await adminDb
        .collection("contact_lists")
        .where("workspaceId", "==", workspaceId)
        .orderBy("updatedAt", "desc")
        .limit(500)
        .get()
    return snap.docs.map((d) => mapList(d.id, d.data()))
}

export async function getList(
    workspaceId: string,
    listId: string,
): Promise<ContactList | null> {
    if (!workspaceId) throw new Error("workspaceId required")
    const doc = await adminDb.collection("contact_lists").doc(listId).get()
    if (!doc.exists) return null
    const data = doc.data()!
    if (data.workspaceId !== workspaceId) return null
    return mapList(doc.id, data)
}

export interface CreateListInput {
    workspaceId: string
    name: string
    description?: string
    createdBy?: string | null
}

export async function createList(input: CreateListInput): Promise<ContactList> {
    if (!input.workspaceId) throw new Error("workspaceId required")
    if (!input.name?.trim()) throw new Error("name required")
    const now = new Date()
    const ref = await adminDb.collection("contact_lists").add({
        workspaceId: input.workspaceId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        type: "static",
        contactCount: 0,
        createdBy: input.createdBy ?? null,
        createdAt: now,
        updatedAt: now,
    })
    const snap = await ref.get()
    return mapList(ref.id, snap.data()!)
}

export async function updateList(
    workspaceId: string,
    listId: string,
    patch: { name?: string; description?: string },
): Promise<ContactList> {
    const ref = adminDb.collection("contact_lists").doc(listId)
    const doc = await ref.get()
    if (!doc.exists) throw new Error("List not found")
    if (doc.data()?.workspaceId !== workspaceId) throw new Error("Forbidden")
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (patch.name !== undefined) updates.name = patch.name.trim()
    if (patch.description !== undefined)
        updates.description = patch.description.trim() || null
    await ref.update(updates)
    const updated = await ref.get()
    return mapList(ref.id, updated.data()!)
}

export async function deleteList(workspaceId: string, listId: string): Promise<void> {
    const ref = adminDb.collection("contact_lists").doc(listId)
    const doc = await ref.get()
    if (!doc.exists) return
    if (doc.data()?.workspaceId !== workspaceId) throw new Error("Forbidden")
    // Cascade delete members. Batch in chunks of 500 (Firestore limit).
    const members = await ref.collection("members").get()
    const batchSize = 500
    for (let i = 0; i < members.docs.length; i += batchSize) {
        const batch = adminDb.batch()
        for (const m of members.docs.slice(i, i + batchSize)) batch.delete(m.ref)
        await batch.commit()
    }
    await ref.delete()
}

export async function addContactsToList(
    workspaceId: string,
    listId: string,
    contactIds: string[],
): Promise<{ added: number; alreadyPresent: number }> {
    if (contactIds.length === 0) return { added: 0, alreadyPresent: 0 }
    const listRef = adminDb.collection("contact_lists").doc(listId)
    const listDoc = await listRef.get()
    if (!listDoc.exists) throw new Error("List not found")
    if (listDoc.data()?.workspaceId !== workspaceId) throw new Error("Forbidden")

    const membersCol = listRef.collection("members")
    // Chunk add via batches of 450 (leaves room for list counter update below)
    let added = 0
    let alreadyPresent = 0
    const now = new Date()
    const BATCH = 450

    for (let i = 0; i < contactIds.length; i += BATCH) {
        const chunk = contactIds.slice(i, i + BATCH)
        // Check which already exist to avoid miscount
        const existingSnaps = await Promise.all(
            chunk.map((id) => membersCol.doc(id).get()),
        )
        const batch = adminDb.batch()
        chunk.forEach((cid, idx) => {
            if (existingSnaps[idx].exists) {
                alreadyPresent += 1
                return
            }
            batch.set(membersCol.doc(cid), {
                workspaceId,
                contactId: cid,
                addedAt: now,
            })
            added += 1
        })
        await batch.commit()
    }

    if (added > 0) {
        await listRef.update({
            contactCount: FieldValue.increment(added),
            updatedAt: new Date(),
        })
    }
    return { added, alreadyPresent }
}

export async function removeContactsFromList(
    workspaceId: string,
    listId: string,
    contactIds: string[],
): Promise<{ removed: number }> {
    if (contactIds.length === 0) return { removed: 0 }
    const listRef = adminDb.collection("contact_lists").doc(listId)
    const listDoc = await listRef.get()
    if (!listDoc.exists) throw new Error("List not found")
    if (listDoc.data()?.workspaceId !== workspaceId) throw new Error("Forbidden")

    const membersCol = listRef.collection("members")
    let removed = 0
    const BATCH = 450

    for (let i = 0; i < contactIds.length; i += BATCH) {
        const chunk = contactIds.slice(i, i + BATCH)
        const existingSnaps = await Promise.all(
            chunk.map((id) => membersCol.doc(id).get()),
        )
        const batch = adminDb.batch()
        chunk.forEach((cid, idx) => {
            if (existingSnaps[idx].exists) {
                batch.delete(membersCol.doc(cid))
                removed += 1
            }
        })
        await batch.commit()
    }

    if (removed > 0) {
        await listRef.update({
            contactCount: FieldValue.increment(-removed),
            updatedAt: new Date(),
        })
    }
    return { removed }
}

export async function listMemberIds(
    workspaceId: string,
    listId: string,
    limit = 5000,
): Promise<string[]> {
    const listRef = adminDb.collection("contact_lists").doc(listId)
    const listDoc = await listRef.get()
    if (!listDoc.exists) return []
    if (listDoc.data()?.workspaceId !== workspaceId) return []
    const snap = await listRef.collection("members").limit(limit).get()
    return snap.docs.map((d) => d.id)
}

/**
 * Given a set of list IDs, return the deduped union of contact IDs
 * (members of ANY of the lists). Used for the `by_list` audience.
 */
export async function unionMemberIds(
    workspaceId: string,
    listIds: string[],
    limitPerList = 5000,
): Promise<string[]> {
    const sets = await Promise.all(
        listIds.map((id) => listMemberIds(workspaceId, id, limitPerList)),
    )
    const out = new Set<string>()
    for (const s of sets) for (const cid of s) out.add(cid)
    return [...out]
}

export async function countMembers(
    workspaceId: string,
    listId: string,
): Promise<number> {
    const listRef = adminDb.collection("contact_lists").doc(listId)
    const listDoc = await listRef.get()
    if (!listDoc.exists) return 0
    if (listDoc.data()?.workspaceId !== workspaceId) return 0
    // Firestore's count() aggregation is efficient; fall back to list length
    // if the SDK's count aggregation isn't available in this runtime.
    try {
        const agg = await listRef.collection("members").count().get()
        return agg.data().count
    } catch {
        const snap = await listRef.collection("members").limit(10_000).get()
        return snap.size
    }
}
