"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Send, Pencil, Trash2, CalendarX } from "lucide-react"
import {
    cancelScheduledCampaignAction,
    deleteCampaignAction,
    sendCampaignAction,
} from "../../actions"

interface Props {
    campaignId: string
    status: string
    canSend: boolean
    canEdit: boolean
}

export function CampaignActions({ campaignId, status, canSend, canEdit }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const handleSend = () => {
        if (!canSend) {
            toast.error("Verify a SES domain before sending")
            return
        }
        if (!confirm("Send this campaign now? This will deduct credits per recipient.")) {
            return
        }
        startTransition(async () => {
            const result = await sendCampaignAction(campaignId)
            if (!result.success) {
                toast.error(result.error || "Send failed")
                return
            }
            toast.success(
                `Campaign sent. ${result.sent ?? 0} delivered, ${result.failed ?? 0} failed.`,
            )
            router.refresh()
        })
    }

    const handleDelete = () => {
        if (!confirm("Delete this campaign?")) return
        startTransition(async () => {
            const result = await deleteCampaignAction(campaignId)
            if (!result.success) {
                toast.error(result.error || "Delete failed")
                return
            }
            toast.success("Deleted")
            router.push("/email-marketing")
        })
    }

    const handleCancelSchedule = () => {
        if (!confirm("Cancel the scheduled send? The campaign will become a draft again.")) {
            return
        }
        startTransition(async () => {
            const result = await cancelScheduledCampaignAction(campaignId)
            if (!result.success) {
                toast.error(result.error || "Failed to cancel schedule")
                return
            }
            toast.success("Schedule canceled — campaign is a draft again")
            router.refresh()
        })
    }

    const canSendNow = status === "draft" || status === "scheduled"
    const isScheduled = status === "scheduled"

    return (
        <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
                <Link href={`/email-marketing/campaigns/${campaignId}/edit`}>
                    <Button variant="outline" size="sm">
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                </Link>
            )}
            {isScheduled && (
                <Button
                    onClick={handleCancelSchedule}
                    disabled={isPending}
                    variant="outline"
                    size="sm"
                >
                    <CalendarX className="w-4 h-4 mr-2" />
                    Cancel schedule
                </Button>
            )}
            {canSendNow && (
                <Button onClick={handleSend} disabled={isPending || !canSend} size="sm">
                    {isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4 mr-2" />
                    )}
                    {isScheduled ? "Send now instead" : "Send now"}
                </Button>
            )}
            <Button
                onClick={handleDelete}
                disabled={isPending || status === "sending"}
                variant="ghost"
                size="icon"
            >
                <Trash2 className="w-4 h-4" />
            </Button>
        </div>
    )
}
