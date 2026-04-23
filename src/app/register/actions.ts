"use server"

import bcrypt from "bcryptjs"
import { z } from "zod"
import { adminDb } from "@/lib/firebase-admin"

const registerSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    workspaceName: z.string().min(1, "Workspace name is required").max(100).optional(),
})

export async function registerUser(data: { name: string; email: string; password: string; workspaceName?: string }) {
    const parsed = registerSchema.safeParse(data)
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message }
    }

    const { name, email, password, workspaceName } = parsed.data

    try {
        // Check if this email already has an account
        const existingSnap = await adminDb.collection("users")
            .where("email", "==", email)
            .limit(1)
            .get()

        if (!existingSnap.empty) {
            const existingUser = existingSnap.docs[0]
            const userData = existingUser.data()

            // If user already has a password, they're fully registered
            if (userData.passwordHash) {
                return { success: false, error: "An account with this email already exists. Try signing in instead." }
            }

            // Pre-created user (invited to a workspace) — set their password
            const passwordHash = await bcrypt.hash(password, 12)
            await existingUser.ref.update({
                name,
                passwordHash,
                updatedAt: new Date(),
            })
            return { success: true }
        }

        // New user — create user + workspace
        const passwordHash = await bcrypt.hash(password, 12)
        const now = new Date()

        // Create user document (global — no workspaceId)
        const userRef = await adminDb.collection("users").add({
            name,
            email,
            passwordHash,
            createdAt: now,
            updatedAt: now,
        })

        // Create workspace
        const slug = (workspaceName || name + "'s Workspace")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 60)

        const wsName = workspaceName || `${name}'s Workspace`
        const workspaceRef = await adminDb.collection("workspaces").add({
            name: wsName,
            slug,
            ownerId: userRef.id,
            plan: "free",
            status: "active",
            memberCount: 1,
            contactCount: 0,
            email_credit_balance: 0,
            marketing_tier: "none",
            createdAt: now,
            updatedAt: now,
        })

        // Create workspace membership (OWNER)
        await adminDb.collection("workspace_members").add({
            workspaceId: workspaceRef.id,
            userId: userRef.id,
            role: "OWNER",
            status: "active",
            joinedAt: now,
            invitedBy: null,
        })

        // Provision default workspace data (pipeline, stages, tags, etc.)
        const { provisionWorkspace } = await import("@/lib/workspace-defaults")
        await provisionWorkspace(workspaceRef.id, wsName)

        return { success: true }
    } catch (err) {
        console.error("[REGISTER] Error:", err)
        return { success: false, error: "Something went wrong. Please try again." }
    }
}

export async function checkIsFirstUser(): Promise<boolean> {
    try {
        const snap = await adminDb.collection("users").limit(1).get()
        return snap.empty
    } catch {
        return true // If Firebase isn't configured, treat as first user
    }
}
