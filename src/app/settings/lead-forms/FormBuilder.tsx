"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Palette, Eye, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { getLeadForm, updateLeadForm } from "./actions"
import { FieldPalette } from "./FieldPalette"
import { FieldPropertiesEditor } from "./FieldPropertiesEditor"
import { StyleSettings } from "./StyleSettings"
import { FormRenderer } from "@/components/forms/FormRenderer"
import { FIELD_TYPE_CONFIG } from "./types"
import type { LeadForm, FormField, FormStyle, FieldType } from "./types"

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
    const [hasChanges, setHasChanges] = useState(false)

    useEffect(() => {
        loadForm()
    }, [formId])

    async function loadForm() {
        setLoading(true)
        const f = await getLeadForm(formId)
        setForm(f)
        setLoading(false)
    }

    const updateFields = useCallback((fields: FormField[]) => {
        setForm(prev => prev ? { ...prev, fields } : prev)
        setHasChanges(true)
    }, [])

    const updateStyle = useCallback((style: FormStyle) => {
        setForm(prev => prev ? { ...prev, style } : prev)
        setHasChanges(true)
    }, [])

    const updateName = useCallback((name: string) => {
        setForm(prev => prev ? { ...prev, name } : prev)
        setHasChanges(true)
    }, [])

    const addField = (type: FieldType) => {
        if (!form) return
        const config = FIELD_TYPE_CONFIG[type]
        const newField: FormField = {
            id: crypto.randomUUID().replace(/-/g, "").slice(0, 8),
            type,
            label: config.defaultLabel,
            placeholder: "",
            required: type === "email",
            width: "full",
            ...(["dropdown", "radio", "checkbox"].includes(type) && { options: ["Option 1", "Option 2", "Option 3"] }),
        }
        const newFields = [...form.fields, newField]
        updateFields(newFields)
        setSelectedFieldId(newField.id)
    }

    const updateField = (updatedField: FormField) => {
        if (!form) return
        updateFields(form.fields.map(f => f.id === updatedField.id ? updatedField : f))
    }

    const deleteField = (fieldId: string) => {
        if (!form) return
        updateFields(form.fields.filter(f => f.id !== fieldId))
        if (selectedFieldId === fieldId) setSelectedFieldId(null)
    }

    const moveField = (fieldId: string, direction: "up" | "down") => {
        if (!form) return
        const idx = form.fields.findIndex(f => f.id === fieldId)
        if (idx < 0) return
        const newIdx = direction === "up" ? idx - 1 : idx + 1
        if (newIdx < 0 || newIdx >= form.fields.length) return
        const newFields = [...form.fields]
        ;[newFields[idx], newFields[newIdx]] = [newFields[newIdx], newFields[idx]]
        updateFields(newFields)
    }

    const handleSave = async () => {
        if (!form) return
        setSaving(true)
        const res = await updateLeadForm(formId, {
            name: form.name,
            fields: form.fields,
            style: form.style,
        })
        if (res.success) {
            toast.success("Form saved")
            setHasChanges(false)
        } else {
            toast.error("Failed to save")
        }
        setSaving(false)
    }

    const handlePreview = () => {
        window.open(`/form/${formId}`, "_blank")
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!form) {
        return (
            <div className="text-center py-16">
                <p className="text-sm text-muted-foreground">Form not found</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={onBack}>Go Back</Button>
            </div>
        )
    }

    const selectedField = form.fields.find(f => f.id === selectedFieldId) || null
    const selectedFieldIdx = form.fields.findIndex(f => f.id === selectedFieldId)

    return (
        <div className="flex flex-col h-full -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6">
            {/* Top bar */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-background shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <Input
                    value={form.name}
                    onChange={e => updateName(e.target.value)}
                    className="h-8 text-sm font-medium max-w-[240px] border-0 bg-transparent focus-visible:bg-muted focus-visible:ring-0 px-2"
                />
                <div className="flex-1" />
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowStyleSettings(true)}>
                    <Palette className="h-3.5 w-3.5 mr-1.5" />
                    Style
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handlePreview}>
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    Preview
                </Button>
                <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving || !hasChanges}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    {saving ? "Saving..." : "Save"}
                </Button>
            </div>

            {/* Three-panel layout */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Left: Field Palette */}
                <div className="w-[200px] border-r p-3 overflow-y-auto shrink-0 hidden sm:block">
                    <FieldPalette onAdd={addField} />
                </div>

                {/* Center: Form Preview */}
                <div className="flex-1 overflow-y-auto bg-muted/30">
                    <div className="p-6">
                        {/* Mobile add field button */}
                        <div className="sm:hidden mb-4">
                            <select
                                onChange={e => { if (e.target.value) addField(e.target.value as FieldType); e.target.value = "" }}
                                className="w-full h-9 px-3 text-sm border rounded-lg bg-background"
                                defaultValue=""
                            >
                                <option value="" disabled>+ Add Field</option>
                                {Object.entries(FIELD_TYPE_CONFIG).map(([type, config]) => (
                                    <option key={type} value={type}>{config.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Form preview in a card frame */}
                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-[600px] mx-auto">
                            <FormRenderer
                                form={form}
                                mode="preview"
                                selectedFieldId={selectedFieldId}
                                onFieldSelect={setSelectedFieldId}
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Properties Editor */}
                <div className="w-[280px] border-l p-3 overflow-y-auto shrink-0 hidden sm:block">
                    {selectedField ? (
                        <FieldPropertiesEditor
                            field={selectedField}
                            onChange={updateField}
                            onDelete={() => deleteField(selectedField.id)}
                            onMoveUp={() => moveField(selectedField.id, "up")}
                            onMoveDown={() => moveField(selectedField.id, "down")}
                            isFirst={selectedFieldIdx === 0}
                            isLast={selectedFieldIdx === form.fields.length - 1}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <p className="text-sm font-medium mb-1">No field selected</p>
                            <p className="text-xs">Click a field in the preview to edit its properties</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Style Settings Sheet */}
            <StyleSettings
                open={showStyleSettings}
                onClose={() => setShowStyleSettings(false)}
                style={form.style}
                onChange={updateStyle}
            />
        </div>
    )
}
