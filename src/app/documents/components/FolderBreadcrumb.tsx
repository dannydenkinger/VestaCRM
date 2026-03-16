"use client"

import { ChevronRight, Folder } from "lucide-react"

interface FolderBreadcrumbProps {
    path: string // "/" or "/Contracts/2024"
    onNavigate: (path: string) => void
}

export function FolderBreadcrumb({ path, onNavigate }: FolderBreadcrumbProps) {
    if (path === "/") return null

    const segments = path.split("/").filter(Boolean)
    const crumbs = segments.map((seg, i) => ({
        label: seg,
        path: "/" + segments.slice(0, i + 1).join("/"),
    }))

    return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground px-1 py-1.5">
            <button
                className="hover:text-foreground transition-colors flex items-center gap-1"
                onClick={() => onNavigate("/")}
            >
                <Folder className="h-3 w-3" />
                All
            </button>
            {crumbs.map((crumb) => (
                <span key={crumb.path} className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    <button
                        className="hover:text-foreground transition-colors"
                        onClick={() => onNavigate(crumb.path)}
                    >
                        {crumb.label}
                    </button>
                </span>
            ))}
        </div>
    )
}
