import Link from "next/link"
import { requireAuth } from "@/lib/auth-guard"
import { getMarketingStats } from "@/lib/reporting/marketing"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ArrowLeft,
    BarChart3,
    Calendar,
    Mail,
    MousePointer2,
    Target,
    Users,
    Workflow,
} from "lucide-react"
import { ContactGrowthChart } from "./ContactGrowthChart"

export const dynamic = "force-dynamic"

export default async function MarketingReportingPage() {
    const session = await requireAuth()
    const workspaceId = (session.user as { workspaceId: string }).workspaceId
    const stats = await getMarketingStats(workspaceId)

    const openRate30 =
        stats.totals.emailsSent30d > 0
            ? Math.round(
                  (stats.totals.emailsOpened30d / stats.totals.emailsSent30d) * 1000,
              ) / 10
            : 0
    const clickRate30 =
        stats.totals.emailsSent30d > 0
            ? Math.round(
                  (stats.totals.emailsClicked30d / stats.totals.emailsSent30d) * 1000,
              ) / 10
            : 0
    const goalConv =
        stats.totals.automationRuns30d > 0
            ? Math.round(
                  (stats.totals.automationGoals30d / stats.totals.automationRuns30d) *
                      1000,
              ) / 10
            : 0

    return (
        <div className="container mx-auto max-w-6xl py-10 px-4 space-y-8">
            <div>
                <div className="text-xs text-muted-foreground mb-1">
                    <Link href="/reporting" className="hover:underline inline-flex items-center gap-1">
                        <ArrowLeft className="w-3 h-3" />
                        Reporting
                    </Link>
                </div>
                <h1 className="text-2xl font-semibold">Marketing analytics</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Audience growth, campaign performance, and automation conversion at
                    a glance. Last 30 days unless noted.
                </p>
            </div>

            {/* Top stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                    icon={Users}
                    label="Total contacts"
                    value={stats.totals.contacts}
                    sublabel={`+${stats.totals.contactsThisMonth} this month`}
                />
                <StatCard
                    icon={Mail}
                    label="Emails sent (30d)"
                    value={stats.totals.emailsSent30d}
                    sublabel={`${stats.totals.campaignsSent} campaigns total`}
                />
                <StatCard
                    icon={MousePointer2}
                    label="Open rate (30d)"
                    value={`${openRate30}%`}
                    sublabel={`${clickRate30}% click rate`}
                />
                <StatCard
                    icon={Target}
                    label="Automation goals (30d)"
                    value={stats.totals.automationGoals30d}
                    sublabel={`${goalConv}% conversion`}
                />
                <StatCard
                    icon={Workflow}
                    label="Active automations"
                    value={stats.totals.automationsActive}
                    sublabel={`${stats.totals.automationRuns30d} runs in 30d`}
                />
                <StatCard
                    icon={Calendar}
                    label="Upcoming bookings"
                    value={stats.totals.appointmentsUpcoming}
                    sublabel={`${stats.totals.appointments30d} in 30d`}
                />
                <StatCard
                    icon={Mail}
                    label="Bounces (30d)"
                    value={stats.totals.emailsBounced30d}
                    sublabel="Auto-suppressed"
                    tone={stats.totals.emailsBounced30d > 0 ? "danger" : undefined}
                />
                <StatCard
                    icon={Users}
                    label="New contacts (7d)"
                    value={stats.totals.contactsLast7d}
                    sublabel="Last 7 days"
                />
            </div>

            {/* Contact growth chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        Contact growth (last 90 days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ContactGrowthChart data={stats.contactGrowth} />
                </CardContent>
            </Card>

            {/* Campaign performance table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        Recent campaigns
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.campaignPerf.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No campaign sends in the last 30 days.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                        <th className="text-left py-2 font-semibold">Campaign</th>
                                        <th className="text-right py-2 font-semibold">Sent</th>
                                        <th className="text-right py-2 font-semibold">Opens</th>
                                        <th className="text-right py-2 font-semibold">Open %</th>
                                        <th className="text-right py-2 font-semibold">Clicks</th>
                                        <th className="text-right py-2 font-semibold">Click %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {stats.campaignPerf.slice(0, 10).map((c) => (
                                        <tr key={c.id}>
                                            <td className="py-2 truncate max-w-[200px]">
                                                <Link
                                                    href={`/email-marketing/campaigns/${c.id}`}
                                                    className="hover:underline"
                                                >
                                                    {c.name}
                                                </Link>
                                            </td>
                                            <td className="text-right tabular-nums">{c.sent}</td>
                                            <td className="text-right tabular-nums">{c.opens}</td>
                                            <td className="text-right tabular-nums text-emerald-600">
                                                {c.openRate}%
                                            </td>
                                            <td className="text-right tabular-nums">{c.clicks}</td>
                                            <td className="text-right tabular-nums text-emerald-700">
                                                {c.clickRate}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Automation conversion */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Workflow className="w-4 h-4 text-primary" />
                        Top automations (by enrollments, last 30d)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.automationPerf.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No automation runs in the last 30 days.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                        <th className="text-left py-2 font-semibold">Automation</th>
                                        <th className="text-right py-2 font-semibold">Runs</th>
                                        <th className="text-right py-2 font-semibold">Completed</th>
                                        <th className="text-right py-2 font-semibold">Goals 🎯</th>
                                        <th className="text-right py-2 font-semibold">Conv %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {stats.automationPerf.map((a) => (
                                        <tr key={a.id}>
                                            <td className="py-2 truncate max-w-[240px]">
                                                <Link
                                                    href={`/automations/${a.id}`}
                                                    className="hover:underline"
                                                >
                                                    {a.name}
                                                </Link>
                                            </td>
                                            <td className="text-right tabular-nums">{a.runs}</td>
                                            <td className="text-right tabular-nums text-emerald-600">
                                                {a.completed}
                                            </td>
                                            <td className="text-right tabular-nums text-primary">
                                                {a.goalsReached}
                                            </td>
                                            <td className="text-right tabular-nums">
                                                {a.conversionRate}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function StatCard({
    icon: Icon,
    label,
    value,
    sublabel,
    tone,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: number | string
    sublabel?: string
    tone?: "danger"
}) {
    const valueColor = tone === "danger" ? "text-red-600" : ""
    return (
        <Card>
            <CardContent className="py-4 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                </div>
                <div className={`text-2xl font-semibold tabular-nums ${valueColor}`}>
                    {typeof value === "number" ? value.toLocaleString() : value}
                </div>
                {sublabel && (
                    <div className="text-[11px] text-muted-foreground">{sublabel}</div>
                )}
            </CardContent>
        </Card>
    )
}
