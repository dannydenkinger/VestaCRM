"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
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
import { Loader2, Send, Save, AlertTriangle } from "lucide-react"
import { saveCampaignAction, sendCampaignAction } from "./actions"

interface TemplateSummary {
    id: string
    name: string
    subject: string
    renderedHtml: string
}

type AudienceType = "all_contacts" | "by_tag"

interface Props {
    initialCampaign?: {
        id: string
        name: string
        subject: string
        templateId: string | null
        renderedHtml: string
        audienceType: AudienceType
        audienceValue: string[] | null
    }
    templates: TemplateSummary[]
    balance: number
    sesReady: boolean
}

export function CampaignBuilder({
    initialCampaign,
    templates,
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

    const save = async (): Promise<string | null> => {
        if (!canSave) {
            toast.error("Name, subject, and HTML are required")
            return null
        }
        const result = await saveCampaignAction({
            id: campaignId ?? undefined,
            name: name.trim(),
            subject: subject.trim(),
            templateId: templateId ?? null,
            renderedHtml: html,
            audienceType,
            audienceValue: audienceType === "by_tag" ? audienceValueArr : null,
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
            const id = await save()
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
                            <Label htmlFor="subject">Subject line</Label>
                            <Input
                                id="subject"
                                placeholder="What's new this month"
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
                            <Label htmlFor="html">HTML body</Label>
                            <textarea
                                id="html"
                                className="w-full min-h-[240px] font-mono text-xs p-3 border rounded-md bg-background"
                                value={html}
                                onChange={(e) => setHtml(e.target.value)}
                                placeholder="<h1>Hello {{first_name}}</h1>..."
                                disabled={isPending}
                            />
                            <p className="text-xs text-muted-foreground">
                                Personalize with{" "}
                                <code className="text-[11px]">{"{{first_name}}"}</code>,{" "}
                                <code className="text-[11px]">{"{{name}}"}</code>,{" "}
                                <code className="text-[11px]">{"{{email}}"}</code>,{" "}
                                <code className="text-[11px]">{"{{phone}}"}</code>,{" "}
                                <code className="text-[11px]">{"{{company}}"}</code>.
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
                    </CardContent>
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
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
