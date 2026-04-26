import Link from "next/link"
import { requireAuth } from "@/lib/auth-guard"
import { listTemplates } from "@/lib/campaigns/templates"
import { STARTER_TEMPLATES } from "@/lib/campaigns/starter-templates"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Sparkles, ArrowRight } from "lucide-react"
import { TemplateTile } from "./TemplateTile"
import { TemplatePreview } from "./TemplatePreview"

export const dynamic = "force-dynamic"

export default async function TemplatesListPage() {
    const session = await requireAuth()
    const workspaceId = (session.user as { workspaceId: string }).workspaceId
    const templates = await listTemplates(workspaceId)

    return (
        <div className="container mx-auto max-w-6xl py-10 px-4 space-y-10">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs text-muted-foreground mb-1">
                        <Link href="/email-marketing" className="hover:underline">
                            ← Email Marketing
                        </Link>
                    </div>
                    <h1 className="text-2xl font-semibold">Templates</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Reusable email designs. Pick one when creating a campaign.
                    </p>
                </div>
                <Link href="/email-marketing/templates/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New template
                    </Button>
                </Link>
            </div>

            {templates.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Your templates
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            {templates.length} total
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map((t) => (
                            <TemplateTile
                                key={t.id}
                                template={{
                                    id: t.id,
                                    name: t.name,
                                    subject: t.subject,
                                    description: t.description,
                                    renderedHtml: t.renderedHtml,
                                    updatedAt: t.updatedAt,
                                }}
                            />
                        ))}
                    </div>
                </section>
            )}

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Start from a template
                    </h2>
                    <span className="text-xs text-muted-foreground">
                        {STARTER_TEMPLATES.length} starters
                    </span>
                </div>
                {templates.length === 0 && (
                    <Card className="p-6 text-sm text-muted-foreground">
                        You don&apos;t have any templates yet. Pick a starter below to get
                        going in seconds — every starter is fully editable.
                    </Card>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {STARTER_TEMPLATES.map((s) => (
                        <Link
                            key={s.slug}
                            href={`/email-marketing/templates/new?starter=${s.slug}`}
                            className="group"
                        >
                            <Card className="h-full p-0 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all duration-150">
                                <TemplatePreview html={s.renderedHtml} height={180} />
                                <div className="p-4 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] uppercase tracking-wider font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                                            {s.category}
                                        </span>
                                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                    <div className="font-semibold text-sm">{s.name}</div>
                                    <div className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                                        {s.description}
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    )
}
