"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateNotificationPreferences, saveFcmToken } from "./users/actions"
import { toast } from "sonner"
import { Loader2, Mail, Bell, Smartphone } from "lucide-react"
import { requestPushToken } from "@/lib/firebase-messaging"

const EVENT_TYPES = [
    { key: "opportunity", label: "New Lead / Opportunity" },
    { key: "contact", label: "New Contact" },
    { key: "checkin", label: "Check-in Reminder" },
    { key: "checkout", label: "Check-out Reminder" },
    { key: "task", label: "Task Due" },
] as const

type Prefs = Record<string, boolean>

const defaultPrefs: Prefs = {
    emailEnabled: true,
    email_opportunity: true,
    email_contact: true,
    email_checkin: true,
    email_checkout: true,
    email_task: true,
    pushEnabled: false,
    push_opportunity: true,
    push_contact: true,
    push_checkin: true,
    push_checkout: true,
    push_task: true,
}

export function NotificationPreferences({ initialPrefs }: { initialPrefs: Prefs | null }) {
    const [prefs, setPrefs] = useState<Prefs>({ ...defaultPrefs, ...initialPrefs })
    const [saving, setSaving] = useState(false)
    const [requestingPush, setRequestingPush] = useState(false)

    const toggle = (key: string) => {
        setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const handleEnablePush = async () => {
        setRequestingPush(true)
        try {
            const token = await requestPushToken()
            if (!token) {
                toast.error("Push notifications were denied or are not supported in this browser.")
                return
            }
            await saveFcmToken(token)
            setPrefs(prev => ({ ...prev, pushEnabled: true }))
            toast.success("Push notifications enabled!")
        } catch (err) {
            console.error("Push setup error:", err)
            toast.error("Failed to enable push notifications")
        } finally {
            setRequestingPush(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await updateNotificationPreferences(prefs)
            toast.success("Notification preferences saved")
        } catch {
            toast.error("Failed to save preferences")
        } finally {
            setSaving(false)
        }
    }

    const emailEnabled = prefs.emailEnabled !== false
    const pushEnabled = prefs.pushEnabled === true

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notification Preferences
                </CardTitle>
                <CardDescription>
                    Control which events trigger email and push alerts. In-app notifications are always on.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Email Master toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <Label className="text-sm font-semibold">Email Alerts</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Master toggle for all email notifications
                            </p>
                        </div>
                    </div>
                    <Switch
                        checked={emailEnabled}
                        onCheckedChange={() => toggle("emailEnabled")}
                    />
                </div>

                {/* Email per-event toggles */}
                {emailEnabled && (
                    <div className="space-y-1">
                        {EVENT_TYPES.map(({ key, label }) => (
                            <div
                                key={key}
                                className="flex items-center justify-between py-3 px-4 rounded-md hover:bg-muted/30 transition-colors"
                            >
                                <Label className="text-sm">{label}</Label>
                                <Switch
                                    checked={prefs[`email_${key}`] !== false}
                                    onCheckedChange={() => toggle(`email_${key}`)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Push Master toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <Label className="text-sm font-semibold">Push Notifications</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Browser & device push alerts (requires permission)
                            </p>
                        </div>
                    </div>
                    {pushEnabled ? (
                        <Switch
                            checked={true}
                            onCheckedChange={() => toggle("pushEnabled")}
                        />
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEnablePush}
                            disabled={requestingPush}
                        >
                            {requestingPush && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enable
                        </Button>
                    )}
                </div>

                {/* Push per-event toggles */}
                {pushEnabled && (
                    <div className="space-y-1">
                        {EVENT_TYPES.map(({ key, label }) => (
                            <div
                                key={key}
                                className="flex items-center justify-between py-3 px-4 rounded-md hover:bg-muted/30 transition-colors"
                            >
                                <Label className="text-sm">{label}</Label>
                                <Switch
                                    checked={prefs[`push_${key}`] !== false}
                                    onCheckedChange={() => toggle(`push_${key}`)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <Button onClick={handleSave} disabled={saving} size="sm">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Preferences
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
