"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Target, FileCode2, ShieldCheck, AlignLeft } from "lucide-react"
import type { SEOScoreBreakdown } from "./types"

interface SEOChecklistProps {
    breakdown: SEOScoreBreakdown | null
    compact?: boolean
}

const categoryConfig = {
    content: {
        label: "Content",
        icon: Target,
        color: "text-blue-500",
        bgColor: "bg-blue-500",
    },
    technical: {
        label: "Technical",
        icon: FileCode2,
        color: "text-purple-500",
        bgColor: "bg-purple-500",
    },
    eeat: {
        label: "E-E-A-T",
        icon: ShieldCheck,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500",
    },
    formatting: {
        label: "Formatting",
        icon: AlignLeft,
        color: "text-amber-500",
        bgColor: "bg-amber-500",
    },
}

function ScoreRing({ score, max, size = 48 }: { score: number; max: number; size?: number }) {
    const percentage = max > 0 ? (score / max) * 100 : 0
    const radius = (size - 6) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percentage / 100) * circumference

    const color =
        percentage >= 80 ? "stroke-emerald-500" : percentage >= 50 ? "stroke-amber-500" : "stroke-rose-500"

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={3}
                    fill="none"
                    className="text-muted/30"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={3}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={color}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold">{score}</span>
            </div>
        </div>
    )
}

export default function SEOChecklist({ breakdown, compact = false }: SEOChecklistProps) {
    if (!breakdown) {
        return (
            <Card className="border-border/50 bg-card/50">
                <CardContent className="py-8 text-center text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Save your article to see SEO analysis</p>
                </CardContent>
            </Card>
        )
    }

    const totalMax = breakdown.content.max + breakdown.technical.max + breakdown.eeat.max + breakdown.formatting.max
    const scoreColor =
        breakdown.total >= 80 ? "text-emerald-500" : breakdown.total >= 50 ? "text-amber-500" : "text-rose-500"

    return (
        <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">SEO Score</CardTitle>
                    <div className="flex items-center gap-2">
                        <span className={`text-2xl font-black ${scoreColor}`}>{breakdown.total}</span>
                        <span className="text-xs text-muted-foreground">/ {totalMax}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {(["content", "technical", "eeat", "formatting"] as const).map((cat) => {
                    const config = categoryConfig[cat]
                    const data = breakdown[cat]
                    const Icon = config.icon

                    return (
                        <div key={cat} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                    <span className="text-xs font-semibold">{config.label}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <ScoreRing score={data.score} max={data.max} size={32} />
                                    <span className="text-[10px] text-muted-foreground">/ {data.max}</span>
                                </div>
                            </div>

                            {!compact && (
                                <div className="space-y-1 pl-5">
                                    {data.checks.map((check) => (
                                        <div
                                            key={check.id}
                                            className="flex items-center gap-2 py-0.5"
                                        >
                                            {check.passed ? (
                                                <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                                            ) : (
                                                <XCircle className="h-3 w-3 text-rose-500 flex-shrink-0" />
                                            )}
                                            <span className={`text-[11px] ${check.passed ? "text-muted-foreground" : "text-foreground"}`}>
                                                {check.label}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={`text-[8px] h-3.5 px-1 ml-auto ${check.passed ? "border-emerald-500/30 text-emerald-500" : "border-rose-500/30 text-rose-500"}`}
                                            >
                                                {check.passed ? `+${check.weight}` : `0/${check.weight}`}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}
