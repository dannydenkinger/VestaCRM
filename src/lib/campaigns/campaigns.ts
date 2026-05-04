import { adminDb } from "@/lib/firebase-admin"
import { sendEmail, SesIdentityNotReadyError } from "@/lib/ses/sender"
import { InsufficientCreditsError } from "@/lib/credits/email-credits"
import { logActivity } from "@/lib/activities/timeline"
import { unionMembers } from "@/lib/lists/contact-lists"
import type {
    CampaignAudienceType,
    CampaignStatus,
    EmailCampaign,
} from "@/types"

function tsToISO(ts: unknown): string {
    if (!ts) return ""
    if (typeof (ts as { toDate?: () => Date }).toDate === "function") {
        return (ts as { toDate: () => Date }).toDate().toISOString()
    }
    if (ts instanceof Date) return ts.toISOString()
    return typeof ts === "string" ? ts : ""
}

function mapCampaign(id: string, data: Record<string, unknown>): EmailCampaign {
    const stats = (data.stats as EmailCampaign["stats"]) ?? {
        targeted: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
    }
    return {
        id,
        workspaceId: (data.workspaceId as string) ?? "",
        name: (data.name as string) ?? "",
        subject: (data.subject as string) ?? "",
        templateId: (data.templateId as string) ?? null,
        renderedHtml: (data.renderedHtml as string) ?? "",
        audienceType: (data.audienceType as CampaignAudienceType) ?? "all_contacts",
        audienceValue: (data.audienceValue as string[] | null) ?? null,
        excludeListIds: (data.excludeListIds as string[] | null) ?? null,
        status: (data.status as CampaignStatus) ?? "draft",
        scheduledAt: data.scheduledAt ? tsToISO(data.scheduledAt) : undefined,
        stats,
        createdBy: (data.createdBy as string) ?? null,
        createdAt: tsToISO(data.createdAt),
        updatedAt: tsToISO(data.updatedAt),
        sentAt: data.sentAt ? tsToISO(data.sentAt) : undefined,
    }
}

export async function listCampaigns(workspaceId: string): Promise<EmailCampaign[]> {
    if (!workspaceId) throw new Error("workspaceId required")
    const snap = await adminDb
        .collection("email_campaigns")
        .where("workspaceId", "==", workspaceId)
        .orderBy("createdAt", "desc")
        .limit(200)
        .get()
    return snap.docs.map((d) => mapCampaign(d.id, d.data()))
}

export async function getCampaign(
    workspaceId: string,
    id: string,
): Promise<EmailCampaign | null> {
    const doc = await adminDb.collection("email_campaigns").doc(id).get()
    if (!doc.exists) return null
    const data = doc.data()!
    if (data.workspaceId !== workspaceId) return null
    return mapCampaign(doc.id, data)
}

export interface CreateCampaignInput {
    workspaceId: string
    name: string
    subject: string
    templateId?: string | null
    renderedHtml: string
    audienceType: CampaignAudienceType
    audienceValue?: string[] | null
    excludeListIds?: string[] | null
    createdBy?: string | null
    scheduledAt?: Date | null
}

export async function createCampaign(input: CreateCampaignInput): Promise<EmailCampaign> {
    if (!input.workspaceId) throw new Error("workspaceId required")
    if (!input.name) throw new Error("name required")
    if (!input.subject) throw new Error("subject required")
    if (!input.renderedHtml) throw new Error("renderedHtml required")

    const now = new Date()
    const status: CampaignStatus = input.scheduledAt ? "scheduled" : "draft"
    const ref = await adminDb.collection("email_campaigns").add({
        workspaceId: input.workspaceId,
        name: input.name,
        subject: input.subject,
        templateId: input.templateId ?? null,
        renderedHtml: input.renderedHtml,
        audienceType: input.audienceType,
        audienceValue: input.audienceValue ?? null,
        excludeListIds: input.excludeListIds ?? null,
        status,
        scheduledAt: input.scheduledAt ?? null,
        stats: { targeted: 0, sent: 0, failed: 0, skipped: 0 },
        createdBy: input.createdBy ?? null,
        createdAt: now,
        updatedAt: now,
    })
    const snap = await ref.get()
    return mapCampaign(ref.id, snap.data()!)
}

