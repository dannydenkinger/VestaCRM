"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
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
    Briefcase,
    CalendarClock,
    CheckCircle2,
    ClipboardCopy,
    Clock,
    Coffee,
    GitBranch,
    Globe,
    Loader2,
    Mail,
    MessageSquare,
    Pencil,
    Plus,
    Save,
    Sparkles,
    StopCircle,
    Tag,
    Target,
    TestTube,
    Trash2,
    TrendingUp,
    UserCheck,
    Users,
    Workflow,
    Zap,
} from "lucide-react"
import {
    bulkEnrollAction,
    createAutomationAction,
    enrollTestRunAction,
    updateAutomationAction,
} from "./actions"
import { AutomationCanvas } from "./AutomationCanvas"
import type {
    Automation,
    AutomationNode,
    Trigger,
    TriggerType,
} from "@/lib/automations/types"

interface ListOpt { id: string; name: string }
interface TagOpt { id: string; name: string; color: string }
interface TemplateOpt { id: string; name: string; subject: string; renderedHtml: string }
interface UserOpt { id: string; name: string; email: string }

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
    users?: UserOpt[]
    recentRuns?: RunSummary[]
    /** Public app URL for displaying the webhook-in URL (passed in from server). */
    appUrl?: string
}

const TRIGGER_OPTIONS: Array<{ value: TriggerType; label: string; description: string }> = [
    { value: "contact_created", label: "Contact created", description: "When a new contact is added to the CRM." },
    { value: "contact_added_to_list", label: "Added to list", description: "When a contact is added to a specific list." },
    { value: "tag_added", label: "Tag added", description: "When a tag is added to a contact." },
    { value: "form_submitted", label: "Form submitted", description: "When someone submits one of your forms." },
    { value: "pipeline_stage_entered", label: "Pipeline stage entered", description: "When an opportunity moves into a stage." },
    { value: "opportunity_created", label: "Opportunity created", description: "When a new deal/opportunity is created." },
    { value: "opportunity_won", label: "Opportunity won", description: "When an opportunity is marked as won." },
    { value: "opportunity_lost", label: "Opportunity lost", description: "When an opportunity is marked as closed_lost." },
    { value: "opportunity_value_changed", label: "Opportunity value changed", description: "When an opportunity's deal value changes." },
    { value: "opportunity_stale", label: "Opportunity stale", description: "Daily check: open opportunity hasn't moved in N days." },
    { value: "email_opened", label: "Email opened", description: "When a recipient opens a campaign email." },
    { value: "email_clicked", label: "Email clicked", description: "When a recipient clicks a link in a campaign email." },
    { value: "contact_field_updated", label: "Contact field updated", description: "When a specific field on the contact changes." },
    { value: "sms_replied", label: "SMS replied", description: "When a contact sends an SMS to your Twilio number." },
    { value: "appointment_booked", label: "Appointment booked", description: "External scheduler (Calendly, Cal.com, Acuity) POSTs when a meeting is booked." },
    { value: "birthday", label: "Birthday", description: "Fires daily for any contact whose birthday matches today (UTC)." },
    { value: "anniversary", label: "Anniversary", description: "Fires daily for any contact whose anniversary matches today (UTC)." },
    { value: "webhook_in", label: "Webhook (external)", description: "External system POSTs to a unique URL to enroll a contact." },
    { value: "manual", label: "Manual / API", description: "Only triggered explicitly via an API call." },
]

