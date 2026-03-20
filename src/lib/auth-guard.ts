"use server"

import { auth } from "@/auth"

export async function requireAuth() {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }
    if (!session.user.workspaceId) {
        throw new Error("No workspace selected")
    }
    return session
}

export async function requireAdmin() {
    const session = await requireAuth()
    const role = session.user.role
    if (role !== "ADMIN" && role !== "OWNER") {
        throw new Error("Forbidden: Admin access required")
    }
    return session
}

export async function requireRole(allowedRoles: string | string[]) {
    const session = await requireAuth()
    const role = session.user.role
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    if (!roles.includes(role)) {
        throw new Error(`Forbidden: Requires one of: ${roles.join(", ")}`)
    }
    return { session, role }
}
