import { NextResponse } from "next/server"
import { getExpiringWatches } from "@/lib/gmail-integration"
import { setupGmailWatch } from "@/lib/gmail-watch"

/**
 * Cron endpoint to renew Gmail push notification watches.
 * Gmail watches expire after 7 days. This should run daily.
 *
 * Call: GET /api/cron/gmail-watch
 */
export async function GET(request: Request) {
    // Verify cron secret if configured
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
        const authHeader = request.headers.get("authorization")
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
    }

    try {
        // Get all integrations with watches expiring within 24 hours
        const expiring = await getExpiringWatches(24 * 60 * 60 * 1000)

        let renewed = 0
        let failed = 0

        for (const integration of expiring) {
            try {
                await setupGmailWatch(integration.workspaceId, integration.userId)
                renewed++
            } catch (err) {
                console.error(
                    `[GMAIL-CRON] Failed to renew watch for user ${integration.userId}:`,
                    err
                )
                failed++
            }
        }

        return NextResponse.json({
            ok: true,
            renewed,
            failed,
            total: expiring.length,
        })
    } catch (error) {
        console.error("[GMAIL-CRON] Error renewing watches:", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
