import { NextResponse } from "next/server"

/**
 * Health check endpoint that verifies core service connections.
 * Useful for monitoring and onboarding setup verification.
 * 
 * Note: This route uses adminDb directly for the global health check.
 * It does not need workspace scoping since it's checking system-level connectivity.
 */
export async function GET() {
    const checks: Record<string, { status: "ok" | "missing" | "error"; detail?: string }> = {}

    // Check required env vars
    const requiredVars = [
        "NEXTAUTH_SECRET",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
        "FIREBASE_PROJECT_ID",
        "FIREBASE_PRIVATE_KEY",
        "RESEND_API_KEY",
        "RESEND_FROM_EMAIL",
    ]

    for (const v of requiredVars) {
        checks[v] = process.env[v] ? { status: "ok" } : { status: "missing" }
    }

    // Check Firebase connection (global health check — adminDb is appropriate here)
    try {
        const { adminDb } = await import("@/lib/firebase-admin")
        await adminDb.collection("_health").limit(1).get()
        checks["firebase_connection"] = { status: "ok" }
    } catch (err: any) {
        checks["firebase_connection"] = { status: "error", detail: err.message?.slice(0, 100) }
    }

    const allOk = Object.values(checks).every((c) => c.status === "ok")

    return NextResponse.json(
        { healthy: allOk, checks },
        { status: allOk ? 200 : 503 }
    )
}
