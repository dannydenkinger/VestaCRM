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
import {
    Paintbrush,
    Settings2,
    Layers,
    X,
    ChevronDown,
    ChevronRight,
    Box,
    Type,
    Heading,
    Image as ImageIcon,
    Link as LinkIcon,
    Square,
    Table,
    List,
    Minus,
    Rows,
    Columns,
} from "lucide-react"
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

const SECTOR_COLLAPSED_KEY = "vesta:editor:collapsedSectors"

function loadCollapsedSectors(): Set<string> {
    if (typeof window === "undefined") return new Set()
    try {
        const raw = localStorage.getItem(SECTOR_COLLAPSED_KEY)
        if (!raw) return new Set()
        const arr = JSON.parse(raw)
        return new Set(Array.isArray(arr) ? arr : [])
    } catch {
        return new Set()
    }
}

function SectorBlock({ sector }: { sector: Sector }) {
    const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsedSectors)
    const sectorId = sector.getId()
    const isCollapsed = collapsed.has(sectorId)

    const toggle = () => {
        setCollapsed((prev) => {
            const next = new Set(prev)
            if (next.has(sectorId)) next.delete(sectorId)
            else next.add(sectorId)
            try {
                localStorage.setItem(SECTOR_COLLAPSED_KEY, JSON.stringify([...next]))
            } catch {
                // ignore
            }
            return next
        })
    }

    const properties = sector.getProperties()
    if (properties.length === 0) return null
    return (
        <div>
            <button
                type="button"
                onClick={toggle}
                aria-expanded={!isCollapsed}
                className="flex items-center gap-1 w-full text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 hover:text-foreground transition-colors mb-1.5"
            >
                {isCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                ) : (
                    <ChevronDown className="w-3 h-3" />
                )}
                <span className="flex-1 text-left">{sector.getName()}</span>
                <span className="opacity-60 tabular-nums normal-case font-normal">
                    {properties.length}
                </span>
            </button>
            {!isCollapsed && (
                <div className="space-y-2 mb-3">
                    {properties.map((prop) => (
                        <PropertyInput key={prop.getId()} property={prop} />
                    ))}
                </div>
            )}
        </div>
    )
}

function PropertyInput({ property }: { property: Property }) {
    const editor = useEditorMaybe()
    const label = property.getLabel() || property.getName()
    const type = property.getType() as string
    const name = property.getName()

    // Read in priority order:
    //   1. component.getStyle()[name] — GrapesJS's parsed style model
    //   2. raw `style="..."` HTML attribute (parsed inline)
    //   3. DOM element's actual computed style (always works for inline styles)
    //   4. property.getValue() — last-resort, depends on active selector
    const selected = editor?.getSelected()
    const componentStyle = (selected?.getStyle?.() ?? {}) as Record<string, string>
    const value = readStyleValue(selected, componentStyle, name, property)

    const updateValue = (next: string) => {
        try {
            property.upValue(next)
        } catch {
            // ignore
        }
        try {
            if (selected) {
                selected.setStyle({ ...componentStyle, [name]: next })
            }
        } catch {
            // ignore
        }
    }

    const clearValue = () => {
        try {
            if (selected) {
                const remaining: Record<string, string> = { ...componentStyle }
                delete remaining[name]
                selected.setStyle(remaining)
            }
        } catch {
            // ignore
        }
        try {
            property.upValue("")
        } catch {
            // ignore
        }
    }

    const isColor = type === "color" || /color|background-color/i.test(name)
    const hasValue = !!value

    // Color picker: native + hex text side-by-side
    if (isColor) {
        return (
            <PropRow label={label} onClear={hasValue ? clearValue : undefined}>
                <div className="flex items-center gap-1 flex-1 min-w-0">
                    <input
                        type="color"
                        value={normalizeColor(value) || "#000000"}
                        onChange={(e) => updateValue(e.target.value)}
                        className="w-7 h-7 rounded border cursor-pointer p-0 bg-transparent"
                        aria-label={label}
                    />
                    <Input
                        value={value}
                        onChange={(e) => updateValue(e.target.value)}
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
                <PropRow label={label} onClear={hasValue ? clearValue : undefined}>
                    <select
                        value={value}
                        onChange={(e) => updateValue(e.target.value)}
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
                <PropRow label={label} onClear={hasValue ? clearValue : undefined}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            value={parseFloat(value) || 0}
                            onChange={(e) => updateValue(e.target.value)}
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
            <PropRow label={label} onClear={hasValue ? clearValue : undefined}>
                <Input
                    type="text"
                    value={value}
                    onChange={(e) => updateValue(e.target.value)}
                    placeholder="0"
                    className="h-7 text-xs flex-1 min-w-0"
                />
            </PropRow>
        )
    }

    // Default: text input
    return (
        <PropRow label={label} onClear={hasValue ? clearValue : undefined}>
            <Input
                type="text"
                value={value}
                onChange={(e) => updateValue(e.target.value)}
                className="h-7 text-xs flex-1 min-w-0"
            />
        </PropRow>
    )
}

