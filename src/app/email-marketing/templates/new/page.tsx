import { requireAuth } from "@/lib/auth-guard"
import { adminDb } from "@/lib/firebase-admin"
import { STARTER_TEMPLATES } from "@/lib/campaigns/starter-templates"
import { TemplateEditor } from "../TemplateEditor"

export const dynamic = "force-dynamic"

export default async function NewTemplatePage() {
    const session = await requireAuth()
    const user = session.user as { workspaceId: string }

    const wsDoc = await adminDb.collection("workspaces").doc(user.workspaceId).get()
    const workspaceName = (wsDoc.data()?.name as string) || undefined

    return (
        <div className="container mx-auto max-w-6xl py-10 px-4 space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">New template</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Pick a starter, or drag + drop blocks below. Prefer to design elsewhere? Click
                    Import .html to seed the editor from a file.
                </p>
            </div>
            <TemplateEditor
                starterTemplates={STARTER_TEMPLATES}
                workspaceName={workspaceName}
            />
        </div>
    )
}
