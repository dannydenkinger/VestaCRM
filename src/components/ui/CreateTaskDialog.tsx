"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createTask, updateTask } from "@/app/calendar/actions"
import { getAllContacts } from "@/app/communications/actions"
import { getOpportunitiesList } from "@/app/pipeline/actions"

interface Recurrence {
    type: "none" | "daily" | "weekly" | "monthly"
    interval?: number
    endDate?: string | Date | null
}

interface TaskData {
    id?: string
    title: string
    description?: string
    dueDate?: string | Date | null
    priority?: string
    contactId?: string | null
    opportunityId?: string | null
    recurrence?: Recurrence | null
    blockedByTaskId?: string | null
}

interface CreateTaskDialogProps {
    isOpen: boolean
    onClose: () => void
    onSaved: () => void
    initialData?: TaskData | null
    initialContactId?: string | null
    initialDate?: Date | null
    availableTasks?: { id: string; title: string }[]
}

export function CreateTaskDialog({ isOpen, onClose, onSaved, initialData, initialContactId, initialDate, availableTasks }: CreateTaskDialogProps) {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [dueDate, setDueDate] = useState("")
    const [priority, setPriority] = useState("MEDIUM")
    const [contactId, setContactId] = useState<string>("")
    const [blockedByTaskId, setBlockedByTaskId] = useState<string>("")
    const [recurrenceType, setRecurrenceType] = useState<"none" | "daily" | "weekly" | "monthly">("none")
    const [recurrenceInterval, setRecurrenceInterval] = useState(1)
    const [recurrenceEndDate, setRecurrenceEndDate] = useState("")
    const [contacts, setContacts] = useState<{ id: string; name: string; email: string }[]>([])
    const [contactSearchQuery, setContactSearchQuery] = useState("")
    const [contactDropdownOpen, setContactDropdownOpen] = useState(false)
    const [opportunities, setOpportunities] = useState<{ id: string; name: string }[]>([])
    const [opportunityId, setOpportunityId] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            getAllContacts().then(r => {
                if (r.success && r.contacts) setContacts(r.contacts)
            })
            getOpportunitiesList().then(r => {
                if (r.success && r.opportunities) setOpportunities(r.opportunities)
            })
        }
    }, [isOpen])

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title || "")
                setDescription(initialData.description || "")
                // Format date for datetime-local input
                if (initialData.dueDate) {
                    try {
                        const dateObj = new Date(initialData.dueDate);
                        const tzoffset = dateObj.getTimezoneOffset() * 60000;
                        const localISOTime = new Date(dateObj.getTime() - tzoffset).toISOString().slice(0, 16);
                        setDueDate(localISOTime);
                    } catch (e) {
                        setDueDate("")
                    }
                } else {
                    setDueDate("")
                }
                setPriority(initialData.priority || "MEDIUM")
                setContactId(initialData.contactId || initialContactId || "")
                setOpportunityId(initialData.opportunityId || "")
                setBlockedByTaskId(initialData.blockedByTaskId || "")
                if (initialData.recurrence && initialData.recurrence.type !== "none") {
                    setRecurrenceType(initialData.recurrence.type as any)
                    setRecurrenceInterval(initialData.recurrence.interval || 1)
                    if (initialData.recurrence.endDate) {
                        try {
                            const endDateObj = new Date(initialData.recurrence.endDate);
                            setRecurrenceEndDate(endDateObj.toISOString().slice(0, 10));
                        } catch { setRecurrenceEndDate("") }
                    } else {
                        setRecurrenceEndDate("")
                    }
                } else {
                    setRecurrenceType("none")
                    setRecurrenceInterval(1)
                    setRecurrenceEndDate("")
                }
            } else {
                setTitle("")
                setDescription("")
                setBlockedByTaskId("")
                // Auto-fill date from initialDate prop (click-to-add from calendar)
                if (initialDate) {
                    try {
                        const tzoffset = initialDate.getTimezoneOffset() * 60000;
                        const localISOTime = new Date(initialDate.getTime() - tzoffset).toISOString().slice(0, 16);
                        setDueDate(localISOTime);
                    } catch {
                        setDueDate("")
                    }
                } else {
                    setDueDate("")
                }
                setPriority("MEDIUM")
                setContactId(initialContactId || "")
                setOpportunityId("")
                setRecurrenceType("none")
                setRecurrenceInterval(1)
                setRecurrenceEndDate("")
            }
        }
    }, [isOpen, initialData, initialContactId, initialDate])

    const handleSave = async () => {
        if (!title.trim()) return
        setIsLoading(true)

        const taskData: any = {
            title,
            description,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            priority,
            recurrence: recurrenceType !== "none" ? {
                type: recurrenceType,
                interval: recurrenceInterval,
                endDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
            } : { type: "none" },
        }
        if (contactId && contactId !== "none") taskData.contactId = contactId
        else taskData.contactId = null
        if (opportunityId && opportunityId !== "none") taskData.opportunityId = opportunityId
        else taskData.opportunityId = null
        if (blockedByTaskId && blockedByTaskId !== "none") taskData.blockedByTaskId = blockedByTaskId
        else taskData.blockedByTaskId = null

        try {
            if (initialData?.id) {
                await updateTask(initialData.id, taskData)
            } else {
                await createTask(taskData)
            }
            onSaved()
            onClose()
        } catch (error) {
            console.error("Failed to save task:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] border-white/10 bg-background/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle>{initialData?.id ? "Edit Task" : "Create New Task"}</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Title</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            autoFocus
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                            value={description}
                            onChange={(e: any) => setDescription(e.target.value)}
                            placeholder="Add details..."
                            className="resize-none h-24"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Due Date & Time</label>
                            <Input
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Priority</label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW">Low</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="HIGH">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Link to contact</label>
                        <div className="relative">
                            <Input
                                placeholder="Search contacts..."
                                value={contactDropdownOpen ? contactSearchQuery : (contacts.find(c => c.id === contactId)?.name || (contactId && contactId !== "none" ? "Selected" : ""))}
                                onChange={(e) => { setContactSearchQuery(e.target.value); setContactDropdownOpen(true) }}
                                onFocus={() => setContactDropdownOpen(true)}
                                onBlur={() => setTimeout(() => setContactDropdownOpen(false), 200)}
                            />
                            {contactId && contactId !== "none" && !contactDropdownOpen && (
                                <button
                                    type="button"
                                    onClick={() => { setContactId(""); setContactSearchQuery("") }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <span className="text-xs">Clear</span>
                                </button>
                            )}
                            {contactDropdownOpen && (
                                <div className="absolute z-50 top-full mt-1 w-full max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 text-muted-foreground"
                                        onClick={() => { setContactId("none"); setContactSearchQuery(""); setContactDropdownOpen(false) }}
                                    >
                                        None
                                    </button>
                                    {contacts
                                        .filter(c => !contactSearchQuery || c.name?.toLowerCase().includes(contactSearchQuery.toLowerCase()) || c.email?.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                                        .map(c => (
                                            <button
                                                type="button"
                                                key={c.id}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex justify-between items-center"
                                                onClick={() => { setContactId(c.id); setContactSearchQuery(""); setContactDropdownOpen(false) }}
                                            >
                                                <span className="font-medium">{c.name}</span>
                                                {c.email && <span className="text-xs text-muted-foreground ml-2 truncate">{c.email}</span>}
                                            </button>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Link to deal</label>
                        <Select value={opportunityId} onValueChange={setOpportunityId}>
                            <SelectTrigger>
                                <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {opportunities.map(o => (
                                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {availableTasks && availableTasks.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Blocked by</label>
                            <Select value={blockedByTaskId} onValueChange={setBlockedByTaskId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {availableTasks.filter(t => t.id !== initialData?.id).map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Recurrence</label>
                        <div className="grid grid-cols-2 gap-4">
                            <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as any)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No repeat</SelectItem>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                            {recurrenceType !== "none" && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">Every</span>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={recurrenceInterval}
                                        onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-16"
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        {recurrenceType === "daily" ? "day(s)" : recurrenceType === "weekly" ? "week(s)" : "month(s)"}
                                    </span>
                                </div>
                            )}
                        </div>
                        {recurrenceType !== "none" && (
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-muted-foreground">End date (optional)</label>
                                <Input
                                    type="date"
                                    value={recurrenceEndDate}
                                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isLoading || !title.trim()}>
                        {isLoading ? "Saving..." : initialData?.id ? "Update Task" : "Create Task"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
