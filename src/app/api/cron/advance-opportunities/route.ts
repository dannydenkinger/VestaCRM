import { NextResponse } from "next/server";
import { autoAdvanceOpportunities } from "@/app/pipeline/actions";
import { checkStayReminders } from "@/lib/reminders";
import { checkStaleOpportunities } from "@/lib/stale-opportunities";
import { processScheduledEmails } from "@/lib/email-sequences";
import { processScheduledMessages } from "@/app/communications/actions";
import { processFollowUpReminders } from "@/lib/follow-up-reminders";
import { processScheduledReports } from "@/lib/scheduled-reports";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

async function getActiveWorkspaceIds(): Promise<string[]> {
    const snap = await adminDb.collection("workspaces").where("status", "==", "active").get();
    return snap.docs.map(d => d.id);
}

// Daily cron: auto-advance opportunities, send reminders, check stale deals, send scheduled emails & messages, follow-up reminders, scheduled reports
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceIds = await getActiveWorkspaceIds();
    const allResults: Record<string, any> = {};

    for (const workspaceId of workspaceIds) {
        const [advanceResult, remindersResult, staleResult, emailsResult, scheduledMsgsResult, followUpResult, reportsResult] = await Promise.all([
            autoAdvanceOpportunities(),
            checkStayReminders(workspaceId),
            checkStaleOpportunities(workspaceId),
            processScheduledEmails(workspaceId),
            processScheduledMessages(),
            processFollowUpReminders(workspaceId).catch(err => ({ error: String(err) })),
            processScheduledReports(workspaceId).catch(err => ({ error: String(err) })),
        ]);

        allResults[workspaceId] = {
            ...advanceResult,
            reminders: remindersResult,
            stale: staleResult,
            scheduledEmails: emailsResult,
            scheduledMessages: scheduledMsgsResult,
            followUpReminders: followUpResult,
            scheduledReports: reportsResult,
        };
    }

    return NextResponse.json(allResults);
}
