/**
 * Action handler registry. Each handler executes one node type and returns
 * a result that tells the engine what to do next:
 *
 *   { advance: true }                             — move to the next node
 *   { advance: true, jumpTo: "n3" }               — jump to a specific node id
 *   { advance: false, scheduledFor: Date }        — pause and resume later
 *   { advance: true, end: true }                  — terminate the run
 *   { advance: false, error: "..." }              — fail the run
 *
 * Handlers don't mutate run state directly — the engine does. They receive
 * a snapshot of the run + automation + the resolved contact (if any) and
 * return a typed result.
 */

import { adminDb } from "@/lib/firebase-admin"
import { sendEmail } from "@/lib/ses/sender"
import { addContactsToList, removeContactsFromList } from "@/lib/lists/contact-lists"
import type {
    ActionType,
    AddTagNode,
    AddToListNode,
    AutomationNode,
    AutomationRun,
    BranchIfNode,
    RemoveFromListNode,
    RemoveTagNode,
    SendEmailNode,
    WaitNode,
} from "./types"

export interface ActionContext {
    workspaceId: string
    automationId: string
    run: AutomationRun
    /** All nodes in the parent automation (for branch_if to look up node ids). */
    nodes: AutomationNode[]
    /** The CRM contact, if this run is for a CRM contact. */
    contact: ActionContact | null
}

export interface ActionContact {
    id: string
    name: string | null
    firstName: string | null
    lastName: string | null
    email: string | null
    tags: Array<{ tagId: string; name?: string; color?: string }>
}

export interface ActionResult {
    /** Should the engine move past this node? */
    advance: boolean
    /** Skip the linear next-node and jump to this node id instead. */
    jumpTo?: string
    /** When advance=false, when should the run resume? */
    scheduledFor?: Date
    /** Mark the run as completed. */
    end?: boolean
    /** Mark the run as errored with this message. */
    error?: string
    /** Add to the run's contextData (merged shallow). */
    contextPatch?: Record<string, unknown>
}

// ── Handlers ───────────────────────────────────────────────────────────────