const ACTION_PALETTE: Array<{
    type: AutomationNode["type"]
    label: string
    description: string
    Icon: React.ComponentType<{ className?: string }>
}> = [
    { type: "send_email", label: "Send email", description: "Email the contact with custom subject + body.", Icon: Mail },
    { type: "ai_send_email", label: "AI email", description: "Claude writes a personalized body per recipient, then sends.", Icon: Sparkles },
    { type: "send_sms", label: "Send SMS", description: "Text the contact via Twilio. Requires Twilio credentials in Settings.", Icon: MessageSquare },
    { type: "wait", label: "Wait", description: "Pause for a number of minutes / hours / days.", Icon: Clock },
    { type: "wait_until", label: "Wait until date", description: "Pause until a specific calendar time.", Icon: CalendarClock },
    { type: "wait_until_business_hours", label: "Wait for business hours", description: "Pause until the next business window opens.", Icon: Coffee },
    { type: "branch_if", label: "If / then", description: "Take a different path based on a condition.", Icon: GitBranch },
    { type: "stop_if", label: "Stop if", description: "Exit early if a condition is true (e.g. unsubscribed).", Icon: StopCircle },
    { type: "add_tag", label: "Add tag", description: "Add a tag to the contact.", Icon: Tag },
    { type: "remove_tag", label: "Remove tag", description: "Remove a tag from the contact.", Icon: Tag },
    { type: "add_to_list", label: "Add to list", description: "Add the contact to a list.", Icon: Users },
    { type: "remove_from_list", label: "Remove from list", description: "Remove the contact from a list.", Icon: Users },
    { type: "update_contact_field", label: "Update field", description: "Set a field on the contact (status, etc.).", Icon: Pencil },
    { type: "increment_field", label: "Increment field", description: "Add to a numeric field (lead score, points).", Icon: TrendingUp },
    { type: "assign_user", label: "Assign user", description: "Set the contact's owner.", Icon: UserCheck },
    { type: "create_task", label: "Create task", description: "Create a follow-up task linked to the contact.", Icon: Briefcase },
    { type: "send_internal_email", label: "Internal email", description: "Email a teammate (lead notification).", Icon: Mail },
    { type: "update_opportunity", label: "Update opportunity", description: "Set a field on the trigger's opportunity (status, stage, etc.).", Icon: Pencil },
    { type: "webhook", label: "Webhook", description: "POST run context to an external URL.", Icon: Globe },
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
        case "ai_send_email":
            return {
                id,
                type,
                subject: "Following up, {{first_name}}",
                prompt:
                    "Write a friendly, personal follow-up email referencing that they recently signed up. Mention one specific way our product can help. Keep it short — 3 short paragraphs. Sign off as 'Sam from {{company}}'.",
                model: "claude-haiku-4-5",
                maxOutputTokens: 600,
            }
        case "send_sms":
            return {
                id,
                type,
                body: "Hey {{first_name}}, quick note from {{company}} — reply STOP to opt out.",
            }
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
        case "stop_if":
            return {
                id,
                type,
                condition: { field: "tag", targetId: "" },
            }
        case "update_contact_field":
            return { id, type, fieldPath: "", value: "" }
        case "increment_field":
            return { id, type, fieldPath: "leadScore", delta: 10 }
        case "assign_user":
            return { id, type, userId: "" }
        case "create_task":
            return { id, type, title: "Follow up with {{first_name}}", dueOffsetDays: 1 }
        case "send_internal_email":
            return { id, type, to: "", subject: "New lead: {{first_name}}", body: "" }
        case "update_opportunity":
            return { id, type, fieldPath: "status", value: "closed_won" }
        case "webhook":
            return { id, type, url: "" }
        case "wait_until":
            return { id, type, until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
        case "wait_until_business_hours":
            return {
                id,
                type,
                startHour: 9,
                endHour: 17,
                businessDays: [1, 2, 3, 4, 5],
                timezone: typeof Intl !== "undefined"
                    ? Intl.DateTimeFormat().resolvedOptions().timeZone
                    : "UTC",
            }
    }
}

