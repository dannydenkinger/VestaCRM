import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Add routes that don't require authentication here (e.g., public landing pages, API webhooks)
const publicRoutes = [
    "/", // If landing page is public, or login page
]

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const { nextUrl } = req

    if (nextUrl.pathname.startsWith("/api") || nextUrl.pathname.startsWith("/_next")) {
        return NextResponse.next()
    }

    const isPublicRoute = publicRoutes.includes(nextUrl.pathname)

    if (!isLoggedIn && !isPublicRoute) {
        // Redirect completely unauthenticated users to home/login
        return NextResponse.redirect(new URL("/", nextUrl))
    }

    return NextResponse.next()
})

export const config = {
    matcher: [
        // Match all routes except static assets, internal Next.js paths, and images
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
}
