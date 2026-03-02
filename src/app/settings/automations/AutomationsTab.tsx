"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Plus, Zap, ArrowRight, Webhook } from "lucide-react"

export default function AutomationsPage() {
    const automations = [
        {
            id: "1",
            name: "New Web Inquiry Webhook",
            description: "Parses form payload from afcrashpad.com, creates contact, and drops them into New Lead.",
            isActive: true,
            lastRun: "2 hours ago",
            trigger: "Webhook",
            action: "Create Contact + Deal",
        },
        {
            id: "2",
            name: "All Forms Signed Trigger",
            description: "Detects when Authorization, Lease, and T&C are signed, then moves deal to 'Booked'.",
            isActive: true,
            lastRun: "Yesterday",
            trigger: "Form Status = Complete",
            action: "Move to Booked",
        },
        {
            id: "3",
            name: "30-Day Check-out Notice",
            description: "Sends automated email reminder 30 days before tenant check-out date.",
            isActive: false,
            lastRun: "Never",
            trigger: "Date - 30 days",
            action: "Send Email",
        },
    ]

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 mb-4">
                <div className="space-y-1">
                    <CardTitle>Automations</CardTitle>
                    <CardDescription>
                        Configure triggers and actions to run the CRM on autopilot.
                    </CardDescription>
                </div>
                <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Workflow
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4">
                    {automations.map((automation) => (
                        <Card key={automation.id} className="relative overflow-hidden transition-all hover:bg-muted/10">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4 items-start w-full">
                                        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            {automation.trigger === "Webhook" ? (
                                                <Webhook className="h-5 w-5" />
                                            ) : (
                                                <Zap className="h-5 w-5" />
                                            )}
                                        </div>

                                        <div className="flex flex-col flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-lg">{automation.name}</h3>
                                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">
                                                    Last Run: {automation.lastRun}
                                                </span>
                                            </div>

                                            <p className="text-sm text-muted-foreground max-w-[80%]">
                                                {automation.description}
                                            </p>

                                            <div className="flex items-center gap-3 pt-3 text-sm font-medium">
                                                <div className="flex items-center gap-1.5 text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded border">
                                                    <span className="text-xs uppercase tracking-wider font-bold">IF</span>
                                                    <span>{automation.trigger}</span>
                                                </div>
                                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                                <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2.5 py-1 rounded border border-primary/20">
                                                    <span className="text-xs uppercase tracking-wider font-bold">THEN</span>
                                                    <span>{automation.action}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 ml-auto shrink-0 pl-10 border-l border-border/50">
                                            <span className="text-sm font-medium text-muted-foreground w-12 text-right">
                                                {automation.isActive ? "Active" : "Paused"}
                                            </span>
                                            <Switch checked={automation.isActive} />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
