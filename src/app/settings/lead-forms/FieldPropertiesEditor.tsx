"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react"
import type { FormField } from "./types"

interface Props {
    field: FormField
    onChange: (field: FormField) => void
    onDelete: () => void
    onMoveUp: () => void
    onMoveDown: () => void
    isFirst: boolean
    isLast: boolean
}

export function FieldPropertiesEditor({ field, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: Props) {
    const update = (partial: Partial<FormField>) => onChange({ ...field, ...partial })
    const hasOptions = ["dropdown", "radio", "checkbox"].includes(field.type)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Field Properties</p>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} disabled={isFirst}>
                        <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} disabled={isLast}>
                        <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Label */}
            <div className="space-y-1.5">
                <Label className="text-xs">Label</Label>
                <Input
                    value={field.label}
                    onChange={e => update({ label: e.target.value })}
                    className="h-8 text-sm"
                />
            </div>

            {/* Placeholder (not for header, hidden, radio, checkbox) */}
            {!["header", "hidden", "radio", "checkbox"].includes(field.type) && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Placeholder</Label>
                    <Input
                        value={field.placeholder || ""}
                        onChange={e => update({ placeholder: e.target.value })}
                        className="h-8 text-sm"
                    />
                </div>
            )}

            {/* Help text */}
            <div className="space-y-1.5">
                <Label className="text-xs">Help Text</Label>
                <Input
                    value={field.helpText || ""}
                    onChange={e => update({ helpText: e.target.value })}
                    placeholder="Optional description below the field"
                    className="h-8 text-sm"
                />
            </div>

            {/* Required toggle (not for header) */}
            {field.type !== "header" && field.type !== "hidden" && (
                <div className="flex items-center justify-between">
                    <Label className="text-xs">Required</Label>
                    <Switch
                        checked={field.required}
                        onCheckedChange={checked => update({ required: checked })}
                    />
                </div>
            )}

            {/* Width toggle */}
            {field.type !== "header" && field.type !== "hidden" && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Width</Label>
                    <div className="flex gap-1">
                        {(["full", "half"] as const).map(w => (
                            <button
                                key={w}
                                onClick={() => update({ width: w })}
                                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                    field.width === w
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {w === "full" ? "Full Width" : "Half Width"}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Default value (for hidden fields) */}
            {field.type === "hidden" && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Default Value</Label>
                    <Input
                        value={field.defaultValue || ""}
                        onChange={e => update({ defaultValue: e.target.value })}
                        className="h-8 text-sm"
                    />
                </div>
            )}

            {/* Options editor */}
            {hasOptions && (
                <div className="space-y-1.5">
                    <Label className="text-xs">Options</Label>
                    <div className="space-y-1.5">
                        {(field.options || []).map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                                <Input
                                    value={opt}
                                    onChange={e => {
                                        const newOpts = [...(field.options || [])]
                                        newOpts[idx] = e.target.value
                                        update({ options: newOpts })
                                    }}
                                    className="h-7 text-xs flex-1"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    onClick={() => {
                                        const newOpts = (field.options || []).filter((_, i) => i !== idx)
                                        update({ options: newOpts })
                                    }}
                                >
                                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs w-full"
                            onClick={() => update({ options: [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`] })}
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Option
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
