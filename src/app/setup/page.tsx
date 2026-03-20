import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SetupWizard } from "./SetupWizard"

const DEFAULT_STATUS = {
    firebaseConnected: false,
    google: { connected: false, calendarConnected: false, ga4PropertyId: null, gscSiteUrl: null },
    resend: { connected: false },
    anthropic: { connected: false },
    serper: { connected: false },
    wordpress: { connected: false },
    setupCompleted: false,
}

export default async function SetupPage() {
    const session = await auth()
    if (!session?.user?.email) redirect("/")

    let status
    try {
        // Dynamic import — firebase-admin throws at module level if env vars are missing.
        // This lets the wizard render even before Firebase is configured.
        const { getSetupStatus } = await import("./actions")
        status = { ...(await getSetupStatus()), firebaseConnected: true }
    } catch {
        status = DEFAULT_STATUS
    }

    return (
        <div className="min-h-dvh bg-gradient-to-b from-background to-muted/30">
            <SetupWizard initialStatus={status} />
        </div>
    )
}
