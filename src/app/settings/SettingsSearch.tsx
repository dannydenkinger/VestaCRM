"use client"

import { useState, useCallback } from "react"
import { Search, X } from "lucide-react"

const SETTINGS_MAP: Record<string, { tab: string; keywords: string[] }> = {
    "profile": { tab: "profile", keywords: ["profile", "name", "email", "avatar", "account", "personal"] },
    "notifications": { tab: "profile", keywords: ["notification", "push", "email alerts", "preferences"] },
    "branding": { tab: "profile", keywords: ["branding", "logo", "color", "company name", "brand"] },
    "workspace": { tab: "workspace", keywords: ["workspace", "bases", "lead sources", "tags", "status", "accommodations", "pipeline", "priority"] },
    "users": { tab: "users", keywords: ["users", "team", "roles", "permissions", "invite", "admin", "owner", "agent"] },
    "integrations": { tab: "integrations", keywords: ["integrations", "google", "calendar", "ical", "sync", "api", "connect"] },
    "automations": { tab: "automations", keywords: ["automations", "email template", "sequence", "scheduled", "workflow", "follow-up", "reminders"] },
    "custom-fields": { tab: "custom-fields", keywords: ["custom fields", "fields", "metadata", "properties"] },
    "api-keys": { tab: "api-keys", keywords: ["api keys", "api", "token", "secret", "key"] },
    "reports": { tab: "reports", keywords: ["reports", "scheduled reports", "export", "analytics"] },
    "workflows": { tab: "workflows", keywords: ["workflows", "automation", "rules", "triggers"] },
    "assignment": { tab: "assignment", keywords: ["assignment", "auto-assign", "round robin", "rules"] },
    "audit": { tab: "audit", keywords: ["audit", "log", "history", "changes", "security"] },
    "data": { tab: "data", keywords: ["data", "export", "csv", "backup"] },
}

export function SettingsSearch() {
    const [query, setQuery] = useState("")

    const handleSearch = useCallback((value: string) => {
        setQuery(value)
        if (!value.trim()) return

        const term = value.toLowerCase()
        for (const [, config] of Object.entries(SETTINGS_MAP)) {
            if (config.keywords.some(k => k.includes(term))) {
                // Find and click the matching tab trigger
                const trigger = document.querySelector(`[role="tab"][value="${config.tab}"]`) as HTMLElement
                if (trigger) {
                    trigger.click()
                    trigger.scrollIntoView({ behavior: "smooth", block: "nearest" })
                }
                return
            }
        }
    }, [])

    const matches = query.trim()
        ? Object.entries(SETTINGS_MAP).filter(([, config]) =>
            config.keywords.some(k => k.includes(query.toLowerCase()))
        )
        : []

    return (
        <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
                type="text"
                placeholder="Search settings..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full sm:w-72 h-9 pl-9 pr-8 text-sm rounded-md border bg-muted/20 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {query && (
                <button
                    onClick={() => setQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
            {query && matches.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full sm:w-72 bg-popover border rounded-md shadow-md py-1 max-h-48 overflow-y-auto">
                    {matches.map(([key, config]) => (
                        <button
                            key={key}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 capitalize"
                            onClick={() => {
                                const trigger = document.querySelector(`[role="tab"][value="${config.tab}"]`) as HTMLElement
                                if (trigger) trigger.click()
                                setQuery("")
                            }}
                        >
                            {key.replace("-", " ")}
                            <span className="text-xs text-muted-foreground ml-2">
                                {config.keywords.slice(0, 3).join(", ")}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
