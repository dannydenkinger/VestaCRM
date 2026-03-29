"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { FormStyle } from "./types"
import { FONT_OPTIONS } from "./types"

interface Props {
    open: boolean
    onClose: () => void
    style: FormStyle
    onChange: (style: FormStyle) => void
}

export function StyleSettings({ open, onClose, style, onChange }: Props) {
    const update = (partial: Partial<FormStyle>) => onChange({ ...style, ...partial })

    return (
        <Sheet open={open} onOpenChange={v => !v && onClose()}>
            <SheetContent className="overflow-y-auto w-[360px] sm:w-[400px]">
                <SheetHeader>
                    <SheetTitle>Form Style</SheetTitle>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                    {/* Title & Description */}
                    <section className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Header</p>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Title</Label>
                            <Input value={style.title} onChange={e => update({ title: e.target.value })} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Description</Label>
                            <Textarea value={style.description || ""} onChange={e => update({ description: e.target.value })} rows={2} className="text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Logo URL</Label>
                            <Input value={style.logoUrl || ""} onChange={e => update({ logoUrl: e.target.value })} placeholder="https://..." className="h-8 text-sm" />
                        </div>
                    </section>

                    {/* Colors */}
                    <section className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Colors</p>
                        {[
                            { key: "backgroundColor", label: "Background" },
                            { key: "accentColor", label: "Accent / Focus" },
                            { key: "textColor", label: "Text" },
                            { key: "buttonColor", label: "Button" },
                            { key: "buttonTextColor", label: "Button Text" },
                        ].map(({ key, label }) => (
                            <div key={key} className="flex items-center justify-between">
                                <Label className="text-xs">{label}</Label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={(style as any)[key]}
                                        onChange={e => update({ [key]: e.target.value } as any)}
                                        className="h-7 w-7 rounded border cursor-pointer"
                                    />
                                    <Input
                                        value={(style as any)[key]}
                                        onChange={e => update({ [key]: e.target.value } as any)}
                                        className="h-7 w-20 text-xs font-mono"
                                    />
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* Typography */}
                    <section className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Typography</p>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Font</Label>
                            <select
                                value={style.fontFamily}
                                onChange={e => update({ fontFamily: e.target.value })}
                                className="w-full h-8 px-2 text-sm border rounded-md bg-background"
                            >
                                {FONT_OPTIONS.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                        </div>
                    </section>

                    {/* Layout */}
                    <section className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Layout</p>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Column Layout</Label>
                            <div className="flex gap-1">
                                {(["single", "two-column"] as const).map(l => (
                                    <button
                                        key={l}
                                        onClick={() => update({ layout: l })}
                                        className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                            style.layout === l
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        {l === "single" ? "Single Column" : "Two Columns"}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Border Radius</Label>
                            <div className="flex gap-1">
                                {(["none", "sm", "md", "lg", "full"] as const).map(r => (
                                    <button
                                        key={r}
                                        onClick={() => update({ borderRadius: r })}
                                        className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                            style.borderRadius === r
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Button */}
                    <section className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submit Button</p>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Button Text</Label>
                            <Input value={style.buttonText} onChange={e => update({ buttonText: e.target.value })} className="h-8 text-sm" />
                        </div>
                    </section>

                    {/* Success */}
                    <section className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">After Submission</p>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Success Message</Label>
                            <Textarea value={style.successMessage} onChange={e => update({ successMessage: e.target.value })} rows={2} className="text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Redirect URL (optional)</Label>
                            <Input value={style.redirectUrl || ""} onChange={e => update({ redirectUrl: e.target.value })} placeholder="https://yoursite.com/thank-you" className="h-8 text-sm" />
                            <p className="text-[11px] text-muted-foreground">If set, redirects instead of showing the success message</p>
                        </div>
                    </section>
                </div>
            </SheetContent>
        </Sheet>
    )
}
