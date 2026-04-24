import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { adminDb } from "@/lib/firebase-admin"
import { getList, listMemberIds } from "@/lib/lists/contact-lists"
import { ListDetailClient } from "./ListDetailClient"

export const dynamic = "force-dynamic"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ListDetailPage({ params }: PageProps) {
    const { id } = await params
    const session = await requireAuth()
    const workspaceId = (session.user as { workspaceId: string }).workspaceId

    const list = await getList(workspaceId, id)
    if (!list) notFound()

    // Load first page of members for display
    const memberIds = await listMemberIds(workspaceId, id, 200)
    const memberContacts = await loadContactsBatch(workspaceId, memberIds)

    return (
        <div className="container mx-auto max-w-5xl py-10 px-4 space-y-6">
            <div>
                <div className="text-xs text-muted-foreground mb-1">
                    <Link href="/email-marketing/lists" className="hover:underline">
                        ← Contact lists
                    </Link>
                </div>
                <h1 className="text-2xl font-semibold">{list.name}</h1>
                {list.description && (
                    <p className="text-sm text-muted-foreground mt-1">{list.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2 tabular-nums">
                    {list.contactCount.toLocaleString()} {list.contactCount === 1 ? "contact" : "contacts"}
                </p>
            </div>
            <ListDetailClient
                listId={list.id}
                listName={list.name}
                initialMembers={memberContacts}
                initialCount={list.contactCount}
            />
        </div>
    )
}

async function loadContactsBatch(
    workspaceId: string,
    contactIds: string[],
): Promise<Array<{ id: string; name: string; email: string }>> {
    if (contactIds.length === 0) return []
    const out: Array<{ id: string; name: string; email: string }> = []
    for (let i = 0; i < contactIds.length; i += 30) {
        const chunk = contactIds.slice(i, i + 30)
        const snap = await adminDb
            .collection("contacts")
            .where("workspaceId", "==", workspaceId)
            .where("__name__", "in", chunk)
            .get()
        for (const d of snap.docs) {
            const data = d.data()
            out.push({
                id: d.id,
                name: (data.name as string) ?? "",
                email: (data.email as string) ?? "",
            })
        }
    }
    return out.sort((a, b) => {
        const an = (a.name || a.email).toLowerCase()
        const bn = (b.name || b.email).toLowerCase()
        return an.localeCompare(bn)
    })
}
