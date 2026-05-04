import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { adminDb } from "@/lib/firebase-admin"
import { getList, listMembers } from "@/lib/lists/contact-lists"
import { ListDetailClient, type ListMemberRow } from "./ListDetailClient"

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

    // Load first page of members — both CRM-linked and CSV-imported externals.
    const members = await listMembers(workspaceId, id, 200)

    // Hydrate CRM members with name/email from the contacts collection.
    const crmContactIds = members
        .filter((m) => m.kind === "crm")
        .map((m) => m.contactId)
    const crmContactsById = await loadContactsById(workspaceId, crmContactIds)

    const memberRows: ListMemberRow[] = members.map((m) => {
        if (m.kind === "external") {
            return {
                memberId: m.memberId,
                kind: "external",
                email: m.email,
                name: m.name ?? "",
            }
        }
        const c = crmContactsById.get(m.contactId)
        return {
            memberId: m.memberId,
            kind: "crm",
            contactId: m.contactId,
            email: c?.email ?? "",
            name: c?.name ?? "",
        }
    })

    // Sort: name (or email) ascending
    memberRows.sort((a, b) =>
        (a.name || a.email).toLowerCase().localeCompare(
            (b.name || b.email).toLowerCase(),
        ),
    )

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
                    {list.contactCount.toLocaleString()}{" "}
                    {list.contactCount === 1 ? "member" : "members"}
                </p>
            </div>
            <ListDetailClient
                listId={list.id}
                listName={list.name}
                initialMembers={memberRows}
                initialCount={list.contactCount}
            />
        </div>
    )
}

async function loadContactsById(
    workspaceId: string,
    contactIds: string[],
): Promise<Map<string, { name: string; email: string }>> {
    const out = new Map<string, { name: string; email: string }>()
    if (contactIds.length === 0) return out
    for (let i = 0; i < contactIds.length; i += 30) {
        const chunk = contactIds.slice(i, i + 30)
        const snap = await adminDb
            .collection("contacts")
            .where("workspaceId", "==", workspaceId)
            .where("__name__", "in", chunk)
            .get()
        for (const d of snap.docs) {
            const data = d.data()
            out.set(d.id, {
                name: (data.name as string) ?? "",
                email: (data.email as string) ?? "",
            })
        }
    }
    return out
}
