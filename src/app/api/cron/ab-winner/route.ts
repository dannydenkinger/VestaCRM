import { NextRequest, NextResponse } from "next/server"
import {
    findDueABCampaigns,
    finalizeABTest,
} from "@/lib/campaigns/campaigns"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * Cron route: pick A/B-test campaigns whose test window has elapsed, pick
 * the winning subject by opens/clicks, send winner to the rest. Same auth
 * pattern as the other cron endpoints.
 */
export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV !== "development") {
        const authHeader = req.headers.get("authorization") ?? ""
        const expected = process.env.CRON_SECRET
        if (!expected) {
            return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
        }
        if (authHeader !== `Bearer ${expected}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
    }

    const due = await findDueABCampaigns(10)
    const results: Array<{ id: string; ok: boolean; winner?: number; sent?: number; error?: string }> = []
    for (const c of due) {
        try {
            const res = await finalizeABTest(c.workspaceId, c.id)
            results.push({
                id: c.id,
                ok: res.ok,
                winner: res.winnerVariant,
                sent: res.sent,
                error: res.error,
            })
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error"
            results.push({ id: c.id, ok: false, error: message })
        }
    }
    return NextResponse.json({ ok: true, processed: results.length, results })
}
