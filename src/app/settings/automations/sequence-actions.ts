"use server"

import { adminDb } from "@/lib/firebase-admin"
import { auth } from "@/auth"

export async function getSequences() {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    try {
        const snap = await adminDb.collection("email_sequences").orderBy("createdAt", "desc").get()
        const sequences = snap.docs.map(doc => {
            const d = doc.data()
            return {
                id: doc.id,
                name: d.name || "",
                trigger: d.trigger || "",
                enabled: d.enabled ?? true,
                steps: d.steps || [],
            }
        })
        return { success: true, sequences }
    } catch (error) {
        console.error("Failed to get sequences:", error)
        return { success: false, error: "Failed to get sequences" }
    }
}

export async function createSequence(data: {
    name: string
    trigger: string
    steps: { delayDays: number; templateId: string; templateName: string }[]
}) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    try {
        const ref = await adminDb.collection("email_sequences").add({
            name: data.name,
            trigger: data.trigger,
            enabled: true,
            steps: data.steps,
            createdAt: new Date(),
        })
        return { success: true, id: ref.id }
    } catch (error) {
        console.error("Failed to create sequence:", error)
        return { success: false, error: "Failed to create sequence" }
    }
}

export async function updateSequence(id: string, data: Partial<{
    name: string
    trigger: string
    enabled: boolean
    steps: { delayDays: number; templateId: string; templateName: string }[]
}>) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    try {
        await adminDb.collection("email_sequences").doc(id).update(data)
        return { success: true }
    } catch (error) {
        console.error("Failed to update sequence:", error)
        return { success: false, error: "Failed to update sequence" }
    }
}

export async function deleteSequence(id: string) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    try {
        await adminDb.collection("email_sequences").doc(id).delete()
        return { success: true }
    } catch (error) {
        console.error("Failed to delete sequence:", error)
        return { success: false, error: "Failed to delete sequence" }
    }
}
