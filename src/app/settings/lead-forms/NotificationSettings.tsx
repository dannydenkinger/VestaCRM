"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import type { LeadForm } from "./types"

interface Props {
    open: boolean
    onClose: () => void
    notifications: LeadForm["notifications"]
    onChange: (notifications: LeadForm["notifications"]) => void
}

const MERGE_TAGS = [
    { tag: "{{name}}", label: "Name" },
    { tag: "{{email}}", label: "Email" },
    { tag: "{{phone}}", label: "Phone" },
    { tag: "{{form_name}}", label: "Form Name" },
]

export function NotificationSettings({ open, onClose, notifications, onChange }: Props) {
    const config = notifications || {
        adminEmailEnabled: false,
        adminEmailAddresses: [],
        autoresponderEnabled: false,
        autoresponderSubject: "",
        autoresponderBody: "",
    }

    const update = (partial: Partial<NonNullable<LeadForm["notifications"]>>) =>
        onChange({ ...config, ...partial })

    return (
        <Sheet open={open} onOpenChange={v => !v && onClose()}>
            <SheetContent className="overflow-y-auto w-[360px] sm:w-[420px]">
                <SheetHeader>
                    <SheetTitle>Notifications</SheetTitle>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                    {/* Admin notifications */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Admin Email Notification</p>
                                <p className="text-xs text-muted-foreground">Get emailed when someone submits this form</p>
                            </div>
                            <Switch checked={config.adminEmailEnabled} onCheckedChange={v => update({ adminEmailEnabled: v })} />
                        </div>
                        {config.adminEmailEnabled && (
                            <div className="space-y-1.5">
                                <Label className="text-xs">Send to (comma-separated emails)</Label>
                                <Input
                                    value={config.adminEmailAddresses?.join(", ") || ""}
                                    onChange={e => update({ adminEmailAddresses: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                                    placeholder="admin@company.com, team@company.com"
                                    className="h-8 text-sm"
                                />
                            </div>
                        )}
                    </section>

                    {/* Autoresponder */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Auto-Reply to Submitter</p>
                                <p className="text-xs text-muted-foreground">Send an automatic email to the person who filled out the form</p>
                            </div>
                            <Switch checked={config.autoresponderEnabled} onCheckedChange={v => update({ autoresponderEnabled: v })} />
                        </div>
                        {config.autoresponderEnabled && (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Subject</Label>
                                    <Input
                                        value={config.autoresponderSubject || ""}
                                        onChange={e => update({ autoresponderSubject: e.target.value })}
                                        placeholder="Thanks for reaching out, {{name}}!"
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Body</Label>
                                    <Textarea
                                        value={config.autoresponderBody || ""}
                                        onChange={e => update({ autoresponderBody: e.target.value })}
                                        placeholder="Hi {{name}},\n\nThank you for contacting us! We've received your message and will get back to you within 24 hours.\n\nBest regards"
                                        rows={6}
                                        className="text-sm"
                                    />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1.5">Insert merge tag:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {MERGE_TAGS.map(({ tag, label }) => (
                                            <Button
                                                key={tag}
                                                variant="outline"
                                                size="sm"
                                                className="h-6 text-[10px] px-2"
                                                onClick={() => {
                                                    update({ autoresponderBody: (config.autoresponderBody || "") + tag })
                                                }}
                                            >
                                                {label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </SheetContent>
        </Sheet>
    )
}
