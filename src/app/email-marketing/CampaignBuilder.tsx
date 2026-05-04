"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { TokenInserter, insertAtCursor } from "@/components/email/TokenInserter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Send, Save, AlertTriangle, Clock, FlaskConical } from "lucide-react"
import { saveCampaignAction, sendCampaignAction } from "./actions"
import type { CampaignABTest } from "@/types"

interface TemplateSummary {
    id: string
    name: string
    subject: string
    renderedHtml: string
}

type AudienceType = "all_contacts" | "by_tag" | "by_list"

interface ListSummary {
    id: string
    name: string
    contactCount: number
}

interface Props {
    initialCampaign?: {
        id: string
        name: string
        subject: string
        templateId: string | null
        renderedHtml: string
        audienceType: AudienceType
        audienceValue: string[] | null
        excludeListIds?: string[] | null
        abTest?: CampaignABTest | null
        scheduledAt?: string | null
    }
    templates: TemplateSummary[]
    lists?: ListSummary[]
    balance: number
    sesReady: boolean
}

export function CampaignBuilder({
    initialCampaign,
    templates,
    lists = [],
    balance,
    sesReady,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [campaignId, setCampaignId] = useState<string | null>(
        initialCampaign?.id ?? null,
    )
    const [name, setName] = useState(initialCampaign?.name ?? "")
    const [subject, setSubject] = useState(initialCampaign?.subject ?? "")
    const [templateId, setTemplateId] = useState<string | null>(
        initialCampaign?.templateId ?? null,
    )
    const [html, setHtml] = useState(initialCampaign?.renderedHtml ?? "")
    const [audienceType, setAudienceType] = useState<AudienceType>(
        (initialCampaign?.audienceType as AudienceType) ?? "all_contacts",
    )
    const [audienceValue, setAudienceValue] = useState(
        (initialCampaign?.audienceValue ?? []).join(", "),
    )
    // For by_list: array of selected list IDs (multi-select)
    const [selectedListIds, setSelectedListIds] = useState<string[]>(
        initialCampaign?.audienceType === "by_list"
            ? (initialCampaign.audienceValue ?? [])
            : [],
    )
    const [excludeListIds, setExcludeListIds] = useState<string[]>(
        initialCampaign?.excludeListIds ?? [],
    )
    const [sendMode, setSendMode] = useState<"now" | "schedule">(
        initialCampaign?.scheduledAt ? "schedule" : "now",
    )
    const [scheduledAtLocal, setScheduledAtLocal] = useState<string>(() => {
        if (!initialCampaign?.scheduledAt) return ""
        // Convert ISO -> local datetime-local format (YYYY-MM-DDTHH:mm)
        const d = new Date(initialCampaign.scheduledAt)
        const pad = (n: number) => String(n).padStart(2, "0")
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    })

    const [abTest, setAbTest] = useState<CampaignABTest>(() =>
        initialCampaign?.abTest ?? {
            enabled: false,
            variants: ["", ""],
            metric: "opens",
            testPercentage: 20,
            testDurationHours: 4,
        },
    )

    const subjectInputRef = useRef<HTMLInputElement | null>(null)
    const htmlTextareaRef = useRef<HTMLTextAreaElement | null>(null)

    const insertIntoSubject = (token: string) => {
        const { value, cursor } = insertAtCursor(subjectInputRef.current, token, subject)
        setSubject(value)
        requestAnimationFrame(() => {
            const el = subjectInputRef.current
            if (el) {
                el.focus()
                el.setSelectionRange(cursor, cursor)
            }
        })
    }

    const insertIntoHtml = (token: string) => {
        const { value, cursor } = insertAtCursor(htmlTextareaRef.current, token, html)
        setHtml(value)
        requestAnimationFrame(() => {
            const el = htmlTextareaRef.current
            if (el) {
                el.focus()
                el.setSelectionRange(cursor, cursor)
            }
        })
    }

    const handleTemplateChange = (value: string) => {
        const newId = value === "none" ? null : value
        setTemplateId(newId)
        if (newId) {
            const picked = templates.find((t) => t.id === newId)
            if (picked) {
                setHtml(picked.renderedHtml)
                if (!subject.trim()) setSubject(picked.subject)
            }
        }
    }

    const canSave =
        name.trim().length > 0 && subject.trim().length > 0 && html.trim().length > 0

    const audienceValueArr = audienceValue
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

    const save = async (
        opts: { scheduledAt?: string | null } = {},
    ): Promise<string | null> => {
        if (!canSave) {
            toast.error("Name, subject, and HTML are required")
            return null
        }
        let audienceValueOut: string[] | null = null
        if (audienceType === "by_tag") audienceValueOut = audienceValueArr
        else if (audienceType === "by_list") audienceValueOut = selectedListIds

        const result = await saveCampaignAction({
            id: campaignId ?? undefined,
            name: name.trim(),
            subject: subject.trim(),
            templateId: templateId ?? null,
            renderedHtml: html,
            audienceType,
            audienceValue: audienceValueOut,
            excludeListIds: excludeListIds.length > 0 ? excludeListIds : null,
            abTest: abTest.enabled ? abTest : null,
            scheduledAt: opts.scheduledAt ?? null,
        })
        if (!result.success || !result.campaign) {
            toast.error(result.error || "Failed to save campaign")
            return null
        }
        setCampaignId(result.campaign.id)
        return result.campaign.id
    }

    const handleSaveDraft = () => {
        startTransition(async () => {
            const id = await save()
            if (id) {
                toast.success("Draft saved")
                router.push(`/email-marketing/campaigns/${id}`)
            }
        })
    }

    const handleSendNow = () => {
        if (!sesReady) {
            toast.error("Verify a SES domain before sending")
            return
        }
        if (!confirm("Send this campaign now? This will deduct credits per recipient.")) {
            return
        }
        startTransition(async () => {
            const id = await save({ scheduledAt: null })
            if (!id) return
            const result = await sendCampaignAction(id)
            if (!result.success) {
                toast.error(result.error || "Send failed")
                return
            }
            toast.success(
                `Campaign sent. ${result.sent ?? 0} delivered, ${result.failed ?? 0} failed.`,
            )
            router.push(`/email-marketing/campaigns/${id}`)
        })
    }

    const handleSchedule = () => {
        if (!sesReady) {
            toast.error("Verify a SES domain before scheduling")
            return
        }
        if (!scheduledAtLocal) {
            toast.error("Pick a date and time")
            return
        }
        const when = new Date(scheduledAtLocal)
        if (isNaN(when.getTime())) {
            toast.error("Invalid date")
            return
        }
        if (when.getTime() < Date.now() + 60_000) {
            toast.error("Pick a time at least a minute in the future")
            return
        }
        startTransition(async () => {
            const id = await save({ scheduledAt: when.toISOString() })
            if (!id) return
            toast.success(`Scheduled for ${when.toLocaleString()}`)
            router.push(`/email-marketing/campaigns/${id}`)
        })
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Campaign name</Label>
                            <Input
                                id="name"
                                placeholder="March newsletter"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isPending}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="subject">Subject line</Label>
                                <TokenInserter
                                    onInsert={insertIntoSubject}
                                    label="Token"
                                    disabled={isPending}
                                />
                            </div>
                            <Input
                                id="subject"
                                ref={subjectInputRef}
                                placeholder="What's new for {{first_name}}"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                disabled={isPending}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Template</Label>
                            <Select
                                value={templateId ?? "none"}
                                onValueChange={handleTemplateChange}
                                disabled={isPending}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a template or write HTML below" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No template (inline HTML)</SelectItem>
                                    {templates.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Picking a template fills the HTML below. You can still edit it.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="html">HTML body</Label>
                                <TokenInserter
                                    onInsert={insertIntoHtml}
                                    disabled={isPending}
                                />
                            </div>
                            <textarea
                                id="html"
                                ref={htmlTextareaRef}
                                className="w-full min-h-[240px] font-mono text-xs p-3 border rounded-md bg-background"
                                value={html}
                                onChange={(e) => setHtml(e.target.value)}
                                placeholder="<h1>Hello {{first_name}}</h1>..."
                                disabled={isPending}
                            />
                            <p className="text-xs text-muted-foreground">
                                CSS is auto-inlined at send time so Gmail/Outlook render correctly.
                                Personalization tokens (above) get filled per-recipient.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md overflow-hidden bg-white">
                            <iframe
                                title="Preview"
                                srcDoc={html || "<p style='padding:2rem;color:#999'>(no content yet)</p>"}
                                className="w-full h-[400px]"
                                sandbox=""
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Audience</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Targeting</Label>
                            <Select
                                value={audienceType}
                                onValueChange={(v) => setAudienceType(v as AudienceType)}
                                disabled={isPending}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_contacts">
                                        All contacts with email
                                    </SelectItem>
                                    <SelectItem value="by_list">By list</SelectItem>
                                    <SelectItem value="by_tag">By tag</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {audienceType === "by_tag" && (
                            <div className="space-y-2">
                                <Label htmlFor="tags">Tags (comma-separated, max 10)</Label>
                                <Input
                                    id="tags"
                                    placeholder="vip, newsletter"
                                    value={audienceValue}
                                    onChange={(e) => setAudienceValue(e.target.value)}
                                    disabled={isPending}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Matches contacts with any of the listed tags.
                                </p>
                            </div>
                        )}
                        {audienceType === "by_list" && (
                            <div className="space-y-2">
                                <Label>Include lists</Label>
                                {lists.length === 0 ? (
                                    <div className="text-xs text-muted-foreground p-3 border border-dashed rounded">
                                        No lists yet.{" "}
                                        <Link
                                            href="/email-marketing/lists/new"
                                            className="underline"
                                        >
                                            Create one
                                        </Link>
                                        .
                                    </div>
                                ) : (
                                    <div className="space-y-1 max-h-48 overflow-y-auto border rounded p-2">
                                        {lists.map((l) => (
                                            <label
                                                key={l.id}
                                                className="flex items-center gap-2 px-2 py-1 hover:bg-muted/40 rounded cursor-pointer text-sm"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedListIds.includes(l.id)}
                                                    onChange={(e) => {
                                                        setSelectedListIds((prev) =>
                                                            e.target.checked
                                                                ? [...prev, l.id]
                                                                : prev.filter((x) => x !== l.id),
                                                        )
                                                    }}
                                                    disabled={isPending}
                                                />
                                                <span className="flex-1 truncate">{l.name}</span>
                                                <span className="text-xs text-muted-foreground tabular-nums">
                                                    {l.contactCount}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Contacts in any of these lists receive the email (deduped).
                                </p>
                            </div>
                        )}

                        {lists.length > 0 && (
                            <div className="space-y-2 pt-3 border-t">
                                <Label className="text-xs">Exclude lists (optional)</Label>
                                <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                                    {lists.map((l) => (
                                        <label
                                            key={l.id}
                                            className="flex items-center gap-2 px-2 py-1 hover:bg-muted/40 rounded cursor-pointer text-sm"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={excludeListIds.includes(l.id)}
                                                onChange={(e) => {
                                                    setExcludeListIds((prev) =>
                                                        e.target.checked
                                                            ? [...prev, l.id]
                                                            : prev.filter((x) => x !== l.id),
                                                    )
                                                }}
                                                disabled={isPending}
                                            />
                                            <span className="flex-1 truncate">{l.name}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Contacts in these lists are removed from the audience even if
                                    they match above. Useful for &ldquo;send to A, except anyone in B&rdquo;.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <FlaskConical className="w-4 h-4 text-primary" />
                            A/B subject test
                        </CardTitle>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                                type="checkbox"
                                checked={abTest.enabled}
                                onChange={(e) =>
                                    setAbTest((prev) => ({
                                        ...prev,
                                        enabled: e.target.checked,
                                        variants: e.target.checked && !prev.variants[0]
                                            ? [subject, ""]
                                            : prev.variants,
                                    }))
                                }
                                disabled={isPending}
                            />
                            Enable
                        </label>
                    </CardHeader>
                    {abTest.enabled && (
                        <CardContent className="space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Subject A</Label>
                                <Input
                                    value={abTest.variants[0]}
                                    onChange={(e) =>
                                        setAbTest((p) => ({
                                            ...p,
                                            variants: [e.target.value, p.variants[1]],
                                        }))
                                    }
                                    placeholder="First subject line"
                                    disabled={isPending}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Subject B</Label>
                                <Input
                                    value={abTest.variants[1]}
                                    onChange={(e) =>
                                        setAbTest((p) => ({
                                            ...p,
                                            variants: [p.variants[0], e.target.value],
                                        }))
                                    }
                                    placeholder="Second subject line — try a different angle"
                                    disabled={isPending}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs">Test pool %</Label>
                                    <Input
                                        type="number"
                                        min={10}
                                        max={50}
                                        value={abTest.testPercentage}
                                        onChange={(e) =>
                                            setAbTest((p) => ({
                                                ...p,
                                                testPercentage: Math.max(
                                                    10,
                                                    Math.min(50, parseInt(e.target.value) || 20),
                                                ),
                                            }))
                                        }
                                        disabled={isPending}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Wait (hrs)</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={168}
                                        value={abTest.testDurationHours}
                                        onChange={(e) =>
                                            setAbTest((p) => ({
                                                ...p,
                                                testDurationHours: parseInt(e.target.value) || 4,
                                            }))
                                        }
                                        disabled={isPending}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Pick by</Label>
                                    <Select
                                        value={abTest.metric}
                                        onValueChange={(v) =>
                                            setAbTest((p) => ({
                                                ...p,
                                                metric: v as "opens" | "clicks",
                                            }))
                                        }
                                        disabled={isPending}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="opens">Opens</SelectItem>
                                            <SelectItem value="clicks">Clicks</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground/70 leading-snug">
                                {abTest.testPercentage}% of the audience gets split between
                                the two subjects. After {abTest.testDurationHours}h, the
                                winning subject (by {abTest.metric}) is sent to the rest.
                                Cron picks winners every 30 min.
                            </p>
                        </CardContent>
                    )}
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Send</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Credit balance</span>
                            <Badge variant="outline">{balance.toLocaleString()}</Badge>
                        </div>
                        {!sesReady && (
                            <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/10 p-2 rounded">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>
                                    SES domain is not verified. You can save as a draft but not send.
                                </span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>When to send</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSendMode("now")}
                                    disabled={isPending}
                                    className={`text-left p-2.5 border rounded-md text-xs transition-colors ${
                                        sendMode === "now"
                                            ? "border-primary bg-primary/5"
                                            : "hover:bg-muted/50"
                                    }`}
                                >
                                    <div className="font-medium flex items-center gap-1.5">
                                        <Send className="w-3.5 h-3.5" />
                                        Send now
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSendMode("schedule")}
                                    disabled={isPending}
                                    className={`text-left p-2.5 border rounded-md text-xs transition-colors ${
                                        sendMode === "schedule"
                                            ? "border-primary bg-primary/5"
                                            : "hover:bg-muted/50"
                                    }`}
                                >
                                    <div className="font-medium flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        Schedule
                                    </div>
                                </button>
                            </div>
                            {sendMode === "schedule" && (
                                <ScheduleControls
                                    scheduledAtLocal={scheduledAtLocal}
                                    onChange={setScheduledAtLocal}
                                    disabled={isPending}
                                />
                            )}
                        </div>

                        <Button
                            onClick={handleSaveDraft}
                            disabled={isPending || !canSave}
                            variant="outline"
                            className="w-full"
                        >
                            {isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save draft
                        </Button>
                        {sendMode === "now" ? (
                            <Button
                                onClick={handleSendNow}
                                disabled={isPending || !canSave || !sesReady}
                                className="w-full"
                            >
                                {isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4 mr-2" />
                                )}
                                Save and send now
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSchedule}
                                disabled={isPending || !canSave || !sesReady || !scheduledAtLocal}
                                className="w-full"
                            >
                                {isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Clock className="w-4 h-4 mr-2" />
                                )}
                                Schedule send
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function pad(n: number): string {
    return String(n).padStart(2, "0")
}

function toLocalInputValue(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface QuickPreset {
    label: string
    compute: () => Date
}

const QUICK_PRESETS: QuickPreset[] = [
    {
        label: "In 1 hour",
        compute: () => {
            const d = new Date()
            d.setHours(d.getHours() + 1, 0, 0, 0)
            return d
        },
    },
    {
        label: "Tomorrow 9am",
        compute: () => {
            const d = new Date()
            d.setDate(d.getDate() + 1)
            d.setHours(9, 0, 0, 0)
            return d
        },
    },
    {
        label: "Tomorrow 1pm",
        compute: () => {
            const d = new Date()
            d.setDate(d.getDate() + 1)
            d.setHours(13, 0, 0, 0)
            return d
        },
    },
    {
        label: "Next Monday 9am",
        compute: () => {
            const d = new Date()
            const day = d.getDay()
            const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7
            d.setDate(d.getDate() + daysUntilMonday)
            d.setHours(9, 0, 0, 0)
            return d
        },
    },
]

function ScheduleControls({
    scheduledAtLocal,
    onChange,
    disabled,
}: {
    scheduledAtLocal: string
    onChange: (v: string) => void
    disabled?: boolean
}) {
    // Tick every 30s so the relative time preview stays fresh.
    const [, setTick] = useState(0)
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 30_000)
        return () => clearInterval(id)
    }, [])

    const tz = useMemo(() => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone
        } catch {
            return "local"
        }
    }, [])

    const parsed = useMemo(() => {
        if (!scheduledAtLocal) return null
        const d = new Date(scheduledAtLocal)
        return isNaN(d.getTime()) ? null : d
    }, [scheduledAtLocal])

    const inPast = parsed && parsed.getTime() < Date.now()
    const tooSoon =
        parsed && parsed.getTime() < Date.now() + 60_000 && !inPast

    const relative = parsed ? formatRelativeFuture(parsed) : ""

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
                {QUICK_PRESETS.map((p) => (
                    <button
                        key={p.label}
                        type="button"
                        onClick={() => onChange(toLocalInputValue(p.compute()))}
                        disabled={disabled}
                        className="text-[11px] px-2 py-1.5 border rounded-md hover:bg-muted/50 hover:border-primary/30 transition-colors disabled:opacity-50 text-muted-foreground hover:text-foreground"
                    >
                        {p.label}
                    </button>
                ))}
            </div>
            <Input
                type="datetime-local"
                value={scheduledAtLocal}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
            />
            <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                    Timezone: <span className="font-medium">{tz}</span>
                </span>
                {parsed && (
                    <span
                        className={
                            inPast
                                ? "text-red-600"
                                : tooSoon
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                        }
                    >
                        {inPast
                            ? "Time is in the past"
                            : tooSoon
                              ? "Schedule at least 1 minute out"
                              : `Fires ${relative}`}
                    </span>
                )}
            </div>
            <p className="text-[10px] text-muted-foreground/70 leading-snug">
                Cron checks every 5 min, so actual send may fire up to 5 minutes after the scheduled time.
            </p>
        </div>
    )
}

function formatRelativeFuture(d: Date): string {
    const diffMs = d.getTime() - Date.now()
    const diffMin = Math.round(diffMs / 60_000)
    if (diffMin < 60) return `in ${diffMin} min`
    const diffHr = Math.round(diffMin / 60)
    if (diffHr < 24) return `in ${diffHr}h ${diffMin % 60}m`
    const diffDay = Math.round(diffHr / 24)
    if (diffDay < 7) return `in ${diffDay} day${diffDay === 1 ? "" : "s"}`
    return `on ${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`
}
