"use client"

import { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { CommissionTracker } from "@/app/dashboard/commissions/CommissionTracker"
import { ReferralTracker } from "@/app/dashboard/referrals/ReferralTracker"
import { RevenueTracker } from "./RevenueTracker"
import { ExpenseTracker } from "./ExpenseTracker"

export default function FinancePage() {
    const [dateRange, setDateRange] = useState<"all" | "month" | "quarter" | "year">("all")
    const [activeTab, setActiveTab] = useState("commissions")

    const handleExportCSV = () => {
        // Find the visible table and export its data
        const tabContent = document.querySelector(`[data-state="active"][role="tabpanel"]`)
        if (!tabContent) return
        const table = tabContent.querySelector("table")
        if (!table) return

        const rows: string[][] = []
        table.querySelectorAll("tr").forEach(tr => {
            const cells: string[] = []
            tr.querySelectorAll("th, td").forEach(cell => {
                // Skip checkbox columns
                if (cell.querySelector('button[role="checkbox"]') || cell.querySelector('[data-state]')) return
                cells.push((cell as HTMLElement).innerText.replace(/,/g, "").trim())
            })
            if (cells.length > 0) rows.push(cells)
        })

        if (rows.length === 0) return
        const csv = rows.map(r => r.join(",")).join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `finance-${activeTab}-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const dateFilter = useMemo(() => {
        const now = new Date()
        if (dateRange === "month") {
            return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: now.toISOString() }
        }
        if (dateRange === "quarter") {
            const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
            return { start: qStart.toISOString(), end: now.toISOString() }
        }
        if (dateRange === "year") {
            return { start: new Date(now.getFullYear(), 0, 1).toISOString(), end: now.toISOString() }
        }
        return null
    }, [dateRange])

    return (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 pb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                            Finance
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground mt-0.5">Track commissions, referral payouts, revenue, and agent earnings.</p>
                    </div>
                    <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold" onClick={handleExportCSV}>
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Export CSV</span>
                    </Button>
                    <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-md border border-white/5">
                        {([
                            { value: "all", label: "All Time" },
                            { value: "month", label: "This Month" },
                            { value: "quarter", label: "This Quarter" },
                            { value: "year", label: "This Year" },
                        ] as const).map(f => (
                            <button
                                key={f.value}
                                onClick={() => setDateRange(f.value)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${
                                    dateRange === f.value
                                        ? 'bg-background shadow-sm text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-muted/30 border border-white/5 flex-wrap h-auto gap-0.5 p-1">
                        <TabsTrigger value="commissions" className="text-xs font-semibold">Commissions</TabsTrigger>
                        <TabsTrigger value="referrals" className="text-xs font-semibold">Referrals</TabsTrigger>
                        <TabsTrigger value="revenue" className="text-xs font-semibold">Revenue</TabsTrigger>
                        <TabsTrigger value="expenses" className="text-xs font-semibold">Expenses</TabsTrigger>
                    </TabsList>

                    <TabsContent value="commissions" className="m-0">
                        <CommissionTracker dateFilter={dateFilter} />
                    </TabsContent>

                    <TabsContent value="referrals" className="m-0">
                        <ReferralTracker dateFilter={dateFilter} />
                    </TabsContent>

                    <TabsContent value="revenue" className="m-0">
                        <RevenueTracker dateFilter={dateFilter} />
                    </TabsContent>

                    <TabsContent value="expenses" className="m-0">
                        <ExpenseTracker dateFilter={dateFilter} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
