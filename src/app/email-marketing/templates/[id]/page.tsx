import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { getTemplate } from "@/lib/campaigns/templates"
import { TemplateEditor } from "../TemplateEditor"

export const dynamic = "force-dynamic"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditTemplatePage({ params }: PageProps) {
    const { id } = await params
    const session = await requireAuth()
    const user = session.user as { id: string; workspaceId: string }

    const template = await getTemplate(user.workspaceId, id)
    if (!template) notFound()

    return (
        <div className="container mx-auto max-w-6xl py-10 px-4 space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Edit template</h1>
                <p className="text-sm text-muted-foreground mt-1 truncate">{template.name}</p>
            </div>
            <TemplateEditor
                initial={{
                    id: template.id,
                    name: template.name,
                    subject: template.subject,
                    description: template.description,
                    renderedHtml: template.renderedHtml,
                    topolJson: template.topolJson,
                }}
                topolApiKey={process.env.NEXT_PUBLIC_TOPOL_API_KEY || null}
                topolUserId={`ws-${user.id}`}
            />
        </div>
    )
}
