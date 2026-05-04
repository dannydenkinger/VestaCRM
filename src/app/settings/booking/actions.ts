"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth-guard"
import { upsertBookingPage } from "@/lib/booking/store"

const dayHoursSchema = z.object({
    start: z.number().int().min(0).max(23),
    end: z.number().int().min(1).max(24),
})

const saveSchema = z.object({
    name: z.string().min(1).max(120),
    slug: z
        .string()
        .min(1)
        .max(80)
        .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
    timezone: z.string().min(1).max(80),
    slotDurationMinutes: z.number().int().min(5).max(480),
    bufferMinutes: z.number().int().min(0).max(120),
    advanceNoticeHours: z.number().int().min(0).max(168),
    maxPerDay: z.number().int().min(0).max(50),
    futureWindowDays: z.number().int().min(1).max(180),
    intro: z.string().max(500).optional(),
    hoursByDay: z.record(z.string(), dayHoursSchema),
})

export async function saveBookingPageAction(input: z.infer<typeof saveSchema>) {
    const session = await requireAdmin()
    const workspaceId = (session.user as { workspaceId: string }).workspaceId

    const parsed = saveSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message }
    }

    try {
        // Re-shape hoursByDay keys (string → number)
        const hours: Partial<Record<number, { start: number; end: number }>> = {}
        for (const [k, v] of Object.entries(parsed.data.hoursByDay)) {
            const day = parseInt(k, 10)
            if (Number.isInteger(day) && day >= 0 && day <= 6) {
                hours[day] = v
            }
        }

        const page = await upsertBookingPage(workspaceId, {
            name: parsed.data.name,
            slug: parsed.data.slug,
            timezone: parsed.data.timezone,
            slotDurationMinutes: parsed.data.slotDurationMinutes,
            bufferMinutes: parsed.data.bufferMinutes,
            advanceNoticeHours: parsed.data.advanceNoticeHours,
            maxPerDay: parsed.data.maxPerDay,
            futureWindowDays: parsed.data.futureWindowDays,
            intro: parsed.data.intro,
            hoursByDay: hours,
        })

        revalidatePath("/settings/booking")
        return { success: true, page }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save"
        return { success: false, error: message }
    }
}
