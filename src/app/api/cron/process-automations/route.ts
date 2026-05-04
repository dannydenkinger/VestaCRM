import { NextRequest, NextResponse } from "next/server"
import { processDueWaitingRuns } from "@/lib/automations/engine"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes — Vercel hobby cap

/**
 * Cron route: pick up automation_runs whose `wait` timer has elapsed and
 * advance them. Mirrors the auth pattern of /api/cron/send-scheduled-campaigns.
 *
 * Trigger: GitHub Actions workflow at .github/workflows/process-automations.yml
 * fires every minute. Bearer auth via CRON_SECRET in production.
 */
export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV !== "development") {
        const authHeader = req.headers.get("authorization") ?? ""
        const expected = process.env.CRON_SECRET
        if (!expected) {
            console.error("[cron/process-automations] CRON_SECRET not set")
            return NextResponse.json(
                { error: "CRON_SECRET not configured" },
                { status: 500 },
            )
        }
        if (authHeader !== `Bearer ${expected}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
    }

    try {
        // Process up to 25 due runs per tick. Each run can execute up to 20
        // steps before yielding, so worst case ~500 node-executions / minute,
        // well under the 300s timeout.
        const result = await processDueWaitingRuns(25)
        return NextResponse.json({ ok: true, ...result })
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        console.error("[cron/process-automations] failed:", err)
        return NextResponse.json({ ok: false, error: message }, { status: 500 })
    }
}
