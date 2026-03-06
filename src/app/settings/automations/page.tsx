import { redirect } from "next/navigation"

export default function AutomationsPage() {
    redirect("/settings?tab=automations")
}
