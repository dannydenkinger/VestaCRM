"use server"

import { adminDb } from "@/lib/firebase-admin"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

const DEFAULT_URGENT_DAYS = 14
const DEFAULT_SOON_DAYS = 30
const SETTINGS_DOC_ID = "pipeline"

export type PipelinePrioritySettings = {
    urgentDays: number
    soonDays: number
}

export async function getPipelinePrioritySettings(): Promise<{ success: boolean; settings?: PipelinePrioritySettings }> {
    try {
        const doc = await adminDb.collection("settings").doc(SETTINGS_DOC_ID).get()
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
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }
    const usersSnap = await adminDb.collection("users").where("email", "==", session.user.email).limit(1).get()
    if (usersSnap.empty) return { success: false, error: "Unauthorized" }
    const dbUser = usersSnap.docs[0].data() as { role?: string }
    if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN") return { success: false, error: "Admin access required" }

    const urgentDays = Math.max(0, Math.floor(Number(settings.urgentDays)) || DEFAULT_URGENT_DAYS)
    const soonDays = Math.max(urgentDays, Math.floor(Number(settings.soonDays)) || DEFAULT_SOON_DAYS)

    try {
        await adminDb.collection("settings").doc(SETTINGS_DOC_ID).set(
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
