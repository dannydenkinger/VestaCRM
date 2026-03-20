/**
 * Provisions a new workspace with default data: pipeline, stages, tags,
 * contact statuses, lead sources, and settings documents.
 *
 * Called during registration when a new user creates a workspace.
 *
 * NOTE: This file intentionally uses adminDb directly (not tenantDb) because
 * it is creating the initial workspace data during provisioning. The tenantDb
 * helper's .add() auto-injects workspaceId, but here we need batch operations
 * and explicit control over document IDs and subcollections.
 */

import { adminDb } from "@/lib/firebase-admin"

const DEFAULT_STAGES = [
    { name: "New Lead", order: 0, probability: 10 },
    { name: "Contacted", order: 1, probability: 20 },
    { name: "Qualified", order: 2, probability: 40 },
    { name: "Proposal Sent", order: 3, probability: 60 },
    { name: "Negotiation", order: 4, probability: 80 },
    { name: "Closed Won", order: 5, probability: 100 },
    { name: "Closed Lost", order: 6, probability: 0 },
]

const DEFAULT_TAGS = [
    "Hot Lead",
    "Referral",
    "VIP",
    "Follow Up",
]

const DEFAULT_STATUSES = [
    { name: "Active", order: 0, color: "#22c55e" },
    { name: "Inactive", order: 1, color: "#6b7280" },
    { name: "Do Not Contact", order: 2, color: "#ef4444" },
]

const DEFAULT_LEAD_SOURCES = [
    "Website",
    "Referral",
    "Social Media",
    "Cold Call",
    "Email Campaign",
    "Walk-in",
    "Other",
]

export async function provisionWorkspace(workspaceId: string, workspaceName: string) {
    const batch = adminDb.batch()
    const now = new Date()

    // Create default pipeline
    const pipelineRef = adminDb.collection("pipelines").doc()
    batch.set(pipelineRef, {
        name: "Sales Pipeline",
        workspaceId,
        createdAt: now,
        updatedAt: now,
    })

    // Create default stages
    for (const stage of DEFAULT_STAGES) {
        const stageRef = pipelineRef.collection("stages").doc()
        batch.set(stageRef, {
            ...stage,
            workspaceId,
            createdAt: now,
        })
    }

    // Create default tags
    for (const tagName of DEFAULT_TAGS) {
        const tagRef = adminDb.collection("tags").doc()
        batch.set(tagRef, {
            name: tagName,
            workspaceId,
            createdAt: now,
        })
    }

    // Create default contact statuses
    for (const status of DEFAULT_STATUSES) {
        const statusRef = adminDb.collection("contact_statuses").doc()
        batch.set(statusRef, {
            ...status,
            workspaceId,
            createdAt: now,
        })
    }

    // Create default lead sources
    for (const sourceName of DEFAULT_LEAD_SOURCES) {
        const sourceRef = adminDb.collection("lead_sources").doc()
        batch.set(sourceRef, {
            name: sourceName,
            workspaceId,
            createdAt: now,
        })
    }

    // Create default settings documents (using workspace-prefixed convention)
    const settingsDefaults: Record<string, Record<string, unknown>> = {
        branding: { companyName: workspaceName, workspaceId },
        integrations: { setupCompleted: false, workspaceId },
        automations: { workspaceId },
        pipeline: { workspaceId },
        commission_rates: { workspaceId },
        follow_up_reminders: { workspaceId },
        referrals: { workspaceId },
    }

    for (const [key, data] of Object.entries(settingsDefaults)) {
        const settingsRef = adminDb.collection("settings").doc(`${workspaceId}_${key}`)
        batch.set(settingsRef, { ...data, createdAt: now })
    }

    await batch.commit()
}
