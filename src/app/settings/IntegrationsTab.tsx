"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { disconnectGoogleCalendar } from "./users/actions"
import { useState } from "react"
import { Loader2 } from "lucide-react"

export function IntegrationsTab({
    isConnected,
    icsFeedUrl
}: {
    isConnected: boolean;
    icsFeedUrl: string;
}) {
    const [isDisconnecting, setIsDisconnecting] = useState(false)

    const handleDisconnect = async () => {
        setIsDisconnecting(true)
        try {
            await disconnectGoogleCalendar()
            // Router refresh is handled by revalidatePath in the server action
        } catch (error) {
            console.error(error)
        } finally {
            setIsDisconnecting(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-xl bg-card shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                    <div className="text-3xl bg-muted/30 p-2 rounded-xl border border-white/5 shadow-inner">🗓</div>
                    <div>
                        <div className="font-bold text-base tracking-tight">Google Calendar</div>
                        <div className="text-sm text-muted-foreground/80 font-medium">Two-way sync for opportunities and tasks.</div>
                    </div>
                </div>
                {isConnected ? (
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-md text-xs font-black uppercase tracking-widest border border-emerald-500/20 shadow-sm flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Connected
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDisconnect}
                            disabled={isDisconnecting}
                            className="h-8 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/10 transition-colors"
                        >
                            {isDisconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
                        </Button>
                    </div>
                ) : (
                    <a href="/api/auth/google-calendar" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                        Connect Account
                    </a>
                )}
            </div>

            <div className="flex flex-col gap-3 p-5 border rounded-xl bg-card shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="text-3xl bg-muted/30 p-2 rounded-xl border border-white/5 shadow-inner">🍎</div>
                    <div>
                        <div className="font-bold text-base tracking-tight">Apple Calendar (iOS / Mac)</div>
                        <div className="text-sm text-muted-foreground/80 font-medium">One-way sync. Subscribe to this feed on your Apple device.</div>
                    </div>
                </div>
                <div className="flex mt-1">
                    <Input readOnly value={icsFeedUrl} className="font-mono text-[11px] rounded-r-none bg-muted/30 border-r-0 focus-visible:ring-0 shadow-inner" />
                    <a href={icsFeedUrl} className="flex border border-l-0 rounded-r-lg px-6 items-center bg-muted/50 hover:bg-muted text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 whitespace-nowrap">
                        Download .ics
                    </a>
                </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-xl bg-card opacity-50 grayscale cursor-not-allowed">
                <div className="flex items-center gap-4">
                    <div className="text-3xl bg-muted/30 p-2 rounded-xl border border-white/5">📱</div>
                    <div>
                        <div className="font-bold text-base tracking-tight text-muted-foreground">Twilio SMS</div>
                        <div className="text-sm text-muted-foreground/60 font-medium">Send automated text updates to contacts.</div>
                    </div>
                </div>
                <div className="px-3 py-1 bg-muted rounded-md text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 shadow-inner">Coming Soon</div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-xl bg-card opacity-50 grayscale cursor-not-allowed">
                <div className="flex items-center gap-4">
                    <div className="text-3xl bg-muted/30 p-2 rounded-xl border border-white/5">💳</div>
                    <div>
                        <div className="font-bold text-base tracking-tight text-muted-foreground">Stripe Billing</div>
                        <div className="text-sm text-muted-foreground/60 font-medium">Collect deposits and invoice payments.</div>
                    </div>
                </div>
                <div className="px-3 py-1 bg-muted rounded-md text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 shadow-inner">Coming Soon</div>
            </div>
        </div>
    )
}