export interface UpdateCampaignInput {
    name?: string
    subject?: string
    templateId?: string | null
    renderedHtml?: string
    audienceType?: CampaignAudienceType
    audienceValue?: string[] | null
    excludeListIds?: string[] | null
    scheduledAt?: Date | null
}

export async function updateCampaign(
    workspaceId: string,
    id: string,
    patch: UpdateCampaignInput,
): Promise<EmailCampaign> {
    const ref = adminDb.collection("email_campaigns").doc(id)
    const doc = await ref.get()
    if (!doc.exists) throw new Error("Campaign not found")
    const existing = doc.data()!
    if (existing.workspaceId !== workspaceId) throw new Error("Forbidden")
    if (existing.status !== "draft" && existing.status !== "scheduled") {
        throw new Error(`Cannot edit campaign in status '${existing.status}'`)
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (patch.name !== undefined) updates.name = patch.name
    if (patch.subject !== undefined) updates.subject = patch.subject
    if (patch.templateId !== undefined) updates.templateId = patch.templateId
    if (patch.renderedHtml !== undefined) updates.renderedHtml = patch.renderedHtml
    if (patch.audienceType !== undefined) updates.audienceType = patch.audienceType
    if (patch.audienceValue !== undefined) updates.audienceValue = patch.audienceValue
    if (patch.excludeListIds !== undefined) updates.excludeListIds = patch.excludeListIds
    if (patch.scheduledAt !== undefined) {
        updates.scheduledAt = patch.scheduledAt
        // Status follows the schedule: presence of a date = scheduled, absence = draft
        updates.status = patch.scheduledAt ? "scheduled" : "draft"
    }

    await ref.update(updates)
    const updated = await ref.get()
    return mapCampaign(ref.id, updated.data()!)
}

export async function deleteCampaign(workspaceId: string, id: string): Promise<void> {
    const ref = adminDb.collection("email_campaigns").doc(id)
    const doc = await ref.get()
    if (!doc.exists) return
    const data = doc.data()!
    if (data.workspaceId !== workspaceId) throw new Error("Forbidden")
    if (data.status === "sending") throw new Error("Cannot delete a campaign while it is sending")
    await ref.delete()
}

interface AudienceContact {
    /** Empty string for external (CSV-imported) emails — they have no contact doc. */
    id: string
    email: string
    /** True for CSV-imported emails that aren't tied to a CRM contact. */
    external?: boolean
    /** Optional display name (used by personalization tokens for externals). */
    name?: string
}

async function resolveContactsByIds(
    workspaceId: string,
    ids: string[],
): Promise<AudienceContact[]> {
    if (ids.length === 0) return []
    const out: AudienceContact[] = []
    for (let i = 0; i < ids.length; i += 30) {
        const chunk = ids.slice(i, i + 30)
        const snap = await adminDb
            .collection("contacts")
            .where("workspaceId", "==", workspaceId)
            .where("__name__", "in", chunk)
            .get()
        for (const d of snap.docs) {
            const email = (d.data().email as string) ?? ""
            if (email && email.includes("@")) out.push({ id: d.id, email })
        }
    }
    return out
}

async function resolveAudience(
    workspaceId: string,
    audienceType: CampaignAudienceType,
    audienceValue: string[] | null,
    excludeListIds: string[] | null = null,
    limit = 5000,
): Promise<AudienceContact[]> {
    let base: AudienceContact[] = []

    if (audienceType === "all_contacts") {
        const snap = await adminDb
            .collection("contacts")
            .where("workspaceId", "==", workspaceId)
            .limit(limit)
            .get()
        base = snap.docs
            .map((d) => ({ id: d.id, email: (d.data().email as string) ?? "" }))
            .filter((c) => c.email && c.email.includes("@"))
    } else if (audienceType === "by_ids") {
        base = await resolveContactsByIds(workspaceId, audienceValue ?? [])
    } else if (audienceType === "by_list") {
        const listIds = audienceValue ?? []
        if (listIds.length === 0) return []
        // by_list now includes both CRM contacts AND external CSV-imported
        // emails (those don't have a contact doc, so they bypass the contacts
        // lookup and ride along as { id: "", email, external: true, name? }).
        const { contactIds, externalEmails } = await unionMembers(
            workspaceId,
            listIds,
            limit,
        )
        const crmContacts = await resolveContactsByIds(workspaceId, contactIds)
        // Dedupe externals against any CRM contacts that share the same email
        const knownEmails = new Set(crmContacts.map((c) => c.email.toLowerCase()))
        const externals: AudienceContact[] = externalEmails
            .filter((e) => !knownEmails.has(e.email.toLowerCase()))
            .map((e) => ({
                id: "",
                email: e.email,
                external: true,
                name: e.name,
            }))
        base = [...crmContacts, ...externals]
    }

    if (audienceType === "by_tag") {
        const tags = audienceValue ?? []
        if (tags.length === 0) return []
        const snap = await adminDb
            .collection("contacts")
            .where("workspaceId", "==", workspaceId)
            .where("tags", "array-contains-any", tags.slice(0, 10))
            .limit(limit)
            .get()
        base = snap.docs
            .map((d) => ({ id: d.id, email: (d.data().email as string) ?? "" }))
            .filter((c) => c.email && c.email.includes("@"))
    }

    // Exclusion step: filter out any audience entries that appear in the
    // excludeListIds. Excludes by contactId AND by lower-cased email so
    // CSV-imported externals on the exclude list are honored too.
    if (excludeListIds && excludeListIds.length > 0) {
        const excluded = await unionMembers(workspaceId, excludeListIds, limit)
        const excludedIds = new Set(excluded.contactIds)
        const excludedEmails = new Set(
            excluded.externalEmails.map((e) => e.email.toLowerCase()),
        )
        base = base.filter(
            (c) =>
                !excludedIds.has(c.id) &&
                !excludedEmails.has((c.email ?? "").toLowerCase()),
        )
    }

    return base
}

export interface SendCampaignResult {
    ok: boolean
    campaignId: string
    targeted: number
    sent: number
    failed: number
    skipped: number
    error?: string
}

/** Number of recipients sent in parallel within a single campaign. */
const SEND_CONCURRENCY = 5

/** Retry transient SES failures (network blips, throttle) up to this many times. */
const SEND_MAX_ATTEMPTS = 3

/** Backoff between retries. */
const SEND_RETRY_BASE_MS = 250

function isTransientError(err: unknown): boolean {
    if (err instanceof SesIdentityNotReadyError) return false
    if (err instanceof InsufficientCreditsError) return false
    const message = err instanceof Error ? err.message : String(err)
    // Treat AWS throttles, 5xx, and network errors as transient. Anything that
    // looks like a permanent bounce / config issue is left alone.
    return /(throttl|timeout|temporar|service unavailable|internal server|ECONN|ETIMEDOUT|ENETUNREACH|fetch failed)/i.test(
        message,
    )
}

async function sendOneWithRetry(
    args: Parameters<typeof sendEmail>[0],
): Promise<{ ok: boolean; fatal?: Error }> {
    let lastError: unknown
    for (let attempt = 1; attempt <= SEND_MAX_ATTEMPTS; attempt++) {
        try {
            const result = await sendEmail(args)
            if (result.ok) return { ok: true }
            // Soft-fail (e.g. invalid recipient) — don't retry.
            return { ok: false }
        } catch (err) {
            lastError = err
            if (
                err instanceof SesIdentityNotReadyError ||
                err instanceof InsufficientCreditsError
            ) {
                return { ok: false, fatal: err }
            }
            if (attempt < SEND_MAX_ATTEMPTS && isTransientError(err)) {
                await new Promise((r) => setTimeout(r, SEND_RETRY_BASE_MS * 2 ** (attempt - 1)))
                continue
            }
            return { ok: false }
        }
    }
    // Shouldn't get here, but TypeScript wants a return.
    void lastError
    return { ok: false }
}

export async function sendCampaign(
    workspaceId: string,
    campaignId: string,
): Promise<SendCampaignResult> {
    const ref = adminDb.collection("email_campaigns").doc(campaignId)

    // Race-safe claim: atomically transition status (draft|scheduled) → sending.
    // Prevents double-sends if the cron fires twice or a manual send overlaps
    // a scheduled tick.
    const claimResult = await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists) throw new Error("Campaign not found")
        const data = snap.data()!
        if (data.workspaceId !== workspaceId) throw new Error("Forbidden")
        if (data.status !== "draft" && data.status !== "scheduled") {
            return {
                claimed: false as const,
                status: data.status as CampaignStatus,
                data,
            }
        }
        tx.update(ref, { status: "sending", updatedAt: new Date() })
        return { claimed: true as const, status: data.status, data }
    })

    if (!claimResult.claimed) {
        return {
            ok: false,
            campaignId,
            targeted: 0,
            sent: 0,
            failed: 0,
            skipped: 0,
            error: `Cannot send campaign in status '${claimResult.status}'`,
        }
    }

    const data = claimResult.data

    let sent = 0
    let failed = 0
    let skipped = 0
    let targeted = 0
    let fatalError: string | undefined

    try {
        const audience = await resolveAudience(
            workspaceId,
            data.audienceType as CampaignAudienceType,
            (data.audienceValue as string[] | null) ?? null,
            (data.excludeListIds as string[] | null) ?? null,
        )
        targeted = audience.length

        // Send in parallel chunks. Stops fast if we hit a fatal error
        // (SES not ready / out of credits) — skip remainder of audience.
        for (let i = 0; i < audience.length; i += SEND_CONCURRENCY) {
            if (fatalError) break
            const chunk = audience.slice(i, i + SEND_CONCURRENCY)
            const results = await Promise.all(
                chunk.map((contact) =>
                    sendOneWithRetry({
                        workspaceId,
                        to: contact.email,
                        subject: data.subject,
                        html: data.renderedHtml,
                        // External (CSV) members have no contact doc — pass
                        // undefined so email_logs doesn't get a fake contactId.
                        contactId: contact.external ? undefined : contact.id,
                        campaignId,
                        autoResolveContact: false,
                    }),
                ),
            )
            for (const r of results) {
                if (r.fatal) {
                    fatalError = r.fatal.message
                    if (r.fatal instanceof InsufficientCreditsError) {
                        skipped = audience.length - sent - failed - 1
                    }
                    break
                }
                if (r.ok) sent += 1
                else failed += 1
            }
        }

        const finalStatus: CampaignStatus =
            fatalError || failed > 0 ? "sent_with_errors" : "sent"

        await ref.update({
            status: finalStatus,
            stats: { targeted, sent, failed, skipped },
            sentAt: new Date(),
            updatedAt: new Date(),
        })

        await logActivity({
            workspaceId,
            type: "email_sent",
            source: "ses",
            subject: `Campaign "${data.name}" completed`,
            body: `${sent}/${targeted} sent, ${failed} failed, ${skipped} skipped.`,
            metadata: { campaignId },
            sourceRef: campaignId,
        })

        return {
            ok: !fatalError,
            campaignId,
            targeted,
            sent,
            failed,
            skipped,
            error: fatalError,
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        await ref.update({
            status: "failed",
            stats: { targeted, sent, failed, skipped },
            updatedAt: new Date(),
        })
        return {
            ok: false,
            campaignId,
            targeted,
            sent,
            failed,
            skipped,
            error: message,
        }
    }
}
