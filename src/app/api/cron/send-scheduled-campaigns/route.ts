import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { sendCampaign } from "@/lib/campaigns/campaigns"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes — max for hobby plan

/**
 * Cron route: pick up `scheduled` campaigns whose `scheduledAt` has passed
 * and send them. Wired to Vercel Cron via vercel.json (every minute).
 *
 * Auth: Vercel Cron sends a `Authorization: Bearer <CRON_SECRET>` header. We
 * accept either that or no auth on localhost (so dev can curl the route).
 */
export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV !== "development") {
        const authHeader = req.headers.get("authorization") ?? ""
        const expected = process.env.CRON_SECRET
        if (!expected) {
            console.error("[cron/send-scheduled-campaigns] CRON_SECRET not set")
            return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
        }
        if (authHeader !== `Bearer ${expected}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
    }

    const now = new Date()
    const snap = await adminDb
        .collection("email_campaigns")
        .where("status", "==", "scheduled")
        .where("scheduledAt", "<=", now)
        .limit(20) // process at most 20 per minute to stay within Vercel's 300s budget
        .get()

    if (snap.empty) {
        return NextResponse.json({ ok: true, processed: 0 })
    }

    const results: Array<{ id: string; ok: boolean; sent?: number; failed?: number; error?: string }> = []

    for (const doc of snap.docs) {
        const data = doc.data()
        const workspaceId = data.workspaceId as string | undefined
        if (!workspaceId) continue
        try {
            const result = await sendCampaign(workspaceId, doc.id)
            results.push({
                id: doc.id,
                ok: result.ok,
                sent: result.sent,
                failed: result.failed,
                error: result.error,
            })
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error"
            results.push({ id: doc.id, ok: false, error: message })
            console.error(`[cron] failed to send campaign ${doc.id}:`, err)
        }
    }

    return NextResponse.json({ ok: true, processed: results.length, results })
}
