"use client"

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"

interface DataPoint {
    date: string
    count: number
}

export function ContactGrowthChart({ data }: { data: DataPoint[] }) {
    // Compute cumulative for a "growth" feel
    let running = 0
    const cumulative = data.map((d) => {
        running += d.count
        return { ...d, cumulative: running, label: d.date.slice(5) }
    })

    if (cumulative.every((d) => d.count === 0)) {
        return (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                No new contacts in the last 90 days
            </div>
        )
    }

    return (
        <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulative} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        interval={Math.ceil(cumulative.length / 8)}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        width={36}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: 8,
                            fontSize: 12,
                            padding: "6px 10px",
                        }}
                        labelFormatter={(label) => `2026-${label}`}
                        formatter={(value, name) => [
                            String(value),
                            name === "count" ? "New that day" : "Cumulative",
                        ]}
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#4f46e5"
                        strokeWidth={2}
                        fill="url(#growthGradient)"
                        fillOpacity={1}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
