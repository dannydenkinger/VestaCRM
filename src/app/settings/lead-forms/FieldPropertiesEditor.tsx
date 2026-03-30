"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Copy } from "lucide-react"
import type { FormField, FieldValidation, FieldStyle } from "./types"
import { ConditionalLogicEditor } from "@/components/forms/ConditionalLogicEditor"

interface Props {
    field: FormField
    allFields?: FormField[]
    onChange: (field: FormField) => void
    onDelete: () => void
    onDuplicate?: () => void
    onMoveUp: () => void
    onMoveDown: () => void
    isFirst: boolean
    isLast: boolean
}

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="border-t pt-3">
            <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 w-full text-left mb-2">
                {open ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
            </button>
            {open && <div className="space-y-3 pl-0.5">{children}</div>}
        </div>
    )
}

export function FieldPropertiesEditor({ field, allFields, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown, isFirst, isLast }: Props) {
    const update = (partial: Partial<FormField>) => onChange({ ...field, ...partial })
    const updateValidation = (partial: Partial<FieldValidation>) =>
        onChange({ ...field, validation: { ...field.validation, ...partial } })
    const updateStyle = (partial: Partial<FieldStyle>) =>
        onChange({ ...field, fieldStyle: { ...field.fieldStyle, ...partial } })

    const hasOptions = ["dropdown", "radio", "checkbox"].includes(field.type)
    const isTextType = ["short_text", "long_text", "email", "phone", "number"].includes(field.type)
    const isDisplayOnly = ["header", "divider", "image", "rich_text", "hidden"].includes(field.type)

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{field.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} disabled={isFirst} title="Move up">
                        <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} disabled={isLast} title="Move down">
                        <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    {onDuplicate && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate} title="Duplicate">
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* ── Basic Properties ── */}

            {field.type !== "divider" && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Label</Label>
                    <Input value={field.label} onChange={e => update({ label: e.target.value })} className="h-8 text-sm" />
                </div>
            )}

            {!isDisplayOnly && !["radio", "checkbox", "rating", "scale", "file_upload", "signature", "full_name", "address", "phone_intl"].includes(field.type) && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Placeholder</Label>
                    <Input value={field.placeholder || ""} onChange={e => update({ placeholder: e.target.value })} className="h-8 text-sm" />
                </div>
            )}

            {!isDisplayOnly && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Help Text</Label>
                    <Input value={field.helpText || ""} onChange={e => update({ helpText: e.target.value })} placeholder="Optional description" className="h-8 text-sm" />
                </div>
            )}

            {!isDisplayOnly && (
                <div className="flex items-center justify-between">
                    <Label className="text-xs">Required</Label>
                    <Switch checked={field.required} onCheckedChange={checked => update({ required: checked })} />
                </div>
            )}

            {!isDisplayOnly && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Width</Label>
                    <div className="flex gap-1">
                        {(["full", "half"] as const).map(w => (
                            <button key={w} onClick={() => update({ width: w })}
                                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${field.width === w ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                {w === "full" ? "Full" : "Half"}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Type-Specific Properties ── */}

            {field.type === "hidden" && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Default Value</Label>
                    <Input value={field.defaultValue || ""} onChange={e => update({ defaultValue: e.target.value })} className="h-8 text-sm" />
                </div>
            )}

            {field.type === "image" && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Image URL</Label>
                    <Input value={field.imageUrl || ""} onChange={e => update({ imageUrl: e.target.value })} placeholder="https://..." className="h-8 text-sm" />
                    <Label className="text-xs">Alt Text</Label>
                    <Input value={field.imageAlt || ""} onChange={e => update({ imageAlt: e.target.value })} className="h-8 text-sm" />
                </div>
            )}

            {field.type === "rich_text" && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Content (HTML)</Label>
                    <Textarea value={field.richTextContent || ""} onChange={e => update({ richTextContent: e.target.value })} rows={4} className="text-xs font-mono" />
                </div>
            )}

            {field.type === "rating" && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Max Stars</Label>
                    <div className="flex gap-1">
                        {[5, 10].map(n => (
                            <button key={n} onClick={() => update({ ratingMax: n })}
                                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${(field.ratingMax || 5) === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                {n} Stars
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {field.type === "scale" && (
                <div className="space-y-1.5">
                    <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                            <Label className="text-xs">Min</Label>
                            <Input type="number" value={field.scaleMin ?? 1} onChange={e => update({ scaleMin: Number(e.target.value) })} className="h-7 text-xs" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <Label className="text-xs">Max</Label>
                            <Input type="number" value={field.scaleMax ?? 10} onChange={e => update({ scaleMax: Number(e.target.value) })} className="h-7 text-xs" />
                        </div>
                    </div>
                    <Label className="text-xs">Min Label</Label>
                    <Input value={field.scaleMinLabel || ""} onChange={e => update({ scaleMinLabel: e.target.value })} placeholder="Not likely" className="h-7 text-xs" />
                    <Label className="text-xs">Max Label</Label>
                    <Input value={field.scaleMaxLabel || ""} onChange={e => update({ scaleMaxLabel: e.target.value })} placeholder="Very likely" className="h-7 text-xs" />
                </div>
            )}

            {field.type === "full_name" && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Name Parts</Label>
                    {(["prefix", "first", "middle", "last", "suffix"] as const).map(part => (
                        <label key={part} className="flex items-center gap-2 text-xs">
                            <input type="checkbox"
                                checked={(field.nameFields || ["first", "last"]).includes(part)}
                                onChange={e => {
                                    const current = field.nameFields || ["first", "last"]
                                    update({ nameFields: e.target.checked ? [...current, part] : current.filter(p => p !== part) })
                                }}
                                className="h-3.5 w-3.5"
                            />
                            {part.charAt(0).toUpperCase() + part.slice(1)}
                        </label>
                    ))}
                </div>
            )}

            {field.type === "address" && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Address Parts</Label>
                    {(["street", "city", "state", "zip", "country"] as const).map(part => (
                        <label key={part} className="flex items-center gap-2 text-xs">
                            <input type="checkbox"
                                checked={(field.addressFields || ["street", "city", "state", "zip", "country"]).includes(part)}
                                onChange={e => {
                                    const current = field.addressFields || ["street", "city", "state", "zip", "country"]
                                    update({ addressFields: e.target.checked ? [...current, part] : current.filter(p => p !== part) })
                                }}
                                className="h-3.5 w-3.5"
                            />
                            {part.charAt(0).toUpperCase() + part.slice(1)}
                        </label>
                    ))}
                </div>
            )}

            {field.type === "file_upload" && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Max Files</Label>
                    <Input type="number" value={field.validation?.maxFiles ?? 1} onChange={e => updateValidation({ maxFiles: Number(e.target.value) })} className="h-7 text-xs" />
                    <Label className="text-xs">Max File Size (MB)</Label>
                    <Input type="number" value={(field.validation?.maxFileSize ?? 25 * 1048576) / 1048576} onChange={e => updateValidation({ maxFileSize: Number(e.target.value) * 1048576 })} className="h-7 text-xs" />
                    <Label className="text-xs">Allowed Types</Label>
                    <Input value={field.validation?.allowedFileTypes?.join(", ") || ""} onChange={e => updateValidation({ allowedFileTypes: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="image/*, .pdf, .doc" className="h-7 text-xs" />
                </div>
            )}

            {/* ── Options Editor ── */}

            {hasOptions && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Options</Label>
                    {(field.options || []).map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                            <Input value={opt} onChange={e => {
                                const newOpts = [...(field.options || [])]
                                newOpts[idx] = e.target.value
                                update({ options: newOpts })
                            }} className="h-7 text-xs flex-1" />
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => update({ options: (field.options || []).filter((_, i) => i !== idx) })}>
                                <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" className="h-7 text-xs w-full"
                        onClick={() => update({ options: [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`] })}>
                        <Plus className="h-3 w-3 mr-1" /> Add Option
                    </Button>
                </div>
            )}

            {/* ── Validation Section ── */}

            {isTextType && (
                <CollapsibleSection title="Validation">
                    {["short_text", "long_text", "email", "phone"].includes(field.type) && (
                        <>
                            <div className="flex gap-2">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Min Length</Label>
                                    <Input type="number" value={field.validation?.minLength ?? ""} onChange={e => updateValidation({ minLength: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-xs" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Max Length</Label>
                                    <Input type="number" value={field.validation?.maxLength ?? ""} onChange={e => updateValidation({ maxLength: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-xs" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-xs">Show Character Count</Label>
                                <Switch checked={field.showCharCount || false} onCheckedChange={checked => update({ showCharCount: checked })} />
                            </div>
                        </>
                    )}
                    {field.type === "number" && (
                        <div className="flex gap-2">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs">Min Value</Label>
                                <Input type="number" value={field.validation?.min ?? ""} onChange={e => updateValidation({ min: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-xs" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs">Max Value</Label>
                                <Input type="number" value={field.validation?.max ?? ""} onChange={e => updateValidation({ max: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-xs" />
                            </div>
                        </div>
                    )}
                    <div className="space-y-1">
                        <Label className="text-xs">Regex Pattern</Label>
                        <Input value={field.validation?.pattern || ""} onChange={e => updateValidation({ pattern: e.target.value })} placeholder="^[A-Z].*" className="h-7 text-xs font-mono" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Custom Error Message</Label>
                        <Input value={field.validation?.customMessage || ""} onChange={e => updateValidation({ customMessage: e.target.value })} placeholder="Please enter a valid..." className="h-7 text-xs" />
                    </div>
                </CollapsibleSection>
            )}

            {/* ── Field Style Section ── */}

            {!isDisplayOnly && (
                <CollapsibleSection title="Style">
                    <div className="space-y-1.5">
                        <Label className="text-xs">Label Position</Label>
                        <div className="flex gap-1">
                            {(["top", "left", "hidden"] as const).map(pos => (
                                <button key={pos} onClick={() => updateStyle({ labelPosition: pos })}
                                    className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors ${(field.fieldStyle?.labelPosition || "top") === pos ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                    {pos.charAt(0).toUpperCase() + pos.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Font Size</Label>
                        <div className="flex gap-1">
                            {(["sm", "md", "lg"] as const).map(s => (
                                <button key={s} onClick={() => updateStyle({ fontSize: s })}
                                    className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors ${(field.fieldStyle?.fontSize || "md") === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                    {s.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Input Height</Label>
                        <div className="flex gap-1">
                            {(["sm", "md", "lg"] as const).map(s => (
                                <button key={s} onClick={() => updateStyle({ inputHeight: s })}
                                    className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors ${(field.fieldStyle?.inputHeight || "md") === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                    {s.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-xs">Label Color</Label>
                        <input type="color" value={field.fieldStyle?.labelColor || "#1f2937"} onChange={e => updateStyle({ labelColor: e.target.value })} className="h-6 w-6 rounded border cursor-pointer" />
                    </div>
                </CollapsibleSection>
            )}

            {/* ── Conditional Logic Section ── */}

            {!isDisplayOnly && allFields && allFields.length > 1 && (
                <CollapsibleSection title="Conditional Logic">
                    <ConditionalLogicEditor
                        field={field}
                        allFields={allFields}
                        onChange={logic => update({ conditionalLogic: logic })}
                    />
                </CollapsibleSection>
            )}
        </div>
    )
}
