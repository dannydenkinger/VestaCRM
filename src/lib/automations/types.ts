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
    | "contact_field_updated"
    | "webhook_in"
    | "manual"

export interface TriggerConfig {
    /** Optional filter: only fire for events matching this id (list, tag, form, stage, campaign). */
    listId?: string
    tagId?: string
    formId?: string
    stageId?: string
    campaignId?: string
    /** For contact_field_updated: which field path to watch. */
    fieldPath?: string
}

export interface Trigger {
    type: TriggerType
    config: TriggerConfig
}

// ── Actions / Nodes ────────────────────────────────────────────────────────

export type ActionType =
    | "send_email"
    | "ai_send_email"
    | "wait"
    | "wait_until"
    | "wait_until_business_hours"
    | "add_tag"
    | "remove_tag"
    | "add_to_list"
    | "remove_from_list"
    | "branch_if"
    | "stop_if"
    | "update_contact_field"
    | "increment_field"
    | "assign_user"
    | "create_task"
    | "send_internal_email"
    | "webhook"
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

/**
 * AI-generated email: Claude writes the body per recipient using the prompt,
 * then sends. Subject is fixed (tokens supported); the body is whatever the
 * model generates.
 *
 * Costs Anthropic API tokens per send (in addition to one email credit).
 * Use Haiku for high-volume / cost-sensitive flows; Sonnet for higher quality.
 */
export interface AiSendEmailNode extends BaseNode {
    type: "ai_send_email"
    /** Subject line (tokens supported, no AI). */
    subject: string
    /** What you want the AI to write. Includes contact context automatically. */
    prompt: string
    /** Anthropic model id. Defaults to claude-haiku-4-5 if omitted. */
    model?: "claude-haiku-4-5" | "claude-sonnet-4-6" | "claude-opus-4-7"
    /** Max tokens in the AI's response. Default 600. */
    maxOutputTokens?: number
}

export interface WaitNode extends BaseNode {
    type: "wait"
    /** Total minutes to wait. UI lets users enter days/hours/minutes; we store minutes. */
    delayMinutes: number
}

/** Wait until a specific calendar time (ISO string). */
export interface WaitUntilNode extends BaseNode {
    type: "wait_until"
    /** ISO 8601 datetime — the run resumes at or after this moment. */
    until: string
}

/**
 * Wait until the next business-hours window. If currently inside the window,
 * the run resumes immediately. Otherwise pauses until the next window open.
 */
export interface WaitUntilBusinessHoursNode extends BaseNode {
    type: "wait_until_business_hours"
    /** Hour (0-23) when the window opens, in the configured timezone. Default 9. */
    startHour?: number
    /** Hour (0-23) when the window closes. Default 17. */
    endHour?: number
    /** Days of week considered business days (0 = Sunday). Default [1,2,3,4,5]. */
    businessDays?: number[]
    /** IANA timezone name (e.g. "America/New_York"). Default UTC. */
    timezone?: string
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

/** Exit the run early if the condition is true. Otherwise continue. */
export interface StopIfNode extends BaseNode {
    type: "stop_if"
    condition: BranchCondition
}

/** Set a single field on the contact. */
export interface UpdateContactFieldNode extends BaseNode {
    type: "update_contact_field"
    /** Field path on the contact doc. Supports nested via dots, e.g. "customFields.lead_score". */
    fieldPath: string
    /** Literal value to write (string/number/null — UI keeps this simple in v1). */
    value: string | number | null
}

/** Add (or subtract via negative delta) from a numeric contact field. Lead-score style. */
export interface IncrementFieldNode extends BaseNode {
    type: "increment_field"
    fieldPath: string
    delta: number
}

/** Set the contact's assigneeId to a specific workspace user. */
export interface AssignUserNode extends BaseNode {
    type: "assign_user"
    /** Workspace user id (member id from workspace_members). Empty = unassign. */
    userId: string
}

/** Create a task linked to the contact, optionally assigned to a user. */
export interface CreateTaskNode extends BaseNode {
    type: "create_task"
    /** Task title. Tokens like {{first_name}} are rendered. */
    title: string
    /** Optional description (tokens supported). */
    description?: string
    /** Optional assignee user id. */
    assigneeId?: string
    /** Optional due offset in days from "now" (when the action fires). */
    dueOffsetDays?: number
}

/** Send an email to a workspace user (e.g. internal lead notification). */
export interface SendInternalEmailNode extends BaseNode {
    type: "send_internal_email"
    /** Comma-separated email addresses (workspace teammates). Tokens supported. */
    to: string
    subject: string
    body: string
}

/** POST the run context to an arbitrary URL. The escape hatch for power users. */
export interface WebhookNode extends BaseNode {
    type: "webhook"
    url: string
    /** Optional Authorization header value (sent verbatim). */
    authHeader?: string
}

export interface EndNode extends BaseNode {
    type: "end"
}

export type AutomationNode =
    | SendEmailNode
    | AiSendEmailNode
    | WaitNode
    | WaitUntilNode
    | WaitUntilBusinessHoursNode
    | AddTagNode
    | RemoveTagNode
    | AddToListNode
    | RemoveFromListNode
    | BranchIfNode
    | StopIfNode
    | UpdateContactFieldNode
    | IncrementFieldNode
    | AssignUserNode
    | CreateTaskNode
    | SendInternalEmailNode
    | WebhookNode
    | EndNode

// ── Automation envelope ───────────────────────────────────────────────────

export interface AutomationStats {
    runsStarted: number
    runsCompleted: number
    runsErrored: number
    contactsEnrolled: number
    /** Runs that hit the goal condition before completion. */
    goalsReached?: number
}

/**
 * A goal: when this trigger fires for a contact in a running automation,
 * the run is short-circuited as "goal_reached" and counted as a conversion.
 * Same trigger schema as the main trigger, just used as an end condition.
 */
export interface AutomationGoal {
    type: TriggerType
    config: TriggerConfig
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
    /** Allow contacts to re-enter when the trigger fires again. Default false. */
    allowReEnroll?: boolean
    /** Optional goal — when reached, run terminates early as `goal_reached`. */
    goal?: AutomationGoal
    /** Token for webhook_in trigger (set on save when trigger.type === "webhook_in"). */
    webhookToken?: string
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
    | "goal_reached"

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
