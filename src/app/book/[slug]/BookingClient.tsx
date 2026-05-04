"use client"

import { useMemo, useState, useTransition } from "react"
import { Calendar, CheckCircle2, Clock, Loader2 } from "lucide-react"
import { submitBookingAction } from "./actions"

interface DayBlock {
    date: string
    dow: number
    slots: Array<{ start: string; end: string }>
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function BookingClient({
    slug,
    pageName,
    workspaceName,
    timezone,
    slotMinutes,
    intro,
    days,
}: {
    slug: string
    pageName: string
    workspaceName: string
    timezone: string
    slotMinutes: number
    intro?: string
    days: DayBlock[]
}) {
    const [selectedDate, setSelectedDate] = useState<string | null>(
        days[0]?.date ?? null,
    )
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [notes, setNotes] = useState("")
    const [submitted, setSubmitted] = useState<{ when: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const day = useMemo(
        () => days.find((d) => d.date === selectedDate),
        [days, selectedDate],
    )

    const handleSubmit = () => {
        setError(null)
        if (!selectedSlot || !name.trim() || !email.includes("@")) {
            setError("Pick a time and fill in name + email")
            return
        }
        startTransition(async () => {
            const res = await submitBookingAction({
                slug,
                startsAt: selectedSlot,
                name: name.trim(),
                email: email.trim(),
                notes: notes.trim() || undefined,
            })
            if (!res.success) {
                setError(res.error || "Failed to book")
                return
            }
            setSubmitted({ when: res.startsAt ?? selectedSlot })
        })
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-8 text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-semibold text-slate-900">
                        You&apos;re booked
                    </h1>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Confirmed for{" "}
                        <span className="font-semibold text-slate-900">
                            {formatLocal(submitted.when, timezone)}
                        </span>
                        .
                    </p>
                    <p className="text-xs text-slate-400">
                        A confirmation email is on its way.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="p-6 border-b">
                    <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
                        {workspaceName}
                    </div>
                    <h1 className="text-2xl font-semibold text-slate-900">{pageName}</h1>
                    {intro && (
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                            {intro}
                        </p>
                    )}
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {slotMinutes}-minute meeting · times shown in {timezone}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] divide-y md:divide-y-0 md:divide-x">
                    {/* Day picker */}
                    <div className="p-4 max-h-[480px] overflow-y-auto">
                        <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                            <Calendar className="w-3 h-3 inline mr-1.5" />
                            Pick a day
                        </div>
                        {days.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                No availability in the next few weeks. Try again later.
                            </p>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {days.map((d) => (
                                    <button
                                        key={d.date}
                                        type="button"
                                        onClick={() => {
                                            setSelectedDate(d.date)
                                            setSelectedSlot(null)
                                        }}
                                        className={`text-left p-2 rounded-md border transition-colors ${
                                            selectedDate === d.date
                                                ? "border-indigo-500 bg-indigo-50"
                                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                            {DAY_NAMES[d.dow]}
                                        </div>
                                        <div className="text-sm font-semibold text-slate-900 tabular-nums">
                                            {d.date.slice(5)}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            {d.slots.length} slot{d.slots.length === 1 ? "" : "s"}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Slot picker */}
                    <div className="p-4 max-h-[480px] overflow-y-auto">
                        <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                            <Clock className="w-3 h-3 inline mr-1.5" />
                            Pick a time
                        </div>
                        {!day ? (
                            <p className="text-sm text-slate-500">Pick a day first.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {day.slots.map((s) => (
                                    <button
                                        key={s.start}
                                        type="button"
                                        onClick={() => setSelectedSlot(s.start)}
                                        className={`w-full text-left text-sm py-2 px-3 rounded-md border transition-colors tabular-nums ${
                                            selectedSlot === s.start
                                                ? "border-indigo-500 bg-indigo-500 text-white"
                                                : "border-slate-200 hover:border-slate-300 text-slate-700"
                                        }`}
                                    >
                                        {formatTimeOnly(s.start, timezone)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Form */}
                {selectedSlot && (
                    <div className="p-6 border-t bg-slate-50/40 space-y-3">
                        <div className="text-xs text-slate-500">
                            Booking for{" "}
                            <strong className="text-slate-900">
                                {formatLocal(selectedSlot, timezone)}
                            </strong>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                                className="px-3 py-2 text-sm border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                disabled={isPending}
                            />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Your email"
                                className="px-3 py-2 text-sm border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                disabled={isPending}
                            />
                        </div>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Anything else (optional)"
                            rows={3}
                            className="w-full px-3 py-2 text-sm border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            disabled={isPending}
                        />
                        {error && (
                            <p className="text-xs text-red-600">{error}</p>
                        )}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isPending || !selectedSlot || !name.trim() || !email.trim()}
                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Book the meeting
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

function formatLocal(iso: string, tz: string): string {
    try {
        return new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }).format(new Date(iso))
    } catch {
        return iso
    }
}

function formatTimeOnly(iso: string, tz: string): string {
    try {
        return new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour: "numeric",
            minute: "2-digit",
        }).format(new Date(iso))
    } catch {
        return iso
    }
}
