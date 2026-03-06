"use server"

import { adminDb } from "@/lib/firebase-admin"
import { auth } from "@/auth"

const STAGE_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4']
const BASE_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4']

export interface DashboardData {
    pipelines: { id: string; name: string }[]
    kpi: {
        activeStayCount: number
        totalContacts: number
        conversionRate: number
        totalPipelineValue: number
        openInquiries: number
    }
    pipelineData: Record<string, {
        stageDistribution: { name: string; count: number; value: number; color: string }[]
        valueOverTime: {
            "1m": { name: string; value: number }[]
            "6m": { name: string; value: number }[]
            "1y": { name: string; value: number }[]
        }
        dealsByBase: { name: string; deals: number; color: string }[]
        totalValue: number
        totalDeals: number
    }>
    tasks: {
        id: string
        title: string
        assignee: string
        dueDate: string
        priority: string
        status: string
    }[]
}

function formatShortDate(d: Date): string {
    return `${d.getMonth() + 1}/${d.getDate()}`
}

export async function getDashboardData(): Promise<{ success: boolean; data?: DashboardData; error?: string }> {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Not authenticated" }

    try {
        const [pipelinesSnap, oppsSnap, contactsSnap, tasksSnap, usersSnap] = await Promise.all([
            adminDb.collection('pipelines').orderBy('createdAt', 'asc').get(),
            adminDb.collection('opportunities').get(),
            adminDb.collection('contacts').get(),
            adminDb.collection('tasks').orderBy('dueDate', 'asc').get(),
            adminDb.collection('users').get(),
        ])

        // Build stages map
        const pipelinesList: { id: string; name: string }[] = []
        const stageMap: Record<string, { pipelineId: string; name: string; order: number }> = {}

        for (const doc of pipelinesSnap.docs) {
            pipelinesList.push({ id: doc.id, name: doc.data().name })
            const stagesSnap = await doc.ref.collection('stages').orderBy('order', 'asc').get()
            for (const sDoc of stagesSnap.docs) {
                stageMap[sDoc.id] = {
                    pipelineId: doc.id,
                    name: sDoc.data().name,
                    order: sDoc.data().order,
                }
            }
        }

        // Determine closed/booked stage IDs
        const closedNames = new Set(['Booked', 'Closed', 'Signed', 'Closed Won', 'Lost', 'Abandoned'])
        const closedStageIds = new Set(
            Object.entries(stageMap)
                .filter(([, info]) => closedNames.has(info.name))
                .map(([id]) => id)
        )
        const bookedNames = new Set(['Booked', 'Closed', 'Signed', 'Closed Won'])
        const bookedStageIds = new Set(
            Object.entries(stageMap)
                .filter(([, info]) => bookedNames.has(info.name))
                .map(([id]) => id)
        )

        // Contact base map for fallback
        const contactBaseMap: Record<string, string> = {}
        contactsSnap.docs.forEach(doc => {
            const base = doc.data().militaryBase
            if (base) contactBaseMap[doc.id] = base
        })

        // Helper to convert Firestore timestamps to Date
        const toDate = (v: unknown): Date => {
            if (v && typeof v === 'object' && 'toDate' in v && typeof (v as any).toDate === 'function') return (v as any).toDate()
            if (v instanceof Date) return v
            if (typeof v === 'string') return new Date(v)
            if (v && typeof v === 'object' && '_seconds' in v && typeof (v as any)._seconds === 'number') return new Date((v as any)._seconds * 1000)
            return new Date()
        }

        // Process opportunities
        const opps = oppsSnap.docs.map(doc => {
            const d = doc.data()
            const stageInfo = d.pipelineStageId ? stageMap[d.pipelineStageId] : undefined
            return {
                pipelineId: stageInfo?.pipelineId || null,
                stageId: (d.pipelineStageId as string) || '',
                stageName: stageInfo?.name || 'Unknown',
                value: Number(d.opportunityValue) || 0,
                militaryBase: d.militaryBase || (d.contactId ? contactBaseMap[d.contactId] : null) || null,
                createdAt: toDate(d.createdAt),
            }
        })

        // KPIs
        const activeStayCount = contactsSnap.docs.filter(doc => doc.data().status === 'Active Stay').length
        const totalContacts = contactsSnap.size
        const totalPipelineValue = opps.reduce((sum, o) => sum + o.value, 0)
        // Open inquiries = opportunities NOT in a closed/booked/lost stage
        const openInquiries = opps.filter(o => !closedStageIds.has(o.stageId)).length
        const bookedCount = opps.filter(o => bookedStageIds.has(o.stageId)).length
        const conversionRate = opps.length > 0 ? Math.round((bookedCount / opps.length) * 1000) / 10 : 0

        // Per-pipeline data
        const pipelineData: DashboardData['pipelineData'] = {}
        const now = new Date()

        for (const pipeline of pipelinesList) {
            const pipelineOpps = opps.filter(o => o.pipelineId === pipeline.id)

            // Stage distribution
            const stageOrder = Object.entries(stageMap)
                .filter(([, info]) => info.pipelineId === pipeline.id)
                .sort(([, a], [, b]) => a.order - b.order)
                .map(([, info]) => info.name)

            const stageCounts: Record<string, { count: number; value: number }> = {}
            for (const opp of pipelineOpps) {
                if (!stageCounts[opp.stageName]) stageCounts[opp.stageName] = { count: 0, value: 0 }
                stageCounts[opp.stageName].count++
                stageCounts[opp.stageName].value += opp.value
            }

            const stageDistribution = stageOrder.map((name, i) => ({
                name,
                count: stageCounts[name]?.count || 0,
                value: stageCounts[name]?.value || 0,
                color: STAGE_COLORS[i % STAGE_COLORS.length],
            })).filter(s => s.count > 0)

            // --- Value over time ---

            // 1m: daily for last 30 days
            const daily: { name: string; value: number }[] = []
            for (let i = 29; i >= 0; i--) {
                const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
                const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1)
                daily.push({
                    name: formatShortDate(dayStart),
                    value: pipelineOpps.filter(o => o.createdAt >= dayStart && o.createdAt < dayEnd).reduce((s, o) => s + o.value, 0),
                })
            }

            // 6m: weekly for last 26 weeks
            const weekly: { name: string; value: number }[] = []
            for (let i = 25; i >= 0; i--) {
                const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7)
                const weekStart = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate() - 7)
                weekly.push({
                    name: formatShortDate(weekStart),
                    value: pipelineOpps.filter(o => o.createdAt >= weekStart && o.createdAt < weekEnd).reduce((s, o) => s + o.value, 0),
                })
            }

            // 1y: monthly for last 12 months
            const monthly: { name: string; value: number }[] = []
            for (let i = 11; i >= 0; i--) {
                const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
                const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
                const label = mStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                monthly.push({
                    name: label,
                    value: pipelineOpps.filter(o => o.createdAt >= mStart && o.createdAt <= mEnd).reduce((s, o) => s + o.value, 0),
                })
            }

            // Deals by base
            const baseCounts: Record<string, number> = {}
            for (const opp of pipelineOpps) {
                if (opp.militaryBase) baseCounts[opp.militaryBase] = (baseCounts[opp.militaryBase] || 0) + 1
            }
            const dealsByBase = Object.entries(baseCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([name, deals], i) => ({ name, deals, color: BASE_COLORS[i % BASE_COLORS.length] }))

            pipelineData[pipeline.id] = {
                stageDistribution,
                valueOverTime: { "1m": daily, "6m": weekly, "1y": monthly },
                dealsByBase,
                totalValue: pipelineOpps.reduce((s, o) => s + o.value, 0),
                totalDeals: pipelineOpps.length,
            }
        }

        // Tasks
        const userNames: Record<string, string> = {}
        usersSnap.docs.forEach(doc => { userNames[doc.id] = doc.data().name || 'Unknown' })

        const tasks = tasksSnap.docs.map(doc => {
            const d = doc.data()
            const due = d.dueDate?.toDate ? d.dueDate.toDate() : (d.dueDate ? new Date(d.dueDate) : null)
            return {
                id: doc.id,
                title: d.title || 'Untitled',
                assignee: d.assigneeId ? (userNames[d.assigneeId] || 'Unknown') : 'Unassigned',
                dueDate: due && !isNaN(due.getTime()) ? due.toISOString().split('T')[0] : '',
                priority: d.priority === 'HIGH' ? 'High' : d.priority === 'LOW' ? 'Low' : 'Medium',
                status: d.completed ? 'Completed' : 'Pending',
            }
        }).slice(0, 50)

        return {
            success: true,
            data: {
                pipelines: pipelinesList,
                kpi: { activeStayCount, totalContacts, conversionRate, totalPipelineValue, openInquiries },
                pipelineData,
                tasks,
            }
        }
    } catch (error) {
        console.error("Dashboard data error:", error)
        return { success: false, error: "Failed to fetch dashboard data" }
    }
}
