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

import {
    findEnabledAutomationsByTrigger,
    isContactEnrolled,
    startRun,
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
    }
    /** Extra payload merged into the run's contextData. */
    payload?: Record<string, unknown>
}

export async function fireTrigger(input: FireTriggerInput): Promise<void> {
    try {
        const candidates = await findEnabledAutomationsByTrigger(
            input.workspaceId,
            input.type,
        )
        if (candidates.length === 0) return

        for (const automation of candidates) {
            // Filter by config. If the automation's trigger.config has any
            // filter id, the event must match it. Empty config = match all.
            if (!matchesTriggerConfig(automation.trigger.config, input.match)) {
                continue
            }

            // Single-enrollment guard for contact-scoped triggers
            if (input.contactId) {
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
    } catch (err) {
        // Triggers are best-effort — never throw to the caller.
        console.error(`[trigger:${input.type}] fireTrigger failed:`, err)
    }
}

function matchesTriggerConfig(
    config: { listId?: string; tagId?: string; formId?: string; stageId?: string; campaignId?: string },
    match?: FireTriggerInput["match"],
): boolean {
    if (!config) return true
    const fields = ["listId", "tagId", "formId", "stageId", "campaignId"] as const
    for (const f of fields) {
        const expected = config[f]
        if (expected) {
            if (!match || match[f] !== expected) return false
        }
    }
    return true
}
