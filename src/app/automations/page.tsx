import Link from "next/link"
import { requireAuth } from "@/lib/auth-guard"
import { listAutomations } from "@/lib/automations/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Workflow } from "lucide-react"
import { AutomationListClient } from "./AutomationListClient"

export const dynamic = "force-dynamic"

export default async function AutomationsPage() {
    const session = await requireAuth()
    const workspaceId = (session.user as { workspaceId: string }).workspaceId
    const automations = await listAutomations(workspaceId)

    return (
        <div className="container mx-auto max-w-5xl py-10 px-4 space-y-6">
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

            {automations.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center space-y-4">
                        <Workflow className="w-12 h-12 mx-auto opacity-30" />
                        <div className="space-y-1">
                            <div className="font-semibold">No automations yet</div>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                Build a welcome series, abandoned-cart drip, or
                                pipeline-stage follow-up. Pick a trigger, drop
                                some steps, and Vesta runs it for you.
                            </p>
                        </div>
                        <Link href="/automations/new">
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Build your first automation
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <AutomationListClient initialAutomations={automations} />
            )}
        </div>
    )
}
