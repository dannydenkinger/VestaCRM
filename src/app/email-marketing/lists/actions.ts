"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"
import { adminDb } from "@/lib/firebase-admin"
import {
    addContactsToList,
    createList,
    deleteList,
    listMemberIds,
    removeContactsFromList,
    updateList,
} from "@/lib/lists/contact-lists"

async function resolveContext() {
    const session = await requireAuth()
    const user = session.user as { id: string; workspaceId: string }
    return { workspaceId: user.workspaceId, userId: user.id }
}

const saveListSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
})

export async function saveListAction(input: z.infer<typeof saveListSchema>) {
    const { workspaceId, userId } = await resolveContext()
    const parsed = saveListSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message }
    }

    try {
        if (parsed.data.id) {
            const updated = await updateList(workspaceId, parsed.data.id, {
                name: parsed.data.name,
                description: parsed.data.description,
            })
            revalidatePath("/email-marketing/lists")
            revalidatePath(`/email-marketing/lists/${updated.id}`)
            return { success: true, list: updated }
        }
        const created = await createList({
            workspaceId,
            name: parsed.data.name,
            description: parsed.data.description,
            createdBy: userId,
        })
        revalidatePath("/email-marketing/lists")
        return { success: true, list: created }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save list"
        return { success: false, error: message }
    }
}

export async function deleteListAction(listId: string) {
    const { workspaceId } = await resolveContext()
    try {
        await deleteList(workspaceId, listId)
        revalidatePath("/email-marketing/lists")
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete list"
        return { success: false, error: message }
    }
}

const memberOpSchema = z.object({
    listId: z.string().min(1),
    contactIds: z.array(z.string().min(1)).min(1).max(500),
})

export async function addContactsAction(input: z.infer<typeof memberOpSchema>) {
    const { workspaceId } = await resolveContext()
    const parsed = memberOpSchema.safeParse(input)
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Invalid input",
            added: 0,
            alreadyPresent: 0,
        }
    }
    try {
        const result = await addContactsToList(
            workspaceId,
            parsed.data.listId,
            parsed.data.contactIds,
        )
        revalidatePath(`/email-marketing/lists/${parsed.data.listId}`)
        revalidatePath("/email-marketing/lists")
        return { success: true, error: null, ...result }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add contacts"
        return { success: false, error: message, added: 0, alreadyPresent: 0 }
    }
}

export async function removeContactsAction(input: z.infer<typeof memberOpSchema>) {
    const { workspaceId } = await resolveContext()
    const parsed = memberOpSchema.safeParse(input)
    if (!parsed.success) {
        return {
            success: false,
            error: "Invalid input",
            removed: 0,
        }
    }
    try {
        const result = await removeContactsFromList(
            workspaceId,
            parsed.data.listId,
            parsed.data.contactIds,
        )
        revalidatePath(`/email-marketing/lists/${parsed.data.listId}`)
        revalidatePath("/email-marketing/lists")
        return { success: true, error: null, ...result }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to remove contacts"
        return { success: false, error: message, removed: 0 }
    }
}

const searchSchema = z.object({
    query: z.string().max(200),
    listId: z.string().optional(),
    limit: z.number().int().positive().max(50).optional(),
})

/**
 * Search contacts, optionally filtering out those already in a given list
 * (so the picker doesn't offer duplicates).
 */
export async function searchContactsForListAction(
    input: z.infer<typeof searchSchema>,
) {
    const { workspaceId } = await resolveContext()
    const parsed = searchSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: "Invalid query", contacts: [] }

    const q = parsed.data.query.trim().toLowerCase()
    const limit = parsed.data.limit ?? 20

    try {
        // Pull a page of contacts (Firestore can't do real full-text search)
        const snap = await adminDb
            .collection("contacts")
            .where("workspaceId", "==", workspaceId)
            .orderBy("createdAt", "desc")
            .limit(1000)
            .get()

        const all = snap.docs.map((d) => {
            const data = d.data()
            return {
                id: d.id,
                name: (data.name as string) || "",
                email: (data.email as string) || "",
            }
        })

        let filtered = q
            ? all.filter(
                  (c) =>
                      c.name.toLowerCase().includes(q) ||
                      c.email.toLowerCase().includes(q),
              )
            : all

        // Exclude existing list members if a listId was provided
        if (parsed.data.listId) {
            const memberIds = new Set(
                await listMemberIds(workspaceId, parsed.data.listId, 10_000),
            )
            filtered = filtered.filter((c) => !memberIds.has(c.id))
        }

        const sorted = [...filtered].sort((a, b) => {
            const an = (a.name || a.email).toLowerCase()
            const bn = (b.name || b.email).toLowerCase()
            return an.localeCompare(bn)
        })

        return { success: true, contacts: sorted.slice(0, limit) }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Search failed"
        return { success: false, error: message, contacts: [] }
    }
}
