"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, TrendingDown, Clock, DollarSign, Target, ArrowRight } from "lucide-react"
import { getPipelineConversionMetrics } from "./actions"

interface ConversionMetricsProps {
    pipelineId: string
}

function formatCurrency(value: number) {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
}

export function ConversionMetrics({ pipelineId }: ConversionMetricsProps) {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getPipelineConversionMetrics(pipelineId).then(result => {
            if (result.success) setData(result.data)
            setLoading(false)
        })
    }, [pipelineId])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!data || data.totalDeals === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Target className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>No deals in this pipeline yet.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-none bg-muted/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1">
                            <TrendingUp className="h-3 w-3" />
                            Win Rate
                        </div>
                        <div className="text-xl font-bold text-emerald-500">{data.winRate}%</div>
                    </CardContent>
                </Card>
                <Card className="border-none bg-muted/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1">
                            <TrendingDown className="h-3 w-3" />
                            Loss Rate
                        </div>
                        <div className="text-xl font-bold text-rose-500">{data.lossRate}%</div>
                    </CardContent>
                </Card>
                <Card className="border-none bg-muted/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1">
                            <Clock className="h-3 w-3" />
                            Avg Cycle
                        </div>
                        <div className="text-xl font-bold">
                            {data.avgDealCycleDays != null ? `${data.avgDealCycleDays}d` : "—"}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none bg-muted/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1">
                            <DollarSign className="h-3 w-3" />
                            Won Value
                        </div>
                        <div className="text-xl font-bold text-emerald-500">{formatCurrency(data.totalWonValue)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Conversion Funnel */}
            <div>
                <h4 className="text-sm font-semibold mb-3">Conversion Funnel</h4>
                <div className="space-y-2">
                    {data.stages.map((stage: any, idx: number) => {
                        const maxCount = Math.max(...data.stages.map((s: any) => s.count))
                        const widthPct = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 8) : 8

                        return (
                            <div key={stage.stageId}>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium">{stage.stageName}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {stage.count} deal{stage.count !== 1 ? "s" : ""} · {formatCurrency(stage.value)}
                                                </span>
                                                {stage.avgTimeInStage != null && (
                                                    <Badge variant="outline" className="text-[9px] h-4">
                                                        ~{stage.avgTimeInStage}d avg
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="h-6 bg-muted/30 rounded overflow-hidden">
                                            <div
                                                className="h-full bg-primary/60 rounded flex items-center justify-end pr-2 transition-all duration-700"
                                                style={{ width: `${widthPct}%` }}
                                            >
                                                <span className="text-[10px] font-bold text-primary-foreground">{stage.count}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {stage.conversionToNext != null && idx < data.stages.length - 1 && (
                                    <div className="flex items-center gap-1 pl-4 py-1">
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                        <span className={`text-[10px] font-semibold ${stage.conversionToNext >= 50 ? "text-emerald-500" : stage.conversionToNext >= 25 ? "text-amber-500" : "text-rose-500"}`}>
                                            {stage.conversionToNext}% conversion
                                        </span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Won vs Lost */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/20">
                <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Won</div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${data.winRate}%`, minWidth: "4px" }} />
                        <span className="text-xs font-bold text-emerald-500">{formatCurrency(data.totalWonValue)}</span>
                    </div>
                </div>
                <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Lost</div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 bg-rose-500 rounded-full" style={{ width: `${data.lossRate}%`, minWidth: "4px" }} />
                        <span className="text-xs font-bold text-rose-500">{formatCurrency(data.totalLostValue)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
