"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Check, Link2, Code } from "lucide-react"
import { toast } from "sonner"

interface Props {
    open: boolean
    onClose: () => void
    formId: string
    formName: string
}

export function EmbedCodeDialog({ open, onClose, formId, formName }: Props) {
    const [copiedLink, setCopiedLink] = useState(false)
    const [copiedEmbed, setCopiedEmbed] = useState(false)
    const [tab, setTab] = useState<"link" | "iframe">("link")

    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    const formUrl = `${baseUrl}/form/${formId}`
    const iframeCode = `<iframe src="${formUrl}" width="100%" height="700" frameborder="0" style="border:none;max-width:600px;margin:0 auto;display:block;"></iframe>`

    const copy = (text: string, type: "link" | "embed") => {
        navigator.clipboard.writeText(text)
        toast.success("Copied!")
        if (type === "link") { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000) }
        else { setCopiedEmbed(true); setTimeout(() => setCopiedEmbed(false), 2000) }
    }

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Share &ldquo;{formName}&rdquo;</DialogTitle>
                </DialogHeader>

                <div className="flex gap-1 bg-muted rounded-lg p-0.5 mb-4">
                    {[
                        { value: "link" as const, label: "Direct Link", icon: Link2 },
                        { value: "iframe" as const, label: "Embed Code", icon: Code },
                    ].map(t => (
                        <button
                            key={t.value}
                            onClick={() => setTab(t.value)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                                tab === t.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                            }`}
                        >
                            <t.icon className="h-3.5 w-3.5" />
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === "link" ? (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Share this link anywhere — social media, emails, QR codes, or text messages.</p>
                        <div className="flex gap-2">
                            <code className="flex-1 p-2.5 bg-muted rounded-lg text-sm font-mono break-all border select-all">
                                {formUrl}
                            </code>
                            <Button variant="outline" size="icon" className="shrink-0" onClick={() => copy(formUrl, "link")}>
                                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Paste this code into your website to embed the form.</p>
                        <div className="relative">
                            <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto border select-all">
                                {iframeCode}
                            </pre>
                            <Button
                                variant="outline"
                                size="sm"
                                className="absolute top-2 right-2 h-7 text-xs"
                                onClick={() => copy(iframeCode, "embed")}
                            >
                                {copiedEmbed ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                                {copiedEmbed ? "Copied!" : "Copy"}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Works with WordPress, Wix, Squarespace, Webflow, or any site that supports HTML embeds.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
