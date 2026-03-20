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
        version: "1.0.0",
        date: "2026-03-19",
        type: "feature",
        title: "Vesta CRM Launch",
        description: "Full-featured CRM with pipeline management, contacts, calendar integration, communications, document management, and optional marketing and finance modules.",
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
                <CardDescription>Recent updates and improvements to Vesta CRM.</CardDescription>
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
