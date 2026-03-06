"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Globe, Send, ExternalLink, RefreshCw, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { publishToWordPress, getArticleExportData } from "./actions"
import type { BlogArticle } from "./types"

interface WordPressPublisherProps {
    article: BlogArticle
    imageBase64?: string
}

export default function WordPressPublisher({ article, imageBase64 }: WordPressPublisherProps) {
    const [publishing, setPublishing] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [copied, setCopied] = useState<"html" | "md" | "schema" | null>(null)

    const handlePublish = async () => {
        if (article.seoScore < 50) {
            toast.error("SEO score too low. Aim for 50+ before publishing.")
            return
        }

        setPublishing(true)
        try {
            const result = await publishToWordPress(article.id, imageBase64)
            if (result.success && result.data) {
                toast.success(`Published to WordPress! Post ID: ${result.data.postId}`)
            } else {
                toast.error(result.error || "Failed to publish")
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to publish")
        }
        setPublishing(false)
    }

    const handleExport = async (format: "html" | "md" | "schema") => {
        setExporting(true)
        try {
            const result = await getArticleExportData(article.id)
            if (result.success && result.data) {
                const text =
                    format === "html"
                        ? result.data.html
                        : format === "md"
                        ? result.data.markdown
                        : result.data.schema

                await navigator.clipboard.writeText(text)
                setCopied(format)
                setTimeout(() => setCopied(null), 2000)
                toast.success(`${format.toUpperCase()} copied to clipboard`)
            } else {
                toast.error(result.error || "Failed to export")
            }
        } catch (error: any) {
            toast.error(error.message || "Export failed")
        }
        setExporting(false)
    }

    return (
        <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-500" />
                        <CardTitle className="text-sm font-semibold">Publishing</CardTitle>
                    </div>
                    {article.wpPostId && (
                        <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-500">
                            WP #{article.wpPostId}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* WordPress Status */}
                {article.wpPublishedUrl && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-emerald-500">Live on WordPress</span>
                            <a
                                href={article.wpPublishedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-primary flex items-center gap-1 hover:underline"
                            >
                                View <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                        </div>
                        {article.wpLastSynced && (
                            <p className="text-[9px] text-muted-foreground mt-1">
                                Last synced: {new Date(article.wpLastSynced).toLocaleString()}
                            </p>
                        )}
                    </div>
                )}

                {/* Publish / Update button */}
                <Button
                    className="w-full h-9 text-xs gap-2"
                    onClick={handlePublish}
                    disabled={publishing}
                >
                    {publishing ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                        <Send className="h-3 w-3" />
                    )}
                    {article.wpPostId
                        ? publishing
                            ? "Updating..."
                            : "Update on WordPress"
                        : publishing
                        ? "Publishing..."
                        : "Publish to WordPress"}
                </Button>

                {/* Export options */}
                <div className="pt-2 border-t border-border/50">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                        Copy / Export
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] gap-1"
                            onClick={() => handleExport("html")}
                            disabled={exporting}
                        >
                            {copied === "html" ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                            HTML
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] gap-1"
                            onClick={() => handleExport("md")}
                            disabled={exporting}
                        >
                            {copied === "md" ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                            Markdown
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] gap-1"
                            onClick={() => handleExport("schema")}
                            disabled={exporting}
                        >
                            {copied === "schema" ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                            Schema
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
