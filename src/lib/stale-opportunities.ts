import { adminDb } from "@/lib/firebase-admin"
import { createNotification } from "@/app/notifications/actions"

export async function checkStaleOpportunities() {
    let staleCount = 0

    try {
        const settingsDoc = await adminDb.collection("settings").doc("automations").get()
        if (!settingsDoc.exists || !settingsDoc.data()?.staleOpportunityEnabled) {
            return { staleCount: 0 }
        }

        const pipelinesSnap = await adminDb.collection("pipelines").get()
        const today = new Date()
        const todayStr = today.toISOString().slice(0, 10)

        for (const pDoc of pipelinesSnap.docs) {
            const stagesSnap = await pDoc.ref.collection("stages").get()

            for (const sDoc of stagesSnap.docs) {
                const threshold = sDoc.data().stalenessThresholdDays
                if (!threshold || threshold <= 0) continue

                const cutoff = new Date(today.getTime() - threshold * 86400000)

                const oppsSnap = await adminDb.collection("opportunities")
                    .where("pipelineStageId", "==", sDoc.id)
                    .get()

                for (const oppDoc of oppsSnap.docs) {
                    const data = oppDoc.data()
                    const updatedAt = data.updatedAt?.toDate
                        ? data.updatedAt.toDate()
                        : data.updatedAt instanceof Date
                            ? data.updatedAt
                            : typeof data.updatedAt === "string"
                                ? new Date(data.updatedAt)
                                : null

                    if (!updatedAt || updatedAt >= cutoff) continue

                    const contactName = data.name || "Unknown"
                    const dedupeKey = `stale_${oppDoc.id}_${todayStr}`

                    await createNotification({
                        title: `Stale: ${sDoc.data().name}`,
                        message: `${contactName} — no update for ${threshold}+ days`,
                        type: "opportunity",
                        linkUrl: `/pipeline?deal=${oppDoc.id}`,
                        dedupeKey,
                    })
                    staleCount++
                }
            }
        }
    } catch (err) {
        console.error("Stale opportunity check error:", err)
    }

    return { staleCount }
}
