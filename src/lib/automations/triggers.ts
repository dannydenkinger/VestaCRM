/**
 * Trigger dispatcher — the public API the rest of the CRM calls when
 * something happens. Finds matching enabled automations and starts runs.
 *
 *   await fireTrigger({
 *     workspaceId,
 *     type: "contact_added_to_list",
 *     contactId,
 *     contactEmail,
 *     match: { listId },        // filters which automations to enroll into
 *   })
 *
 * Side-effects are best-effort: a failure to fire one trigger never blocks
 * the calling action (e.g. adding a contact to a list always succeeds even
 * if the matching automations crash).
 */

import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import {
    findEnabledAutomationsByTrigger,
    isContactEnrolled,
    startRun,
    updateRun,
} from "./store"
import { advanceRun } from "./engine"
import type { TriggerType } from "./types"

export interface FireTriggerInput {
    workspaceId: string
    type: TriggerType
    /** CRM contact id this event is about. Empty for triggers that aren't contact-scoped. */
    contactId: string
    /** Captured email so external (non-CRM) recipients can still be enrolled. */
    contactEmail?: string
    /** Filter values from the event — used to match automation.trigger.config. */
    match?: {
        listId?: string
        tagId?: string
        formId?: string
        stageId?: string
        campaignId?: string
        fieldPath?: string
    }
    /** Extra payload merged into the run's contextData. */
    payload?: Record<string, unknown>
}

export async function fireTrigger(input: FireTriggerInput): Promise<void> {
    try {
        // Goals: if any RUNNING automation has this trigger as its goal,
        // mark all of that contact's running runs in that automation as
        // goal_reached. Runs in parallel with the enrollment lookup below.
        const goalPromise = input.contactId
            ? evaluateGoals(input).catch((err) =>
                  console.error(`[trigger:${input.type}] goal eval failed:`, err),
              )
            : Promise.resolve()

        const candidates = await findEnabledAutomationsByTrigger(
            input.workspaceId,
            input.type,
        )

        for (const automation of candidates) {
            // Filter by config. If the automation's trigger.config has any
            // filter id, the event must match it. Empty config = match all.
            if (!matchesTriggerConfig(automation.trigger.config, input.match)) {
                continue
            }

            // Single-enrollment guard, unless allowReEnroll is on
            if (input.contactId && !automation.allowReEnroll) {
                const already = await isContactEnrolled(automation.id, input.contactId)
                if (already) continue
            }

            const run = await startRun({
                workspaceId: input.workspaceId,
                automationId: automation.id,
                contactId: input.contactId,
                contactEmail: input.contactEmail,
                contextData: {
                    triggerType: input.type,
                    triggerMatch: input.match ?? {},
                    triggerPayload: input.payload ?? {},
                    triggeredAt: new Date().toISOString(),
                },
            })

            // Fire-and-forget the first step. If it lands on a wait, the run
            // becomes "waiting" and the cron resumes it. If it errors, the
            // run is marked errored — caller is unaffected.
            advanceRun(run.id).catch((err) => {
                console.error(`[trigger:${input.type}] advanceRun failed:`, err)
            })
        }

        await goalPromise
    } catch (err) {
        // Triggers are best-effort — never throw to the caller.
        console.error(`[trigger:${input.type}] fireTrigger failed:`, err)
    }
}

/**
 * Find any RUNNING/WAITING runs for this contact whose parent automation has
 * this trigger as its goal. Mark them goal_reached and bump the goalsReached
 * counter on the automation.
 */
async function evaluateGoals(input: FireTriggerInput): Promise<void> {
    if (!input.contactId) return
    // Find candidate automations: enabled, with a goal of this trigger type
    const snap = await adminDb
        .collection("automations")
        .where("workspaceId", "==", input.workspaceId)
        .where("enabled", "==", true)
        .where("goal.type", "==", input.type)
        .limit(50)
        .get()

    for (const autoDoc of snap.docs) {
        const autoData = autoDoc.data()
        const goal = autoData.goal as { type: string; config: { listId?: string; tagId?: string; formId?: string; stageId?: string; campaignId?: string; fieldPath?: string } }
        if (!matchesTriggerConfig(goal?.config ?? {}, input.match)) continue

        // Find this contact's currently-active runs in that automation
        const runsSnap = await adminDb
            .collection("automation_runs")
            .where("automationId", "==", autoDoc.id)
            .where("contactId", "==", input.contactId)
            .limit(10)
            .get()

        for (const runDoc of runsSnap.docs) {
            const status = runDoc.data().status as string
            if (status !== "running" && status !== "waiting") continue
            await updateRun(runDoc.id, {
                status: "goal_reached",
                completedAt: new Date(),
                scheduledFor: null,
            })
        }
        if (!runsSnap.empty) {
            await adminDb.collection("automations").doc(autoDoc.id).update({
                "stats.goalsReached": FieldValue.increment(1),
                updatedAt: new Date(),
            })
        }
    }
}

function matchesTriggerConfig(
    config: { listId?: string; tagId?: string; formId?: string; stageId?: string; campaignId?: string; fieldPath?: string },
    match?: FireTriggerInput["match"],
): boolean {
    if (!config) return true
    const fields = ["listId", "tagId", "formId", "stageId", "campaignId", "fieldPath"] as const
    for (const f of fields) {
        const expected = config[f]
        if (expected) {
            if (!match || match[f] !== expected) return false
        }
    }
    return true
}
