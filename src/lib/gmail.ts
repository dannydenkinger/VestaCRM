import { adminDb } from "@/lib/firebase-admin"

interface GmailTokens {
    accessToken: string
    refreshToken: string
    accessTokenExpires: number
    email: string
}

async function getGmailTokens(): Promise<GmailTokens | null> {
    const doc = await adminDb.collection("oauth_tokens").doc("gmail").get()
    if (!doc.exists) return null
    return doc.data() as GmailTokens
}

async function refreshAccessToken(tokens: GmailTokens): Promise<string> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: tokens.refreshToken,
        }),
    })
    const data = await response.json()
    if (!data.access_token) throw new Error("Failed to refresh Gmail token")

    // Update stored token
    await adminDb.collection("oauth_tokens").doc("gmail").update({
        accessToken: data.access_token,
        accessTokenExpires: Date.now() + data.expires_in * 1000,
        updatedAt: new Date().toISOString(),
    })

    return data.access_token
}

async function getValidAccessToken(): Promise<string> {
    const tokens = await getGmailTokens()
    if (!tokens) throw new Error("No Gmail tokens found. Please sign out and sign back in to grant Gmail access.")

    if (Date.now() < tokens.accessTokenExpires - 60000) {
        return tokens.accessToken
    }

    return refreshAccessToken(tokens)
}

interface GmailMessage {
    id: string
    subject: string
    from: string
    date: string
    body: string
}

export async function fetchHaroEmails(opts?: {
    maxResults?: number
    afterDate?: string
}): Promise<GmailMessage[]> {
    const accessToken = await getValidAccessToken()
    const maxResults = opts?.maxResults || 5

    // Search for HARO emails
    let query = "from:haro@helpareporter.com subject:HARO"
    if (opts?.afterDate) {
        query += ` after:${opts.afterDate}`
    }

    // List messages matching the query
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
    const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!listRes.ok) {
        const err = await listRes.text()
        throw new Error(`Gmail API list error: ${listRes.status} ${err}`)
    }

    const listData = await listRes.json()
    if (!listData.messages || listData.messages.length === 0) return []

    // Fetch full message content for each
    const messages: GmailMessage[] = []
    for (const msg of listData.messages) {
        const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`
        const msgRes = await fetch(msgUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!msgRes.ok) continue
        const msgData = await msgRes.json()

        // Extract headers
        const headers = msgData.payload?.headers || []
        const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || ""
        const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || ""
        const date = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || ""

        // Extract body (prefer text/plain)
        let body = ""
        const payload = msgData.payload

        if (payload?.body?.data) {
            body = base64UrlDecode(payload.body.data)
        } else if (payload?.parts) {
            // Look for text/plain part
            const textPart = findPart(payload.parts, "text/plain")
            if (textPart?.body?.data) {
                body = base64UrlDecode(textPart.body.data)
            } else {
                // Fallback to text/html
                const htmlPart = findPart(payload.parts, "text/html")
                if (htmlPart?.body?.data) {
                    body = stripHtml(base64UrlDecode(htmlPart.body.data))
                }
            }
        }

        messages.push({ id: msg.id, subject, from, date, body })
    }

    return messages
}

function findPart(parts: any[], mimeType: string): any {
    for (const part of parts) {
        if (part.mimeType === mimeType) return part
        if (part.parts) {
            const found = findPart(part.parts, mimeType)
            if (found) return found
        }
    }
    return null
}

function base64UrlDecode(data: string): string {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/")
    const bytes = Buffer.from(base64, "base64")
    return bytes.toString("utf-8")
}

function stripHtml(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
}
