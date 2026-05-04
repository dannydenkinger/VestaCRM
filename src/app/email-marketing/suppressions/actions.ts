"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-guard"
import {
    addSuppression,
    removeSuppression,
    type SuppressionReason,
} from "@/lib/email/suppressions"

async function ws() {
    const session = await requireAuth()
    return (session.user as { workspaceId: string }).workspaceId
}

const addSchema = z.object({
    email: z.string().email(),
    reason: z.enum(["bounce", "complaint", "unsubscribe", "manual"]).optional(),
    source: z.string().max(200).optional(),
})

export async function addSuppressionAction(input: z.infer<typeof addSchema>) {
    const workspaceId = await ws()
    const parsed = addSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: "Invalid email" }
    try {
        await addSuppression({
            workspaceId,
            email: parsed.data.email,
            reason: (parsed.data.reason as SuppressionReason) ?? "manual",
            source: parsed.data.source ?? "added by user",
        })
        revalidatePath("/email-marketing/suppressions")
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed"
        return { success: false, error: message }
    }
}

const removeSchema = z.object({ email: z.string().email() })

export async function removeSuppressionAction(input: z.infer<typeof removeSchema>) {
    const workspaceId = await ws()
    const parsed = removeSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: "Invalid email" }
    try {
        await removeSuppression(workspaceId, parsed.data.email)
        revalidatePath("/email-marketing/suppressions")
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed"
        return { success: false, error: message }
    }
}
