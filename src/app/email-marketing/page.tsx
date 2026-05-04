import Link from "next/link"
import { requireAuth } from "@/lib/auth-guard"
import { listCampaigns } from "@/lib/campaigns/campaigns"
import { listTemplates } from "@/lib/campaigns/templates"
import { getBalance } from "@/lib/credits/email-credits"
import { getIdentity } from "@/lib/ses/identities"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Plus, FileText, Send, AlertCircle, Users, ShieldOff } from "lucide-react"

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

export default async function EmailMarketingPage() {
    const session = await requireAuth()
    const workspaceId = (session.user as { workspaceId: string }).workspaceId

    const [campaigns, templates, balance, identity] = await Promise.all([
        listCampaigns(workspaceId),
        listTemplates(workspaceId),
        getBalance(workspaceId),
        getIdentity(workspaceId),
    ])

    const sesReady = identity?.status === "VERIFIED"

    return (
        <div className="container mx-auto max-w-6xl py-10 px-4 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Email Marketing</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Build templates, target contacts, send campaigns via Amazon SES.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm">
                        {balance.toLocaleString()} credits
                    </Badge>
                    <Link href="/email-marketing/lists">
                        <Button variant="outline">
                            <Users className="w-4 h-4 mr-2" />
                            Lists
                        </Button>
                    </Link>
                    <Link href="/email-marketing/suppressions">
                        <Button variant="outline">
                            <ShieldOff className="w-4 h-4 mr-2" />
                            Suppressions
                        </Button>
                    </Link>
                    <Link href="/email-marketing/templates/new">
                        <Button variant="outline">
                            <FileText className="w-4 h-4 mr-2" />
                            New template
                        </Button>
                    </Link>
                    <Link href="/email-marketing/campaigns/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            New campaign
                        </Button>
                    </Link>
                </div>
            </div>

            {!sesReady && (
                <Card className="border-amber-500/40 bg-amber-500/5">
                    <CardContent className="pt-6 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <div className="font-medium">SES is not set up</div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Verify a sending domain before sending campaigns.
                            </p>
                        </div>
                        <Link href="/settings/integrations/ses">
                            <Button variant="outline" size="sm">Configure</Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-medium">Campaigns</h2>
                    <span className="text-xs text-muted-foreground">{campaigns.length} total</span>
                </div>
                {campaigns.length === 0 ? (
                    <Card>
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            <Mail className="w-8 h-8 mx-auto mb-3 opacity-50" />
                            No campaigns yet. Create one to get started.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {campaigns.map((c) => (
                            <Link key={c.id} href={`/email-marketing/campaigns/${c.id}`}>
                                <Card className="hover:bg-muted/40 transition-colors cursor-pointer">
                                    <CardContent className="py-4 flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium truncate">{c.name}</span>
                                                {statusBadge(c.status)}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 truncate">
                                                {c.subject}
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground tabular-nums text-right shrink-0 ml-4">
                                            {c.status === "sent" || c.status === "sent_with_errors" ? (
                                                <>
                                                    <div>{c.stats.sent}/{c.stats.targeted} sent</div>
                                                    {c.stats.failed > 0 && (
                                                        <div className="text-red-600">{c.stats.failed} failed</div>
                                                    )}
                                                </>
                                            ) : c.status === "scheduled" && c.scheduledAt ? (
                                                <>
                                                    <div className="text-blue-600">Fires at</div>
                                                    <div>{new Date(c.scheduledAt).toLocaleString()}</div>
                                                </>
                                            ) : (
                                                <div>{new Date(c.createdAt).toLocaleDateString()}</div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <section>
                <div className="flex items-center justify-between mb-3">
                    <Link
                        href="/email-marketing/templates"
                        className="text-lg font-medium hover:underline"
                    >
                        Templates →
                    </Link>
                    <span className="text-xs text-muted-foreground">{templates.length} total</span>
                </div>
                {templates.length === 0 ? (
                    <Card>
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            <FileText className="w-8 h-8 mx-auto mb-3 opacity-50" />
                            No templates yet. Build one with the drag-and-drop editor.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {templates.map((t) => (
                            <Link key={t.id} href={`/email-marketing/templates/${t.id}`}>
                                <Card className="hover:bg-muted/40 transition-colors cursor-pointer h-full">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm truncate">{t.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs text-muted-foreground">
                                        <div className="truncate">{t.subject || "(no subject)"}</div>
                                        <div className="mt-2 text-[11px]">
                                            Updated {new Date(t.updatedAt).toLocaleDateString()}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {campaigns.length > 0 && sesReady && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Send className="w-3 h-3" />
                    Campaigns deduct 1 credit per recipient. Logs appear in <code>email_logs</code> and on each contact&apos;s timeline.
                </p>
            )}
        </div>
    )
}
