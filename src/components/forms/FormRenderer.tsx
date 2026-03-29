"use client"

import { useState } from "react"
import type { LeadForm, FormField } from "@/app/settings/lead-forms/types"
import { BORDER_RADIUS_MAP } from "@/app/settings/lead-forms/types"
import { FormFieldRenderer } from "./FormFieldRenderer"
import { FormSuccess } from "./FormSuccess"

interface Props {
    form: LeadForm
    mode: "preview" | "live"
    selectedFieldId?: string | null
    onFieldSelect?: (fieldId: string) => void
    submitUrl?: string
}

export function FormRenderer({ form, mode, selectedFieldId, onFieldSelect, submitUrl }: Props) {
    const { style, fields } = form
    const radius = BORDER_RADIUS_MAP[style.borderRadius]

    const [values, setValues] = useState<Record<string, any>>({})
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const setValue = (fieldId: string, value: any) => {
        setValues(prev => ({ ...prev, [fieldId]: value }))
        if (errors[fieldId]) setErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n })
    }

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}
        for (const field of fields) {
            if (field.type === "header" || field.type === "hidden") continue
            const val = values[field.id]
            if (field.required && (!val || (typeof val === "string" && !val.trim()) || (Array.isArray(val) && val.length === 0))) {
                newErrors[field.id] = `${field.label} is required`
            }
            if (field.type === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                newErrors[field.id] = "Please enter a valid email address"
            }
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (mode === "preview") return
        if (!validate()) return

        setSubmitting(true)
        try {
            // Build payload with field labels as keys
            const payload: Record<string, any> = {}
            for (const field of fields) {
                if (field.type === "header") continue
                const val = values[field.id]
                if (val !== undefined && val !== "" && val !== null) {
                    // Use smart key mapping for known types
                    if (field.type === "email") payload.email = val
                    else if (field.type === "phone") payload.phone = val
                    else if (field.label.toLowerCase().includes("name") && !payload.name) payload.name = val
                    else if (field.type === "hidden") payload[field.label] = field.defaultValue
                    else {
                        const key = field.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
                        payload[key] = Array.isArray(val) ? val.join(", ") : val
                    }
                }
            }

            const url = submitUrl || `/api/forms/${form.id}/submit`
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                if (style.redirectUrl) {
                    window.location.href = style.redirectUrl
                } else {
                    setSubmitted(true)
                }
            } else {
                const data = await res.json().catch(() => ({}))
                alert(data.error || "Something went wrong. Please try again.")
            }
        } catch {
            alert("Something went wrong. Please try again.")
        }
        setSubmitting(false)
    }

    if (submitted) {
        return (
            <div style={{
                minHeight: "100%",
                backgroundColor: style.backgroundColor,
                fontFamily: style.fontFamily,
            }}>
                <div style={{
                    maxWidth: "560px",
                    margin: "0 auto",
                    padding: "40px 24px",
                }}>
                    <FormSuccess style={style} />
                </div>
            </div>
        )
    }

    // Group fields for two-column layout
    const fieldRows: (FormField | [FormField, FormField])[] = []
    if (style.layout === "two-column") {
        let i = 0
        while (i < fields.length) {
            const field = fields[i]
            if (field.width === "half" && i + 1 < fields.length && fields[i + 1].width === "half") {
                fieldRows.push([field, fields[i + 1]])
                i += 2
            } else {
                fieldRows.push(field)
                i++
            }
        }
    } else {
        fields.forEach(f => fieldRows.push(f))
    }

    return (
        <div style={{
            minHeight: "100%",
            backgroundColor: style.backgroundColor,
            fontFamily: style.fontFamily,
        }}>
            <div style={{
                maxWidth: "560px",
                margin: "0 auto",
                padding: "40px 24px",
            }}>
                {/* Logo */}
                {style.logoUrl && (
                    <div style={{ textAlign: "center", marginBottom: "24px" }}>
                        <img
                            src={style.logoUrl}
                            alt=""
                            style={{ maxHeight: "48px", maxWidth: "200px", objectFit: "contain" }}
                        />
                    </div>
                )}

                {/* Title & Description */}
                {style.title && (
                    <h1 style={{
                        fontSize: "28px",
                        fontWeight: 700,
                        color: style.textColor,
                        textAlign: "center",
                        margin: "0 0 8px 0",
                        fontFamily: style.fontFamily,
                    }}>
                        {style.title}
                    </h1>
                )}
                {style.description && (
                    <p style={{
                        fontSize: "15px",
                        color: "#6b7280",
                        textAlign: "center",
                        margin: "0 0 32px 0",
                        lineHeight: "1.5",
                        fontFamily: style.fontFamily,
                    }}>
                        {style.description}
                    </p>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {fieldRows.map((row, rowIdx) => {
                        if (Array.isArray(row)) {
                            return (
                                <div key={rowIdx} style={{ display: "flex", gap: "16px" }}>
                                    {row.map(field => (
                                        <div
                                            key={field.id}
                                            style={{
                                                flex: 1,
                                                cursor: mode === "preview" ? "pointer" : undefined,
                                                outline: selectedFieldId === field.id ? `2px solid ${style.accentColor}` : undefined,
                                                outlineOffset: "4px",
                                                borderRadius: "4px",
                                            }}
                                            onClick={mode === "preview" ? (e) => { e.preventDefault(); onFieldSelect?.(field.id) } : undefined}
                                        >
                                            <FormFieldRenderer
                                                field={field}
                                                style={style}
                                                value={values[field.id]}
                                                onChange={v => setValue(field.id, v)}
                                                error={errors[field.id]}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )
                        }

                        const field = row as FormField
                        return (
                            <div
                                key={field.id}
                                style={{
                                    cursor: mode === "preview" ? "pointer" : undefined,
                                    outline: selectedFieldId === field.id ? `2px solid ${style.accentColor}` : undefined,
                                    outlineOffset: "4px",
                                    borderRadius: "4px",
                                }}
                                onClick={mode === "preview" ? (e) => { e.preventDefault(); onFieldSelect?.(field.id) } : undefined}
                            >
                                <FormFieldRenderer
                                    field={field}
                                    style={style}
                                    value={values[field.id]}
                                    onChange={v => setValue(field.id, v)}
                                    error={errors[field.id]}
                                />
                            </div>
                        )
                    })}

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            width: "100%",
                            padding: "14px",
                            backgroundColor: submitting ? style.buttonColor + "99" : style.buttonColor,
                            color: style.buttonTextColor,
                            border: "none",
                            borderRadius: radius,
                            fontSize: "15px",
                            fontWeight: 600,
                            fontFamily: style.fontFamily,
                            cursor: submitting ? "not-allowed" : "pointer",
                            transition: "opacity 0.15s",
                            marginTop: "8px",
                        }}
                    >
                        {submitting ? "Submitting..." : style.buttonText}
                    </button>
                </form>

                {/* Powered by */}
                <p style={{
                    textAlign: "center",
                    fontSize: "11px",
                    color: "#9ca3af",
                    marginTop: "32px",
                }}>
                    Powered by Vesta CRM
                </p>
            </div>
        </div>
    )
}
