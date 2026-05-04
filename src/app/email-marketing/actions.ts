"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"
import {
    createTemplate,
    deleteTemplate,
    updateTemplate,
} from "@/lib/campaigns/templates"
import {
    createCampaign,
    deleteCampaign,
    sendCampaign,
    updateCampaign,
} from "@/lib/campaigns/campaigns"
import { sendEmail, SesIdentityNotReadyError } from "@/lib/ses/sender"
import { InsufficientCreditsError } from "@/lib/credits/email-credits"

async function resolveContext() {
    const session = await requireAuth()
    const user = session.user as { id: string; workspaceId: string }
    return { workspaceId: user.workspaceId, userId: user.id }
}

const saveTemplateSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1).max(120),
    subject: z.string().max(200).default(""),
    description: z.string().max(500).optional(),
    renderedHtml: z.string().max(500_000),
    designJson: z.record(z.string(), z.unknown()).nullable().optional(),
})

export async function saveTemplateAction(input: z.infer<typeof saveTemplateSchema>) {
    const { workspaceId, userId } = await resolveContext()
    const parsed = saveTemplateSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message }
    }

    try {
        if (parsed.data.id) {
            const updated = await updateTemplate(workspaceId, parsed.data.id, {
                name: parsed.data.name,
                subject: parsed.data.subject,
                description: parsed.data.description,
                renderedHtml: parsed.data.renderedHtml,
                designJson: parsed.data.designJson ?? null,
            })
            revalidatePath("/email-marketing/templates")
            return { success: true, template: updated }
        }
        const created = await createTemplate({
            workspaceId,
            name: parsed.data.name,
            subject: parsed.data.subject,
            description: parsed.data.description,
            renderedHtml: parsed.data.renderedHtml,
            designJson: parsed.data.designJson ?? null,
            createdBy: userId,
        })
        revalidatePath("/email-marketing/templates")
        return { success: true, template: created }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save template"
        return { success: false, error: message }
    }
}

const sendTestSchema = z.object({
    to: z.string().email(),
    subject: z.string().min(1).max(200),
    html: z.string().min(1).max(500_000),
})

export async function sendTemplateTestAction(input: z.infer<typeof sendTestSchema>) {
    const { workspaceId } = await resolveContext()
    const parsed = sendTestSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message }
    }

    try {
        const result = await sendEmail({
            workspaceId,
            to: parsed.data.to,
            subject: parsed.data.subject,
            html: parsed.data.html,
        })
        return {
            success: result.ok,
            error: result.error,
            messageId: result.messageId,
            balanceAfter: result.balanceAfter,
        }
    } catch (err) {
        if (err instanceof SesIdentityNotReadyError) {
            return { success: false, error: `SES is not ready (${err.status}). Verify a domain in Settings → Integrations → Amazon SES.` }
        }
        if (err instanceof InsufficientCreditsError) {
            return { success: false, error: `Insufficient credits (${err.available} available). Buy a credit pack first.` }
        }
        const message = err instanceof Error ? err.message : "Failed to send"
        return { success: false, error: message }
    }
}

export async function deleteTemplateAction(id: string) {
    const { workspaceId } = await resolveContext()
    try {
        await deleteTemplate(workspaceId, id)
        revalidatePath("/email-marketing/templates")
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete template"
        return { success: false, error: message }
    }
}

const abTestSchema = z
    .object({
        enabled: z.boolean(),
        variants: z.tuple([z.string().max(200), z.string().max(200)]),
        metric: z.enum(["opens", "clicks"]),
        testPercentage: z.number().int().min(10).max(50),
        testDurationHours: z.number().int().min(1).max(168),
        winnerVariant: z.union([z.literal(0), z.literal(1)]).optional(),
        winnerSelectedAt: z.string().optional(),
    })
    .nullable()
    .optional()

const saveCampaignSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1).max(120),
    subject: z.string().min(1).max(200),
    templateId: z.string().nullable().optional(),
    renderedHtml: z.string().min(1).max(500_000),
    audienceType: z.enum(["all_contacts", "by_tag", "by_ids", "by_list"]),
    audienceValue: z.array(z.string()).nullable().optional(),
    excludeListIds: z.array(z.string()).nullable().optional(),
    abTest: abTestSchema,
    scheduledAt: z.string().datetime().nullable().optional(),
})

export async function saveCampaignAction(input: z.infer<typeof saveCampaignSchema>) {
    const { workspaceId, userId } = await resolveContext()
    const parsed = saveCampaignSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message }
    }

    const scheduledAtDate = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null

    try {
        if (parsed.data.id) {
            const updated = await updateCampaign(workspaceId, parsed.data.id, {
                name: parsed.data.name,
                subject: parsed.data.subject,
                templateId: parsed.data.templateId ?? null,
                renderedHtml: parsed.data.renderedHtml,
                audienceType: parsed.data.audienceType,
                audienceValue: parsed.data.audienceValue ?? null,
                excludeListIds: parsed.data.excludeListIds ?? null,
                abTest: parsed.data.abTest ?? null,
                scheduledAt: scheduledAtDate,
            })
            revalidatePath("/email-marketing")
            revalidatePath(`/email-marketing/campaigns/${updated.id}`)
            return { success: true, campaign: updated }
        }
        const created = await createCampaign({
            workspaceId,
            name: parsed.data.name,
            subject: parsed.data.subject,
            templateId: parsed.data.templateId ?? null,
            renderedHtml: parsed.data.renderedHtml,
            audienceType: parsed.data.audienceType,
            audienceValue: parsed.data.audienceValue ?? null,
            excludeListIds: parsed.data.excludeListIds ?? null,
            abTest: parsed.data.abTest ?? null,
            createdBy: userId,
            scheduledAt: scheduledAtDate,
        })
        revalidatePath("/email-marketing")
        return { success: true, campaign: created }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save campaign"
        return { success: false, error: message }
    }
}

export async function deleteCampaignAction(id: string) {
    const { workspaceId } = await resolveContext()
    try {
        await deleteCampaign(workspaceId, id)
        revalidatePath("/email-marketing")
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete campaign"
        return { success: false, error: message }
    }
}

export async function cancelScheduledCampaignAction(id: string) {
    const { workspaceId } = await resolveContext()
    try {
        const updated = await updateCampaign(workspaceId, id, {
            scheduledAt: null,
        })
        revalidatePath("/email-marketing")
        revalidatePath(`/email-marketing/campaigns/${id}`)
        return { success: true, campaign: updated }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to cancel schedule"
        return { success: false, error: message }
    }
}

export async function sendCampaignAction(id: string) {
    const { workspaceId } = await resolveContext()
    try {
        const result = await sendCampaign(workspaceId, id)
        revalidatePath("/email-marketing")
        revalidatePath(`/email-marketing/campaigns/${id}`)
        return {
            success: result.ok,
            campaignId: id,
            targeted: result.targeted,
            sent: result.sent,
            failed: result.failed,
            skipped: result.skipped,
            error: result.error,
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to send campaign"
        return {
            success: false,
            campaignId: id,
            targeted: 0,
            sent: 0,
            failed: 0,
            skipped: 0,
            error: message,
        }
    }
}
