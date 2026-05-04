/**
 * Automations — unified workflow engine for Vesta CRM.
 *
 * One model handles email drips AND pipeline-stage automations AND tag-based
 * workflows AND form-followup sequences. Email-send is one action type
 * alongside add-tag, wait, branch, etc.
 *
 * Data shapes (Firestore collections):
 *
 *   automations/{automationId}
 *     {
 *       workspaceId, name, description?, enabled,
 *       trigger: { type: TriggerType, config: {...} },
 *       nodes: AutomationNode[],          // ordered linear list (v1)
 *       stats: { runsStarted, runsCompleted, runsErrored, contactsEnrolled },
 *       createdBy, createdAt, updatedAt
 *     }
 *
 *   automation_runs/{runId}
 *     {
 *       workspaceId, automationId, contactId,
 *       contactEmail?,                     // captured at enroll for externals
 *       status: RunStatus,
 *       currentNodeIdx: number,            // index into automation.nodes
 *       scheduledFor?,                     // when status="waiting", wake-up time
 *       contextData: {...},                // accumulated payload from trigger + actions
 *       startedAt, updatedAt, completedAt?, errorMessage?
 *     }
 */

// ── Triggers ───────────────────────────────────────────────────────────────

export type TriggerType =
    | "contact_created"
    | "contact_added_to_list"
    | "tag_added"
    | "tag_removed"
    | "form_submitted"
    | "pipeline_stage_entered"
    | "opportunity_won"
    | "email_opened"
    | "email_clicked"
    | "manual"

export interface TriggerConfig {
    /** Optional filter: only fire for events matching this id (list, tag, form, stage, campaign). */
    listId?: string
    tagId?: string
    formId?: string
    stageId?: string
    campaignId?: string
}

export interface Trigger {
    type: TriggerType
    config: TriggerConfig
}

// ── Actions / Nodes ────────────────────────────────────────────────────────

export type ActionType =
    | "send_email"
    | "wait"
    | "add_tag"
    | "remove_tag"
    | "add_to_list"
    | "remove_from_list"
    | "branch_if"
    | "end"

export interface BaseNode {
    /** Stable local id, e.g. "n1". Used for branching destinations. */
    id: string
    type: ActionType
}

export interface SendEmailNode extends BaseNode {
    type: "send_email"
    /** Inline subject (tokens supported). */
    subject: string
    /** Inline HTML body (tokens supported). */
    html: string
    /** Optional: source template id (UI-only — full HTML is denormalized into html). */
    templateId?: string | null
}

export interface WaitNode extends BaseNode {
    type: "wait"
    /** Total minutes to wait. UI lets users enter days/hours/minutes; we store minutes. */
    delayMinutes: number
}

export interface AddTagNode extends BaseNode {
    type: "add_tag"
    tagId: string
    tagName?: string
}

export interface RemoveTagNode extends BaseNode {
    type: "remove_tag"
    tagId: string
}

export interface AddToListNode extends BaseNode {
    type: "add_to_list"
    listId: string
}

export interface RemoveFromListNode extends BaseNode {
    type: "remove_from_list"
    listId: string
}

export type ConditionField =
    | "tag"
    | "list_membership"
    | "email_opened"
    | "email_clicked"

export interface BranchCondition {
    field: ConditionField
    /** For tag/list/campaign conditions, which id to test against. */
    targetId: string
}

export interface BranchIfNode extends BaseNode {
    type: "branch_if"
    condition: BranchCondition
    /** Node id to jump to when condition is true. */
    trueNext: string
    /** Node id to jump to when condition is false. */
    falseNext: string
}

export interface EndNode extends BaseNode {
    type: "end"
}

export type AutomationNode =
    | SendEmailNode
    | WaitNode
    | AddTagNode
    | RemoveTagNode
    | AddToListNode
    | RemoveFromListNode
    | BranchIfNode
    | EndNode

// ── Automation envelope ───────────────────────────────────────────────────

export interface AutomationStats {
    runsStarted: number
    runsCompleted: number
    runsErrored: number
    contactsEnrolled: number
}

export interface Automation {
    id: string
    workspaceId: string
    name: string
    description?: string
    enabled: boolean
    trigger: Trigger
    nodes: AutomationNode[]
    stats: AutomationStats
    createdBy: string | null
    createdAt: string
    updatedAt: string
}

// ── Runs ───────────────────────────────────────────────────────────────────

export type RunStatus =
    | "running"
    | "waiting"
    | "completed"
    | "errored"
    | "stopped"

export interface AutomationRun {
    id: string
    workspaceId: string
    automationId: string
    /** Contact this run belongs to. Empty string for external email enrollments. */
    contactId: string
    /** Captured at enrollment so we can still email externals (no contact). */
    contactEmail?: string
    status: RunStatus
    /** Index into automation.nodes — where the run is currently paused. */
    currentNodeIdx: number
    /** When status="waiting", the cron job wakes the run at this time. */
    scheduledFor?: string
    /** Trigger payload + accumulated context from past actions. */
    contextData: Record<string, unknown>
    startedAt: string
    updatedAt: string
    completedAt?: string
    errorMessage?: string
}
