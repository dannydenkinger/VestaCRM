import { randomUUID } from "crypto"
import type { FormField, FormStyle, LeadForm } from "@/app/settings/lead-forms/types"

export function generateFormId(): string {
    return randomUUID().replace(/-/g, "").slice(0, 12)
}

export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60)
}

export function generateFieldId(): string {
    return randomUUID().replace(/-/g, "").slice(0, 8)
}

export function getDefaultFields(): FormField[] {
    return [
        {
            id: generateFieldId(),
            type: "short_text",
            label: "Full Name",
            placeholder: "John Smith",
            required: true,
            width: "full",
        },
        {
            id: generateFieldId(),
            type: "email",
            label: "Email Address",
            placeholder: "john@example.com",
            required: true,
            width: "full",
        },
        {
            id: generateFieldId(),
            type: "phone",
            label: "Phone Number",
            placeholder: "(555) 123-4567",
            required: false,
            width: "full",
        },
        {
            id: generateFieldId(),
            type: "long_text",
            label: "Message",
            placeholder: "How can we help you?",
            required: false,
            width: "full",
        },
    ]
}

export function getDefaultStyle(branding?: {
    companyName?: string
    primaryColor?: string
    logoUrl?: string
}): FormStyle {
    const accent = branding?.primaryColor || "#2563eb"
    return {
        logoUrl: branding?.logoUrl || undefined,
        title: branding?.companyName ? `Contact ${branding.companyName}` : "Contact Us",
        description: "Fill out the form below and we'll get back to you shortly.",
        backgroundColor: "#ffffff",
        accentColor: accent,
        textColor: "#1f2937",
        fontFamily: "Inter, system-ui, sans-serif",
        buttonText: "Submit",
        buttonColor: accent,
        buttonTextColor: "#ffffff",
        borderRadius: "md",
        successMessage: "Thank you! We've received your submission and will be in touch soon.",
        redirectUrl: undefined,
        layout: "single",
    }
}

export function getGoogleFontUrl(fontFamily: string): string | null {
    const googleFonts: Record<string, string> = {
        "'Playfair Display', serif": "Playfair+Display:wght@400;600;700",
        "'DM Sans', sans-serif": "DM+Sans:wght@400;500;600;700",
        "'Space Grotesk', sans-serif": "Space+Grotesk:wght@400;500;600;700",
        "'JetBrains Mono', monospace": "JetBrains+Mono:wght@400;500;600",
    }
    const family = googleFonts[fontFamily]
    if (!family) return null
    return `https://fonts.googleapis.com/css2?family=${family}&display=swap`
}
