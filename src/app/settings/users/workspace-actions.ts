"use server"

import { requireAuth } from "@/lib/auth-guard"
import { adminDb } from "@/lib/firebase-admin"

export async function getUserWorkspaces() {
    const session = await requireAuth()
    const userId = session.user.id

    // Get all active memberships for this user
    const memberSnap = await adminDb.collection("workspace_members")
        .where("userId", "==", userId)
        .where("status", "==", "active")
        .get()

    if (memberSnap.empty) return []

    // Batch-fetch workspace docs
    const wsRefs = memberSnap.docs.map(d =>
        adminDb.collection("workspaces").doc(d.data().workspaceId)
    )
    const wsDocs = await adminDb.getAll(...wsRefs)

    const memberRoles = new Map(
        memberSnap.docs.map(d => [d.data().workspaceId, d.data().role])
    )

    return wsDocs
        .filter(d => d.exists)
        .map(d => ({
            id: d.id,
            name: d.data()?.name || "Unnamed Workspace",
            role: memberRoles.get(d.id) || "AGENT",
        }))
}

export async function getWorkspaceInfo(workspaceId: string) {
    const session = await requireAuth()
    const doc = await adminDb.collection("workspaces").doc(workspaceId).get()
    if (!doc.exists) return null
    const data = doc.data()
    return {
        id: doc.id,
        name: data?.name,
        slug: data?.slug,
        plan: data?.plan,
        memberCount: data?.memberCount,
        createdAt: data?.createdAt?.toDate?.()?.toISOString() || null,
    }
}
