import Link from "next/link"
import { requireAuth } from "@/lib/auth-guard"
import { listTemplates } from "@/lib/campaigns/templates"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Plus } from "lucide-react"
import { TemplateTile } from "./TemplateTile"

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
                        <TemplateTile
                            key={t.id}
                            template={{
                                id: t.id,
                                name: t.name,
                                subject: t.subject,
                                description: t.description,
                                updatedAt: t.updatedAt,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
