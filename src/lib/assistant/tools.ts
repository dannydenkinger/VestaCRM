/**
 * Tool definitions for the in-app AI assistant.
 *
 * Read-only in v1. Each tool returns a compact JSON-ish payload (Claude
 * works fine with stringified JSON results) that's tiny enough to keep
 * follow-up reasoning fast.
 *
 * Adding a tool: append to TOOL_DEFS and TOOL_HANDLERS. Schema is the
 * official Anthropic tool input_schema (JSON Schema subset).
 */

import type Anthropic from "@anthropic-ai/sdk"
import { adminDb } from "@/lib/firebase-admin"

export interface ToolContext {
    workspaceId: string
}

interface ToolHandler {
    (args: Record<string, unknown>, ctx: ToolContext): Promise<unknown>
}

export const TOOL_DEFS: Anthropic.Messages.ToolUnion[] = [
    {
        name: "search_contacts",
        description:
            "Search the workspace's contacts by name or email substring. Returns up to 10 matches with name, email, status, and creation date.",
        input_schema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search term — matches name or email substrings (case-insensitive).",
                },
            },
            required: ["query"],
        },
    },
    {
        name: "get_pipeline_summary",
        description:
            "Get a snapshot of the sales pipeline: count of opportunities per stage and total open deal value.",
        input_schema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "get_recent_campaigns",
        description:
            "List recent email campaigns with delivery counts and status. Default last 10.",
        input_schema: {
            type: "object",
            properties: {
                limit: {
                    type: "integer",
                    description: "Max campaigns to return (default 10, max 25).",
                },
            },
            required: [],
        },
    },
    {
        name: "get_automation_summary",
        description:
            "List the workspace's automations with enable status and runs/goals counters.",
        input_schema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "get_upcoming_appointments",
        description:
            "List upcoming confirmed bookings within the next N days (default 14).",
        input_schema: {
            type: "object",
            properties: {
                days: {
                    type: "integer",
                    description: "Window in days from now (default 14, max 90).",
                },
            },
            required: [],
        },
    },
    {
        name: "get_stale_opportunities",
        description:
            "Find open opportunities not updated in the last N days (default 14).",
        input_schema: {
            type: "object",
            properties: {
                days: {
                    type: "integer",
                    description: "Days of inactivity (default 14, max 365).",
                },
                limit: {
                    type: "integer",
                    description: "Max results (default 20, max 50).",
                },
            },
            required: [],
        },
    },
]

