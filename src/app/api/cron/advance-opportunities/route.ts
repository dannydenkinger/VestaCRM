import { NextResponse } from "next/server";
import { autoAdvanceOpportunities } from "@/app/pipeline/actions";
import { checkStayReminders } from "@/lib/reminders";
import { checkStaleOpportunities } from "@/lib/stale-opportunities";
import { processScheduledEmails } from "@/lib/email-sequences";

export const dynamic = "force-dynamic";

// Daily cron: auto-advance opportunities, send reminders, check stale deals, send scheduled emails
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [advanceResult, remindersResult, staleResult, emailsResult] = await Promise.all([
        autoAdvanceOpportunities(),
        checkStayReminders(),
        checkStaleOpportunities(),
        processScheduledEmails(),
    ]);

    return NextResponse.json({
        ...advanceResult,
        reminders: remindersResult,
        stale: staleResult,
        scheduledEmails: emailsResult,
    });
}
