"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
    MoreHorizontal,
    Pencil,
    Trash2,
    Loader2,
    Mail,
    Clock,
    Tag,
    GitBranch,
    Globe,
    StopCircle,
    Users,
    Workflow,
    Briefcase,
    CalendarClock,
    Coffee,
    MessageSquare,
    Sparkles,
    TrendingUp,
    UserCheck,
} from "lucide-react"
import {
    deleteAutomationAction,
    toggleAutomationAction,
} from "./actions"
import type { Automation, TriggerType, ActionType } from "@/lib/automations/types"

const TRIGGER_LABELS: Record<TriggerType, string> = {
    contact_created: "Contact created",
    contact_added_to_list: "Added to list",
    tag_added: "Tag added",
    tag_removed: "Tag removed",
    form_submitted: "Form submitted",
    pipeline_stage_entered: "Pipeline stage entered",
    opportunity_won: "Opportunity won",
    email_opened: "Email opened",
    email_clicked: "Email clicked",
    contact_field_updated: "Contact field updated",
    sms_replied: "SMS replied",
    appointment_booked: "Appointment booked",
    webhook_in: "Webhook (external)",
    manual: "Manual / API",
}

const ACTION_ICONS: Record<ActionType, React.ComponentType<{ className?: string }>> = {
    send_email: Mail,
    ai_send_email: Sparkles,
    send_sms: MessageSquare,
    wait: Clock,
    wait_until: CalendarClock,
    wait_until_business_hours: Coffee,
    add_tag: Tag,
    remove_tag: Tag,
    add_to_list: Users,
    remove_from_list: Users,
    branch_if: GitBranch,
    stop_if: StopCircle,
    update_contact_field: Pencil,
    increment_field: TrendingUp,
    assign_user: UserCheck,
    create_task: Briefcase,
    send_internal_email: Mail,
    webhook: Globe,
    end: Workflow,
}

export function AutomationListClient({
    initialAutomations,
}: {
    initialAutomations: Automation[]
}) {
    const router = useRouter()
    const [automations, setAutomations] = useState(initialAutomations)
    const [isPending, startTransition] = useTransition()

    const handleToggle = (id: string, enabled: boolean) => {
        // Optimistic UI
        setAutomations((prev) =>
            prev.map((a) => (a.id === id ? { ...a, enabled } : a)),
        )
        startTransition(async () => {
            const res = await toggleAutomationAction({ id, enabled })
            if (!res.success) {
                toast.error(res.error || "Failed to toggle")
                setAutomations((prev) =>
                    prev.map((a) => (a.id === id ? { ...a, enabled: !enabled } : a)),
                )
            } else {
                toast.success(enabled ? "Automation enabled" : "Automation paused")
            }
        })
    }

    const handleDelete = (a: Automation) => {
        if (
            !confirm(
                `Delete "${a.name}"? In-flight runs will error on next tick.`,
            )
        ) {
            return
        }
        startTransition(async () => {
            const res = await deleteAutomationAction(a.id)
            if (!res.success) {
                toast.error(res.error || "Failed to delete")
                return
            }
            setAutomations((prev) => prev.filter((x) => x.id !== a.id))
            toast.success("Automation deleted")
            router.refresh()
        })
    }

    return (
        <div className="space-y-3">
            {automations.map((a) => (
                <Card key={a.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="py-4 flex items-center gap-4">
                        <Switch
                            checked={a.enabled}
                            onCheckedChange={(v) => handleToggle(a.id, v)}
                            disabled={isPending}
                            aria-label="Enable automation"
                        />

                        <Link href={`/automations/${a.id}`} className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{a.name}</span>
                                {!a.enabled && (
                                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                        Paused
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-primary" />
                                    Trigger: <strong className="text-foreground/80">
                                        {TRIGGER_LABELS[a.trigger.type]}
                                    </strong>
                                </span>
                                <span className="opacity-50">·</span>
                                <span className="flex items-center gap-1.5">
                                    {a.nodes.slice(0, 5).map((n, idx) => {
                                        const Icon = ACTION_ICONS[n.type]
                                        return (
                                            <Icon
                                                key={idx}
                                                className="w-3 h-3 opacity-70"
                                            />
                                        )
                                    })}
                                    <span className="tabular-nums">{a.nodes.length} step{a.nodes.length === 1 ? "" : "s"}</span>
                                </span>
                            </div>
                        </Link>

                        <div className="text-right text-xs text-muted-foreground tabular-nums shrink-0">
                            <div>{a.stats.runsStarted} runs</div>
                            <div className="text-emerald-600">{a.stats.runsCompleted} completed</div>
                            {a.stats.goalsReached !== undefined && a.stats.goalsReached > 0 && (
                                <div className="text-primary">
                                    🎯 {a.stats.goalsReached} goals
                                </div>
                            )}
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    disabled={isPending}
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onSelect={() => router.push(`/automations/${a.id}`)}
                                >
                                    <Pencil className="w-3.5 h-3.5 mr-2" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => handleDelete(a)}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
