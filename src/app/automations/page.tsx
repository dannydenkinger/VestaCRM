import Link from "next/link"
import { requireAuth } from "@/lib/auth-guard"
import { listAutomations } from "@/lib/automations/store"
import { STARTER_AUTOMATIONS } from "@/lib/automations/starters"
import { Button } from "@/components/ui/button"
import { Plus, Workflow } from "lucide-react"
import { AutomationListClient } from "./AutomationListClient"
import { StarterGrid } from "./StarterGrid"

export const dynamic = "force-dynamic"

export default async function AutomationsPage() {
    const session = await requireAuth()
    const workspaceId = (session.user as { workspaceId: string }).workspaceId
    const automations = await listAutomations(workspaceId)

    return (
        <div className="container mx-auto max-w-5xl py-10 px-4 space-y-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <Workflow className="w-6 h-6 text-primary" />
                        Automations
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                        Trigger emails, tags, and list actions automatically when
                        something happens — a contact signs up, joins a list, or
                        moves through your pipeline.
                    </p>
                </div>
                <Link href="/automations/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New automation
                    </Button>
                </Link>
            </div>

            {automations.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Your automations
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            {automations.length} total
                        </span>
                    </div>
                    <AutomationListClient initialAutomations={automations} />
                </section>
            )}

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Start from a template
                    </h2>
                    <span className="text-xs text-muted-foreground">
                        {STARTER_AUTOMATIONS.length} starters
                    </span>
                </div>
                {automations.length === 0 && (
                    <p className="text-sm text-muted-foreground max-w-2xl">
                        Pick a battle-tested flow to fork. Each starter creates a
                        paused copy you can edit before going live.
                    </p>
                )}
                <StarterGrid
                    starters={STARTER_AUTOMATIONS.map((s) => ({
                        slug: s.slug,
                        name: s.name,
                        description: s.description,
                        category: s.category,
                    }))}
                />
            </section>
        </div>
    )
}
