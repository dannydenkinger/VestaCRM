import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url")

    if (!url) {
        return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
    }

    // Only allow Firebase Storage URLs
    if (!url.includes("firebasestorage.app") && !url.includes("storage.googleapis.com")) {
        return NextResponse.json({ error: "Invalid URL" }, { status: 403 })
    }

    try {
        const response = await fetch(url)

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch PDF: ${response.status}` },
                { status: response.status }
            )
        }

        const arrayBuffer = await response.arrayBuffer()

        return new NextResponse(arrayBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Cache-Control": "public, max-age=3600",
            },
        })
    } catch (err) {
        console.error("PDF proxy error:", err)
        return NextResponse.json(
            { error: "Failed to proxy PDF" },
            { status: 500 }
        )
    }
}