async function handleSendEmail(
    node: SendEmailNode,
    ctx: ActionContext,
): Promise<ActionResult> {
    const to = ctx.contact?.email ?? (ctx.run.contactEmail || "")
    if (!to || !to.includes("@")) {
        return { advance: true, error: undefined } // skip silently
    }
    try {
        await sendEmail({
            workspaceId: ctx.workspaceId,
            to,
            subject: node.subject,
            html: node.html,
            contactId: ctx.contact?.id || undefined,
            // Mark this email_log as coming from an automation. We reuse the
            // campaignId field for now — a future schema change can split
            // this into source: "automation"|"campaign" if it gets confusing.
            campaignId: `automation:${ctx.automationId}`,
            autoResolveContact: false,
        })
        return { advance: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : "send_email failed"
        // Suppression / SES not ready / out of credits are not the engine's
        // problem — log and advance so the rest of the run continues.
        console.warn(`[automation:${ctx.automationId}] send_email skipped: ${message}`)
        return { advance: true }
    }
}

async function handleWait(node: WaitNode): Promise<ActionResult> {
    const minutes = Math.max(1, Math.floor(node.delayMinutes || 0))
    const scheduledFor = new Date(Date.now() + minutes * 60_000)
    return { advance: false, scheduledFor }
}

async function handleAddTag(
    node: AddTagNode,
    ctx: ActionContext,
): Promise<ActionResult> {
    if (!ctx.contact) return { advance: true }
    const existing = ctx.contact.tags ?? []
    if (existing.some((t) => t.tagId === node.tagId)) {
        return { advance: true } // already has it
    }
    const tagDoc = await adminDb.collection("tags").doc(node.tagId).get()
    const tagData = tagDoc.exists
        ? {
              tagId: node.tagId,
              name: (tagDoc.data()?.name as string) ?? node.tagName ?? node.tagId,
              color: (tagDoc.data()?.color as string) ?? "#94a3b8",
          }
        : { tagId: node.tagId, name: node.tagName ?? node.tagId, color: "#94a3b8" }
    await adminDb
        .collection("contacts")
        .doc(ctx.contact.id)
        .update({ tags: [...existing, tagData], updatedAt: new Date() })
    return { advance: true }
}

async function handleRemoveTag(
    node: RemoveTagNode,
    ctx: ActionContext,
): Promise<ActionResult> {
    if (!ctx.contact) return { advance: true }
    const filtered = (ctx.contact.tags ?? []).filter((t) => t.tagId !== node.tagId)
    if (filtered.length === ctx.contact.tags.length) return { advance: true }
    await adminDb
        .collection("contacts")
        .doc(ctx.contact.id)
        .update({ tags: filtered, updatedAt: new Date() })
    return { advance: true }
}

async function handleAddToList(
    node: AddToListNode,
    ctx: ActionContext,
): Promise<ActionResult> {
    if (!ctx.contact) return { advance: true }
    await addContactsToList(ctx.workspaceId, node.listId, [ctx.contact.id])
    return { advance: true }
}

async function handleRemoveFromList(
    node: RemoveFromListNode,
    ctx: ActionContext,
): Promise<ActionResult> {
    if (!ctx.contact) return { advance: true }
    await removeContactsFromList(ctx.workspaceId, node.listId, [ctx.contact.id])
    return { advance: true }
}

async function handleBranchIf(
    node: BranchIfNode,
    ctx: ActionContext,
): Promise<ActionResult> {
    const truthy = await evaluateCondition(node, ctx)
    return { advance: true, jumpTo: truthy ? node.trueNext : node.falseNext }
}

async function evaluateCondition(
    node: BranchIfNode,
    ctx: ActionContext,
): Promise<boolean> {
    const c = node.condition
    if (!ctx.contact) return false

    if (c.field === "tag") {
        return (ctx.contact.tags ?? []).some((t) => t.tagId === c.targetId)
    }
    if (c.field === "list_membership") {
        const doc = await adminDb
            .collection("contact_lists")
            .doc(c.targetId)
            .collection("members")
            .doc(ctx.contact.id)
            .get()
        return doc.exists
    }
    if (c.field === "email_opened" || c.field === "email_clicked") {
        const field = c.field === "email_opened" ? "openedAt" : "clickedAt"
        const snap = await adminDb
            .collection("email_logs")
            .where("workspaceId", "==", ctx.workspaceId)
            .where("contactId", "==", ctx.contact.id)
            .where("campaignId", "==", c.targetId)
            .limit(20)
            .get()
        return snap.docs.some((d) => !!d.data()[field])
    }
    return false
}

// ── Dispatcher ─────────────────────────────────────────────────────────────

const HANDLERS: Record<ActionType, (node: AutomationNode, ctx: ActionContext) => Promise<ActionResult>> = {
    send_email: (n, c) => handleSendEmail(n as SendEmailNode, c),
    wait: (n) => handleWait(n as WaitNode),
    add_tag: (n, c) => handleAddTag(n as AddTagNode, c),
    remove_tag: (n, c) => handleRemoveTag(n as RemoveTagNode, c),
    add_to_list: (n, c) => handleAddToList(n as AddToListNode, c),
    remove_from_list: (n, c) => handleRemoveFromList(n as RemoveFromListNode, c),
    branch_if: (n, c) => handleBranchIf(n as BranchIfNode, c),
    end: async () => ({ advance: true, end: true }),
}

export async function runAction(
    node: AutomationNode,
    ctx: ActionContext,
): Promise<ActionResult> {
    const handler = HANDLERS[node.type]
    if (!handler) {
        return { advance: true, error: `Unknown action type: ${node.type}` }
    }
    try {
        return await handler(node, ctx)
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { advance: false, error: message }
    }
}

// Helper: load the contact for a run (with the fields action handlers need)
export async function loadActionContact(
    contactId: string,
): Promise<ActionContact | null> {
    if (!contactId) return null
    const doc = await adminDb.collection("contacts").doc(contactId).get()
    if (!doc.exists) return null
    const data = doc.data() || {}
    return {
        id: doc.id,
        name: (data.name as string) ?? null,
        firstName: (data.firstName as string) ?? null,
        lastName: (data.lastName as string) ?? null,
        email: (data.email as string) ?? null,
        tags: ((data.tags as ActionContact["tags"]) ?? []) as ActionContact["tags"],
    }
}
