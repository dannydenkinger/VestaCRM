import {
    generateSlots,
    getBookingPageBySlug,
    listAppointmentsInRange,
} from "@/lib/booking/store"
import { notFound } from "next/navigation"
import { adminDb } from "@/lib/firebase-admin"
import { BookingClient } from "./BookingClient"

export const dynamic = "force-dynamic"

interface PageProps {
    params: Promise<{ slug: string }>
}

export default async function PublicBookingPage({ params }: PageProps) {
    const { slug } = await params
    const page = await getBookingPageBySlug(slug)
    if (!page) notFound()

    const now = new Date()
    const horizon = new Date(now.getTime() + page.futureWindowDays * 24 * 60 * 60 * 1000)
    const existing = await listAppointmentsInRange(page.workspaceId, now, horizon)
    const days = generateSlots(page, existing, now)

    // Workspace name for the header
    const wsDoc = await adminDb.collection("workspaces").doc(page.workspaceId).get()
    const workspaceName = (wsDoc.data()?.name as string) || page.name

    return (
        <BookingClient
            slug={slug}
            pageName={page.name}
            workspaceName={workspaceName}
            timezone={page.timezone}
            slotMinutes={page.slotDurationMinutes}
            intro={page.intro}
            days={days}
        />
    )
}
