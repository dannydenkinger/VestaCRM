"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, Plus, Search, Trash2, User, X } from "lucide-react"
import {
    addContactsAction,
    deleteListAction,
    removeContactsAction,
    searchContactsForListAction,
} from "../actions"

interface Contact {
    id: string
    name: string
    email: string
}

interface Props {
    listId: string
    listName: string
    initialMembers: Contact[]
    initialCount: number
}

export function ListDetailClient({
    listId,
    listName,
    initialMembers,
    initialCount,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [members, setMembers] = useState<Contact[]>(initialMembers)
    const [memberCount, setMemberCount] = useState(initialCount)

    const [searchQ, setSearchQ] = useState("")
    const [searchResults, setSearchResults] = useState<Contact[]>([])
    const [searchOpen, setSearchOpen] = useState(false)
    const [pendingAdds, setPendingAdds] = useState<Contact[]>([])
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleSearchChange = (value: string) => {
        setSearchQ(value)
        setSearchOpen(true)
        if (searchTimer.current) clearTimeout(searchTimer.current)
        searchTimer.current = setTimeout(async () => {
            const res = await searchContactsForListAction({
                query: value,
                listId,
                limit: 20,
            })
            if (res.success) setSearchResults(res.contacts)
        }, 180)
    }

    const queueAdd = (c: Contact) => {
        setPendingAdds((prev) =>
            prev.some((x) => x.id === c.id) ? prev : [...prev, c],
        )
        setSearchOpen(false)
        setSearchQ("")
    }

    const removePending = (id: string) => {
        setPendingAdds((prev) => prev.filter((x) => x.id !== id))
    }

    const commitAdds = () => {
        if (pendingAdds.length === 0) return
        startTransition(async () => {
            const result = await addContactsAction({
                listId,
                contactIds: pendingAdds.map((c) => c.id),
            })
            if (!result.success) {
                toast.error(result.error || "Failed to add contacts")
                return
            }
            toast.success(
                `Added ${result.added ?? 0} contact${result.added === 1 ? "" : "s"}.` +
                    (result.alreadyPresent ? ` ${result.alreadyPresent} already in list.` : ""),
            )
            setMembers((prev) => {
                const ids = new Set(prev.map((x) => x.id))
                return [...prev, ...pendingAdds.filter((c) => !ids.has(c.id))].sort(
                    (a, b) =>
                        (a.name || a.email).toLowerCase().localeCompare(
                            (b.name || b.email).toLowerCase(),
                        ),
                )
            })
            setMemberCount((c) => c + (result.added ?? 0))
            setPendingAdds([])
        })
    }

    const handleRemove = (contactId: string) => {
        startTransition(async () => {
            const result = await removeContactsAction({
                listId,
                contactIds: [contactId],
            })
            if (!result.success) {
                toast.error(result.error || "Failed to remove")
                return
            }
            setMembers((prev) => prev.filter((c) => c.id !== contactId))
            setMemberCount((c) => Math.max(0, c - 1))
            toast.success("Removed")
        })
    }

    const handleDeleteList = () => {
        if (
            !confirm(
                `Delete list "${listName}"? Contacts are not deleted — they just leave the list.`,
            )
        ) {
            return
        }
        startTransition(async () => {
            const result = await deleteListAction(listId)
            if (!result.success) {
                toast.error(result.error || "Failed to delete")
                return
            }
            toast.success("List deleted")
            router.push("/email-marketing/lists")
        })
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-base">Add contacts</CardTitle>
                    <Button
                        onClick={handleDeleteList}
                        disabled={isPending}
                        variant="ghost"
                        size="sm"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete list
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="relative">
                        <div className="flex items-center gap-2 border rounded-md px-2">
                            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                            <Input
                                value={searchQ}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                onFocus={() => {
                                    setSearchOpen(true)
                                    if (searchResults.length === 0) handleSearchChange("")
                                }}
                                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                                placeholder="Search contacts by name or email…"
                                className="border-0 shadow-none focus-visible:ring-0 px-0"
                                disabled={isPending}
                            />
                        </div>
                        {searchOpen && searchResults.length > 0 && (
                            <div className="absolute z-10 left-0 right-0 mt-1 border rounded-md bg-popover shadow-md max-h-64 overflow-auto">
                                {searchResults.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                                        onMouseDown={(e) => {
                                            e.preventDefault()
                                            queueAdd(c)
                                        }}
                                    >
                                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate">{c.name || c.email}</div>
                                            {c.name && c.email && (
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {c.email}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {pendingAdds.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-xs text-muted-foreground">
                                Queued ({pendingAdds.length})
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {pendingAdds.map((c) => (
                                    <span
                                        key={c.id}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs"
                                    >
                                        {c.name || c.email}
                                        <button
                                            type="button"
                                            onClick={() => removePending(c.id)}
                                            disabled={isPending}
                                            className="hover:text-destructive"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div>
                                <Button
                                    onClick={commitAdds}
                                    disabled={isPending}
                                    size="sm"
                                >
                                    {isPending ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4 mr-2" />
                                    )}
                                    Add {pendingAdds.length} to list
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        Members
                        <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
                            ({memberCount.toLocaleString()})
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {members.length === 0 ? (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                            No contacts yet. Use the search above to add some.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {members.map((c) => (
                                <div
                                    key={c.id}
                                    className="flex items-center justify-between py-2.5 text-sm"
                                >
                                    <div className="min-w-0">
                                        <div className="truncate">{c.name || "(no name)"}</div>
                                        {c.email && (
                                            <div className="text-xs text-muted-foreground truncate">
                                                {c.email}
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        onClick={() => handleRemove(c.id)}
                                        disabled={isPending}
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {memberCount > members.length && (
                                <div className="py-3 text-center text-xs text-muted-foreground">
                                    Showing {members.length} of {memberCount}. Refresh to see more.
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
