"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
    ArrowLeft,
    ArrowRight,
    Clock,
    Loader2,
    Mail,
    Plus,
    Save,
    Tag,
    Trash2,
    Users,
    Workflow,
    Zap,
} from "lucide-react"
import {
    createAutomationAction,
    updateAutomationAction,
} from "./actions"
import type {
    Automation,
    AutomationNode,
    Trigger,
    TriggerType,
} from "@/lib/automations/types"

interface ListOpt { id: string; name: string }
interface TagOpt { id: string; name: string; color: string }
interface TemplateOpt { id: string; name: string; subject: string; renderedHtml: string }

interface RunSummary {
    id: string
    contactId: string
    contactEmail?: string
    status: string
    currentNodeIdx: number
    startedAt: string
    scheduledFor?: string
    errorMessage?: string
}

interface BuilderProps {
    mode: "create" | "edit"
    initial?: Automation
    lists: ListOpt[]
    tags: TagOpt[]
    templates: TemplateOpt[]
    recentRuns?: RunSummary[]
}

const TRIGGER_OPTIONS: Array<{ value: TriggerType; label: string; description: string }> = [
    { value: "contact_created", label: "Contact created", description: "When a new contact is added to the CRM." },
    { value: "contact_added_to_list", label: "Added to list", description: "When a contact is added to a specific list." },
    { value: "tag_added", label: "Tag added", description: "When a tag is added to a contact." },
    { value: "form_submitted", label: "Form submitted", description: "When someone submits one of your forms." },
    { value: "pipeline_stage_entered", label: "Pipeline stage entered", description: "When an opportunity moves into a stage." },
    { value: "opportunity_won", label: "Opportunity won", description: "When an opportunity is marked as won." },
    { value: "email_opened", label: "Email opened", description: "When a recipient opens a campaign email." },
    { value: "email_clicked", label: "Email clicked", description: "When a recipient clicks a link in a campaign email." },
    { value: "manual", label: "Manual / API", description: "Only triggered explicitly via an API call." },
]

const ACTION_PALETTE: Array<{
    type: AutomationNode["type"]
    label: string
    description: string
    Icon: React.ComponentType<{ className?: string }>
}> = [
    { type: "send_email", label: "Send email", description: "Email the contact with custom subject + body.", Icon: Mail },
    { type: "wait", label: "Wait", description: "Pause for a number of minutes / hours / days.", Icon: Clock },
    { type: "add_tag", label: "Add tag", description: "Add a tag to the contact.", Icon: Tag },
    { type: "remove_tag", label: "Remove tag", description: "Remove a tag from the contact.", Icon: Tag },
    { type: "add_to_list", label: "Add to list", description: "Add the contact to a list.", Icon: Users },
    { type: "remove_from_list", label: "Remove from list", description: "Remove the contact from a list.", Icon: Users },
    { type: "end", label: "End", description: "Stop the automation here.", Icon: Workflow },
]

let _nodeIdCounter = 1
function nextNodeId(): string {
    return `n${Date.now().toString(36)}${(_nodeIdCounter++).toString(36)}`
}

function defaultNodeFor(type: AutomationNode["type"]): AutomationNode {
    const id = nextNodeId()
    switch (type) {
        case "send_email":
            return { id, type, subject: "", html: "" }
        case "wait":
            return { id, type, delayMinutes: 60 }
        case "add_tag":
            return { id, type, tagId: "" }
        case "remove_tag":
            return { id, type, tagId: "" }
        case "add_to_list":
            return { id, type, listId: "" }
        case "remove_from_list":
            return { id, type, listId: "" }
        case "end":
            return { id, type }
        case "branch_if":
            return {
                id,
                type,
                condition: { field: "tag", targetId: "" },
                trueNext: "",
                falseNext: "",
            }
    }
}

