"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import dynamic from "next/dynamic"
import type { ProjectData } from "grapesjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Save, Upload, Send } from "lucide-react"
import { TokenInserter, insertAtCursor } from "@/components/email/TokenInserter"
import { buildContactContext, renderTokens } from "@/lib/templating/tokens"
import { saveTemplateAction, sendTemplateTestAction } from "../actions"

// Lazy-load GrapesJS — heavy bundle (~300 KB). Keeps initial JS small on
// every other page.
const GrapesEmailEditor = dynamic(
    () => import("@/components/email/GrapesEmailEditor").then((m) => m.GrapesEmailEditor),
    {
        ssr: false,
        loading: () => (
            <div className="py-16 text-sm text-muted-foreground text-center">
                <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" />
                Loading editor…
            </div>
        ),
    },
)

interface StarterOption {
    slug: string
    name: string
    subject: string
    description: string
    renderedHtml: string
}

interface Props {
    initial?: {
        id: string
        name: string
        subject: string
        description?: string
        renderedHtml: string
        /** Stored GrapesJS project JSON from a previous edit (null if HTML-only). */
        designJson: Record<string, unknown> | null
    }
    starterTemplates?: StarterOption[]
    workspaceName?: string
}

export function TemplateEditor({ initial, starterTemplates, workspaceName }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [templateId, setTemplateId] = useState<string | null>(initial?.id ?? null)
    const [name, setName] = useState(initial?.name ?? "")
    const [subject, setSubject] = useState(initial?.subject ?? "")
    const [description, setDescription] = useState(initial?.description ?? "")
    const [html, setHtml] = useState(initial?.renderedHtml ?? "")
    const [designJson, setDesignJson] = useState<ProjectData | null>(
        (initial?.designJson as ProjectData | null) ?? null,
    )

    // Seed HTML handed to the GrapesJS canvas on first mount. Mutating this
    // after mount doesn't re-import — we'd have to call setComponents on the
    // editor instance, which is handled via the `seedHtmlKey` force-remount.
    const [canvasSeed, setCanvasSeed] = useState<string>(initial?.renderedHtml ?? "")
    const [canvasSeedKey, setCanvasSeedKey] = useState(0)

    const subjectInputRef = useRef<HTMLInputElement | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [testTo, setTestTo] = useState("")
    const [isSendingTest, setIsSendingTest] = useState(false)

    const [previewName, setPreviewName] = useState("Jane Doe")
    const [previewEmail, setPreviewEmail] = useState("jane@example.com")
    const previewContext = buildContactContext(
        { name: previewName, email: previewEmail, phone: "+1 555 555 0100" },
        { name: workspaceName ?? "Your Company" },
    )
    const previewSubject = renderTokens(subject, previewContext)
    const previewHtml = renderTokens(html, previewContext)

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

    const handleEditorChange = (nextHtml: string, project: ProjectData) => {
        setHtml(nextHtml)
        setDesignJson(project)
    }

    const handleHtmlFileChosen = async (file: File) => {
        if (!file) return
        const lower = file.name.toLowerCase()
        if (!lower.endsWith(".html") && !lower.endsWith(".htm") && !file.type.includes("html")) {
            toast.error("Pick an .html file (the file you got from Claude / Figma export / etc.)")
            return
        }
        if (file.size > 1_000_000) {
            toast.error("HTML file is too large (max 1 MB)")
            return
        }
        try {
            const text = await file.text()
            if (html.trim() && !confirm("This will replace your current design. Continue?")) {
                return
            }
            setCanvasSeed(text)
            setCanvasSeedKey((n) => n + 1)
            setDesignJson(null)
            toast.success(`Imported ${file.name}`)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to read file")
        }
    }

    const handleUseStarter = (s: StarterOption) => {
        if (
            (name.trim() || subject.trim() || html.trim()) &&
            !confirm("This will replace your current draft. Continue?")
        ) {
            return
        }
        setName(s.name)
        setSubject(s.subject)
        setCanvasSeed(s.renderedHtml)
        setCanvasSeedKey((n) => n + 1)
        setDesignJson(null)
        toast.success(`Loaded "${s.name}"`)
    }

    const handleSendTest = () => {
        if (!testTo.trim()) {
            toast.error("Enter a recipient email")
            return
        }
        if (!subject.trim() || !html.trim()) {
            toast.error("Add a subject and design something first")
            return
        }
        setIsSendingTest(true)
        sendTemplateTestAction({
            to: testTo.trim(),
            subject: subject.trim(),
            html,
        })
            .then((res) => {
                if (!res.success) {
                    toast.error(res.error || "Send failed")
                    return
                }
                toast.success(
                    `Sent. ${res.balanceAfter !== undefined ? `Credits left: ${res.balanceAfter}` : ""}`,
                )
            })
            .catch((err) => {
                toast.error(err instanceof Error ? err.message : "Send failed")
            })
            .finally(() => setIsSendingTest(false))
    }

    const handleSave = () => {
        if (!name.trim()) {
            toast.error("Name is required")
            return
        }
        if (!html.trim()) {
            toast.error("Design something first")
            return
        }
        startTransition(async () => {
            const result = await saveTemplateAction({
                id: templateId ?? undefined,
                name: name.trim(),
                subject: subject.trim(),
                description: description.trim() || undefined,
                renderedHtml: html,
                designJson: (designJson as Record<string, unknown> | null) ?? null,
            })
            if (!result.success || !result.template) {
                toast.error(result.error || "Failed to save")
                return
            }
            setTemplateId(result.template.id)
            toast.success("Template saved")
            router.push(`/email-marketing/templates/${result.template.id}`)
        })
    }

    return (
        <div className="space-y-6">
            {!initial && starterTemplates && starterTemplates.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Start from a template</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                            Click any template to load it as a starting point. You can edit
                            everything afterward.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {starterTemplates.map((s) => (
                                <button
                                    key={s.slug}
                                    type="button"
                                    onClick={() => handleUseStarter(s)}
                                    disabled={isPending}
                                    className="text-left p-3 border rounded-md hover:bg-muted/50 transition-colors disabled:opacity-50"
                                >
                                    <div className="text-sm font-medium">{s.name}</div>
                                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {s.description}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Welcome email v2"
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="subject">Default subject</Label>
                            <TokenInserter
                                onInsert={insertIntoSubject}
                                size="sm"
                                label="Token"
                                disabled={isPending}
                            />
                        </div>
                        <Input
                            id="subject"
                            ref={subjectInputRef}
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Welcome, {{first_name}}"
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="description">Description (optional)</Label>
                        <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isPending}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Design</CardTitle>
                    <div className="flex items-center gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".html,.htm,text/html"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) handleHtmlFileChosen(f)
                                e.target.value = ""
                            }}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isPending}
                        >
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                            Import .html
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <GrapesEmailEditor
                        key={canvasSeedKey}
                        initialProject={canvasSeedKey === 0 ? designJson : null}
                        initialHtml={canvasSeed}
                        onChange={handleEditorChange}
                    />
                    <p className="text-[11px] text-muted-foreground mt-2">
                        Drag blocks from the left panel. CSS is auto-inlined at send time for
                        Gmail/Outlook compatibility.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-muted/30 rounded-md">
                        <div className="space-y-1">
                            <Label htmlFor="previewName" className="text-xs">
                                Preview as (name)
                            </Label>
                            <Input
                                id="previewName"
                                value={previewName}
                                onChange={(e) => setPreviewName(e.target.value)}
                                placeholder="Jane Doe"
                                disabled={isPending}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="previewEmail" className="text-xs">
                                Preview as (email)
                            </Label>
                            <Input
                                id="previewEmail"
                                value={previewEmail}
                                onChange={(e) => setPreviewEmail(e.target.value)}
                                placeholder="jane@example.com"
                                disabled={isPending}
                            />
                        </div>
                    </div>
                    {subject && (
                        <div className="text-sm">
                            <span className="text-muted-foreground">Subject: </span>
                            <span className="font-medium">{previewSubject}</span>
                        </div>
                    )}
                    <div className="border rounded-md overflow-hidden bg-white">
                        <iframe
                            title="Preview"
                            srcDoc={previewHtml || "<p style='padding:2rem;color:#999'>(no content yet)</p>"}
                            className="w-full h-[400px]"
                            sandbox=""
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Send a test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Sends this draft (with CSS inlined and tokens rendered) to one address.
                        Deducts 1 credit. The fastest way to catch rendering issues across Gmail / Outlook.
                    </p>
                    <div className="flex items-center gap-2">
                        <Input
                            type="email"
                            placeholder="you@example.com"
                            value={testTo}
                            onChange={(e) => setTestTo(e.target.value)}
                            disabled={isSendingTest || isPending}
                            className="max-w-xs"
                        />
                        <Button
                            type="button"
                            onClick={handleSendTest}
                            disabled={isSendingTest || isPending || !testTo.trim()}
                            variant="outline"
                        >
                            {isSendingTest ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4 mr-2" />
                            )}
                            Send test
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isPending}>
                    {isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Save template
                </Button>
            </div>
        </div>
    )
}
