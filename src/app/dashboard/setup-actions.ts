"use server"

import { adminDb } from "@/lib/firebase-admin"
import { tenantDb } from "@/lib/tenant-db"
import { auth } from "@/auth"

interface SetupItem {
    id: string
    label: string
    done: boolean
    href: string
}

export async function getSetupStatus(): Promise<{
    success: boolean
    dismissed?: boolean
    items?: SetupItem[]
}> {
    try {
        const session = await auth()
        if (!session?.user) return { success: false }

        const userId = session.user.id
        if (!userId) return { success: false }

        const workspaceId = session.user.workspaceId
        const db = tenantDb(workspaceId)

        // Check if user dismissed the checklist (users collection is global)
        const userDoc = await adminDb.collection("users").doc(userId).get()
        if (userDoc.exists && userDoc.data()?.setupChecklistDismissed) {
            return { success: true, dismissed: true }
        }

        // Check each setup task in parallel — workspace-scoped collections use tenant db
        const [contactsSnap, pipelinesSnap, templatesSnap, calendarSnap, membersSnap] = await Promise.all([
            db.collection("contacts").limit(1).get(),
            db.collection("pipelines").limit(1).get(),
            db.collection("email_templates").limit(1).get(),
            adminDb.collection("calendar_integrations").where("userId", "==", userId).limit(1).get(),
            adminDb.collection("workspace_members").where("workspaceId", "==", workspaceId).where("status", "==", "active").get(),
        ])

        const hasProfile = userDoc.exists && !!(userDoc.data()?.name)
        const hasContacts = !contactsSnap.empty
        const hasPipelines = !pipelinesSnap.empty
        const hasTemplates = !templatesSnap.empty
        const hasCalendar = !calendarSnap.empty
        const hasTeamMembers = membersSnap.size > 1

        const items: SetupItem[] = [
            { id: "profile", label: "Complete your profile", done: hasProfile, href: "/settings" },
            { id: "contact", label: "Add your first contact", done: hasContacts, href: "/contacts" },
            { id: "pipeline", label: "Set up a pipeline", done: hasPipelines, href: "/pipeline" },
            { id: "templates", label: "Create an email template", done: hasTemplates, href: "/settings/automations" },
            { id: "calendar", label: "Connect Google Calendar", done: hasCalendar, href: "/settings" },
            { id: "team", label: "Invite team members", done: hasTeamMembers, href: "/settings" },
        ]

        return { success: true, dismissed: false, items }
    } catch (error) {
        console.error("Setup status error:", error)
        return { success: false }
    }
}

export async function getOnboardingCompleted(): Promise<boolean> {
    try {
        const session = await auth()
        if (!session?.user) return false
        const userId = session.user.id
        if (!userId) return false
        const userDoc = await adminDb.collection("users").doc(userId).get()
        return !!(userDoc.exists && userDoc.data()?.onboardingCompleted)
    } catch {
        return false
    }
}

export async function completeOnboarding() {
    try {
        const session = await auth()
        if (!session?.user) return { success: false }
        const userId = session.user.id
        if (!userId) return { success: false }
        await adminDb.collection("users").doc(userId).set(
            { onboardingCompleted: true },
            { merge: true }
        )
        return { success: true }
    } catch {
        return { success: false }
    }
}

export async function dismissSetupChecklist() {
    try {
        const session = await auth()
        if (!session?.user) return { success: false }

        const userId = session.user.id
        if (!userId) return { success: false }

        await adminDb.collection("users").doc(userId).update({
            setupChecklistDismissed: true,
        })

        return { success: true }
    } catch (error) {
        return { success: false }
    }
}
