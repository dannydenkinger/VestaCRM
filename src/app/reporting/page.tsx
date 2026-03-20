import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, MousePointer2 } from "lucide-react"
import { getReportingData } from "./actions"

export const dynamic = "force-dynamic"

export default async function ReportingPage() {
    const res = await getReportingData();
    const stats = (res.success && res.data) ? res.data : {
        totalProfit: 0,
        avgProfit: 0,
        bookedCount: 0,
        conversionRate: 0,
        topKeywords: [],
    };

    return (
        <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 pb-28 md:pb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Reporting & Analytics</h2>
                        <p className="text-sm sm:text-base text-muted-foreground mt-0.5">Track your performance across profit margins, conversion rates, and lead sources.</p>
                    </div>
                </div>

                <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-emerald-50/10 border-emerald-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Closed Profit</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">${stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Across {stats.bookedCount} signed deals</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Profit / Deal</CardTitle>
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.avgProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Calculated from closed opportunities</p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/10 border-blue-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lead Conversion Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.conversionRate.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">Leads moved to Booked/Signed stage</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 pt-4">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            Deal Performance
                        </CardTitle>
                        <CardDescription>Overview of your closed deal metrics.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1 p-4 rounded-lg border bg-muted/30">
                                    <p className="text-xs text-muted-foreground font-medium">Deals Closed</p>
                                    <p className="text-2xl font-bold">{stats.bookedCount}</p>
                                </div>
                                <div className="space-y-1 p-4 rounded-lg border bg-muted/30">
                                    <p className="text-xs text-muted-foreground font-medium">Conversion Rate</p>
                                    <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                                </div>
                                <div className="space-y-1 p-4 rounded-lg border bg-muted/30">
                                    <p className="text-xs text-muted-foreground font-medium">Total Profit</p>
                                    <p className="text-2xl font-bold text-emerald-600">${stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="space-y-1 p-4 rounded-lg border bg-muted/30">
                                    <p className="text-xs text-muted-foreground font-medium">Avg Profit / Deal</p>
                                    <p className="text-2xl font-bold">${stats.avgProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <MousePointer2 className="h-4 w-4 text-muted-foreground" />
                                    SEO & Referral Keywords
                                </CardTitle>
                                <CardDescription>Top inbound search terms from contacts.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.topKeywords.length > 0 ? (
                                stats.topKeywords.map((item) => (
                                    <div key={item.keyword} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                                        <span className="text-sm font-medium">{item.keyword}</span>
                                        <Badge variant="secondary" className="font-mono">{item.count}</Badge>
                                    </div>
                                ))
                            ) : (
                                <div className="flex h-[200px] sm:h-[300px] items-center justify-center border-2 border-dashed rounded-md bg-muted/10">
                                    <p className="text-sm text-muted-foreground">No keyword data found.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            </div>
        </div>
    )
}

