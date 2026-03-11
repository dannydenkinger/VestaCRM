"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Megaphone, Bug, Sparkles, Wrench } from "lucide-react"

interface ChangelogEntry {
    version: string
    date: string
    type: "feature" | "fix" | "improvement" | "maintenance"
    title: string
    description: string
}

const changelog: ChangelogEntry[] = [
    {
        version: "2.5.0",
        date: "2026-03-11",
        type: "feature",
        title: "Sprint 5 QoL Improvements",
        description: "Blog post scheduling, calculator result history, expense tracking, goal tracking on dashboard, inline contact editing, subtask support, and more.",
    },
    {
        version: "2.4.0",
        date: "2026-03-08",
        type: "feature",
        title: "Sprint 4 Enhancements",
        description: "Quick-publish blog status cycling, tools favorites & recents, quick notes from contact list, mini calendar sidebar, and dashboard sparklines.",
    },
    {
        version: "2.3.0",
        date: "2026-03-05",
        type: "feature",
        title: "Sprint 3 Features",
        description: "Real-time push notifications, document preview, pipeline card aging indicators, bulk task operations, and accessibility improvements.",
    },
    {
        version: "2.2.0",
        date: "2026-03-01",
        type: "improvement",
        title: "Sprint 2 Polish",
        description: "Pipeline refactoring (1878→846 lines), contact detail extraction, unit test coverage, custom error pages, and search page.",
    },
    {
        version: "2.1.0",
        date: "2026-02-25",
        type: "feature",
        title: "Sprint 1 Foundation",
        description: "Command palette, notification center, breadcrumbs, settings search, scheduled reports, workflow builder, and auto-assignment rules.",
    },
    {
        version: "2.0.0",
        date: "2026-02-15",
        type: "feature",
        title: "Major Platform Release",
        description: "Blog CMS with AI generation, WordPress publishing, SEO scoring, content clusters, email sequences, and push notifications.",
    },
    {
        version: "1.5.0",
        date: "2026-02-01",
        type: "improvement",
        title: "Mobile UX Rework",
        description: "Professional-grade responsive design across all pages, touch-optimized interactions, and performance improvements.",
    },
    {
        version: "1.0.0",
        date: "2026-01-15",
        type: "feature",
        title: "Initial Launch",
        description: "Core CRM with pipeline management, contacts, calendar, communications, finance tracking, and military calculators.",
    },
]

const typeConfig = {
    feature: { icon: Sparkles, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "Feature" },
    fix: { icon: Bug, color: "bg-rose-500/10 text-rose-600 border-rose-500/20", label: "Fix" },
    improvement: { icon: Wrench, color: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "Improvement" },
    maintenance: { icon: Megaphone, color: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Maintenance" },
}

export function Changelog() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4" />
                    Changelog
                </CardTitle>
                <CardDescription>Recent updates and improvements to AFCrashpad CRM.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative space-y-0">
                    {changelog.map((entry, idx) => {
                        const config = typeConfig[entry.type]
                        const Icon = config.icon
                        return (
                            <div key={entry.version} className="relative pl-8 pb-8 last:pb-0">
                                {idx < changelog.length - 1 && (
                                    <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                                )}
                                <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-muted flex items-center justify-center border">
                                    <Icon className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-sm">v{entry.version}</span>
                                        <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                                            {config.label}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                            {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </span>
                                    </div>
                                    <p className="font-semibold text-sm">{entry.title}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{entry.description}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