const handlers: Record<string, ToolHandler> = {
    search_contacts: async (args, ctx) => {
        const query = String(args.query ?? "").toLowerCase().trim()
        if (!query) return { error: "query required" }
        const snap = await adminDb
            .collection("contacts")
            .where("workspaceId", "==", ctx.workspaceId)
            .limit(500)
            .get()
        const matches = snap.docs
            .map((d) => {
                const data = d.data()
                return {
                    id: d.id,
                    name: (data.name as string) ?? "",
                    email: (data.email as string) ?? "",
                    status: (data.status as string) ?? "",
                    createdAt: tsToISO(data.createdAt),
                }
            })
            .filter(
                (c) =>
                    c.name.toLowerCase().includes(query) ||
                    c.email.toLowerCase().includes(query),
            )
            .slice(0, 10)
        return { count: matches.length, matches }
    },

    get_pipeline_summary: async (_args, ctx) => {
        const snap = await adminDb
            .collection("opportunities")
            .where("workspaceId", "==", ctx.workspaceId)
            .where("status", "==", "open")
            .limit(2000)
            .get()
        const byStage = new Map<string, { count: number; totalValue: number }>()
        let totalValue = 0
        for (const d of snap.docs) {
            const data = d.data()
            const stage = (data.pipelineStageId as string) ?? "(no stage)"
            const value = Number(data.opportunityValue) || 0
            const ent = byStage.get(stage) ?? { count: 0, totalValue: 0 }
            ent.count += 1
            ent.totalValue += value
            byStage.set(stage, ent)
            totalValue += value
        }
        // Resolve stage IDs → names (best-effort)
        const stageNames = new Map<string, string>()
        const pipelinesSnap = await adminDb
            .collection("pipelines")
            .where("workspaceId", "==", ctx.workspaceId)
            .limit(20)
            .get()
        for (const p of pipelinesSnap.docs) {
            const stagesSnap = await p.ref.collection("stages").get()
            for (const s of stagesSnap.docs) {
                stageNames.set(s.id, (s.data().name as string) ?? s.id)
            }
        }
        return {
            totalOpenOpportunities: snap.size,
            totalOpenValue: totalValue,
            byStage: [...byStage.entries()].map(([stageId, s]) => ({
                stageName: stageNames.get(stageId) ?? stageId,
                count: s.count,
                totalValue: s.totalValue,
            })),
        }
    },

    get_recent_campaigns: async (args, ctx) => {
        const limit = Math.min(25, Math.max(1, Number(args.limit) || 10))
        const snap = await adminDb
            .collection("email_campaigns")
            .where("workspaceId", "==", ctx.workspaceId)
            .orderBy("createdAt", "desc")
            .limit(limit)
            .get()
        return {
            campaigns: snap.docs.map((d) => {
                const data = d.data()
                const stats = data.stats ?? {}
                return {
                    id: d.id,
                    name: (data.name as string) ?? "(untitled)",
                    subject: (data.subject as string) ?? "",
                    status: (data.status as string) ?? "draft",
                    sent: (stats.sent as number) ?? 0,
                    failed: (stats.failed as number) ?? 0,
                    targeted: (stats.targeted as number) ?? 0,
                    sentAt: tsToISO(data.sentAt),
                }
            }),
        }
    },

    get_automation_summary: async (_args, ctx) => {
        const snap = await adminDb
            .collection("automations")
            .where("workspaceId", "==", ctx.workspaceId)
            .limit(100)
            .get()
        return {
            automations: snap.docs.map((d) => {
                const data = d.data()
                const stats = data.stats ?? {}
                return {
                    id: d.id,
                    name: (data.name as string) ?? "(untitled)",
                    enabled: (data.enabled as boolean) ?? false,
                    triggerType: (data.trigger?.type as string) ?? "",
                    runsStarted: (stats.runsStarted as number) ?? 0,
                    runsCompleted: (stats.runsCompleted as number) ?? 0,
                    goalsReached: (stats.goalsReached as number) ?? 0,
                }
            }),
        }
    },

    get_upcoming_appointments: async (args, ctx) => {
        const days = Math.min(90, Math.max(1, Number(args.days) || 14))
        const now = new Date()
        const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
        const snap = await adminDb
            .collection("appointments")
            .where("workspaceId", "==", ctx.workspaceId)
            .where("startsAt", ">=", now)
            .where("startsAt", "<=", horizon)
            .limit(50)
            .get()
            .catch(() => null)
        if (!snap) return { appointments: [] }
        return {
            appointments: snap.docs
                .filter((d) => d.data().status !== "cancelled")
                .map((d) => {
                    const data = d.data()
                    return {
                        id: d.id,
                        name: (data.contactName as string) ?? "",
                        email: (data.contactEmail as string) ?? "",
                        startsAt: tsToISO(data.startsAt),
                        endsAt: tsToISO(data.endsAt),
                    }
                }),
        }
    },

    get_stale_opportunities: async (args, ctx) => {
        const days = Math.min(365, Math.max(1, Number(args.days) || 14))
        const limit = Math.min(50, Math.max(1, Number(args.limit) || 20))
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        const snap = await adminDb
            .collection("opportunities")
            .where("workspaceId", "==", ctx.workspaceId)
            .where("status", "==", "open")
            .where("updatedAt", "<=", cutoff)
            .limit(limit)
            .get()
        return {
            count: snap.size,
            opportunities: snap.docs.map((d) => {
                const data = d.data()
                const updatedAt = tsToISO(data.updatedAt)
                const daysIdle = Math.floor(
                    (Date.now() - new Date(updatedAt).getTime()) /
                        (24 * 60 * 60 * 1000),
                )
                return {
                    id: d.id,
                    name: (data.name as string) ?? "(unnamed)",
                    value: Number(data.opportunityValue) || 0,
                    contactId: (data.contactId as string) ?? null,
                    daysIdle,
                    updatedAt,
                }
            }),
        }
    },
}

function tsToISO(ts: unknown): string {
    if (!ts) return ""
    if (ts instanceof Date) return ts.toISOString()
    if (typeof (ts as { toDate?: () => Date }).toDate === "function") {
        return (ts as { toDate: () => Date }).toDate().toISOString()
    }
    return typeof ts === "string" ? ts : ""
}

export async function runTool(
    name: string,
    args: Record<string, unknown>,
    ctx: ToolContext,
): Promise<string> {
    const handler = handlers[name]
    if (!handler) return JSON.stringify({ error: `Unknown tool: ${name}` })
    try {
        const result = await handler(args, ctx)
        return JSON.stringify(result)
    } catch (err) {
        const message = err instanceof Error ? err.message : "tool failed"
        return JSON.stringify({ error: message })
    }
}
