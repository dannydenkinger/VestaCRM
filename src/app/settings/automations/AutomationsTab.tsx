"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Zap, ArrowRight, Mail, CalendarClock, FileCheck, Trash2, Edit2, Play } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
    getAutomationSettings,
    updateAutomationSettings,
    getEmailTemplates,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
} from "./actions"
import { autoAdvanceOpportunities } from "@/app/pipeline/actions"

interface EmailTemplate {
    id: string
    name: string
    subject: string
    body: string
    createdAt: string | null
}

interface AutomationSettings {
    autoReplyEnabled: boolean
    autoReplyTemplateId: string | null
    autoAdvanceEnabled: boolean
}

export default function AutomationsContent() {
    const [settings, setSettings] = useState<AutomationSettings>({
        autoReplyEnabled: false,
        autoReplyTemplateId: null,
        autoAdvanceEnabled: false,
    })
    const [templates, setTemplates] = useState<EmailTemplate[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
    const [templateForm, setTemplateForm] = useState({ name: "", subject: "", body: "" })
    const [isSaving, setIsSaving] = useState(false)
    const [isAdvancing, setIsAdvancing] = useState(false)

    useEffect(() => {
        async function load() {
            const [settingsRes, templatesRes] = await Promise.all([
                getAutomationSettings(),
                getEmailTemplates(),
            ])
            if (settingsRes.success && settingsRes.settings) setSettings(settingsRes.settings)
            if (templatesRes.success && templatesRes.templates) setTemplates(templatesRes.templates)
            setIsLoading(false)
        }
        load()
    }, [])

    const handleToggleAutoReply = async (enabled: boolean) => {
        if (enabled && !settings.autoReplyTemplateId) {
            toast.error("Select an email template first before enabling auto-reply.")
            return
        }
        setSettings(prev => ({ ...prev, autoReplyEnabled: enabled }))
        const res = await updateAutomationSettings({ autoReplyEnabled: enabled })
        if (!res.success) {
            setSettings(prev => ({ ...prev, autoReplyEnabled: !enabled }))
            toast.error("Failed to update setting.")
        }
    }

    const handleToggleAutoAdvance = async (enabled: boolean) => {
        setSettings(prev => ({ ...prev, autoAdvanceEnabled: enabled }))
        const res = await updateAutomationSettings({ autoAdvanceEnabled: enabled })
        if (!res.success) {
            setSettings(prev => ({ ...prev, autoAdvanceEnabled: !enabled }))
            toast.error("Failed to update setting.")
        }
    }

    const handleSelectTemplate = async (templateId: string) => {
        setSettings(prev => ({ ...prev, autoReplyTemplateId: templateId }))
        await updateAutomationSettings({ autoReplyTemplateId: templateId })
    }

    const handleOpenCreateTemplate = () => {
        setEditingTemplate(null)
        setTemplateForm({ name: "", subject: "", body: "" })
        setIsTemplateDialogOpen(true)
    }

    const handleOpenEditTemplate = (template: EmailTemplate) => {
        setEditingTemplate(template)
        setTemplateForm({ name: template.name, subject: template.subject, body: template.body })
        setIsTemplateDialogOpen(true)
    }

    const handleSaveTemplate = async () => {
        if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.body.trim()) {
            toast.error("All fields are required.")
            return
        }
        setIsSaving(true)
        if (editingTemplate) {
            const res = await updateEmailTemplate(editingTemplate.id, templateForm)
            if (res.success) {
                setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...templateForm } : t))
                toast.success("Template updated.")
            } else {
                toast.error("Failed to update template.")
            }
        } else {
            const res = await createEmailTemplate(templateForm)
            if (res.success && res.id) {
                setTemplates(prev => [{ id: res.id!, ...templateForm, createdAt: new Date().toISOString() }, ...prev])
                toast.success("Template created.")
            } else {
                toast.error("Failed to create template.")
            }
        }
        setIsSaving(false)
        setIsTemplateDialogOpen(false)
    }

    const handleDeleteTemplate = async (id: string) => {
        const res = await deleteEmailTemplate(id)
        if (res.success) {
            setTemplates(prev => prev.filter(t => t.id !== id))
            if (settings.autoReplyTemplateId === id) {
                setSettings(prev => ({ ...prev, autoReplyTemplateId: null, autoReplyEnabled: false }))
            }
            toast.success("Template deleted.")
        } else {
            toast.error("Failed to delete template.")
        }
    }

    const handleRunAutoAdvance = async () => {
        setIsAdvancing(true)
        const res = await autoAdvanceOpportunities()
        if (res.success) {
            toast.success(`Auto-advance complete. ${res.advancedCount || 0} opportunities moved to Current Tenant.`)
        } else {
            toast.error("Failed to run auto-advance.")
        }
        setIsAdvancing(false)
    }

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-12 text-center text-muted-foreground">Loading automations...</CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Auto-Reply Automation */}
            <Card>
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
                        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                            <Mail className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col flex-1 space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-base sm:text-lg">Inquiry Auto-Reply</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Automatically send a reply email when a new inquiry comes in from the website webhook.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 text-sm font-medium">
                                <div className="flex items-center gap-1.5 text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded border">
                                    <span className="text-xs uppercase tracking-wider font-bold">IF</span>
                                    <span>New Inquiry Received</span>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2.5 py-1 rounded border border-primary/20">
                                    <span className="text-xs uppercase tracking-wider font-bold">THEN</span>
                                    <span>Send Auto-Reply Email</span>
                                </div>
                            </div>
                            <div className="pt-4">
                                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Reply Template</label>
                                <Select
                                    value={settings.autoReplyTemplateId || "none"}
                                    onValueChange={(val) => handleSelectTemplate(val === "none" ? "" : val)}
                                >
                                    <SelectTrigger className="w-full sm:w-[300px]">
                                        <SelectValue placeholder="Select a template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No template selected</SelectItem>
                                        {templates.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 sm:ml-auto shrink-0 sm:pl-10 sm:border-l border-border/50">
                            <span className="text-sm font-medium text-muted-foreground w-12 text-right">
                                {settings.autoReplyEnabled ? "Active" : "Paused"}
                            </span>
                            <Switch
                                checked={settings.autoReplyEnabled}
                                onCheckedChange={handleToggleAutoReply}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Auto-Advance Automation */}
            <Card>
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
                        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                            <CalendarClock className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col flex-1 space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-base sm:text-lg">Auto-Advance to Current Tenant</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Automatically moves opportunities to &quot;Current Tenant&quot; stage when in &quot;Lease Signed&quot; or &quot;Move In Scheduled&quot; and the start date has passed.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 text-sm font-medium">
                                <div className="flex items-center gap-1.5 text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded border">
                                    <span className="text-xs uppercase tracking-wider font-bold">IF</span>
                                    <span>Start Date Passed</span>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2.5 py-1 rounded border border-primary/20">
                                    <span className="text-xs uppercase tracking-wider font-bold">THEN</span>
                                    <span>Move to Current Tenant</span>
                                </div>
                            </div>
                            <div className="pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRunAutoAdvance}
                                    disabled={isAdvancing}
                                >
                                    <Play className="h-3.5 w-3.5 mr-1.5" />
                                    {isAdvancing ? "Running..." : "Run Now"}
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 sm:ml-auto shrink-0 sm:pl-10 sm:border-l border-border/50">
                            <span className="text-sm font-medium text-muted-foreground w-12 text-right">
                                {settings.autoAdvanceEnabled ? "Active" : "Paused"}
                            </span>
                            <Switch
                                checked={settings.autoAdvanceEnabled}
                                onCheckedChange={handleToggleAutoAdvance}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* All Forms Signed → Move to Booked */}
            <Card>
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
                        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileCheck className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col flex-1 space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-base sm:text-lg">All Forms Signed Trigger</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                When all three required documents are checked (Lease, T&C, Payment Authorization), use the &quot;Move to Lease Signed&quot; button in the opportunity&apos;s Documents tab.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 text-sm font-medium">
                                <div className="flex items-center gap-1.5 text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded border">
                                    <span className="text-xs uppercase tracking-wider font-bold">IF</span>
                                    <span>All 3 Docs Checked</span>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2.5 py-1 rounded border border-primary/20">
                                    <span className="text-xs uppercase tracking-wider font-bold">THEN</span>
                                    <span>Move to Lease Signed</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 sm:ml-auto shrink-0 sm:pl-10 sm:border-l border-border/50">
                            <span className="text-sm font-medium text-emerald-500 w-12 text-right">Built-in</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Email Templates */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                        <CardTitle>Email Templates</CardTitle>
                        <CardDescription>Create and manage email templates used by automations.</CardDescription>
                    </div>
                    <Button size="sm" onClick={handleOpenCreateTemplate}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Template
                    </Button>
                </CardHeader>
                <CardContent>
                    {templates.length === 0 ? (
                        <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
                            <div className="text-center">
                                <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No email templates yet.</p>
                                <Button variant="link" className="mt-1" onClick={handleOpenCreateTemplate}>Create your first template</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {templates.map((template) => (
                                <div key={template.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold truncate">{template.name}</h4>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">Subject: {template.subject}</p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4 shrink-0">
                                        {settings.autoReplyTemplateId === template.id && (
                                            <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-500/20">Active</span>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditTemplate(template)}>
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20" onClick={() => handleDeleteTemplate(template.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Template Create/Edit Dialog */}
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? "Edit Template" : "Create Email Template"}</DialogTitle>
                        <DialogDescription>
                            {editingTemplate
                                ? "Update this email template."
                                : "Create a new email template to use with auto-reply and other automations."
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Template Name</label>
                            <Input
                                placeholder="e.g. Welcome Inquiry Response"
                                value={templateForm.name}
                                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Email Subject</label>
                            <Input
                                placeholder="e.g. Thank you for your inquiry!"
                                value={templateForm.subject}
                                onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Email Body</label>
                            <Textarea
                                placeholder="Write your email template here..."
                                className="min-h-[200px]"
                                value={templateForm.body}
                                onChange={(e) => setTemplateForm(prev => ({ ...prev, body: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground mt-1.5">
                                Tip: Use {"{{name}}"} for the contact&apos;s name and {"{{base}}"} for their military base.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveTemplate} disabled={isSaving}>
                            {isSaving ? "Saving..." : editingTemplate ? "Save Changes" : "Create Template"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
