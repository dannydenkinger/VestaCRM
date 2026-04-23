"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import Script from "next/script"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Save, AlertTriangle } from "lucide-react"
import { saveTemplateAction } from "../actions"

interface Props {
    initial?: {
        id: string
        name: string
        subject: string
        description?: string
        renderedHtml: string
        topolJson: Record<string, unknown> | null
    }
    topolApiKey: string | null
    topolUserId: string
}

declare global {
    interface Window {
        TopolPlugin?: {
            init: (options: Record<string, unknown>) => void
            save: () => void
            load: (json: Record<string, unknown>) => void
            destroy?: () => void
        }
    }
}

const TOPOL_SCRIPT = "https://plugin.topol.io/main.min.js"

export function TemplateEditor({ initial, topolApiKey, topolUserId }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [templateId, setTemplateId] = useState<string | null>(initial?.id ?? null)
    const [name, setName] = useState(initial?.name ?? "")
    const [subject, setSubject] = useState(initial?.subject ?? "")
    const [description, setDescription] = useState(initial?.description ?? "")
    const [html, setHtml] = useState(initial?.renderedHtml ?? "")
    const [topolJson, setTopolJson] = useState<Record<string, unknown> | null>(
        initial?.topolJson ?? null,
    )
    const [topolReady, setTopolReady] = useState(false)
    const initializedRef = useRef(false)

    useEffect(() => {
        if (!topolApiKey) return
        if (!topolReady) return
        if (initializedRef.current) return
        if (typeof window === "undefined" || !window.TopolPlugin) return

        initializedRef.current = true
        window.TopolPlugin.init({
            id: "#topol-container",
            authorize: { apiKey: topolApiKey, userId: topolUserId },
            template: topolJson ?? undefined,
            callbacks: {
                onSave: (json: Record<string, unknown>, exportedHtml: string) => {
                    setTopolJson(json)
                    setHtml(exportedHtml)
                    toast.success("Design captured. Click Save template to persist.")
                },
                onSaveAndClose: (json: Record<string, unknown>, exportedHtml: string) => {
                    setTopolJson(json)
                    setHtml(exportedHtml)
                },
            },
            language: "en",
        })

        return () => {
            if (window.TopolPlugin?.destroy) {
                try {
                    window.TopolPlugin.destroy()
                } catch {
                    // ignore
                }
            }
            initializedRef.current = false
        }
    }, [topolApiKey, topolUserId, topolReady, topolJson])

    const handleSave = () => {
        if (!name.trim()) {
            toast.error("Name is required")
            return
        }
        // If Topol is available and user has made changes, pull latest first
        if (topolApiKey && topolReady && window.TopolPlugin) {
            try {
                window.TopolPlugin.save()
            } catch {
                // Topol's save triggers the onSave callback synchronously in recent versions.
            }
        }
        startTransition(async () => {
            const result = await saveTemplateAction({
                id: templateId ?? undefined,
                name: name.trim(),
                subject: subject.trim(),
                description: description.trim() || undefined,
                renderedHtml: html,
                topolJson,
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
            {topolApiKey && (
                <Script
                    src={TOPOL_SCRIPT}
                    strategy="afterInteractive"
                    onLoad={() => setTopolReady(true)}
                />
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
                        <Label htmlFor="subject">Default subject</Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Welcome to Acme"
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

            {topolApiKey ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Design</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div id="topol-container" style={{ minHeight: 600 }} />
                        {!topolReady && (
                            <div className="py-12 text-sm text-muted-foreground text-center">
                                <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" />
                                Loading Topol editor…
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Card className="border-amber-500/40 bg-amber-500/5">
                        <CardContent className="pt-6 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <div className="font-medium">Topol builder not configured</div>
                                <p className="text-muted-foreground mt-1">
                                    Set <code>NEXT_PUBLIC_TOPOL_API_KEY</code> in <code>.env.local</code> to enable the
                                    drag-and-drop editor. For now, paste HTML below.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>HTML body</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                className="w-full min-h-[400px] font-mono text-xs p-3 border rounded-md bg-background"
                                value={html}
                                onChange={(e) => setHtml(e.target.value)}
                                placeholder="<h1>Hello {{name}}</h1>"
                                disabled={isPending}
                            />
                        </CardContent>
                    </Card>
                </>
            )}

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
