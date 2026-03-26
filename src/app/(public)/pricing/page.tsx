import { PublicNav } from "@/components/marketing/PublicNav"
import { PublicFooter } from "@/components/marketing/PublicFooter"
import PricingTable from "@/components/marketing/PricingTable"
import type { Plan } from "@/components/marketing/PricingTable"

export const metadata = {
    title: "Pricing | Vesta CRM",
}

const plans: Plan[] = [
    {
        title: "Free",
        price: { monthly: 0, yearly: 0 },
        description: "Perfect for getting started",
        ctaText: "Start Free",
        ctaHref: "/register",
        features: [
            "Up to 100 contacts",
            "2 team members",
            "Pipeline management",
            "Task & calendar management",
            "Google Calendar sync",
            "Basic reporting",
        ],
    },
    {
        title: "Pro",
        price: { monthly: 49, yearly: 470 },
        description: "For growing teams",
        ctaText: "Start Free Trial",
        ctaHref: "/register?plan=pro",
        isFeatured: true,
        features: [
            "Up to 10,000 contacts",
            "10 team members",
            "Everything in Free, plus:",
            "Document management",
            "Email sequences",
            "Marketing tools",
            "Financial tracking",
            "Custom fields",
            "API access",
        ],
    },
    {
        title: "Enterprise",
        price: { monthly: 149, yearly: 1430 },
        description: "For large organizations",
        ctaText: "Contact Sales",
        ctaHref: "/register?plan=enterprise",
        features: [
            "Unlimited contacts",
            "Unlimited team members",
            "Everything in Pro, plus:",
            "Workflow automations",
            "Stage automations",
            "Scheduled reports",
            "Priority support",
        ],
    },
]

export default function PricingPage() {
    return (
        <div className="landing-grain relative min-h-screen overflow-x-clip text-foreground">
            {/* Animated background orbs */}
            <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="landing-orb-home landing-orb-home-1" />
                <div className="landing-orb-home landing-orb-home-2" />
                <div className="landing-orb-home landing-orb-home-3" />
                <div className="landing-orb-home landing-orb-home-4" />
            </div>

            <PublicNav />

            <main className="relative z-10 pt-24 pb-20">
                <PricingTable plans={plans} />
            </main>

            <PublicFooter />
        </div>
    )
}
