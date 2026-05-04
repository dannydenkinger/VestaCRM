"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"
import { adminDb } from "@/lib/firebase-admin"
import {
    createAutomation,
    deleteAutomation,
    getAutomation,
    startRun,
    updateAutomation,
} from "@/lib/automations/store"
import { advanceRun } from "@/lib/automations/engine"
import type {
    AutomationNode,
    Trigger,
    TriggerType,
} from "@/lib/automations/types"

async function ws() {
    const session = await requireAuth()
    const u = session.user as { id: string; workspaceId: string }
    return { workspaceId: u.workspaceId, userId: u.id }
}

const TRIGGER_TYPES: TriggerType[] = [
    "contact_created",
    "contact_added_to_list",
    "tag_added",
    "tag_removed",
    "form_submitted",
    "pipeline_stage_entered",
    "opportunity_won",
    "email_opened",
    "email_clicked",
    "manual",
]

const triggerSchema = z.object({
    type: z.enum(TRIGGER_TYPES as [TriggerType, ...TriggerType[]]),
    config: z
        .object({
            listId: z.string().optional(),
            tagId: z.string().optional(),
            formId: z.string().optional(),
            stageId: z.string().optional(),
            campaignId: z.string().optional(),
        })
        .default({}),
})

// Loose node schema — actual shape varies by type. We trust the UI to send
// a valid node and let the engine ignore unknown fields.
const nodeSchema = z
    .object({
        id: z.string().min(1),
        type: z.enum([
            "send_email",
            "wait",
            "add_tag",
            "remove_tag",
            "add_to_list",
            "remove_from_list",
            "branch_if",
            "end",
        ]),
    })
    .passthrough()

const createSchema = z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    enabled: z.boolean().optional(),
    trigger: triggerSchema,
    nodes: z.array(nodeSchema).optional(),
})

export async function createAutomationAction(
    input: z.infer<typeof createSchema>,
) {
    const { workspaceId, userId } = await ws()
    const parsed = createSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message }
    }
    try {
        const created = await createAutomation({
            workspaceId,
            name: parsed.data.name,
            description: parsed.data.description,
            enabled: parsed.data.enabled ?? false,
            trigger: parsed.data.trigger as Trigger,
            nodes: (parsed.data.nodes ?? []) as AutomationNode[],
            createdBy: userId,
        })
        revalidatePath("/automations")
        return { success: true, automation: created }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create"
        return { success: false, error: message }
    }
}

const updateSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    enabled: z.boolean().optional(),
    trigger: triggerSchema.optional(),
    nodes: z.array(nodeSchema).optional(),
})

export async function updateAutomationAction(
    input: z.infer<typeof updateSchema>,
) {
    const { workspaceId } = await ws()
    const parsed = updateSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message }
    }
    try {
        const updated = await updateAutomation(workspaceId, parsed.data.id, {
            name: parsed.data.name,
            description: parsed.data.description,
            enabled: parsed.data.enabled,
            trigger: parsed.data.trigger as Trigger | undefined,
            nodes: parsed.data.nodes as AutomationNode[] | undefined,
        })
        revalidatePath("/automations")
        revalidatePath(`/automations/${updated.id}`)
        return { success: true, automation: updated }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update"
        return { success: false, error: message }
    }
}

export async function toggleAutomationAction(input: {
    id: string
    enabled: boolean
}) {
    return updateAutomationAction({ id: input.id, enabled: input.enabled })
}

export async function deleteAutomationAction(id: string) {
    const { workspaceId } = await ws()
    try {
        await deleteAutomation(workspaceId, id)
        revalidatePath("/automations")
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete"
        return { success: false, error: message }
    }
}

const testEnrollSchema = z.object({
    automationId: z.string().min(1),
    /** Email to enroll. If a contact with this email exists, use it; else
     *  enroll as an external recipient (engine treats as no contact). */
    email: z.string().email(),
})

/**
 * Manually enroll a single email as a test run. Useful for testing a flow
 * without waiting for the natural trigger to fire. Bypasses the
 * single-enrollment guard so you can test repeatedly.
 */
export async function enrollTestRunAction(
    input: z.infer<typeof testEnrollSchema>,
) {
    const { workspaceId } = await ws()
    const parsed = testEnrollSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: "Invalid email" }

    try {
        const automation = await getAutomation(workspaceId, parsed.data.automationId)
        if (!automation) return { success: false, error: "Automation not found" }

        // Try to resolve the email to an existing CRM contact (so add_tag,
        // update_field, etc. have something to operate on)
        const lower = parsed.data.email.toLowerCase()
        const snap = await adminDb
            .collection("contacts")
            .where("workspaceId", "==", workspaceId)
            .where("email", "==", lower)
            .limit(1)
            .get()
        const contactId = snap.empty ? "" : snap.docs[0].id

        const run = await startRun({
            workspaceId,
            automationId: parsed.data.automationId,
            contactId,
            contactEmail: lower,
            contextData: {
                triggerType: "manual",
                triggerMatch: {},
                triggerPayload: { test: true },
                triggeredAt: new Date().toISOString(),
            },
        })

        // Fire the first step. If it lands on a wait, the cron picks it up.
        advanceRun(run.id).catch((err) => {
            console.error(`[test-enroll] advanceRun failed:`, err)
        })

        revalidatePath(`/automations/${parsed.data.automationId}`)
        return { success: true, runId: run.id }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Test failed"
        return { success: false, error: message }
    }
}
