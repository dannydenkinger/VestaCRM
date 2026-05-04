/**
 * Daily cron: fires birthday + anniversary automation triggers for any
 * contact whose stored date matches today's MM-DD (UTC).
 *
 * Runs once per day. Idempotency is via the per-contact single-enrollment
 * guard inside fireTrigger — if the cron fires twice on the same day, the
 * automation only enrolls each contact once (unless allowReEnroll is on).
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { fireTrigger } from "@/lib/automations/triggers"

export const dynamic = "force-dynamic"
export const maxDuration = 300

interface ContactDateMatch {
    workspaceId: string
    contactId: string
    email?: string
    type: "birthday" | "anniversary"
    date: string
}

const PER_TICK_CAP = 5000

export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV !== "development") {
        const authHeader = req.headers.get("authorization") ?? ""
        const expected = process.env.CRON_SECRET
        if (!expected) {
            return NextResponse.json(
                { error: "CRON_SECRET not configured" },
                { status: 500 },
            )
        }
        if (authHeader !== `Bearer ${expected}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
    }

    // Today's MM-DD in UTC. Workspace timezone support is a future improvement.
    const today = new Date()
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0")
    const dd = String(today.getUTCDate()).padStart(2, "0")
    const todayMmDd = `${mm}-${dd}`

    // Scan contacts in batches. We do a wide scan rather than indexing on
    // MM-DD (which Firestore can't compound-query without storing a derived
    // field). Capped at PER_TICK_CAP to avoid runaway scans.
    const matches: ContactDateMatch[] = []
    const snap = await adminDb.collection("contacts").limit(PER_TICK_CAP).get()
    for (const d of snap.docs) {
        const data = d.data()
        const workspaceId = data.workspaceId as string | undefined
        if (!workspaceId) continue

        for (const field of ["birthday", "anniversary"] as const) {
            const raw = (data[field] as string | undefined) ?? ""
            if (!raw) continue
            // Accept ISO date (YYYY-MM-DD) or MM-DD or full date strings
            const mmddMatch =
                /^\d{4}-(\d{2})-(\d{2})/.exec(raw) ??
                /^(\d{2})-(\d{2})$/.exec(raw)
            if (!mmddMatch) continue
            const got = `${mmddMatch[1]}-${mmddMatch[2]}`
            if (got !== todayMmDd) continue
            matches.push({
                workspaceId,
                contactId: d.id,
                email: (data.email as string) || undefined,
                type: field,
                date: raw,
            })
        }
    }

    let fired = 0
    for (const m of matches) {
        await fireTrigger({
            workspaceId: m.workspaceId,
            type: m.type,
            contactId: m.contactId,
            contactEmail: m.email,
            payload: { date: m.date },
        }).catch(() => {})
        fired += 1
    }

    return NextResponse.json({
        ok: true,
        date: todayMmDd,
        scanned: snap.size,
        matches: matches.length,
        fired,
    })
}
