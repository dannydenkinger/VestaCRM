import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import {
    getStripe,
    grantFromCheckoutSession,
    isStripeConfigured,
} from "@/lib/billing/credit-topups"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
    if (!isStripeConfigured()) {
        return NextResponse.json(
            { error: "Stripe not configured" },
            { status: 503 },
        )
    }
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    if (!secret) {
        console.error("[Stripe webhook] STRIPE_WEBHOOK_SECRET is not set")
        return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    const signature = req.headers.get("stripe-signature")
    if (!signature) {
        return NextResponse.json({ error: "Missing Stripe-Signature" }, { status: 400 })
    }

    const rawBody = await req.text()
    let event: Stripe.Event
    try {
        const stripe = getStripe()
        event = stripe.webhooks.constructEvent(rawBody, signature, secret)
    } catch (err) {
        const message = err instanceof Error ? err.message : "Signature verification failed"
        console.error("[Stripe webhook] signature error:", message)
        return NextResponse.json({ error: message }, { status: 401 })
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session
                await grantFromCheckoutSession(session)
                return NextResponse.json({ ok: true })
            }
            default:
                return NextResponse.json({ ok: true, ignored: true })
        }
    } catch (err) {
        console.error("[Stripe webhook] handler error:", err)
        const message = err instanceof Error ? err.message : "Handler failed"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
