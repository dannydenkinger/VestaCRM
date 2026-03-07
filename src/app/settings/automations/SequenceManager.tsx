"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Edit2, ListOrdered, Mail } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { getSequences, createSequence, updateSequence, deleteSequence } from "./sequence-actions"

interface SequenceStep {
    delayDays: number
    templateId: string
    templateName: string
}

interface Sequence {
    id: string
    name: string
    trigger: string
    enabled: boolean
    steps: SequenceStep[]
}

interface EmailTemplate {
    id: string
    name: string
}

const TRIGGER_LABELS: Record<string, string> = {
    new_contact: "New Contact Created",
    pre_checkin: "Pre Check-In (7 days before)",
    post_checkout: "Post Check-Out (1 day after)",
}

export function SequenceManager({ templates }: { templates: EmailTemplate[] }) {
    const [sequences, setSequences] = useState<Sequence[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState({
        name: "",
        trigger: "new_contact",
        steps: [{ delayDays: 0, templateId: "", templateName: "" }] as SequenceStep[],
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        getSequences().then(res => {
            if (res.success && res.sequences) setSequences(res.sequences)
            setLoading(false)
        })
    }, [])

    const openCreate = () => {
        setEditingId(null)
        setForm({ name: "", trigger: "new_contact", steps: [{ delayDays: 0, templateId: "", templateName: "" }] })
        setDialogOpen(true)
    }

    const openEdit = (seq: Sequence) => {
        setEditingId(seq.id)
        setForm({ name: seq.name, trigger: seq.trigger, steps: [...seq.steps] })
        setDialogOpen(true)
    }

    const addStep = () => {
        const lastDelay = form.steps.length > 0 ? form.steps[form.steps.length - 1].delayDays : 0
        setForm(prev => ({
            ...prev,
            steps: [...prev.steps, { delayDays: lastDelay + 3, templateId: "", templateName: "" }],
        }))
    }

    const removeStep = (idx: number) => {
        setForm(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== idx) }))
    }

    const updateStep = (idx: number, field: string, value: any) => {
        setForm(prev => {
            const steps = [...prev.steps]
            if (field === "templateId") {
                const tmpl = templates.find(t => t.id === value)
                steps[idx] = { ...steps[idx], templateId: value, templateName: tmpl?.name || "" }
            } else {
                steps[idx] = { ...steps[idx], [field]: value }
            }
            return { ...prev, steps }
        })
    }

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error("Name is required."); return }
        if (form.steps.some(s => !s.templateId)) { toast.error("Each step needs a template."); return }

        setSaving(true)
        if (editingId) {
            const res = await updateSequence(editingId, form)
            if (res.success) {
                setSequences(prev => prev.map(s => s.id === editingId ? { ...s, ...form } : s))
                toast.success("Sequence updated.")
            } else {
                toast.error("Failed to update.")
            }
        } else {
            const res = await createSequence(form)
            if (res.success && res.id) {
                setSequences(prev => [...prev, { id: res.id!, ...form, enabled: true }])
                toast.success("Sequence created.")
            } else {
                toast.error("Failed to create.")
            }
        }
        setSaving(false)
        setDialogOpen(false)
    }

    const handleToggle = async (id: string, enabled: boolean) => {
        setSequences(prev => prev.map(s => s.id === id ? { ...s, enabled } : s))
        const res = await updateSequence(id, { enabled })
        if (!res.success) {
            setSequences(prev => prev.map(s => s.id === id ? { ...s, enabled: !enabled } : s))
            toast.error("Failed to update.")
        }
    }

    const handleDelete = async (id: string) => {
        const res = await deleteSequence(id)
        if (res.success) {
            setSequences(prev => prev.filter(s => s.id !== id))
            toast.success("Sequence deleted.")
        } else {
            toast.error("Failed to delete.")
        }
    }

    if (loading) return null

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <ListOrdered className="h-4 w-4" />
                            Email Sequences
                        </CardTitle>
                        <CardDescription>Automated multi-step email flows triggered by events.</CardDescription>
                    </div>
                    <Button size="sm" onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Sequence
                    </Button>
                </CardHeader>
                <CardContent>
                    {sequences.length === 0 ? (
                        <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
                            <div className="text-center">
                                <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No email sequences yet.</p>
                                <Button variant="link" className="mt-1" onClick={openCreate}>Create your first sequence</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sequences.map(seq => (
                                <div key={seq.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold truncate">{seq.name}</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {TRIGGER_LABELS[seq.trigger] || seq.trigger} &middot; {seq.steps.length} step{seq.steps.length !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4 shrink-0">
                                        <Switch
                                            checked={seq.enabled}
                                            onCheckedChange={(v) => handleToggle(seq.id, v)}
                                        />
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(seq)}>
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20" onClick={() => handleDelete(seq.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit Sequence" : "Create Email Sequence"}</DialogTitle>
                        <DialogDescription>
                            Define a multi-step email flow that triggers automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Sequence Name</label>
                            <Input
                                placeholder="e.g. Welcome Series"
                                value={form.name}
                                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Trigger</label>
                            <Select value={form.trigger} onValueChange={(v) => setForm(prev => ({ ...prev, trigger: v }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new_contact">New Contact Created</SelectItem>
                                    <SelectItem value="pre_checkin">Pre Check-In (7 days before)</SelectItem>
                                    <SelectItem value="post_checkout">Post Check-Out (1 day after)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Steps</label>
                            <div className="space-y-3">
                                {form.steps.map((step, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-muted/20">
                                        <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}.</span>
                                        <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                                            <span className="text-xs text-muted-foreground">Wait</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                className="w-16 h-7 text-xs text-center"
                                                value={step.delayDays}
                                                onChange={(e) => updateStep(idx, "delayDays", parseInt(e.target.value) || 0)}
                                            />
                                            <span className="text-xs text-muted-foreground">days, then send:</span>
                                            <Select
                                                value={step.templateId || "none"}
                                                onValueChange={(v) => updateStep(idx, "templateId", v === "none" ? "" : v)}
                                            >
                                                <SelectTrigger className="h-7 text-xs w-[180px]">
                                                    <SelectValue placeholder="Select template" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Select template</SelectItem>
                                                    {templates.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {form.steps.length > 1 && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeStep(idx)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" size="sm" className="mt-2" onClick={addStep}>
                                <Plus className="h-3 w-3 mr-1" /> Add Step
                            </Button>
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : editingId ? "Save Changes" : "Create Sequence"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
