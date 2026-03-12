import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { adminDb } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
    const session = await auth()
    if (!session?.user) {
        return NextResponse.json({ error: "Not signed in" })
    }

    const url = new URL(request.url)
    const s = session as any

    // If ?clear-batches=true, delete all haro_batches so emails reprocess
    if (url.searchParams.get("clear-batches") === "true") {
        const batchesSnap = await adminDb.collection("haro_batches").get()
        const queriesSnap = await adminDb.collection("haro_queries").get()
        const batch = adminDb.batch()
        batchesSnap.docs.forEach(doc => batch.delete(doc.ref))
        queriesSnap.docs.forEach(doc => batch.delete(doc.ref))
        await batch.commit()
        return NextResponse.json({
            action: "Cleared all HARO batches and queries",
            deletedBatches: batchesSnap.size,
            deletedQueries: queriesSnap.size,
        })
    }

    // If ?fix=true, overwrite Firestore with session tokens
    if (url.searchParams.get("fix") === "true" && s.refreshToken) {
        await adminDb.collection("oauth_tokens").doc("gmail").set({
            accessToken: s.accessToken,
            refreshToken: s.refreshToken,
            accessTokenExpires: s.accessTokenExpires,
            email: session.user.email,
            updatedAt: new Date().toISOString(),
        })

        // Now test the refresh with the new token
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: s.refreshToken,
            }),
        })
        const data = await response.json()

        return NextResponse.json({
            action: "Fixed! Overwrote Firestore with session tokens.",
            refreshTest: {
                status: response.status,
                hasNewAccessToken: !!data.access_token,
                error: data.error,
                errorDescription: data.error_description,
                scope: data.scope,
            }
        })
    }

    // Debug info
    const debug: Record<string, any> = {}
    debug.session = {
        email: session.user.email,
        hasAccessToken: !!s.accessToken,
        hasRefreshToken: !!s.refreshToken,
        refreshTokenPrefix: s.refreshToken ? String(s.refreshToken).substring(0, 15) + "..." : "MISSING",
    }

    const tokenDoc = await adminDb.collection("oauth_tokens").doc("gmail").get()
    if (tokenDoc.exists) {
        const data = tokenDoc.data()!
        debug.firestore = {
            refreshTokenPrefix: data.refreshToken ? String(data.refreshToken).substring(0, 15) + "..." : "MISSING",
            tokenMatch: s.refreshToken === data.refreshToken ? "MATCH" : "MISMATCH — visit ?fix=true to update",
        }
    }

    return NextResponse.json(debug)
}
