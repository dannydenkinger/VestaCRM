import Link from "next/link"
import { requireAuth } from "@/lib/auth-guard"
import { listTemplates } from "@/lib/campaigns/templates"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Plus } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function TemplatesListPage() {
    const session = await requireAuth()
    const workspaceId = (session.user as { workspaceId: string }).workspaceId
    const templates = await listTemplates(workspaceId)

    return (
        <div className="container mx-auto max-w-6xl py-10 px-4 space-y-6">
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

            {templates.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center space-y-3">
                        <FileText className="w-10 h-10 mx-auto opacity-40" />
                        <div className="font-medium">No templates yet</div>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            Build once, reuse across campaigns. Drag blocks onto the canvas, or
                            paste HTML from anywhere.
                        </p>
                        <Link href="/email-marketing/templates/new">
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Create your first template
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((t) => (
                        <Link key={t.id} href={`/email-marketing/templates/${t.id}`}>
                            <Card className="hover:bg-muted/40 transition-colors cursor-pointer h-full">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base truncate">{t.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground truncate">
                                        {t.subject || "(no subject)"}
                                    </div>
                                    {t.description && (
                                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {t.description}
                                        </div>
                                    )}
                                    <div className="mt-3 text-[11px] text-muted-foreground">
                                        Updated {new Date(t.updatedAt).toLocaleDateString()}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
