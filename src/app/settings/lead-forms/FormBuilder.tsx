"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Palette, Eye, Save, Loader2, Plus, Trash2, Layers, Bell, BarChart3 } from "lucide-react"
import { toast } from "sonner"
import { getLeadForm, updateLeadForm } from "./actions"
import { FieldPalette } from "./FieldPalette"
import { FieldPropertiesEditor } from "./FieldPropertiesEditor"
import { StyleSettings } from "./StyleSettings"
import { NotificationSettings } from "./NotificationSettings"
import { FormAnalytics } from "./FormAnalytics"
import { FormRenderer } from "@/components/forms/FormRenderer"
import { FIELD_TYPE_CONFIG } from "./types"
import type { LeadForm, FormField, FormStyle, FormPage, FieldType } from "./types"

interface Props {
    formId: string
    onBack: () => void
}

export function FormBuilder({ formId, onBack }: Props) {
    const [form, setForm] = useState<LeadForm | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
    const [showStyleSettings, setShowStyleSettings] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const [showAnalytics, setShowAnalytics] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [currentPageIdx, setCurrentPageIdx] = useState(0)

    useEffect(() => { loadForm() }, [formId])

    async function loadForm() {
        setLoading(true)
        const f = await getLeadForm(formId)
        setForm(f)
        setLoading(false)
    }

    const markChanged = () => setHasChanges(true)

    // ── Field helpers (work on current page when multi-step) ─────────

    const getCurrentFields = (): FormField[] => {
        if (!form) return []
        if (form.isMultiStep && form.pages?.length) {
            return form.pages[currentPageIdx]?.fields || []
        }
        return form.fields
    }

    const setCurrentFields = (fields: FormField[]) => {
        if (!form) return
        if (form.isMultiStep && form.pages?.length) {
            const newPages = [...form.pages]
            newPages[currentPageIdx] = { ...newPages[currentPageIdx], fields }
            setForm({ ...form, pages: newPages })
        } else {
            setForm({ ...form, fields })
        }
        markChanged()
    }

    const addField = (type: FieldType) => {
        const config = FIELD_TYPE_CONFIG[type]
        const newField: FormField = {
            id: crypto.randomUUID().replace(/-/g, "").slice(0, 8),
            type,
            label: config.defaultLabel,
            placeholder: "",
            required: type === "email",
            width: "full",
            ...(["dropdown", "radio", "checkbox"].includes(type) && { options: ["Option 1", "Option 2", "Option 3"] }),
            ...(type === "rating" && { ratingMax: 5 }),
            ...(type === "scale" && { scaleMin: 1, scaleMax: 10 }),
            ...(type === "full_name" && { nameFields: ["first", "last"] as any }),
            ...(type === "address" && { addressFields: ["street", "city", "state", "zip", "country"] as any }),
        }
        setCurrentFields([...getCurrentFields(), newField])
        setSelectedFieldId(newField.id)
    }

    const updateField = (updatedField: FormField) => {
        setCurrentFields(getCurrentFields().map(f => f.id === updatedField.id ? updatedField : f))
    }

    const deleteField = (fieldId: string) => {
        setCurrentFields(getCurrentFields().filter(f => f.id !== fieldId))
        if (selectedFieldId === fieldId) setSelectedFieldId(null)
    }

    const moveField = (fieldId: string, direction: "up" | "down") => {
        const fields = getCurrentFields()
        const idx = fields.findIndex(f => f.id === fieldId)
        if (idx < 0) return
        const newIdx = direction === "up" ? idx - 1 : idx + 1
        if (newIdx < 0 || newIdx >= fields.length) return
        const newFields = [...fields]
        ;[newFields[idx], newFields[newIdx]] = [newFields[newIdx], newFields[newIdx === idx ? idx : newIdx === idx ? newIdx : newIdx]]
        ;[newFields[idx], newFields[newIdx]] = [newFields[newIdx], newFields[idx]]
        setCurrentFields(newFields)
    }

    // ── Multi-step helpers ───────────────────────────────────────────

    const toggleMultiStep = () => {
        if (!form) return
        if (!form.isMultiStep) {
            // Convert flat fields to pages
            const page: FormPage = { id: crypto.randomUUID().replace(/-/g, "").slice(0, 8), title: "Page 1", fields: form.fields }
            setForm({ ...form, isMultiStep: true, pages: [page] })
        } else {
            // Flatten pages back to fields
            const allFields = form.pages?.flatMap(p => p.fields) || form.fields
            setForm({ ...form, isMultiStep: false, pages: undefined, fields: allFields })
            setCurrentPageIdx(0)
        }
        markChanged()
    }

    const addPage = () => {
        if (!form || !form.pages) return
        const newPage: FormPage = {
            id: crypto.randomUUID().replace(/-/g, "").slice(0, 8),
            title: `Page ${form.pages.length + 1}`,
            fields: [],
        }
        setForm({ ...form, pages: [...form.pages, newPage] })
        setCurrentPageIdx(form.pages.length)
        markChanged()
    }

    const deletePage = (idx: number) => {
        if (!form?.pages || form.pages.length <= 1) return
        const newPages = form.pages.filter((_, i) => i !== idx)
        setForm({ ...form, pages: newPages })
        setCurrentPageIdx(Math.min(currentPageIdx, newPages.length - 1))
        markChanged()
    }

    const updatePageTitle = (idx: number, title: string) => {
        if (!form?.pages) return
        const newPages = [...form.pages]
        newPages[idx] = { ...newPages[idx], title }
        setForm({ ...form, pages: newPages })
        markChanged()
    }

    // ── Save ─────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!form) return
        setSaving(true)
        const res = await updateLeadForm(formId, {
            name: form.name,
            fields: form.isMultiStep ? (form.pages?.flatMap(p => p.fields) || []) : form.fields,
            style: form.style,
            pages: form.pages,
            isMultiStep: form.isMultiStep,
            showReviewPage: form.showReviewPage,
            notifications: form.notifications,
            spamProtection: form.spamProtection,
        })
        if (res.success) {
            toast.success("Form saved")
            setHasChanges(false)
        } else {
            toast.error("Failed to save")
        }
        setSaving(false)
    }

    // ── Render ────────────────────────────────────────────────────────

    if (loading) {
        return <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
    }
    if (!form) {
        return <div className="text-center py-16"><p className="text-sm text-muted-foreground">Form not found</p><Button variant="outline" size="sm" className="mt-2" onClick={onBack}>Go Back</Button></div>
    }

    const currentFields = getCurrentFields()
    const selectedField = currentFields.find(f => f.id === selectedFieldId) || null
    const selectedFieldIdx = currentFields.findIndex(f => f.id === selectedFieldId)

    // Build a preview form that only shows current page fields
    const previewForm: LeadForm = form.isMultiStep
        ? { ...form, fields: currentFields, isMultiStep: false }
        : form

    return (
        <div className="flex flex-col h-full -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6">
            {/* Top bar */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-background shrink-0 flex-wrap">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <Input
                    value={form.name}
                    onChange={e => { setForm({ ...form, name: e.target.value }); markChanged() }}
                    className="h-8 text-sm font-medium max-w-[200px] border-0 bg-transparent focus-visible:bg-muted focus-visible:ring-0 px-2"
                />
                <div className="flex items-center gap-2 ml-2">
                    <Label className="text-xs text-muted-foreground">Multi-step</Label>
                    <Switch checked={form.isMultiStep || false} onCheckedChange={toggleMultiStep} />
                </div>
                {form.isMultiStep && (
                    <div className="flex items-center gap-2 ml-2">
                        <Label className="text-xs text-muted-foreground">Review page</Label>
                        <Switch checked={form.showReviewPage || false} onCheckedChange={v => { setForm({ ...form, showReviewPage: v }); markChanged() }} />
                    </div>
                )}
                <div className="flex-1" />
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowStyleSettings(true)}>
                    <Palette className="h-3.5 w-3.5 mr-1.5" />Style
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowNotifications(true)}>
                    <Bell className="h-3.5 w-3.5 mr-1.5" />Notify
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowAnalytics(true)}>
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" />Analytics
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => window.open(`/form/${formId}`, "_blank")}>
                    <Eye className="h-3.5 w-3.5 mr-1.5" />Preview
                </Button>
                <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving || !hasChanges}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    {saving ? "Saving..." : "Save"}
                </Button>
            </div>

            {/* Page tabs (multi-step only) */}
            {form.isMultiStep && form.pages && (
                <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/20 shrink-0 overflow-x-auto">
                    {form.pages.map((page, idx) => (
                        <div key={page.id} className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={() => { setCurrentPageIdx(idx); setSelectedFieldId(null) }}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                    currentPageIdx === idx ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground border"
                                }`}
                            >
                                <input
                                    value={page.title || `Page ${idx + 1}`}
                                    onChange={e => updatePageTitle(idx, e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className={`bg-transparent border-0 outline-none text-xs font-medium w-20 text-center ${
                                        currentPageIdx === idx ? "text-primary-foreground placeholder:text-primary-foreground/50" : "text-inherit"
                                    }`}
                                />
                            </button>
                            {form.pages!.length > 1 && (
                                <button onClick={() => deletePage(idx)} className="p-0.5 rounded text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={addPage} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted shrink-0">
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* Three-panel layout */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                <div className="w-[200px] border-r p-3 overflow-y-auto shrink-0 hidden sm:block">
                    <FieldPalette onAdd={addField} />
                </div>

                <div className="flex-1 overflow-y-auto bg-muted/30">
                    <div className="p-6">
                        <div className="sm:hidden mb-4">
                            <select onChange={e => { if (e.target.value) addField(e.target.value as FieldType); e.target.value = "" }}
                                className="w-full h-9 px-3 text-sm border rounded-lg bg-background" defaultValue="">
                                <option value="" disabled>+ Add Field</option>
                                {Object.entries(FIELD_TYPE_CONFIG).map(([type, config]) => (
                                    <option key={type} value={type}>{config.label}</option>
                                ))}
                            </select>
                        </div>

                        {form.isMultiStep && (
                            <div className="text-center mb-3">
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    <Layers className="h-3 w-3 inline mr-1" />
                                    Page {currentPageIdx + 1} of {form.pages?.length || 1}
                                </span>
                            </div>
                        )}

                        <div className="bg-white dark:bg-card rounded-xl shadow-sm border overflow-hidden max-w-[600px] mx-auto">
                            <FormRenderer
                                form={previewForm}
                                mode="preview"
                                selectedFieldId={selectedFieldId}
                                onFieldSelect={setSelectedFieldId}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-[280px] border-l p-3 overflow-y-auto shrink-0 hidden sm:block">
                    {selectedField ? (
                        <FieldPropertiesEditor
                            field={selectedField}
                            allFields={currentFields}
                            onChange={updateField}
                            onDelete={() => deleteField(selectedField.id)}
                            onMoveUp={() => moveField(selectedField.id, "up")}
                            onMoveDown={() => moveField(selectedField.id, "down")}
                            isFirst={selectedFieldIdx === 0}
                            isLast={selectedFieldIdx === currentFields.length - 1}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <p className="text-sm font-medium mb-1">No field selected</p>
                            <p className="text-xs">Click a field in the preview to edit</p>
                        </div>
                    )}
                </div>
            </div>

            <StyleSettings open={showStyleSettings} onClose={() => setShowStyleSettings(false)} style={form.style}
                onChange={s => { setForm({ ...form, style: s }); markChanged() }} isMultiStep={form.isMultiStep} />
            <NotificationSettings open={showNotifications} onClose={() => setShowNotifications(false)}
                notifications={form.notifications}
                onChange={n => { setForm({ ...form, notifications: n }); markChanged() }} />
            <FormAnalytics open={showAnalytics} onClose={() => setShowAnalytics(false)} form={form} />
        </div>
    )
}