export function AutomationBuilder({
    mode,
    initial,
    lists,
    tags,
    templates,
    users = [],
    recentRuns,
    appUrl,
}: BuilderProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [name, setName] = useState(initial?.name ?? "")
    const [enabled, setEnabled] = useState(initial?.enabled ?? false)
    const [trigger, setTrigger] = useState<Trigger>(
        initial?.trigger ?? { type: "contact_created", config: {} },
    )
    const [nodes, setNodes] = useState<AutomationNode[]>(initial?.nodes ?? [])
    const [allowReEnroll, setAllowReEnroll] = useState(initial?.allowReEnroll ?? false)
    const [goal, setGoal] = useState<Automation["goal"] | null>(initial?.goal ?? null)
    const [showPalette, setShowPalette] = useState(false)
    const [view, setView] = useState<"list" | "canvas">(() => {
        if (typeof window === "undefined") return "list"
        return (localStorage.getItem("vesta:automations:view") as "list" | "canvas") ?? "list"
    })
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

    const setViewPersisted = (next: "list" | "canvas") => {
        setView(next)
        try {
            localStorage.setItem("vesta:automations:view", next)
        } catch { /* ignore */ }
    }

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
                    allowReEnroll,
                    goal: (goal as Parameters<typeof updateAutomationAction>[0]["goal"]) ?? null,
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
                    allowReEnroll,
                    goal: (goal as Parameters<typeof createAutomationAction>[0]["goal"]) ?? null,
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

                <div className="flex items-center bg-muted rounded-md p-0.5 text-xs">
                    <button
                        type="button"
                        onClick={() => setViewPersisted("list")}
                        className={`px-2.5 py-1 rounded transition-colors ${
                            view === "list"
                                ? "bg-background shadow-sm font-medium"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        List
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewPersisted("canvas")}
                        className={`px-2.5 py-1 rounded transition-colors ${
                            view === "canvas"
                                ? "bg-background shadow-sm font-medium"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Canvas
                    </button>
                </div>

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
                {mode === "edit" && initial && (
                    <TestEnrollButton automationId={initial.id} />
                )}
                <Button onClick={handleSave} disabled={isPending} size="sm">
                    {isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Save
                </Button>
            </header>

            <div className="flex-1 min-h-0 overflow-hidden">
                {view === "canvas" ? (
                    <CanvasLayout
                        nodes={nodes}
                        selectedNodeId={selectedNodeId}
                        setSelectedNodeId={setSelectedNodeId}
                        showPalette={showPalette}
                        setShowPalette={setShowPalette}
                        addNode={addNode}
                        removeNode={removeNode}
                        updateNode={updateNode}
                        trigger={trigger}
                        setTrigger={setTrigger}
                        lists={lists}
                        tags={tags}
                        templates={templates}
                        users={users}
                    />
                ) : (
                <div className="h-full overflow-y-auto">
                <div className="max-w-2xl mx-auto py-8 px-4 space-y-3">
                    {/* Settings card — re-enroll, goal, webhook URL, bulk enroll */}
                    {mode === "edit" && initial && (
                        <SettingsCard
                            automationId={initial.id}
                            allowReEnroll={allowReEnroll}
                            onAllowReEnrollChange={setAllowReEnroll}
                            goal={goal ?? null}
                            onGoalChange={setGoal}
                            webhookUrl={
                                (trigger.type === "webhook_in" ||
                                    trigger.type === "appointment_booked") &&
                                initial.webhookToken &&
                                appUrl
                                    ? `${appUrl}/api/automations/trigger/${initial.webhookToken}`
                                    : null
                            }
                            lists={lists}
                            tags={tags}
                        />
                    )}

                    {/* Trigger card (always second when settings visible) */}
                    <TriggerCard
                        trigger={trigger}
                        onChange={setTrigger}
                        lists={lists}
                        tags={tags}
                    />

                    {/* Connector */}
                    {nodes.length > 0 && <Connector />}

                    {/* Nodes */}
                    {nodes.map((node, idx) => {
                        // For each node, find any branch_if nodes that target it
                        const sources: BranchSource[] = []
                        nodes.forEach((other, otherIdx) => {
                            if (other.type !== "branch_if") return
                            if (other.trueNext === node.id) {
                                sources.push({
                                    sourceStepNumber: otherIdx + 1,
                                    branchType: "true",
                                })
                            }
                            if (other.falseNext === node.id) {
                                sources.push({
                                    sourceStepNumber: otherIdx + 1,
                                    branchType: "false",
                                })
                            }
                        })
                        return (
                            <div key={node.id} className="space-y-3">
                                <NodeCard
                                    node={node}
                                    lists={lists}
                                    tags={tags}
                                    templates={templates}
                                    users={users}
                                    onChange={(patch) => updateNode(node.id, patch)}
                                    onRemove={() => removeNode(node.id)}
                                    stepNumber={idx + 1}
                                    allNodes={nodes}
                                    branchSources={sources}
                                />
                                {idx < nodes.length - 1 && <Connector />}
                            </div>
                        )
                    })}

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
                )}
            </div>
        </div>
    )
}

// ── Canvas layout (split: ReactFlow + side panel) ──────────────────────

interface CanvasLayoutProps {
    nodes: AutomationNode[]
    selectedNodeId: string | null
    setSelectedNodeId: (id: string | null) => void
    showPalette: boolean
    setShowPalette: (b: boolean) => void
    addNode: (type: AutomationNode["type"]) => void
    removeNode: (id: string) => void
    updateNode: (id: string, patch: Partial<AutomationNode>) => void
    trigger: Trigger
    setTrigger: (t: Trigger) => void
    lists: ListOpt[]
    tags: TagOpt[]
    templates: TemplateOpt[]
    users: UserOpt[]
}

function CanvasLayout({
    nodes,
    selectedNodeId,
    setSelectedNodeId,
    showPalette,
    setShowPalette,
    addNode,
    removeNode,
    updateNode,
    trigger,
    setTrigger,
    lists,
    tags,
    templates,
    users,
}: CanvasLayoutProps) {
    const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null
    const triggerLabel =
        TRIGGER_OPTIONS.find((o) => o.value === trigger.type)?.label ?? trigger.type

    const actionMeta = useMemo(() => {
        const out: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {}
        for (const a of ACTION_PALETTE) {
            out[a.type] = { label: a.label, Icon: a.Icon }
        }
        return out
    }, [])

    return (
        <div className="flex h-full">
            <div className="flex-1 relative bg-muted/10">
                <AutomationCanvas
                    nodes={nodes}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={setSelectedNodeId}
                    onAddNodeRequest={() => setShowPalette(true)}
                    onUpdateNode={updateNode}
                    onRemoveNode={removeNode}
                    triggerLabel={triggerLabel}
                    actionMeta={actionMeta}
                />
                {showPalette && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 p-6">
                        <Card className="max-w-md w-full">
                            <CardContent className="py-4 space-y-2">
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
                                <div className="grid grid-cols-2 gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
                                    {ACTION_PALETTE.map((a) => (
                                        <button
                                            key={a.type}
                                            type="button"
                                            onClick={() => {
                                                addNode(a.type)
                                                setShowPalette(false)
                                            }}
                                            className="text-left p-3 border rounded-md hover:bg-muted/40 hover:border-primary/30 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <a.Icon className="w-4 h-4 text-primary" />
                                                <span className="text-sm font-medium group-hover:text-primary">
                                                    {a.label}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                                                {a.description}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <div className="w-96 shrink-0 border-l bg-card overflow-y-auto">
                {selectedNode ? (
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                Edit step
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    removeNode(selectedNode.id)
                                    setSelectedNodeId(null)
                                }}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                        <NodeBody
                            node={selectedNode}
                            lists={lists}
                            tags={tags}
                            templates={templates}
                            users={users}
                            onChange={(patch) => updateNode(selectedNode.id, patch)}
                            allNodes={nodes}
                        />
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                            Trigger
                        </div>
                        <TriggerCard
                            trigger={trigger}
                            onChange={setTrigger}
                            lists={lists}
                            tags={tags}
                        />
                        <p className="text-xs text-muted-foreground pt-4 leading-relaxed">
                            Click a step in the canvas to edit it. Branch_if steps draw two
                            outgoing arrows: green = TRUE, red = FALSE. Dashed lines mean
                            &quot;fall through to the next step&quot;.
                        </p>
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

                {trigger.type === "contact_field_updated" && (
                    <div className="space-y-1">
                        <Label className="text-xs">Field path (optional — any field if blank)</Label>
                        <Input
                            value={trigger.config.fieldPath ?? ""}
                            onChange={(e) =>
                                onChange({
                                    ...trigger,
                                    config: { ...trigger.config, fieldPath: e.target.value || undefined },
                                })
                            }
                            placeholder="status"
                            className="font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground/70">
                            e.g. <code>status</code>, <code>leadScore</code>
                        </p>
                    </div>
                )}

                {trigger.type === "opportunity_stale" && (
                    <div className="space-y-1">
                        <Label className="text-xs">
                            Inactive for how many days?
                        </Label>
                        <Input
                            type="number"
                            min={1}
                            max={365}
                            value={trigger.config.staleDays ?? 14}
                            onChange={(e) =>
                                onChange({
                                    ...trigger,
                                    config: {
                                        ...trigger.config,
                                        staleDays: parseInt(e.target.value) || 14,
                                    },
                                })
                            }
                        />
                        <p className="text-[10px] text-muted-foreground/70">
                            Daily check at 14:00 UTC. Open opportunities not updated
                            in this many days fire the trigger.
                        </p>
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

interface BranchSource {
    sourceStepNumber: number
    branchType: "true" | "false"
}

function NodeCard({
    node,
    lists,
    tags,
    templates,
    users,
    onChange,
    onRemove,
    stepNumber,
    allNodes,
    branchSources,
}: {
    node: AutomationNode
    lists: ListOpt[]
    tags: TagOpt[]
    templates: TemplateOpt[]
    users: UserOpt[]
    onChange: (patch: Partial<AutomationNode>) => void
    onRemove: () => void
    stepNumber: number
    allNodes: AutomationNode[]
    /** Other nodes that branch INTO this node (so we can show "← branch in from step N"). */
    branchSources?: BranchSource[]
}) {
    const meta = ACTION_PALETTE.find((a) => a.type === node.type)
    const Icon = meta?.Icon ?? Workflow
    return (
        <Card>
            <CardContent className="py-4 space-y-3">
                {branchSources && branchSources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        {branchSources.map((src, i) => (
                            <span
                                key={i}
                                className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
                                    src.branchType === "true"
                                        ? "bg-emerald-500/10 text-emerald-700"
                                        : "bg-red-500/10 text-red-700"
                                }`}
                            >
                                ← {src.branchType.toUpperCase()} from step {src.sourceStepNumber}
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground tabular-nums">
                            {stepNumber}
                        </div>
                        <Icon className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium truncate">
                            {meta?.label ?? node.type}
                        </span>
                        <button
                            type="button"
                            onClick={() => navigator.clipboard?.writeText(node.id)}
                            className="text-[10px] font-mono text-muted-foreground/60 hover:text-foreground bg-muted px-1.5 py-0.5 rounded shrink-0"
                            title="Click to copy step id (use as branch target)"
                        >
                            {node.id}
                        </button>
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
                    users={users}
                    onChange={onChange}
                    allNodes={allNodes}
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
    users,
    onChange,
    allNodes,
}: {
    node: AutomationNode
    lists: ListOpt[]
    tags: TagOpt[]
    templates: TemplateOpt[]
    users: UserOpt[]
    onChange: (patch: Partial<AutomationNode>) => void
    allNodes?: AutomationNode[]
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

    if (node.type === "ai_send_email") {
        return (
            <div className="space-y-2">
                <div className="space-y-1">
                    <Label className="text-xs">Subject (tokens supported)</Label>
                    <Input
                        value={node.subject}
                        onChange={(e) => onChange({ subject: e.target.value })}
                        placeholder="Following up, {{first_name}}"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-primary" />
                        Tell Claude what to write
                    </Label>
                    <textarea
                        value={node.prompt}
                        onChange={(e) => onChange({ prompt: e.target.value })}
                        rows={6}
                        placeholder="Write a friendly follow-up about… Mention X. Sign off as Sam."
                        className="w-full px-2.5 py-2 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                    <p className="text-[10px] text-muted-foreground/70 leading-snug">
                        Recipient name + email are auto-injected. Don&apos;t use
                        <code> {"{{first_name}}"}</code> in the body — Claude
                        addresses them by name directly.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Model</Label>
                        <Select
                            value={node.model || "claude-haiku-4-5"}
                            onValueChange={(v) =>
                                onChange({ model: v as "claude-haiku-4-5" | "claude-sonnet-4-6" | "claude-opus-4-7" })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="claude-haiku-4-5">
                                    Haiku 4.5 — fastest, cheapest
                                </SelectItem>
                                <SelectItem value="claude-sonnet-4-6">
                                    Sonnet 4.6 — better quality
                                </SelectItem>
                                <SelectItem value="claude-opus-4-7">
                                    Opus 4.7 — best quality
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Max output tokens</Label>
                        <Input
                            type="number"
                            min={100}
                            max={2000}
                            step={100}
                            value={node.maxOutputTokens ?? 600}
                            onChange={(e) =>
                                onChange({
                                    maxOutputTokens: parseInt(e.target.value) || 600,
                                })
                            }
                        />
                    </div>
                </div>
                <p className="text-[10px] text-muted-foreground/70 leading-snug">
                    Costs Anthropic API tokens per recipient on top of the standard email
                    credit. The system prompt is cached so high-volume drips reuse it.
                </p>
            </div>
        )
    }

    if (node.type === "send_sms") {
        const len = node.body?.length ?? 0
        const segments = len === 0 ? 0 : Math.ceil(len / 160)
        return (
            <div className="space-y-1">
                <Label className="text-xs">Message body</Label>
                <textarea
                    value={node.body}
                    onChange={(e) => onChange({ body: e.target.value })}
                    rows={4}
                    placeholder="Hey {{first_name}}, …"
                    maxLength={1600}
                    className="w-full px-2.5 py-2 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                    <span>
                        Tokens like <code>{"{{first_name}}"}</code> are rendered per recipient.
                    </span>
                    <span className="tabular-nums">
                        {len} chars · {segments} segment{segments === 1 ? "" : "s"}
                    </span>
                </div>
                <p className="text-[10px] text-amber-700/80 leading-snug">
                    Compliance: include an opt-out (e.g. &ldquo;Reply STOP&rdquo;) on first
                    contact and avoid sending outside business hours.
                </p>
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

    if (node.type === "branch_if" || node.type === "stop_if") {
        // Both share the condition picker; branch_if also needs true/false targets.
        return (
            <BranchEditor
                node={node}
                lists={lists}
                tags={tags}
                onChange={onChange}
                allNodes={allNodes ?? []}
                currentNodeId={node.id}
            />
        )
    }

    if (node.type === "update_contact_field") {
        return (
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <Label className="text-xs">Field path</Label>
                    <Input
                        value={node.fieldPath}
                        onChange={(e) => onChange({ fieldPath: e.target.value })}
                        placeholder="status"
                    />
                    <p className="text-[10px] text-muted-foreground/70">
                        e.g. <code>status</code>, <code>customFields.lead_score</code>
                    </p>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Value</Label>
                    <Input
                        value={String(node.value ?? "")}
                        onChange={(e) => onChange({ value: e.target.value })}
                        placeholder="Customer"
                    />
                    <p className="text-[10px] text-muted-foreground/70">
                        Strings & numbers only in v1.
                    </p>
                </div>
            </div>
        )
    }

    if (node.type === "update_opportunity") {
        return (
            <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Field path</Label>
                        <Input
                            value={node.fieldPath}
                            onChange={(e) => onChange({ fieldPath: e.target.value })}
                            placeholder="status"
                        />
                        <p className="text-[10px] text-muted-foreground/70">
                            e.g. <code>status</code>, <code>priority</code>,{" "}
                            <code>opportunityValue</code>
                        </p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Value</Label>
                        <Input
                            value={String(node.value ?? "")}
                            onChange={(e) => onChange({ value: e.target.value })}
                            placeholder="closed_won"
                        />
                    </div>
                </div>
                <p className="text-[10px] text-muted-foreground/70 leading-snug">
                    Only fires when the trigger has an opportunityId in its payload —
                    pipeline_stage_entered, opportunity_*, etc.
                </p>
            </div>
        )
    }

    if (node.type === "webhook") {
        return (
            <div className="space-y-2">
                <div className="space-y-1">
                    <Label className="text-xs">Webhook URL</Label>
                    <Input
                        value={node.url}
                        onChange={(e) => onChange({ url: e.target.value })}
                        placeholder="https://hooks.zapier.com/…"
                        type="url"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Authorization header (optional)</Label>
                    <Input
                        value={node.authHeader ?? ""}
                        onChange={(e) => onChange({ authHeader: e.target.value })}
                        placeholder="Bearer …"
                    />
                </div>
                <p className="text-[10px] text-muted-foreground/70 leading-snug">
                    Sends a JSON POST with workspaceId, contactId, email,
                    name, runId, triggerType. 5-second timeout.
                </p>
            </div>
        )
    }

    if (node.type === "wait_until") {
        const local = isoToLocalInput(node.until)
        return (
            <div className="space-y-1">
                <Label className="text-xs">Resume at (your local timezone)</Label>
                <Input
                    type="datetime-local"
                    value={local}
                    onChange={(e) =>
                        onChange({ until: localInputToIso(e.target.value) })
                    }
                />
                <p className="text-[10px] text-muted-foreground/70">
                    Cron checks every 5 min, so actual resume can drift up to 5 min.
                </p>
            </div>
        )
    }

    if (node.type === "wait_until_business_hours") {
        return (
            <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Start hour (0-23)</Label>
                        <Input
                            type="number"
                            min={0}
                            max={23}
                            value={node.startHour ?? 9}
                            onChange={(e) =>
                                onChange({ startHour: parseInt(e.target.value) || 0 })
                            }
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">End hour (0-23)</Label>
                        <Input
                            type="number"
                            min={0}
                            max={23}
                            value={node.endHour ?? 17}
                            onChange={(e) =>
                                onChange({ endHour: parseInt(e.target.value) || 0 })
                            }
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Timezone (IANA)</Label>
                    <Input
                        value={node.timezone ?? "UTC"}
                        onChange={(e) => onChange({ timezone: e.target.value })}
                        placeholder="America/New_York"
                        className="font-mono"
                    />
                </div>
                <p className="text-[10px] text-muted-foreground/70">
                    Days: Mon–Fri (weekend skip is built in).
                </p>
            </div>
        )
    }

    if (node.type === "increment_field") {
        return (
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <Label className="text-xs">Field path</Label>
                    <Input
                        value={node.fieldPath}
                        onChange={(e) => onChange({ fieldPath: e.target.value })}
                        placeholder="leadScore"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Delta (negative to subtract)</Label>
                    <Input
                        type="number"
                        value={node.delta}
                        onChange={(e) =>
                            onChange({ delta: parseInt(e.target.value) || 0 })
                        }
                    />
                </div>
            </div>
        )
    }

    if (node.type === "assign_user") {
        return (
            <div className="space-y-1">
                <Label className="text-xs">Assign to</Label>
                <Select
                    value={node.userId || "__unassign"}
                    onValueChange={(v) =>
                        onChange({ userId: v === "__unassign" ? "" : v })
                    }
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__unassign">— Unassign</SelectItem>
                        {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                                {u.name || u.email}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )
    }

    if (node.type === "create_task") {
        return (
            <div className="space-y-2">
                <div className="space-y-1">
                    <Label className="text-xs">Title (tokens supported)</Label>
                    <Input
                        value={node.title}
                        onChange={(e) => onChange({ title: e.target.value })}
                        placeholder="Follow up with {{first_name}}"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Description (optional)</Label>
                    <textarea
                        value={node.description ?? ""}
                        onChange={(e) =>
                            onChange({ description: e.target.value })
                        }
                        rows={3}
                        className="w-full px-2.5 py-2 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Assignee (optional)</Label>
                        <Select
                            value={node.assigneeId || "__none"}
                            onValueChange={(v) =>
                                onChange({ assigneeId: v === "__none" ? "" : v })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none">No assignee</SelectItem>
                                {users.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                        {u.name || u.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Due in (days)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={node.dueOffsetDays ?? 1}
                            onChange={(e) =>
                                onChange({
                                    dueOffsetDays: parseInt(e.target.value) || 0,
                                })
                            }
                        />
                    </div>
                </div>
            </div>
        )
    }

    if (node.type === "send_internal_email") {
        return (
            <div className="space-y-2">
                <div className="space-y-1">
                    <Label className="text-xs">To (comma-separated)</Label>
                    <Input
                        value={node.to}
                        onChange={(e) => onChange({ to: e.target.value })}
                        placeholder="sales@yourco.com, manager@yourco.com"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Subject</Label>
                    <Input
                        value={node.subject}
                        onChange={(e) => onChange({ subject: e.target.value })}
                        placeholder="New lead: {{first_name}}"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Body (tokens supported)</Label>
                    <textarea
                        value={node.body}
                        onChange={(e) => onChange({ body: e.target.value })}
                        rows={4}
                        className="w-full px-2.5 py-2 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                </div>
            </div>
        )
    }

    return null
}

function isoToLocalInput(iso: string): string {
    if (!iso) return ""
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ""
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(s: string): string {
    if (!s) return ""
    const d = new Date(s)
    return isNaN(d.getTime()) ? "" : d.toISOString()
}

// ── Branch / stop editor (shared) ───────────────────────────────────────

const CONDITION_FIELDS: Array<{
    value: "tag" | "list_membership" | "email_opened" | "email_clicked"
    label: string
}> = [
    { value: "tag", label: "Contact has tag" },
    { value: "list_membership", label: "Contact is on list" },
    { value: "email_opened", label: "Contact opened campaign" },
    { value: "email_clicked", label: "Contact clicked campaign" },
]

function BranchEditor({
    node,
    lists,
    tags,
    onChange,
    allNodes,
    currentNodeId,
}: {
    node: import("@/lib/automations/types").BranchIfNode | import("@/lib/automations/types").StopIfNode
    lists: ListOpt[]
    tags: TagOpt[]
    onChange: (patch: Partial<AutomationNode>) => void
    allNodes: AutomationNode[]
    currentNodeId: string
}) {
    const c = node.condition
    // Step options for branch targets — exclude self
    const stepOptions = allNodes
        .map((n, idx) => ({ id: n.id, label: stepLabel(n, idx + 1) }))
        .filter((o) => o.id !== currentNodeId)
    return (
        <div className="space-y-2">
            <div className="space-y-1">
                <Label className="text-xs">Condition</Label>
                <Select
                    value={c.field}
                    onValueChange={(v) =>
                        onChange({
                            condition: {
                                field: v as typeof c.field,
                                targetId: "",
                            },
                        } as Partial<AutomationNode>)
                    }
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {CONDITION_FIELDS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                                {f.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {(c.field === "tag" || c.field === "list_membership") && (
                <div className="space-y-1">
                    <Label className="text-xs">
                        {c.field === "tag" ? "Tag" : "List"}
                    </Label>
                    <Select
                        value={c.targetId || ""}
                        onValueChange={(v) =>
                            onChange({
                                condition: { ...c, targetId: v },
                            } as Partial<AutomationNode>)
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={`Pick a ${c.field === "tag" ? "tag" : "list"}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {(c.field === "tag" ? tags : lists).map((opt) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                    {"color" in opt ? (
                                        <span className="flex items-center gap-2">
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: (opt as TagOpt).color }}
                                            />
                                            {opt.name}
                                        </span>
                                    ) : (
                                        opt.name
                                    )}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {(c.field === "email_opened" || c.field === "email_clicked") && (
                <div className="space-y-1">
                    <Label className="text-xs">Campaign ID</Label>
                    <Input
                        value={c.targetId || ""}
                        onChange={(e) =>
                            onChange({
                                condition: { ...c, targetId: e.target.value },
                            } as Partial<AutomationNode>)
                        }
                        placeholder="paste campaign id"
                    />
                    <p className="text-[10px] text-muted-foreground/70">
                        Pull the id from the campaign URL.
                    </p>
                </div>
            )}

            {node.type === "branch_if" && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                        <Label className="text-xs text-emerald-700">If TRUE → jump to</Label>
                        <Select
                            value={node.trueNext || "__fall"}
                            onValueChange={(v) =>
                                onChange({
                                    trueNext: v === "__fall" ? "" : v,
                                } as Partial<AutomationNode>)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__fall">→ next step</SelectItem>
                                {stepOptions.map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-red-700">If FALSE → jump to</Label>
                        <Select
                            value={node.falseNext || "__fall"}
                            onValueChange={(v) =>
                                onChange({
                                    falseNext: v === "__fall" ? "" : v,
                                } as Partial<AutomationNode>)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__fall">→ next step</SelectItem>
                                {stepOptions.map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
        </div>
    )
}

function stepLabel(node: AutomationNode, stepNumber: number): string {
    const meta = ACTION_PALETTE.find((a) => a.type === node.type)
    return `Step ${stepNumber} · ${meta?.label ?? node.type}`
}

// ── Settings card (re-enroll, goal, webhook URL, bulk enroll) ───────────

function SettingsCard({
    automationId,
    allowReEnroll,
    onAllowReEnrollChange,
    goal,
    onGoalChange,
    webhookUrl,
    lists,
    tags,
}: {
    automationId: string
    allowReEnroll: boolean
    onAllowReEnrollChange: (v: boolean) => void
    goal: Automation["goal"] | null
    onGoalChange: (g: Automation["goal"] | null) => void
    webhookUrl: string | null
    lists: ListOpt[]
    tags: TagOpt[]
}) {
    const [bulkOpen, setBulkOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const goalEnabled = goal !== null

    const copyWebhook = () => {
        if (!webhookUrl) return
        navigator.clipboard?.writeText(webhookUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    return (
        <Card>
            <CardContent className="py-3 space-y-3">
                {webhookUrl && (
                    <div className="space-y-1.5 pb-2 border-b">
                        <Label className="text-xs flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5" />
                            Public webhook URL
                        </Label>
                        <div className="flex items-center gap-1.5">
                            <Input
                                value={webhookUrl}
                                readOnly
                                className="font-mono text-[11px] bg-muted/40"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={copyWebhook}
                                className="shrink-0"
                            >
                                {copied ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                    <ClipboardCopy className="w-3.5 h-3.5" />
                                )}
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70 leading-snug">
                            POST <code>{`{ email, name? }`}</code> to enroll a contact.
                            HMAC-signed — only this exact URL works.
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                            type="checkbox"
                            checked={allowReEnroll}
                            onChange={(e) => onAllowReEnrollChange(e.target.checked)}
                        />
                        <span>Allow re-enrollment when trigger fires again</span>
                    </label>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setBulkOpen((v) => !v)}
                    >
                        <Users className="w-3.5 h-3.5 mr-1.5" />
                        Bulk enroll
                    </Button>
                </div>

                {bulkOpen && (
                    <BulkEnrollPanel
                        automationId={automationId}
                        lists={lists}
                        tags={tags}
                        onClose={() => setBulkOpen(false)}
                    />
                )}

                <div className="pt-2 border-t space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                            type="checkbox"
                            checked={goalEnabled}
                            onChange={(e) =>
                                onGoalChange(
                                    e.target.checked
                                        ? { type: "opportunity_won", config: {} }
                                        : null,
                                )
                            }
                        />
                        <Target className="w-3.5 h-3.5 text-primary" />
                        <span>Track a conversion goal</span>
                    </label>
                    {goal && (
                        <div className="pl-6 space-y-1">
                            <Label className="text-xs">Goal trigger</Label>
                            <Select
                                value={goal.type}
                                onValueChange={(v) =>
                                    onGoalChange({
                                        type: v as TriggerType,
                                        config: {},
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TRIGGER_OPTIONS.filter(
                                        (o) =>
                                            o.value !== "manual" &&
                                            o.value !== "webhook_in",
                                    ).map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground/70">
                                Runs end as <strong>goal_reached</strong> the moment this
                                event fires for the contact — counts as a conversion in
                                stats.
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function BulkEnrollPanel({
    automationId,
    lists,
    tags,
    onClose,
}: {
    automationId: string
    lists: ListOpt[]
    tags: TagOpt[]
    onClose: () => void
}) {
    const [audienceType, setAudienceType] = useState<
        "all_contacts" | "by_list" | "by_tag"
    >("all_contacts")
    const [listId, setListId] = useState("")
    const [tagId, setTagId] = useState("")
    const [isPending, startTransition] = useTransition()

    const handleEnroll = () => {
        if (audienceType === "by_list" && !listId) {
            toast.error("Pick a list")
            return
        }
        if (audienceType === "by_tag" && !tagId) {
            toast.error("Pick a tag")
            return
        }
        if (
            !confirm(
                "Bulk-enroll up to 1000 contacts now? This is irreversible.",
            )
        ) {
            return
        }
        startTransition(async () => {
            const audience =
                audienceType === "by_list"
                    ? { type: "by_list" as const, listId }
                    : audienceType === "by_tag"
                      ? { type: "by_tag" as const, tagId }
                      : { type: "all_contacts" as const }
            const res = await bulkEnrollAction({ automationId, audience })
            if (!res.success) {
                toast.error(res.error || "Failed")
                return
            }
            toast.success(
                `Enrolled ${res.enrolled} (skipped ${res.skipped} of ${res.attempted})`,
            )
            onClose()
        })
    }

    return (
        <div className="p-3 bg-muted/30 rounded-md border border-dashed space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
                {(
                    [
                        { v: "all_contacts", label: "All contacts" },
                        { v: "by_list", label: "By list" },
                        { v: "by_tag", label: "By tag" },
                    ] as const
                ).map((opt) => (
                    <button
                        key={opt.v}
                        type="button"
                        onClick={() => setAudienceType(opt.v)}
                        disabled={isPending}
                        className={`text-xs py-1.5 px-2 rounded border transition-colors ${
                            audienceType === opt.v
                                ? "border-primary bg-primary/5 text-primary"
                                : "hover:bg-muted/50"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
            {audienceType === "by_list" && (
                <Select value={listId} onValueChange={setListId} disabled={isPending}>
                    <SelectTrigger>
                        <SelectValue placeholder="Pick a list" />
                    </SelectTrigger>
                    <SelectContent>
                        {lists.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                                {l.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {audienceType === "by_tag" && (
                <Select value={tagId} onValueChange={setTagId} disabled={isPending}>
                    <SelectTrigger>
                        <SelectValue placeholder="Pick a tag" />
                    </SelectTrigger>
                    <SelectContent>
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
            )}
            <div className="flex justify-end gap-1.5">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    disabled={isPending}
                >
                    Cancel
                </Button>
                <Button onClick={handleEnroll} disabled={isPending} size="sm">
                    {isPending ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Enroll up to 1000
                </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/70">
                Skips contacts already enrolled (unless re-enrollment is on).
            </p>
        </div>
    )
}

// ── Test enrollment ─────────────────────────────────────────────────────

function TestEnrollButton({ automationId }: { automationId: string }) {
    const [open, setOpen] = useState(false)
    const [email, setEmail] = useState("")
    const [isPending, startTransition] = useTransition()

    const handleSubmit = () => {
        if (!email.includes("@")) {
            toast.error("Enter a valid email")
            return
        }
        startTransition(async () => {
            const res = await enrollTestRunAction({ automationId, email })
            if (!res.success) {
                toast.error(res.error || "Test failed")
                return
            }
            toast.success("Test run enrolled — check the run history below")
            setEmail("")
            setOpen(false)
        })
    }

    if (!open) {
        return (
            <Button
                onClick={() => setOpen(true)}
                size="sm"
                variant="outline"
                className="gap-1.5"
            >
                <TestTube className="w-3.5 h-3.5" />
                Test
            </Button>
        )
    }

    return (
        <div className="flex items-center gap-1.5">
            <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit()
                    if (e.key === "Escape") {
                        setOpen(false)
                        setEmail("")
                    }
                }}
                placeholder="email to enroll"
                className="h-8 text-xs w-56"
                autoFocus
                disabled={isPending}
            />
            <Button
                onClick={handleSubmit}
                disabled={isPending || !email.trim()}
                size="sm"
                className="h-8"
            >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Run"}
            </Button>
            <Button
                onClick={() => {
                    setOpen(false)
                    setEmail("")
                }}
                disabled={isPending}
                size="sm"
                variant="ghost"
                className="h-8"
            >
                Cancel
            </Button>
        </div>
    )
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