function PropRow({
    label,
    children,
    onClear,
}: {
    label: string
    children: React.ReactNode
    onClear?: () => void
}) {
    return (
        <div className="flex items-center gap-2 group/prop">
            <Label className="text-[11px] text-muted-foreground w-20 truncate shrink-0">
                {label}
            </Label>
            {children}
            {onClear && (
                <button
                    type="button"
                    onClick={onClear}
                    title="Clear value"
                    className="text-muted-foreground/40 hover:text-destructive opacity-0 group-hover/prop:opacity-100 transition-opacity shrink-0"
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </div>
    )
}

/**
 * Read a CSS property's effective value from the selected component.
 * Tries the model layer first, falls back to the live DOM style — that's
 * the source of truth for inline-styled blocks (Hero, Pricing Table, etc.)
 * where the StyleManager's getValue() doesn't always pick up inline styles.
 */
function readStyleValue(
    selected: Component | undefined,
    componentStyle: Record<string, string>,
    name: string,
    property: Property,
): string {
    // 1. Model-level style
    if (componentStyle[name]) return componentStyle[name]

    // 2. Raw style attribute (in case getStyle didn't parse it)
    try {
        const attrs = selected?.getAttributes?.() as Record<string, unknown> | undefined
        const raw = attrs?.style
        if (typeof raw === "string") {
            const parsed = parseInlineStyle(raw)
            if (parsed[name]) return parsed[name]
        }
    } catch {
        // ignore
    }

    // 3. Live DOM (most reliable for inline styles)
    try {
        const el = selected?.getEl?.() as HTMLElement | undefined
        if (el) {
            const inline = el.style.getPropertyValue(name)
            if (inline) return inline
        }
    } catch {
        // ignore
    }

    // 4. Property API fallback
    try {
        const v = property.getValue() as string
        if (v) return v
    } catch {
        // ignore
    }

    return ""
}

function iconForTag(tag: string) {
    const t = (tag || "").toLowerCase()
    if (/^h[1-6]$/.test(t)) return Heading
    if (t === "p") return Type
    if (t === "img") return ImageIcon
    if (t === "a") return LinkIcon
    if (t === "button") return Square
    if (t === "table") return Table
    if (t === "tr") return Rows
    if (t === "td" || t === "th") return Columns
    if (t === "ul" || t === "ol") return List
    if (t === "li") return Minus
    if (t === "span") return Type
    return Box
}

function prettifyTag(tag: string): string {
    const t = (tag || "").toLowerCase()
    const map: Record<string, string> = {
        h1: "Heading 1",
        h2: "Heading 2",
        h3: "Heading 3",
        h4: "Heading 4",
        h5: "Heading 5",
        h6: "Heading 6",
        p: "Paragraph",
        div: "Container",
        span: "Text",
        a: "Link",
        img: "Image",
        button: "Button",
        table: "Section",
        tr: "Row",
        td: "Cell",
        th: "Header cell",
        ul: "Bullet list",
        ol: "Numbered list",
        li: "List item",
        body: "Body",
        section: "Section",
        article: "Article",
        header: "Header",
        footer: "Footer",
    }
    return map[t] ?? t
}

function parseInlineStyle(s: string): Record<string, string> {
    const out: Record<string, string> = {}
    s.split(";").forEach((decl) => {
        const idx = decl.indexOf(":")
        if (idx > 0) {
            const key = decl.slice(0, idx).trim().toLowerCase()
            const val = decl.slice(idx + 1).trim()
            if (key && val) out[key] = val
        }
    })
    return out
}

interface SelectOption {
    id?: string
    value?: string
    name?: string
    label?: string
}

function normalizeColor(v: string): string {
    if (!v) return ""
    const trimmed = v.trim()
    if (trimmed.startsWith("#")) {
        if (trimmed.length === 4) {
            // expand #abc → #aabbcc for native color picker
            return "#" + trimmed.slice(1).split("").map((c) => c + c).join("")
        }
        return trimmed.slice(0, 7)
    }
    if (trimmed.startsWith("rgb")) {
        return rgbToHex(trimmed)
    }
    return ""
}

function rgbToHex(rgb: string): string {
    const m = rgb.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (!m) return ""
    const toHex = (n: number) =>
        Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")
    return "#" + toHex(+m[1]) + toHex(+m[2]) + toHex(+m[3])
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
                    <div className="space-y-3">
                        {traits.map((trait) => (
                            <TraitInput key={String(trait.getId())} trait={trait as unknown as TraitLike} />
                        ))}
                    </div>
                )
            }}
        </TraitsProvider>
    )
}

