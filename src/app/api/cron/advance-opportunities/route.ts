import { NextResponse } from "next/server";
import { autoAdvanceOpportunities } from "@/app/pipeline/actions";
import { checkStayReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    // Optional: verify cron secret for security
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [advanceResult, remindersResult] = await Promise.all([
        autoAdvanceOpportunities(),
        checkStayReminders(),
    ]);

    return NextResponse.json({
        ...advanceResult,
        reminders: remindersResult,
    });
}
