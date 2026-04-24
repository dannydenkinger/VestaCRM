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
    const value = property.getValue() as string
    const type = property.getType() as string

    // Phase 2 stub: wire a basic text/color input per property. The GrapesJS
    // property API is rich (select, radio, slider, composite, stack) — Phase 3
    // can upgrade each type with the right shadcn control. For now, a single
    // text input covers ~70% of properties usefully.
    const isColor = type === "color" || /color|background/i.test(property.getName())

    return (
        <div className="flex items-center gap-2">
            <Label className="text-[11px] text-muted-foreground w-20 truncate shrink-0">
                {label}
            </Label>
            <Input
                type={isColor ? "color" : "text"}
                value={value ?? ""}
                onChange={(e) => property.upValue(e.target.value)}
                className="h-7 text-xs flex-1 min-w-0"
            />
        </div>
    )
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