export function AutomationBuilder({
    mode,
    initial,
    lists,
    tags,
    templates,
    recentRuns,
}: BuilderProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [name, setName] = useState(initial?.name ?? "")
    const [enabled, setEnabled] = useState(initial?.enabled ?? false)
    const [trigger, setTrigger] = useState<Trigger>(
        initial?.trigger ?? { type: "contact_created", config: {} },
    )
    const [nodes, setNodes] = useState<AutomationNode[]>(initial?.nodes ?? [])
    const [showPalette, setShowPalette] = useState(false)

    const addNode = (type: AutomationNode["type"]) => {
        setNodes((prev) => [...prev, defaultNodeFor(type)])
        setShowPalette(false)
    }

    const updateNode = (id: string, patch: Partial<AutomationNode>) => {
        setNodes((prev) =>
            prev.map((n) => (n.id === id ? ({ ...n, ...patch } as AutomationNode) : n)),
        )
    }

    const removeNode = (id: string) => {
        setNodes((prev) => prev.filter((n) => n.id !== id))
    }

    const handleSave = () => {
        if (!name.trim()) {
            toast.error("Name is required")
            return
        }
        startTransition(async () => {
            if (mode === "edit" && initial) {
                const res = await updateAutomationAction({
                    id: initial.id,
                    name: name.trim(),
                    enabled,
                    trigger,
                    // The action's zod schema uses .passthrough() on nodes —
                    // its inferred type has an index signature our
                    // discriminated union lacks. Cast at the boundary.
                    nodes: nodes as Parameters<typeof updateAutomationAction>[0]["nodes"],
                })
                if (!res.success) {
                    toast.error(res.error || "Failed to save")
                    return
                }
                toast.success("Saved")
            } else {
                const res = await createAutomationAction({
                    name: name.trim(),
                    enabled,
                    trigger,
                    nodes: nodes as Parameters<typeof createAutomationAction>[0]["nodes"],
                })
                if (!res.success || !res.automation) {
                    toast.error(res.error || "Failed to create")
                    return
                }
                toast.success("Automation created")
                router.push(`/automations/${res.automation.id}`)
            }
        })
    }

    return (
        <div className="flex flex-col h-[calc(100dvh-72px)] bg-muted/20">
            <header className="h-14 border-b shrink-0 flex items-center px-4 gap-3 bg-card">
                <Link href="/automations">
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Untitled automation"
                    className="h-9 max-w-md border-0 bg-transparent shadow-none focus-visible:bg-muted/40 font-medium"
                    disabled={isPending}
                />
                <div className="flex-1" />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                        checked={enabled}
                        onCheckedChange={setEnabled}
                        disabled={isPending}
                        aria-label="Enabled"
                    />
                    {enabled ? (
                        <span className="text-emerald-600 font-medium">Live</span>
                    ) : (
                        <span>Paused</span>
                    )}
                </div>
                <Button onClick={handleSave} disabled={isPending} size="sm">
                    {isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Save
                </Button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto py-8 px-4 space-y-3">
                    {/* Trigger card (always first) */}
                    <TriggerCard
                        trigger={trigger}
                        onChange={setTrigger}
                        lists={lists}
                        tags={tags}
                    />

                    {/* Connector */}
                    {nodes.length > 0 && <Connector />}

                    {/* Nodes */}
                    {nodes.map((node, idx) => (
                        <div key={node.id} className="space-y-3">
                            <NodeCard
                                node={node}
                                lists={lists}
                                tags={tags}
                                templates={templates}
                                onChange={(patch) => updateNode(node.id, patch)}
                                onRemove={() => removeNode(node.id)}
                                stepNumber={idx + 1}
                            />
                            {idx < nodes.length - 1 && <Connector />}
                        </div>
                    ))}

                    {nodes.length > 0 && <Connector />}

                    {/* Add-step button + palette */}
                    {showPalette ? (
                        <Card className="border-dashed border-primary/40">
                            <CardContent className="py-3 space-y-1">
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Pick an action
                                    </Label>
                                    <button
                                        type="button"
                                        onClick={() => setShowPalette(false)}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {ACTION_PALETTE.map((a) => (
                                        <button
                                            key={a.type}
                                            type="button"
                                            onClick={() => addNode(a.type)}
                                            className="text-left p-3 border rounded-md hover:bg-muted/40 hover:border-primary/30 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <a.Icon className="w-4 h-4 text-primary" />
                                                <span className="text-sm font-medium group-hover:text-primary">
                                                    {a.label}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground line-clamp-2">
                                                {a.description}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowPalette(true)}
                            className="w-full p-3 border-2 border-dashed border-muted-foreground/30 rounded-md hover:border-primary/40 hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add step
                        </button>
                    )}
                </div>

                {/* Run history (edit mode only) */}
                {mode === "edit" && recentRuns && recentRuns.length > 0 && (
                    <div className="max-w-2xl mx-auto pb-12 px-4">
                        <RunHistory runs={recentRuns} />
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Trigger card ─────────────────────────────────────────────────────────

function TriggerCard({
    trigger,
    onChange,
    lists,
    tags,
}: {
    trigger: Trigger
    onChange: (t: Trigger) => void
    lists: ListOpt[]
    tags: TagOpt[]
}) {
    const opt = TRIGGER_OPTIONS.find((o) => o.value === trigger.type)
    return (
        <Card className="border-l-4 border-l-primary">
            <CardContent className="py-4 space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Zap className="w-3.5 h-3.5" />
                    </div>
                    <Label className="text-xs uppercase tracking-wider font-semibold text-primary">
                        Trigger
                    </Label>
                </div>
                <Select
                    value={trigger.type}
                    onValueChange={(v) =>
                        onChange({ type: v as TriggerType, config: {} })
                    }
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {TRIGGER_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {opt && (
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                )}

                {/* Filters per trigger type */}
                {trigger.type === "contact_added_to_list" && (
                    <div className="space-y-1">
                        <Label className="text-xs">Specific list (optional — fires for any list if blank)</Label>
                        <Select
                            value={trigger.config.listId ?? "any"}
                            onValueChange={(v) =>
                                onChange({
                                    ...trigger,
                                    config: { ...trigger.config, listId: v === "any" ? undefined : v },
                                })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Any list" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="any">Any list</SelectItem>
                                {lists.map((l) => (
                                    <SelectItem key={l.id} value={l.id}>
                                        {l.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {(trigger.type === "tag_added" || trigger.type === "tag_removed") && (
                    <div className="space-y-1">
                        <Label className="text-xs">Specific tag (optional — fires for any tag if blank)</Label>
                        <Select
                            value={trigger.config.tagId ?? "any"}
                            onValueChange={(v) =>
                                onChange({
                                    ...trigger,
                                    config: { ...trigger.config, tagId: v === "any" ? undefined : v },
                                })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Any tag" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="any">Any tag</SelectItem>
                                {tags.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        <span className="flex items-center gap-2">
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: t.color }}
                                            />
                                            {t.name}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ── Connector line between nodes ─────────────────────────────────────────

function Connector() {
    return (
        <div className="flex justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground/40 rotate-90" />
        </div>
    )
}

// ── Node cards ───────────────────────────────────────────────────────────

function NodeCard({
    node,
    lists,
    tags,
    templates,
    onChange,
    onRemove,
    stepNumber,
}: {
    node: AutomationNode
    lists: ListOpt[]
    tags: TagOpt[]
    templates: TemplateOpt[]
    onChange: (patch: Partial<AutomationNode>) => void
    onRemove: () => void
    stepNumber: number
}) {
    const meta = ACTION_PALETTE.find((a) => a.type === node.type)
    const Icon = meta?.Icon ?? Workflow
    return (
        <Card>
            <CardContent className="py-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground tabular-nums">
                            {stepNumber}
                        </div>
                        <Icon className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium truncate">
                            {meta?.label ?? node.type}
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onRemove}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>

                <NodeBody
                    node={node}
                    lists={lists}
                    tags={tags}
                    templates={templates}
                    onChange={onChange}
                />
            </CardContent>
        </Card>
    )
}

function NodeBody({
    node,
    lists,
    tags,
    templates,
    onChange,
}: {
    node: AutomationNode
    lists: ListOpt[]
    tags: TagOpt[]
    templates: TemplateOpt[]
    onChange: (patch: Partial<AutomationNode>) => void
}) {
    if (node.type === "send_email") {
        return (
            <div className="space-y-2">
                <div className="space-y-1">
                    <Label className="text-xs">Use a template (optional)</Label>
                    <Select
                        value={node.templateId ?? "none"}
                        onValueChange={(v) => {
                            if (v === "none") {
                                onChange({ templateId: null })
                                return
                            }
                            const t = templates.find((tt) => tt.id === v)
                            if (t) {
                                onChange({
                                    templateId: t.id,
                                    subject: t.subject,
                                    html: t.renderedHtml,
                                })
                            }
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Pick a template or write inline" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No template (inline)</SelectItem>
                            {templates.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Subject</Label>
                    <Input
                        value={node.subject}
                        onChange={(e) => onChange({ subject: e.target.value })}
                        placeholder="What recipients see in their inbox"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">HTML body</Label>
                    <textarea
                        value={node.html}
                        onChange={(e) => onChange({ html: e.target.value })}
                        rows={6}
                        placeholder="<p>Hi {{first_name}}…</p>"
                        className="w-full px-2.5 py-2 text-xs font-mono border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                    <p className="text-[10px] text-muted-foreground/70">
                        Tokens like <code>{`{{first_name}}`}</code> and{" "}
                        <code>{`{{unsubscribe_url}}`}</code> render per recipient.
                    </p>
                </div>
            </div>
        )
    }

    if (node.type === "wait") {
        const minutes = node.delayMinutes
        // Decompose into days/hours/minutes for the UI
        const days = Math.floor(minutes / 1440)
        const hours = Math.floor((minutes % 1440) / 60)
        const mins = minutes % 60
        const setFrom = (d: number, h: number, m: number) =>
            onChange({ delayMinutes: d * 1440 + h * 60 + m })
        return (
            <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                    <Label className="text-xs">Days</Label>
                    <Input
                        type="number"
                        min={0}
                        value={days}
                        onChange={(e) => setFrom(parseInt(e.target.value) || 0, hours, mins)}
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Hours</Label>
                    <Input
                        type="number"
                        min={0}
                        max={23}
                        value={hours}
                        onChange={(e) => setFrom(days, parseInt(e.target.value) || 0, mins)}
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Minutes</Label>
                    <Input
                        type="number"
                        min={0}
                        max={59}
                        value={mins}
                        onChange={(e) => setFrom(days, hours, parseInt(e.target.value) || 0)}
                    />
                </div>
            </div>
        )
    }

    if (node.type === "add_tag" || node.type === "remove_tag") {
        return (
            <div className="space-y-1">
                <Label className="text-xs">Tag</Label>
                <Select
                    value={node.tagId || ""}
                    onValueChange={(v) => onChange({ tagId: v })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Pick a tag" />
                    </SelectTrigger>
                    <SelectContent>
                        {tags.length === 0 && (
                            <SelectItem value="none" disabled>
                                No tags yet
                            </SelectItem>
                        )}
                        {tags.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                                <span className="flex items-center gap-2">
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: t.color }}
                                    />
                                    {t.name}
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )
    }

    if (node.type === "add_to_list" || node.type === "remove_from_list") {
        return (
            <div className="space-y-1">
                <Label className="text-xs">List</Label>
                <Select
                    value={node.listId || ""}
                    onValueChange={(v) => onChange({ listId: v })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Pick a list" />
                    </SelectTrigger>
                    <SelectContent>
                        {lists.length === 0 && (
                            <SelectItem value="none" disabled>
                                No lists yet
                            </SelectItem>
                        )}
                        {lists.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                                {l.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )
    }

    if (node.type === "end") {
        return (
            <p className="text-xs text-muted-foreground">
                The run completes when it reaches this step.
            </p>
        )
    }

    return null
}

// ── Run history ─────────────────────────────────────────────────────────

function RunHistory({ runs }: { runs: RunSummary[] }) {
    return (
        <Card>
            <CardContent className="py-4 space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Recent runs
                </Label>
                <div className="divide-y">
                    {runs.map((r) => (
                        <div
                            key={r.id}
                            className="flex items-center justify-between py-2 text-xs"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        r.status === "completed"
                                            ? "bg-emerald-500"
                                            : r.status === "errored"
                                              ? "bg-red-500"
                                              : r.status === "waiting"
                                                ? "bg-amber-500"
                                                : "bg-muted-foreground"
                                    }`}
                                />
                                <span className="truncate font-mono text-[11px]">
                                    {r.contactEmail || r.contactId.slice(0, 12) + "…"}
                                </span>
                                <span className="text-muted-foreground">
                                    step {r.currentNodeIdx + 1}
                                </span>
                                {r.errorMessage && (
                                    <span
                                        className="text-red-600 text-[10px] truncate"
                                        title={r.errorMessage}
                                    >
                                        {r.errorMessage}
                                    </span>
                                )}
                            </div>
                            <div className="text-muted-foreground tabular-nums shrink-0">
                                {new Date(r.startedAt).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
