/**
 * Stripe-backed credit top-ups.
 *
 * Flow:
 *   1. User clicks "Buy 10,000 credits" → server action creates a Stripe
 *      Checkout Session with `metadata.workspaceId` + `metadata.creditsToGrant`.
 *   2. User pays on Stripe-hosted Checkout.
 *   3. Stripe hits our webhook with `checkout.session.completed`.
 *   4. Webhook grants credits (idempotent on `session.id` via credit_ledger).
 *
 * Env vars:
 *   STRIPE_SECRET_KEY                  - secret key (sk_test_ or sk_live_)
 *   STRIPE_WEBHOOK_SECRET              - from the Stripe CLI or dashboard
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY - only used client-side if we ever
 *                                        switch to Elements; Checkout redirect
 *                                        doesn't need it on the client.
 */

import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"
import { grant as grantCredits } from "@/lib/credits/email-credits"

export interface CreditPack {
    sku: string
    label: string
    credits: number
    amountCents: number
    currency: string
}

export const CREDIT_PACKS: CreditPack[] = [
    { sku: "credits-1k", label: "1,000 credits", credits: 1_000, amountCents: 500, currency: "usd" },
    { sku: "credits-10k", label: "10,000 credits", credits: 10_000, amountCents: 2_500, currency: "usd" },
    { sku: "credits-100k", label: "100,000 credits", credits: 100_000, amountCents: 20_000, currency: "usd" },
]

export function getPack(sku: string): CreditPack | null {
    return CREDIT_PACKS.find((p) => p.sku === sku) ?? null
}

export class StripeNotConfiguredError extends Error {
    constructor() {
        super(
            "Stripe is not configured. Set STRIPE_SECRET_KEY in the environment to enable credit top-ups.",
        )
        this.name = "StripeNotConfiguredError"
    }
}

export function isStripeConfigured(): boolean {
    return !!process.env.STRIPE_SECRET_KEY
}

let cachedStripe: Stripe | null = null

export function getStripe(): Stripe {
    if (cachedStripe) return cachedStripe
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new StripeNotConfiguredError()
    cachedStripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" })
    return cachedStripe
}

export interface CreateCheckoutArgs {
    workspaceId: string
    packSku: string
    userId: string
    origin: string
}

export async function createCheckoutSession({
    workspaceId,
    packSku,
    userId,
    origin,
}: CreateCheckoutArgs): Promise<{ url: string; sessionId: string }> {
    if (!workspaceId) throw new Error("workspaceId required")
    const pack = getPack(packSku)
    if (!pack) throw new Error(`Unknown pack: ${packSku}`)

    const stripe = getStripe()
    const base = origin.replace(/\/$/, "")
    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: pack.currency,
                    unit_amount: pack.amountCents,
                    product_data: {
                        name: pack.label,
                        description: `Adds ${pack.credits.toLocaleString()} email credits to your workspace.`,
                    },
                },
            },
        ],
        metadata: {
            workspaceId,
            userId,
            packSku: pack.sku,
            creditsToGrant: String(pack.credits),
        },
        success_url: `${base}/settings/integrations/ses?topup=success`,
        cancel_url: `${base}/settings/integrations/ses?topup=canceled`,
    })

    if (!session.url) throw new Error("Stripe did not return a checkout URL")
    return { url: session.url, sessionId: session.id }
}

/**
 * Apply a completed Checkout Session idempotently. Safe to call multiple
 * times for the same session (guarded by `credit_ledger.refId`).
 */
export async function grantFromCheckoutSession(
    session: Stripe.Checkout.Session,
): Promise<{ granted: boolean; credits: number; workspaceId: string | null }> {
    const md = (session.metadata ?? {}) as Record<string, string>
    const workspaceId = md.workspaceId || null
    const creditsRaw = md.creditsToGrant
    const credits = creditsRaw ? Number(creditsRaw) : 0

    if (!workspaceId || !Number.isFinite(credits) || credits <= 0) {
        console.warn("[Stripe] Checkout session missing metadata — ignoring", session.id)
        return { granted: false, credits: 0, workspaceId }
    }

    // Idempotency check: same session.id already applied?
    const existing = await adminDb
        .collection("credit_ledger")
        .where("refId", "==", session.id)
        .limit(1)
        .get()
    if (!existing.empty) {
        return { granted: false, credits, workspaceId }
    }

    await grantCredits(
        workspaceId,
        credits,
        `Stripe top-up (${md.packSku ?? "pack"})`,
        session.id,
    )
    return { granted: true, credits, workspaceId }
}
