import { requireAuth } from "@/lib/auth-guard"
import { adminDb } from "@/lib/firebase-admin"
import { STARTER_TEMPLATES } from "@/lib/campaigns/starter-templates"
import { TemplateEditor } from "../TemplateEditor"

export const dynamic = "force-dynamic"

interface PageProps {
    searchParams: Promise<{ starter?: string }>
}

export default async function NewTemplatePage({ searchParams }: PageProps) {
    const session = await requireAuth()
    const user = session.user as { workspaceId: string }

    const wsDoc = await adminDb.collection("workspaces").doc(user.workspaceId).get()
    const workspaceName = (wsDoc.data()?.name as string) || undefined

    const { starter: starterSlug } = await searchParams
    const preselectedStarter = starterSlug
        ? STARTER_TEMPLATES.find((s) => s.slug === starterSlug)
        : undefined

    return (
        <TemplateEditor
            starterTemplates={STARTER_TEMPLATES}
            preselectedStarter={preselectedStarter}
            workspaceName={workspaceName}
        />
    )
}
