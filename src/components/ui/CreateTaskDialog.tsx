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

interface TaskData {
    id?: string
    title: string
    description?: string
    dueDate?: string | Date | null
    priority?: string
    contactId?: string | null
    opportunityId?: string | null
}

interface CreateTaskDialogProps {
    isOpen: boolean
    onClose: () => void
    onSaved: () => void
    initialData?: TaskData | null
    initialContactId?: string | null
}

export function CreateTaskDialog({ isOpen, onClose, onSaved, initialData, initialContactId }: CreateTaskDialogProps) {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [dueDate, setDueDate] = useState("")
    const [priority, setPriority] = useState("MEDIUM")
    const [contactId, setContactId] = useState<string>("")
    const [contacts, setContacts] = useState<{ id: string; name: string; email: string }[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            getAllContacts().then(r => {
                if (r.success && r.contacts) setContacts(r.contacts)
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
                        // Convert to local ISO string format (YYYY-MM-DDThh:mm)
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
            } else {
                setTitle("")
                setDescription("")
                setDueDate("")
                setPriority("MEDIUM")
                setContactId(initialContactId || "")
            }
        }
    }, [isOpen, initialData, initialContactId])

    const handleSave = async () => {
        if (!title.trim()) return
        setIsLoading(true)

        const taskData: any = {
            title,
            description,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            priority
        }
        if (contactId) taskData.contactId = contactId
        else taskData.contactId = null

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
                        <Select value={contactId} onValueChange={setContactId}>
                            <SelectTrigger>
                                <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {contacts.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
