"use client"

import { useEffect, useState } from "react"
import {
    LayersProvider,
    SelectorsProvider,
    StylesProvider,
    TraitsProvider,
    useEditorMaybe,
} from "@grapesjs/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Paintbrush, Settings2, Layers } from "lucide-react"
import type { Component, Property, Sector } from "grapesjs"

export function RightPanel() {
    const editor = useEditorMaybe()
    const [selectedLabel, setSelectedLabel] = useState<string | null>(null)

    useEffect(() => {
        if (!editor) return
        const onSelected = (component: unknown) => {
            try {
                const cmp = component as {
                    get?: (key: string) => unknown
                }
                const name =
                    (cmp.get?.("name") as string) ||
                    (cmp.get?.("tagName") as string) ||
                    "Element"
                setSelectedLabel(name)
            } catch {
                setSelectedLabel(null)
            }
        }
        const onDeselected = () => setSelectedLabel(null)
        editor.on("component:selected", onSelected)
        editor.on("component:deselected", onDeselected)
        return () => {
            editor.off("component:selected", onSelected)
            editor.off("component:deselected", onDeselected)
        }
    }, [editor])

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="px-3 py-2.5 border-b bg-muted/30">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Properties
                </div>
                <div className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
                    {selectedLabel ?? "Nothing selected"}
                </div>
            </div>

            <Tabs defaultValue="style" className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-1 h-9 shrink-0">
                    <TabsTrigger value="style" className="gap-1.5 text-xs">
                        <Paintbrush className="w-3.5 h-3.5" />
                        Style
                    </TabsTrigger>
                    <TabsTrigger value="traits" className="gap-1.5 text-xs">
                        <Settings2 className="w-3.5 h-3.5" />
                        Settings
                    </TabsTrigger>
                    <TabsTrigger value="layers" className="gap-1.5 text-xs">
                        <Layers className="w-3.5 h-3.5" />
                        Layers
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="style" className="flex-1 overflow-y-auto m-0 p-3">
                    <SelectorBar />
                    <StylesPanel />
                </TabsContent>
                <TabsContent value="traits" className="flex-1 overflow-y-auto m-0 p-3">
                    <TraitsPanel />
                </TabsContent>
                <TabsContent value="layers" className="flex-1 overflow-y-auto m-0 p-0">
                    <LayersPanel />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function SelectorBar() {
    return (
        <SelectorsProvider>
            {({ selectors, targets, addSelector }) => (
                <div className="mb-3 pb-3 border-b">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Selectors
                    </Label>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {selectors.length === 0 && (
                            <span className="text-xs text-muted-foreground">
                                {targets.length > 0 ? "(none)" : "Select an element first"}
                            </span>
                        )}
                        {selectors.map((sel, idx) => (
                            <span
                                key={idx}
                                className="text-[11px] px-1.5 py-0.5 rounded bg-muted font-mono"
                            >
                                {sel.toString()}
                            </span>
                        ))}
                        <AddSelectorInput onAdd={addSelector} />
                    </div>
                </div>
            )}
        </SelectorsProvider>
    )
}

function AddSelectorInput({ onAdd }: { onAdd: (name: string) => void }) {
    const [value, setValue] = useState("")
    return (
        <Input
            placeholder="+ class"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter" && value.trim()) {
                    onAdd(value.trim().replace(/^\.+/, ""))
                    setValue("")
                }
            }}
            className="h-6 text-[11px] px-2 w-20 border-dashed"
        />
    )
}

function StylesPanel() {
    return (
        <StylesProvider>
            {({ sectors }) => {
                if (sectors.length === 0) {
                    return (
                        <div className="text-xs text-muted-foreground text-center py-6">
                            Select an element to edit styles
                        </div>
                    )
                }
                return (
                    <div className="space-y-3">
                        {sectors.map((sector) => (
                            <SectorBlock key={sector.getId()} sector={sector} />
                        ))}
                    </div>
                )
            }}
        </StylesProvider>
    )
}

function SectorBlock({ sector }: { sector: Sector }) {
    const properties = sector.getProperties()
    if (properties.length === 0) return null
    return (
        <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                {sector.getName()}
            </div>
            <div className="space-y-2">
                {properties.map((prop) => (
                    <PropertyInput key={prop.getId()} property={prop} />
                ))}
            </div>
        </div>
    )
}

