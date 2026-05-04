import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { adminDb } from "@/lib/firebase-admin"
import {
    getAutomation,
    listRunsByAutomation,
} from "@/lib/automations/store"
import { listLists } from "@/lib/lists/contact-lists"
import { AutomationBuilder } from "../AutomationBuilder"

export const dynamic = "force-dynamic"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditAutomationPage({ params }: PageProps) {
    const { id } = await params
    const session = await requireAuth()
    const workspaceId = (session.user as { workspaceId: string }).workspaceId

    const automation = await getAutomation(workspaceId, id)
    if (!automation) notFound()

    const [lists, tagsSnap, templatesSnap, runs] = await Promise.all([
        listLists(workspaceId),
        adminDb
            .collection("tags")
            .where("workspaceId", "==", workspaceId)
            .limit(200)
            .get(),
        adminDb
            .collection("email_templates")
            .where("workspaceId", "==", workspaceId)
            .orderBy("updatedAt", "desc")
            .limit(50)
            .get(),
        listRunsByAutomation(workspaceId, id, 25),
    ])

    const tags = tagsSnap.docs.map((d) => ({
        id: d.id,
        name: (d.data().name as string) ?? "(untitled)",
        color: (d.data().color as string) ?? "#94a3b8",
    }))
    const templates = templatesSnap.docs.map((d) => ({
        id: d.id,
        name: (d.data().name as string) ?? "(untitled)",
        subject: (d.data().subject as string) ?? "",
        renderedHtml: (d.data().renderedHtml as string) ?? "",
    }))
    const listSummaries = lists.map((l) => ({ id: l.id, name: l.name }))

    return (
        <AutomationBuilder
            mode="edit"
            initial={automation}
            lists={listSummaries}
            tags={tags}
            templates={templates}
            recentRuns={runs.map((r) => ({
                id: r.id,
                contactId: r.contactId,
                contactEmail: r.contactEmail,
                status: r.status,
                currentNodeIdx: r.currentNodeIdx,
                startedAt: r.startedAt,
                scheduledFor: r.scheduledFor,
                errorMessage: r.errorMessage,
            }))}
        />
    )
}
