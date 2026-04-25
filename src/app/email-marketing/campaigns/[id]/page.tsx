import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { getCampaign } from "@/lib/campaigns/campaigns"
import { getBalance } from "@/lib/credits/email-credits"
import { getIdentity } from "@/lib/ses/identities"
import { adminDb } from "@/lib/firebase-admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CampaignActions } from "./CampaignActions"

export const dynamic = "force-dynamic"

function statusBadge(status: string) {
    const map: Record<string, { label: string; className: string }> = {
        draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
        scheduled: { label: "Scheduled", className: "bg-blue-500/10 text-blue-600" },
        sending: { label: "Sending…", className: "bg-amber-500/10 text-amber-600" },
        sent: { label: "Sent", className: "bg-emerald-500/10 text-emerald-600" },
        sent_with_errors: {
            label: "Sent (with errors)",
            className: "bg-yellow-500/10 text-yellow-700",
        },
        failed: { label: "Failed", className: "bg-red-500/10 text-red-600" },
        canceled: { label: "Canceled", className: "bg-muted text-muted-foreground" },
    }
    const v = map[status] ?? { label: status, className: "bg-muted" }
    return <Badge className={v.className}>{v.label}</Badge>
}

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function CampaignDetailPage({ params }: PageProps) {
    const { id } = await params
    const session = await requireAuth()
    const workspaceId = (session.user as { workspaceId: string }).workspaceId

    const campaign = await getCampaign(workspaceId, id)
    if (!campaign) notFound()

    const [balance, identity] = await Promise.all([
        getBalance(workspaceId),
        getIdentity(workspaceId),
    ])
    const sesReady = identity?.status === "VERIFIED"

    // Resolve list names + exclude-list names for the Audience card.
    const listIds = new Set<string>()
    if (campaign.audienceType === "by_list") {
        for (const id of campaign.audienceValue ?? []) listIds.add(id)
    }
    for (const id of campaign.excludeListIds ?? []) listIds.add(id)
    let listNamesById: Record<string, string> = {}
    if (listIds.size > 0) {
        const ids = [...listIds]
        const chunks: string[][] = []
        for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30))
        const snaps = await Promise.all(
            chunks.map((chunk) =>
                adminDb
                    .collection("contact_lists")
                    .where("workspaceId", "==", workspaceId)
                    .where("__name__", "in", chunk)
                    .get(),
            ),
        )
        listNamesById = Object.fromEntries(
            snaps
                .flatMap((s) => s.docs)
                .map((d) => [d.id, (d.data().name as string) ?? d.id]),
        )
    }
    const includeListNames = (campaign.audienceValue ?? []).map(
        (id) => listNamesById[id] ?? id,
    )
    const excludeListNames = (campaign.excludeListIds ?? []).map(
        (id) => listNamesById[id] ?? id,
    )

    // Fetch recent email logs for this campaign
    const logsSnap = await adminDb
        .collection("email_logs")
        .where("workspaceId", "==", workspaceId)
        .where("campaignId", "==", id)
        .orderBy("sentAt", "desc")
        .limit(50)
        .get()

    const logs = logsSnap.docs.map((d) => {
        const data = d.data()
        return {
            id: d.id,
            to: data.to as string,
            status: data.status as string,
            messageId: (data.messageId as string) ?? null,
            errorMessage: (data.errorMessage as string) ?? null,
            sentAt: data.sentAt?.toDate?.()?.toISOString?.() ?? null,
            openedAt: data.openedAt?.toDate?.()?.toISOString?.() ?? null,
            clickedAt: data.clickedAt?.toDate?.()?.toISOString?.() ?? null,
            bouncedAt: data.bouncedAt?.toDate?.()?.toISOString?.() ?? null,
        }
    })

    // Aggregate engagement: open / click / bounce / delivered counts. Only
    // counts logs from this batch (max 50 most recent). For very large
    // campaigns the campaign.stats.* counters are the source of truth, but
    // open/click happens after stats are written, so we recompute here.
    const opened = logs.filter((l) => !!l.openedAt).length
    const clicked = logs.filter((l) => !!l.clickedAt).length
    const bounced = logs.filter((l) => !!l.bouncedAt || l.status === "bounced").length

    const sent = campaign.stats.sent || 0
    const pct = (n: number) => (sent > 0 ? Math.round((n / sent) * 100) : 0)

    return (
        <div className="container mx-auto max-w-5xl py-10 px-4 space-y-6">
            <div className="flex items-center justify-between">
                <div className="min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">
                        <Link href="/email-marketing" className="hover:underline">
                            ← Email Marketing
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-semibold truncate">{campaign.name}</h1>
                        {statusBadge(campaign.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                        {campaign.subject}
                    </p>
                </div>
                <CampaignActions
                    campaignId={campaign.id}
                    status={campaign.status}
                    canSend={sesReady}
                    canEdit={campaign.status === "draft"}
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Targeted" value={campaign.stats.targeted} />
                <StatCard label="Sent" value={campaign.stats.sent} tone="success" />
                <StatCard label="Failed" value={campaign.stats.failed} tone="danger" />
                <StatCard label="Credits left" value={balance} />
            </div>

            {sent > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <RateCard
                        label="Opens"
                        value={opened}
                        rate={pct(opened)}
                        tone="success"
                    />
                    <RateCard
                        label="Clicks"
                        value={clicked}
                        rate={pct(clicked)}
                        tone="success"
                    />
                    <RateCard
                        label="Bounces"
                        value={bounced}
                        rate={pct(bounced)}
                        tone="danger"
                    />
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Audience</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                    {campaign.audienceType === "all_contacts" && (
                        <div>All contacts with an email address</div>
                    )}
                    {campaign.audienceType === "by_tag" && (
                        <div>
                            Contacts tagged{" "}
                            <span className="font-medium">
                                {(campaign.audienceValue ?? []).join(", ") || "(none)"}
                            </span>
                        </div>
                    )}
                    {campaign.audienceType === "by_list" && (
                        <div>
                            Contacts in{" "}
                            <span className="font-medium">
                                {includeListNames.join(", ") || "(no lists selected)"}
                            </span>
                        </div>
                    )}
                    {campaign.audienceType === "by_ids" && (
                        <div>
                            {(campaign.audienceValue ?? []).length} specific contacts
                        </div>
                    )}
                    {excludeListNames.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                            Excluding contacts in{" "}
                            <span className="font-medium">{excludeListNames.join(", ")}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md overflow-hidden bg-white">
                        <iframe
                            title="Campaign preview"
                            srcDoc={campaign.renderedHtml}
                            className="w-full h-[400px]"
                            sandbox=""
                        />
                    </div>
                </CardContent>
            </Card>

            {logs.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Delivery log ({logs.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className="py-2 flex items-center justify-between text-sm"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span
                                        className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                                            log.status === "bounced"
                                                ? "bg-red-500"
                                                : log.status === "failed"
                                                  ? "bg-red-500"
                                                  : log.status === "complained"
                                                    ? "bg-orange-500"
                                                    : log.clickedAt
                                                      ? "bg-emerald-600"
                                                      : log.openedAt
                                                        ? "bg-emerald-400"
                                                        : "bg-muted-foreground"
                                        }`}
                                    />
                                    <span className="truncate">{log.to}</span>
                                    {log.openedAt && (
                                        <span className="text-[10px] uppercase text-emerald-600 font-medium tracking-wider shrink-0">
                                            opened
                                        </span>
                                    )}
                                    {log.clickedAt && (
                                        <span className="text-[10px] uppercase text-emerald-700 font-medium tracking-wider shrink-0">
                                            clicked
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground tabular-nums ml-4 shrink-0">
                                    {log.sentAt ? new Date(log.sentAt).toLocaleString() : "—"}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function StatCard({
    label,
    value,
    tone,
}: {
    label: string
    value: number
    tone?: "success" | "danger"
}) {
    const color =
        tone === "success"
            ? "text-emerald-600"
            : tone === "danger"
              ? "text-red-600"
              : ""
    return (
        <Card>
            <CardContent className="py-4">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className={`text-2xl font-semibold tabular-nums ${color}`}>
                    {value.toLocaleString()}
                </div>
            </CardContent>
        </Card>
    )
}

function RateCard({
    label,
    value,
    rate,
    tone,
}: {
    label: string
    value: number
    rate: number
    tone?: "success" | "danger"
}) {
    const color =
        tone === "success"
            ? "text-emerald-600"
            : tone === "danger"
              ? "text-red-600"
              : ""
    return (
        <Card>
            <CardContent className="py-4">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="flex items-baseline gap-2 mt-0.5">
                    <span className={`text-2xl font-semibold tabular-nums ${color}`}>
                        {rate}%
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {value.toLocaleString()}
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}