function PropertyInput({ property }: { property: Property }) {
    const label = property.getLabel() || property.getName()
    const value = (property.getValue() as string) ?? ""
    const type = property.getType() as string
    const name = property.getName()

    const isColor = type === "color" || /color|background-color/i.test(name)

    // Color picker: native + hex text side-by-side
    if (isColor) {
        return (
            <PropRow label={label}>
                <div className="flex items-center gap-1 flex-1 min-w-0">
                    <input
                        type="color"
                        value={normalizeColor(value) || "#000000"}
                        onChange={(e) => property.upValue(e.target.value)}
                        className="w-7 h-7 rounded border cursor-pointer p-0 bg-transparent"
                        aria-label={label}
                    />
                    <Input
                        value={value}
                        onChange={(e) => property.upValue(e.target.value)}
                        placeholder="#000000"
                        className="h-7 text-xs flex-1 min-w-0 font-mono"
                    />
                </div>
            </PropRow>
        )
    }

    // Select: shadcn-styled dropdown
    if (type === "select" || type === "radio") {
        const options = ((property as unknown as { getOptions?: () => SelectOption[] }).getOptions?.() ?? []) as SelectOption[]
        if (options.length > 0) {
            return (
                <PropRow label={label}>
                    <select
                        value={value}
                        onChange={(e) => property.upValue(e.target.value)}
                        className="h-7 text-xs flex-1 min-w-0 rounded-md border bg-background px-2"
                    >
                        {options.map((opt, idx) => (
                            <option
                                key={String(opt.id ?? opt.value ?? idx)}
                                value={String(opt.id ?? opt.value ?? "")}
                            >
                                {String(opt.label ?? opt.name ?? opt.id ?? opt.value ?? "")}
                            </option>
                        ))}
                    </select>
                </PropRow>
            )
        }
    }

    // Slider: range input + numeric display
    if (type === "slider" || type === "integer" || type === "number") {
        const min = numberOrNull((property as unknown as { getMin?: () => number }).getMin?.())
        const max = numberOrNull((property as unknown as { getMax?: () => number }).getMax?.())
        const step = numberOrNull((property as unknown as { getStep?: () => number }).getStep?.()) ?? 1
        if (type === "slider" && min !== null && max !== null) {
            return (
                <PropRow label={label}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            value={parseFloat(value) || 0}
                            onChange={(e) => property.upValue(e.target.value)}
                            className="flex-1 min-w-0 accent-primary"
                        />
                        <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right">
                            {parseFloat(value) || 0}
                        </span>
                    </div>
                </PropRow>
            )
        }
        return (
            <PropRow label={label}>
                <Input
                    type="text"
                    value={value}
                    onChange={(e) => property.upValue(e.target.value)}
                    placeholder="0"
                    className="h-7 text-xs flex-1 min-w-0"
                />
            </PropRow>
        )
    }

    // Default: text input
    return (
        <PropRow label={label}>
            <Input
                type="text"
                value={value}
                onChange={(e) => property.upValue(e.target.value)}
                className="h-7 text-xs flex-1 min-w-0"
            />
        </PropRow>
    )
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2">
            <Label className="text-[11px] text-muted-foreground w-20 truncate shrink-0">
                {label}
            </Label>
            {children}
        </div>
    )
}

interface SelectOption {
    id?: string
    value?: string
    name?: string
    label?: string
}

function normalizeColor(v: string): string {
    if (!v) return ""
    if (v.startsWith("#")) {
        // Native input wants 7 chars (#rrggbb). Expand 3-digit hex.
        if (v.length === 4) {
            return "#" + v.slice(1).split("").map((c) => c + c).join("")
        }
        return v.slice(0, 7)
    }
    return ""
}

function numberOrNull(v: number | undefined): number | null {
    return typeof v === "number" && Number.isFinite(v) ? v : null
}

function TraitsPanel() {
    return (
        <TraitsProvider>
            {({ traits }) => {
                if (traits.length === 0) {
                    return (
                        <div className="text-xs text-muted-foreground text-center py-6">
                            Select an element to edit its attributes
                        </div>
                    )
                }
                return (
                    <div className="space-y-2">
                        {traits.map((trait) => (
                            <div key={trait.getId()} className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">
                                    {trait.getLabel() || trait.getName()}
                                </Label>
                                <Input
                                    value={(trait.getValue() as string) ?? ""}
                                    onChange={(e) => trait.setValue(e.target.value)}
                                    placeholder={(trait.get("placeholder") as string) ?? ""}
                                    className="h-7 text-xs"
                                />
                            </div>
                        ))}
                    </div>
                )
            }}
        </TraitsProvider>
    )
}

function LayersPanel() {
    return (
        <LayersProvider>
            {({ root }) => {
                if (!root) {
                    return (
                        <div className="text-xs text-muted-foreground text-center py-6">
                            No layers to show
                        </div>
                    )
                }
                return <LayerNode componentId={root.getId()} depth={0} />
            }}
        </LayersProvider>
    )
}

function LayerNode({ componentId, depth }: { componentId: string; depth: number }) {
    const editor = useEditorMaybe()
    if (!editor) return null
    const cmp = editor.Components.getById(componentId)
    if (!cmp) return null

    const label =
        (cmp.get("name") as string) ||
        (cmp.get("custom-name") as string) ||
        (cmp.get("tagName") as string) ||
        "element"
    const children = cmp.components()

    return (
        <div>
            <button
                type="button"
                onClick={() => editor.select(cmp)}
                className="flex items-center gap-1.5 px-3 py-1 w-full text-left text-xs hover:bg-muted/50 truncate"
                style={{ paddingLeft: 12 + depth * 12 }}
            >
                <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/50" />
                <span className="truncate">{label}</span>
            </button>
            {(children as unknown as Component[]).map((child) => (
                <LayerNode
                    key={child.getId()}
                    componentId={child.getId()}
                    depth={depth + 1}
                />
            ))}
        </div>
    )
}
