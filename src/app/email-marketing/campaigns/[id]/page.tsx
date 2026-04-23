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
        }
    })

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

            <Card>
                <CardHeader>
                    <CardTitle>Audience</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                    {campaign.audienceType === "all_contacts" && "All contacts with an email address"}
                    {campaign.audienceType === "by_tag" &&
                        `Contacts tagged: ${(campaign.audienceValue ?? []).join(", ") || "(none)"}`}
                    {campaign.audienceType === "by_ids" &&
                        `${(campaign.audienceValue ?? []).length} specific contacts`}
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
                                            log.status === "sent"
                                                ? "bg-emerald-500"
                                                : log.status === "failed"
                                                  ? "bg-red-500"
                                                  : "bg-muted-foreground"
                                        }`}
                                    />
                                    <span className="truncate">{log.to}</span>
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

