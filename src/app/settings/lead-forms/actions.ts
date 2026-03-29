"use server"

import crypto from "crypto"
import { tenantDb } from "@/lib/tenant-db"
import { adminDb } from "@/lib/firebase-admin"
import { requireAdmin, getAuthSession } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import type { LeadForm, FormField, FormStyle } from "./types"
import { generateFormId, generateSlug, getDefaultFields, getDefaultStyle } from "@/lib/form-utils"

function hashKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex")
}

export async function getLeadForms(): Promise<LeadForm[]> {
    const session = await getAuthSession()
    if (!session?.user?.id) return []
    const workspaceId = session.user.workspaceId
    const db = tenantDb(workspaceId)

    const snap = await db.collection("lead_forms").orderBy("createdAt", "desc").get()
    return snap.docs
        .filter(doc => doc.data().status !== "deleted")
        .map(doc => {
            const d = doc.data()
            return {
                id: doc.id,
                workspaceId: d.workspaceId,
                name: d.name,
                slug: d.slug,
                status: d.status,
                apiKeyHash: d.apiKeyHash || "",
                apiKeyPrefix: d.apiKeyPrefix || "",
                fields: d.fields || [],
                style: d.style || {},
                submissionCount: d.submissionCount || 0,
                createdAt: d.createdAt?.toDate?.()?.toISOString?.() || d.createdAt || "",
                updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() || d.updatedAt || "",
            } as LeadForm
        })
}

export async function getLeadForm(formId: string): Promise<LeadForm | null> {
    const session = await getAuthSession()
    if (!session?.user?.id) return null
    const workspaceId = session.user.workspaceId
    const db = tenantDb(workspaceId)

    const doc = await db.doc("lead_forms", formId).get()
    if (!doc.exists) return null
    const d = doc.data()!
    if (d.workspaceId !== workspaceId) return null

    return {
        id: doc.id,
        workspaceId: d.workspaceId,
        name: d.name,
        slug: d.slug,
        status: d.status,
        apiKeyHash: d.apiKeyHash || "",
        apiKeyPrefix: d.apiKeyPrefix || "",
        fields: d.fields || [],
        style: d.style || {},
        submissionCount: d.submissionCount || 0,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || d.createdAt || "",
        updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() || d.updatedAt || "",
    } as LeadForm
}

export async function createLeadForm(name: string): Promise<{ formId: string }> {
    const session = await requireAdmin()
    const workspaceId = session.user.workspaceId
    const db = tenantDb(workspaceId)

    // Get workspace branding for default styling
    const brandingDoc = await db.settingsDoc("branding").get()
    const branding = brandingDoc.exists ? brandingDoc.data() : undefined

    const formId = generateFormId()
    const slug = generateSlug(name)

    // Generate API key for this form
    const rawKey = crypto.randomBytes(32).toString("base64url")
    const fullKey = `vf_${rawKey}`
    const keyHash = hashKey(fullKey)
    const keyPrefix = fullKey.substring(0, 10) + "..."

    // Store API key in api_keys collection for validateApiKey() compatibility
    await db.add("api_keys", {
        name: `Form: ${name}`,
        keyHash,
        keyPrefix,
        userId: session.user.id || session.user.email,
        formId,
        createdAt: new Date(),
        lastUsedAt: null,
        active: true,
    })

    const now = new Date()
    await db.collectionRef("lead_forms").doc(formId).set({
        workspaceId,
        name,
        slug,
        status: "active" as const,
        apiKeyHash: keyHash,
        apiKeyPrefix: keyPrefix,
        fields: getDefaultFields(),
        style: getDefaultStyle(branding as any),
        submissionCount: 0,
        createdAt: now,
        updatedAt: now,
    })

    revalidatePath("/settings")
    return { formId }
}

export async function updateLeadForm(
    formId: string,
    data: { name?: string; fields?: FormField[]; style?: FormStyle }
): Promise<{ success: boolean }> {
    const session = await requireAdmin()
    const workspaceId = session.user.workspaceId
    const db = tenantDb(workspaceId)

    const doc = await db.doc("lead_forms", formId).get()
    if (!doc.exists || doc.data()?.workspaceId !== workspaceId) {
        return { success: false }
    }

    const update: Record<string, any> = { updatedAt: new Date() }
    if (data.name !== undefined) {
        update.name = data.name
        update.slug = generateSlug(data.name)
    }
    if (data.fields !== undefined) update.fields = data.fields
    if (data.style !== undefined) update.style = data.style

    await db.doc("lead_forms", formId).update(update)
    revalidatePath("/settings")
    return { success: true }
}

export async function deleteLeadForm(formId: string): Promise<{ success: boolean }> {
    const session = await requireAdmin()
    const workspaceId = session.user.workspaceId
    const db = tenantDb(workspaceId)

    const doc = await db.doc("lead_forms", formId).get()
    if (!doc.exists || doc.data()?.workspaceId !== workspaceId) {
        return { success: false }
    }

    await db.doc("lead_forms", formId).update({ status: "deleted", updatedAt: new Date() })
    revalidatePath("/settings")
    return { success: true }
}

export async function duplicateLeadForm(formId: string): Promise<{ formId: string } | null> {
    const session = await requireAdmin()
    const workspaceId = session.user.workspaceId
    const db = tenantDb(workspaceId)

    const doc = await db.doc("lead_forms", formId).get()
    if (!doc.exists || doc.data()?.workspaceId !== workspaceId) return null

    const original = doc.data()!
    const newName = `${original.name} (Copy)`
    const result = await createLeadForm(newName)

    // Copy fields and style from original
    await db.doc("lead_forms", result.formId).update({
        fields: original.fields,
        style: original.style,
        updatedAt: new Date(),
    })

    revalidatePath("/settings")
    return result
}

export async function toggleLeadFormStatus(formId: string): Promise<{ success: boolean }> {
    const session = await requireAdmin()
    const workspaceId = session.user.workspaceId
    const db = tenantDb(workspaceId)

    const doc = await db.doc("lead_forms", formId).get()
    if (!doc.exists || doc.data()?.workspaceId !== workspaceId) {
        return { success: false }
    }

    const currentStatus = doc.data()!.status
    const newStatus = currentStatus === "active" ? "inactive" : "active"
    await db.doc("lead_forms", formId).update({ status: newStatus, updatedAt: new Date() })

    revalidatePath("/settings")
    return { success: true }
}

/**
 * Public function — fetches a form by ID without auth (for the hosted form page).
 */
export async function getPublicLeadForm(formId: string): Promise<LeadForm | null> {
    const doc = await adminDb.collection("lead_forms").doc(formId).get()
    if (!doc.exists) return null
    const d = doc.data()!
    if (d.status !== "active") return null

    return {
        id: doc.id,
        workspaceId: d.workspaceId,
        name: d.name,
        slug: d.slug,
        status: d.status,
        apiKeyHash: d.apiKeyHash || "",
        apiKeyPrefix: d.apiKeyPrefix || "",
        fields: d.fields || [],
        style: d.style || {},
        submissionCount: d.submissionCount || 0,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || "",
        updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() || "",
    } as LeadForm
}
