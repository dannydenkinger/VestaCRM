"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { onForegroundMessage } from "@/lib/firebase-messaging"
import { useSession } from "next-auth/react"

export function PushNotificationListener() {
    const { status } = useSession()

    useEffect(() => {
        if (status !== "authenticated") return

        const unsubscribe = onForegroundMessage(({ title, body, url }) => {
            toast(title, {
                description: body,
                action: url
                    ? { label: "View", onClick: () => (window.location.href = url) }
                    : undefined,
                duration: 6000,
            })
        })

        return unsubscribe
    }, [status])

    return null
}
