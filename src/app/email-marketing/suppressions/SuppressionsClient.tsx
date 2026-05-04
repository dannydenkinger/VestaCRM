"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, Plus, Search, Trash2 } from "lucide-react"
import {
    addSuppressionAction,
    removeSuppressionAction,
} from "./actions"
import type { SuppressionEntry } from "@/lib/email/suppressions"

const REASON_STYLES: Record<string, string> = {
    bounce: "bg-red-500/10 text-red-700",
    complaint: "bg-orange-500/10 text-orange-700",
    unsubscribe: "bg-blue-500/10 text-blue-700",
    manual: "bg-muted text-muted-foreground",
}

export function SuppressionsClient({
    initialEntries,
}: {
    initialEntries: SuppressionEntry[]
}) {
    const router = useRouter()
    const [entries, setEntries] = useState(initialEntries)
    const [filter, setFilter] = useState("")
    const [newEmail, setNewEmail] = useState("")
    const [isPending, startTransition] = useTransition()

    const visible = filter.trim()
        ? entries.filter((e) => e.email.toLowerCase().includes(filter.toLowerCase()))
        : entries

    const handleAdd = () => {
        const email = newEmail.trim().toLowerCase()
        if (!email || !email.includes("@")) {
            toast.error("Enter a valid email")
            return
        }
        startTransition(async () => {
            const res = await addSuppressionAction({
                email,
                reason: "manual",
                source: "added by user from suppressions page",
            })
            if (!res.success) {
                toast.error(res.error || "Failed to add")
                return
            }
            setNewEmail("")
            toast.success(`${email} suppressed`)
            router.refresh()
        })
    }

    const handleRemove = (email: string) => {
        if (!confirm(`Remove ${email} from the suppression list? They'll start receiving emails again.`)) {
            return
        }
        startTransition(async () => {
            const res = await removeSuppressionAction({ email })
            if (!res.success) {
                toast.error(res.error || "Failed to remove")
                return
            }
            setEntries((prev) => prev.filter((e) => e.email !== email))
            toast.success("Removed")
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Filter by email…"
                        className="pl-9 h-9"
                    />
                </div>
                <div className="flex items-center gap-2 border-l pl-2">
                    <Input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Add manually: name@example.com"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAdd()
                        }}
                        disabled={isPending}
                        className="h-9 w-72"
                    />
                    <Button
                        onClick={handleAdd}
                        disabled={isPending || !newEmail.trim()}
                        size="sm"
                    >
                        {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>

            {visible.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                    {entries.length === 0
                        ? "No suppressed addresses yet."
                        : "No matches for that filter."}
                </div>
            ) : (
                <div className="divide-y border rounded-md">
                    {visible.map((e) => (
                        <div
                            key={e.email}
                            className="flex items-center gap-3 py-2.5 px-3 text-sm hover:bg-muted/30 transition-colors"
                        >
                            <span
                                className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded shrink-0 w-24 text-center ${
                                    REASON_STYLES[e.reason] ?? REASON_STYLES.manual
                                }`}
                            >
                                {e.reason}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="truncate font-mono text-[13px]">
                                    {e.email}
                                </div>
                                {e.source && (
                                    <div className="text-[11px] text-muted-foreground truncate">
                                        {e.source}
                                    </div>
                                )}
                            </div>
                            <div className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                                {new Date(e.addedAt).toLocaleDateString()}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemove(e.email)}
                                disabled={isPending}
                                title="Remove from suppression list"
                                className="shrink-0 h-7 w-7"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
