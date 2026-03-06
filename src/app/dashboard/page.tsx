"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    MoreHorizontal,
    Search,
    TrendingUp,
    DollarSign,
    Inbox,
    Home,
    Loader2
} from "lucide-react"
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getDashboardData, type DashboardData } from "./actions"
import { toggleTaskComplete } from "@/app/calendar/actions"

function formatCurrency(value: number) {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    // Per-card pipeline selectors
    const [valuePipelineId, setValuePipelineId] = useState("")
    const [statusPipelineId, setStatusPipelineId] = useState("")
    const [stagePipelineId, setStagePipelineId] = useState("")
    const [basePipelineId, setBasePipelineId] = useState("")

    const [timeframe, setTimeframe] = useState<"1m" | "6m" | "1y">("6m")
    const [taskSearch, setTaskSearch] = useState("")
    const [taskSort, setTaskSort] = useState<"dueDate" | "assignee">("dueDate")
    const [taskFilter, setTaskFilter] = useState<"All" | "Pending" | "Completed">("Pending")
    const [tasks, setTasks] = useState<DashboardData['tasks']>([])

    useEffect(() => {
        getDashboardData().then(result => {
            if (result.success && result.data) {
                setData(result.data)
                setTasks(result.data.tasks)
                const firstId = result.data.pipelines[0]?.id || ""
                setValuePipelineId(firstId)
                setStatusPipelineId(firstId)
                setStagePipelineId(firstId)
                setBasePipelineId(firstId)
            }
            setLoading(false)
        })
    }, [])

    const handleToggleTask = useCallback(async (taskId: string, currentStatus: string) => {
        const newCompleted = currentStatus !== "Completed"
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: newCompleted ? "Completed" : "Pending" } : t
        ))
        await toggleTaskComplete(taskId, newCompleted)
    }, [])

    const filteredAndSortedTasks = useMemo(() => {
        return tasks
            .filter(task => {
                const matchesSearch = task.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
                    task.assignee.toLowerCase().includes(taskSearch.toLowerCase())
                const matchesStatus = taskFilter === "All" || task.status === taskFilter
                return matchesSearch && matchesStatus
            })
            .sort((a, b) => {
                if (taskSort === "dueDate") return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
                return a.assignee.localeCompare(b.assignee)
            })
    }, [tasks, taskSearch, taskSort, taskFilter])

    const getPipelineName = useCallback((id: string) => {
        return data?.pipelines.find(p => p.id === id)?.name || "Select Pipeline"
    }, [data])

    if (loading) {
        return (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 pb-8">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                            Dashboard
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground mt-0.5">Loading analytics...</p>
                    </div>
                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <Card key={i} className="border-none shadow-sm bg-card/40 backdrop-blur-md">
                                <CardContent className="pt-6">
                                    <div className="h-4 w-24 bg-muted/30 rounded animate-pulse mb-3" />
                                    <div className="h-8 w-16 bg-muted/30 rounded animate-pulse" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <div className="h-[320px] bg-muted/10 rounded-lg animate-pulse" />
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="h-[300px] bg-muted/10 rounded-lg animate-pulse" />
                        <div className="h-[300px] bg-muted/10 rounded-lg animate-pulse" />
                    </div>
                </div>
            </div>
        )
    }

    if (!data || data.pipelines.length === 0) {
        return (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 pb-8">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                            Dashboard
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground mt-0.5">Operations overview & real-time analytics.</p>
                    </div>
                    <Card className="border-none shadow-md bg-card/40 backdrop-blur-md">
                        <CardContent className="py-16 flex flex-col items-center justify-center text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">No pipeline data yet</p>
                            <p className="text-sm mt-1">Create a pipeline and add opportunities to see your dashboard analytics.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    const kpi = data.kpi
    const valueData = data.pipelineData[valuePipelineId]?.valueOverTime[timeframe] || []
    const stageData = data.pipelineData[stagePipelineId]?.stageDistribution || []
    const donutData = data.pipelineData[statusPipelineId]?.stageDistribution.map(s => ({ name: s.name, value: s.count, color: s.color })) || []
    const baseData = data.pipelineData[basePipelineId]?.dealsByBase || []

    const PipelineDropdown = ({ value, onChange }: { value: string; onChange: (id: string) => void }) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                    {getPipelineName(value)}
                    <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
                {data.pipelines.map(p => (
                    <DropdownMenuItem key={p.id} className="text-xs" onClick={() => onChange(p.id)}>
                        {p.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )

    return (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 pb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                            Dashboard
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground mt-0.5">Operations overview & real-time analytics.</p>
                    </div>
                </div>

                {/* KPI Row */}
                <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-none shadow-sm bg-card/40 backdrop-blur-md overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Tenants</CardTitle>
                            <Home className="h-4 w-4 text-primary opacity-70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{kpi.activeStayCount}</div>
                            <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                                {kpi.totalContacts} total contacts
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-card/40 backdrop-blur-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conversion Rate</CardTitle>
                            <TrendingUp className="h-4 w-4 text-emerald-500 opacity-70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{kpi.conversionRate}%</div>
                            <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                                Opportunities → Booked
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-card/40 backdrop-blur-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pipeline Value</CardTitle>
                            <DollarSign className="h-4 w-4 text-primary opacity-70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(kpi.totalPipelineValue)}</div>
                            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Total opportunity value</p>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-card/40 backdrop-blur-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Open Inquiries</CardTitle>
                            <Inbox className="h-4 w-4 text-rose-500 opacity-70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{kpi.openInquiries}</div>
                            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Active opportunities</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 sm:gap-6 lg:grid-cols-7">
                    {/* Pipeline Value Chart */}
                    <Card className="lg:col-span-7 border-none shadow-md bg-card/40 backdrop-blur-md">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 space-y-0 p-4 sm:p-6 pb-4">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-semibold">Pipeline Value</CardTitle>
                                <CardDescription className="text-xs">
                                    {timeframe === "1m" ? "Daily value — last 30 days" : timeframe === "6m" ? "Weekly value — last 6 months" : "Monthly value — last 12 months"}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <PipelineDropdown value={valuePipelineId} onChange={setValuePipelineId} />
                                <div className="h-4 w-[1px] bg-muted/50 mx-1" />
                                <div className="flex bg-muted/30 p-0.5 rounded-md">
                                    {(["1m", "6m", "1y"] as const).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTimeframe(t)}
                                            className={`px-2 py-1 text-[10px] font-bold rounded-sm transition-all ${timeframe === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            {t.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 px-4 sm:px-6">
                            <div className="h-[240px] sm:h-[280px] w-full min-h-0">
                                {valueData.some(d => d.value > 0) ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={valueData}>
                                            <defs>
                                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#666' }}
                                                dy={10}
                                                interval={timeframe === "1m" ? 4 : timeframe === "6m" ? 3 : 1}
                                            />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#666' }} tickFormatter={(value) => `$${value / 1000}k`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                                itemStyle={{ color: '#10b981', padding: '0' }}
                                                formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString()}`, 'Value']}
                                            />
                                            <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" animationDuration={1500} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                        No opportunity data for this period
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Opportunity Status Donut (col-3) */}
                    <Card className="lg:col-span-3 border-none shadow-md bg-card/40 backdrop-blur-md">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 space-y-0 p-4 sm:p-6 pb-4">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-semibold">Opportunity Status</CardTitle>
                                <CardDescription className="text-xs">Deal distribution by stage</CardDescription>
                            </div>
                            <PipelineDropdown value={statusPipelineId} onChange={setStatusPipelineId} />
                        </CardHeader>
                        <CardContent className="pt-0 px-4 sm:px-6">
                            <div className="h-[240px] sm:h-[280px] w-full min-h-0">
                                {donutData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={donutData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={75}
                                                paddingAngle={4}
                                                dataKey="value"
                                                animationDuration={1500}
                                                stroke="none"
                                            >
                                                {donutData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                iconSize={6}
                                                formatter={(value) => <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">{value}</span>}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                        No deals in this pipeline
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stage Distribution (col-4) */}
                    <Card className="lg:col-span-4 border-none shadow-md bg-card/40 backdrop-blur-md">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 space-y-0 p-4 sm:p-6 pb-4">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-semibold">Stage Distribution</CardTitle>
                                <CardDescription className="text-xs">Deal volume & value by stage</CardDescription>
                            </div>
                            <PipelineDropdown value={stagePipelineId} onChange={setStagePipelineId} />
                        </CardHeader>
                        <CardContent className="pt-2 px-4 sm:px-6">
                            <div className="space-y-4 h-[180px] overflow-y-auto pr-2 scrollbar-hide">
                                {stageData.length > 0 ? (() => {
                                    const totalCount = stageData.reduce((acc, curr) => acc + curr.count, 0)
                                    const maxCount = Math.max(...stageData.map(d => d.count))
                                    return stageData.map((stage, idx) => (
                                        <div key={idx} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                                                    <span className="font-semibold text-foreground/90">{stage.name}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium">({stage.count} deals)</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold text-foreground">${stage.value.toLocaleString()}</span>
                                                    <span className="ml-2 text-[10px] text-muted-foreground font-medium">
                                                        {totalCount > 0 ? ((stage.count / totalCount) * 100).toFixed(1) : 0}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                                    style={{
                                                        width: `${maxCount > 0 ? (stage.count / maxCount) * 100 : 0}%`,
                                                        backgroundColor: stage.color,
                                                        opacity: 0.8
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                })() : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                        No deals in this pipeline
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Inquiry Tracker by Base (col-4) */}
                    <Card className="lg:col-span-4 border-none shadow-md bg-card/40 backdrop-blur-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-6 pb-4">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-semibold">Inquiry Tracker</CardTitle>
                                <CardDescription className="text-xs">Deals per Military Base</CardDescription>
                            </div>
                            <PipelineDropdown value={basePipelineId} onChange={setBasePipelineId} />
                        </CardHeader>
                        <CardContent className="pt-2 px-4 sm:px-6">
                            <div className="space-y-4 h-[180px] overflow-y-auto pr-2 scrollbar-hide">
                                {baseData.length > 0 ? (() => {
                                    const totalDeals = baseData.reduce((acc, curr) => acc + curr.deals, 0)
                                    const maxDeals = Math.max(...baseData.map(d => d.deals))
                                    return baseData.map((base, idx) => (
                                        <div key={idx} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: base.color }} />
                                                    <span className="font-semibold text-foreground/90">{base.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold text-foreground">{base.deals} {base.deals === 1 ? 'deal' : 'deals'}</span>
                                                    <span className="ml-2 text-[10px] text-muted-foreground font-medium">
                                                        {totalDeals > 0 ? ((base.deals / totalDeals) * 100).toFixed(0) : 0}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                                    style={{
                                                        width: `${maxDeals > 0 ? (base.deals / maxDeals) * 100 : 0}%`,
                                                        backgroundColor: base.color,
                                                        opacity: 0.8
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                })() : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                        No base data available
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Priority Tasks (col-3) */}
                    <Card className="lg:col-span-3 border-none shadow-md bg-card/40 backdrop-blur-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-semibold">Priority Tasks</CardTitle>
                                <CardDescription className="text-xs">Immediate focus items</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="px-3 pt-0">
                            <div className="space-y-3 h-[200px] overflow-y-auto scrollbar-hide">
                                {filteredAndSortedTasks.length > 0 ? filteredAndSortedTasks.slice(0, 5).map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex items-center justify-between p-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors group cursor-pointer"
                                        onClick={() => handleToggleTask(task.id, task.status)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-2 w-2 rounded-full ${task.priority === "High" ? "bg-rose-500" : task.priority === "Medium" ? "bg-amber-500" : "bg-emerald-500"}`} />
                                            <span className={`text-xs font-medium truncate max-w-[120px] ${task.status === "Completed" ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                                        </div>
                                        {task.dueDate && <Badge variant="outline" className="text-[9px] h-5">{task.dueDate.split('-').slice(1).join('/')}</Badge>}
                                    </div>
                                )) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                        No tasks found
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Full Task Manager */}
                <Card className="border-none shadow-lg bg-card/30 backdrop-blur-xl">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 space-y-0">
                        <div>
                            <CardTitle className="text-xl sm:text-2xl">Task Manager</CardTitle>
                            <p className="text-sm text-muted-foreground">Manage daily lead follow-ups and operations</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-full sm:w-auto">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search tasks..."
                                    className="h-9 pl-9 w-full sm:w-64 bg-background/50 border-none shadow-inner min-h-[44px] sm:min-h-[36px]"
                                    value={taskSearch}
                                    onChange={(e) => setTaskSearch(e.target.value)}
                                />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 gap-2 touch-manipulation">
                                        <Clock className="h-4 w-4" />
                                        Sort: {taskSort === "dueDate" ? "Due Date" : "Assignee"}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setTaskSort("dueDate")}>Due Date</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTaskSort("assignee")}>Assignee</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <div className="flex bg-muted/20 p-1 rounded-lg overflow-x-auto w-full sm:w-auto">
                                {(["All", "Pending", "Completed"] as const).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setTaskFilter(f)}
                                        className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-xs font-medium rounded-md transition-all touch-manipulation ${taskFilter === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-0 sm:px-6">
                        <div className="overflow-x-auto -mx-4 sm:mx-0">
                            <table className="w-full text-sm min-w-[600px]">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="text-left py-3 px-6 font-semibold text-muted-foreground">Task</th>
                                        <th className="text-left py-3 px-6 font-semibold text-muted-foreground">Assignee</th>
                                        <th className="text-left py-3 px-6 font-semibold text-muted-foreground">Due Date</th>
                                        <th className="text-left py-3 px-6 font-semibold text-muted-foreground">Priority</th>
                                        <th className="text-left py-3 px-6 font-semibold text-muted-foreground">Status</th>
                                        <th className="py-3 px-6"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedTasks.map((task) => (
                                        <tr key={task.id} className="border-b hover:bg-muted/10 transition-colors group">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    {task.status === "Completed" ? (
                                                        <CheckCircle2
                                                            className="h-5 w-5 text-emerald-500 cursor-pointer"
                                                            onClick={() => handleToggleTask(task.id, task.status)}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary transition-colors cursor-pointer"
                                                            onClick={() => handleToggleTask(task.id, task.status)}
                                                        />
                                                    )}
                                                    <span className={task.status === "Completed" ? "line-through text-muted-foreground" : "font-medium"}>
                                                        {task.title}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                        {task.assignee.charAt(0)}
                                                    </div>
                                                    <span>{task.assignee}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-3 w-3" />
                                                    {task.dueDate || '—'}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <Badge
                                                    variant="outline"
                                                    className={`font-normal ${task.priority === "High" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                                                        task.priority === "Medium" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                                            "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                        }`}
                                                >
                                                    {task.priority}
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`text-xs font-medium ${task.status === "Completed" ? "text-emerald-500" : "text-amber-500"}`}>
                                                    {task.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredAndSortedTasks.length === 0 && (
                            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                                <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
                                <p>No tasks found matching your criteria.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
