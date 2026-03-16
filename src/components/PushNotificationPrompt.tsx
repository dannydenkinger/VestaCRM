"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bell, X, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { requestPushToken } from "@/lib/firebase-messaging"
import { saveFcmToken, getPushNotificationStatus, dismissPushPrompt } from "@/app/settings/users/actions"
import { toast } from "sonner"

export function PushNotificationPrompt() {
    const { status } = useSession()
    const [visible, setVisible] = useState(false)
    const [enabling, setEnabling] = useState(false)

    useEffect(() => {
        if (status !== "authenticated") return
        if (typeof window === "undefined") return
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
        if (Notification.permission === "granted" || Notification.permission === "denied") return

        getPushNotificationStatus().then(result => {
            if (!result.pushEnabled && !result.pushPromptDismissed) {
                setVisible(true)
            }
        })
    }, [status])

    const handleEnable = async () => {
        setEnabling(true)
        try {
            const token = await requestPushToken()
            if (!token) {
                toast.error("Push notifications were denied by your browser.")
                setVisible(false)
                return
            }
            await saveFcmToken(token)
            toast.success("Push notifications enabled!")
            setVisible(false)
        } catch {
            toast.error("Failed to enable push notifications.")
        }
        setEnabling(false)
    }

    const handleDismiss = async () => {
        setVisible(false)
        await dismissPushPrompt()
    }

    if (!visible) return null

    return (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="bg-card border shadow-lg rounded-xl p-4 flex gap-3">
                <div className="shrink-0 p-2 rounded-full bg-primary/10 self-start">
                    <Bell className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Enable push notifications</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Stay updated on deals, tasks, and document signatures.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" onClick={handleEnable} disabled={enabling} className="h-8 text-xs">
                            {enabling && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                            Enable
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-8 text-xs text-muted-foreground">
                            Not now
                        </Button>
                    </div>
                </div>
                <button onClick={handleDismiss} className="shrink-0 h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center self-start">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
            </div>
        </div>
    )
}