interface TraitLike {
    getId: () => string | number
    getName: () => string
    getLabel: () => string
    getValue: () => unknown
    setValue: (v: string) => void
    getType?: () => string
    get: (key: string) => unknown
}

function TraitInput({ trait }: { trait: TraitLike }) {
    const name = trait.getName()
    const label = trait.getLabel() || prettifyTrait(name)
    const value = (trait.getValue() as string) ?? ""
    const type = trait.getType?.() ?? "text"
    const placeholder = (trait.get("placeholder") as string) ?? defaultPlaceholder(name)
    const helpText = (trait.get("description") as string) ?? defaultHelp(name)

    return (
        <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{label}</Label>
            {type === "checkbox" ? (
                <label className="flex items-center gap-2 text-xs">
                    <input
                        type="checkbox"
                        checked={value === "true" || value === "1"}
                        onChange={(e) =>
                            trait.setValue(e.target.checked ? "true" : "")
                        }
                        className="rounded border"
                    />
                    {placeholder || label}
                </label>
            ) : (
                <Input
                    type={type === "number" ? "number" : "text"}
                    value={value}
                    onChange={(e) => trait.setValue(e.target.value)}
                    placeholder={placeholder}
                    className="h-7 text-xs"
                />
            )}
            {helpText && (
                <p className="text-[10px] text-muted-foreground/70 leading-snug">
                    {helpText}
                </p>
            )}
        </div>
    )
}

function prettifyTrait(name: string): string {
    const map: Record<string, string> = {
        href: "Link URL",
        src: "Image source",
        alt: "Alt text",
        target: "Open in",
        title: "Title (tooltip)",
        id: "HTML id",
        name: "Name",
        placeholder: "Placeholder",
    }
    return map[name] ?? name.replace(/-/g, " ")
}

function defaultPlaceholder(name: string): string {
    const map: Record<string, string> = {
        href: "https://example.com",
        src: "https://example.com/image.jpg",
        alt: "Describe the image for screen readers",
        target: "_blank",
        title: "Tooltip text",
    }
    return map[name] ?? ""
}

function defaultHelp(name: string): string {
    const map: Record<string, string> = {
        alt: "Required for accessibility — what would someone see if the image didn't load?",
        target: "Use _blank to open in a new tab.",
        href: "Make sure the URL is absolute (starts with https://).",
    }
    return map[name] ?? ""
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
    const [expanded, setExpanded] = useState(true)
    if (!editor) return null
    const cmp = editor.Components.getById(componentId)
    if (!cmp) return null

    const tagName = (cmp.get("tagName") as string) || "div"
    const label =
        (cmp.get("name") as string) ||
        (cmp.get("custom-name") as string) ||
        prettifyTag(tagName)
    const children = cmp.components()
    const hasChildren = children.length > 0
    const Icon = iconForTag(tagName)
    const isSelected = editor.getSelected()?.getId?.() === componentId

    const highlight = (on: boolean) => {
        try {
            const el = cmp.getEl?.() as HTMLElement | undefined
            if (!el) return
            if (on) {
                el.style.outline = "2px solid #4f46e5"
                el.style.outlineOffset = "2px"
                el.scrollIntoView({ block: "nearest", behavior: "smooth" })
            } else {
                el.style.outline = ""
                el.style.outlineOffset = ""
            }
        } catch {
            // ignore
        }
    }

    return (
        <div>
            <button
                type="button"
                onClick={() => editor.select(cmp)}
                onMouseEnter={() => highlight(true)}
                onMouseLeave={() => highlight(false)}
                className={`flex items-center gap-1.5 py-1 w-full text-left text-xs truncate transition-colors ${
                    isSelected
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50 text-foreground/80"
                }`}
                style={{ paddingLeft: 8 + depth * 12, paddingRight: 8 }}
            >
                {hasChildren ? (
                    <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => {
                            e.stopPropagation()
                            setExpanded((v) => !v)
                        }}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                        {expanded ? (
                            <ChevronDown className="w-3 h-3" />
                        ) : (
                            <ChevronRight className="w-3 h-3" />
                        )}
                    </span>
                ) : (
                    <span className="w-3 shrink-0" />
                )}
                <Icon className="w-3 h-3 shrink-0 opacity-70" />
                <span className="truncate">{label}</span>
            </button>
            {expanded &&
                (children as unknown as Component[]).map((child) => (
                    <LayerNode
                        key={child.getId()}
                        componentId={child.getId()}
                        depth={depth + 1}
                    />
                ))}
        </div>
    )
}
