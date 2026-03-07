import { auth } from "@/auth"

const ROLE_HIERARCHY: Record<string, number> = { OWNER: 3, ADMIN: 2, AGENT: 1 }

export async function requireAuth() {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")
    return session
}

export async function requireRole(minimum: "AGENT" | "ADMIN" | "OWNER") {
    const session = await requireAuth()
    const userRole = (session.user as any).role || "AGENT"
    if ((ROLE_HIERARCHY[userRole] || 0) < ROLE_HIERARCHY[minimum]) {
        throw new Error("Insufficient permissions")
    }
    return session
}

export function getUserRole(session: any): string {
    return (session?.user as any)?.role || "AGENT"
}
