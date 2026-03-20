"use server"

import { tenantDb } from "@/lib/tenant-db"
import { revalidatePath } from "next/cache"
import { requireAdmin, requireAuth } from "@/lib/auth-guard"
import type { PipelinePrioritySettings } from "./types"

const DEFAULT_URGENT_DAYS = 14
const DEFAULT_SOON_DAYS = 30

export async function getPipelinePrioritySettings(): Promise<{ success: boolean; settings?: PipelinePrioritySettings }> {
    try {
        const session = await requireAuth()
        const workspaceId = session.user.workspaceId
        const db = tenantDb(workspaceId)

        const doc = await db.settingsDoc("pipeline").get()
        const data = doc.data()
        return {
            success: true,
            settings: {
                urgentDays: typeof data?.priorityUrgentDays === "number" ? data.priorityUrgentDays : DEFAULT_URGENT_DAYS,
                soonDays: typeof data?.prioritySoonDays === "number" ? data.prioritySoonDays : DEFAULT_SOON_DAYS,
            },
        }
    } catch (error) {
        console.error("Failed to fetch pipeline priority settings:", error)
        return {
            success: true,
            settings: { urgentDays: DEFAULT_URGENT_DAYS, soonDays: DEFAULT_SOON_DAYS },
        }
    }
}

export async function updatePipelinePrioritySettings(settings: PipelinePrioritySettings) {
    let session
    try {
        session = await requireAdmin()
    } catch {
        return { success: false, error: "Admin access required" }
    }

    const urgentDays = Math.max(0, Math.floor(Number(settings.urgentDays)) || DEFAULT_URGENT_DAYS)
    const soonDays = Math.max(urgentDays, Math.floor(Number(settings.soonDays)) || DEFAULT_SOON_DAYS)

    try {
        const workspaceId = session.user.workspaceId
        const db = tenantDb(workspaceId)

        await db.settingsDoc("pipeline").set(
            { priorityUrgentDays: urgentDays, prioritySoonDays: soonDays, updatedAt: new Date() },
            { merge: true }
        )
        revalidatePath("/settings")
        revalidatePath("/pipeline")
        return { success: true }
    } catch (error) {
        console.error("Failed to update pipeline priority settings:", error)
        return { success: false, error: "Failed to save settings" }
    }
}
