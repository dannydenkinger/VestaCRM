"use client"

import type { FormField, FormStyle } from "@/app/settings/lead-forms/types"
import { BORDER_RADIUS_MAP } from "@/app/settings/lead-forms/types"

interface Props {
    field: FormField
    style: FormStyle
    value: any
    onChange: (value: any) => void
    error?: string
}

export function FormFieldRenderer({ field, style, value, onChange, error }: Props) {
    const radius = BORDER_RADIUS_MAP[style.borderRadius]
    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: "10px 14px",
        border: `1px solid ${error ? "#ef4444" : "#d1d5db"}`,
        borderRadius: radius,
        fontSize: "14px",
        fontFamily: style.fontFamily,
        color: style.textColor,
        backgroundColor: "#ffffff",
        outline: "none",
        boxSizing: "border-box" as const,
        transition: "border-color 0.15s",
    }
    const labelStyle: React.CSSProperties = {
        display: "block",
        fontSize: "14px",
        fontWeight: 500,
        color: style.textColor,
        marginBottom: "6px",
        fontFamily: style.fontFamily,
    }
    const helpStyle: React.CSSProperties = {
        fontSize: "12px",
        color: "#9ca3af",
        marginTop: "4px",
        fontFamily: style.fontFamily,
    }
    const errorStyle: React.CSSProperties = {
        fontSize: "12px",
        color: "#ef4444",
        marginTop: "4px",
        fontFamily: style.fontFamily,
    }

    if (field.type === "header") {
        return (
            <div style={{ padding: "8px 0" }}>
                <h2 style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: style.textColor,
                    fontFamily: style.fontFamily,
                    margin: 0,
                }}>
                    {field.label}
                </h2>
                {field.helpText && (
                    <p style={{ ...helpStyle, fontSize: "14px", marginTop: "4px" }}>{field.helpText}</p>
                )}
            </div>
        )
    }

    if (field.type === "hidden") {
        return <input type="hidden" name={field.label} value={field.defaultValue || ""} />
    }

    const renderInput = () => {
        switch (field.type) {
            case "short_text":
                return (
                    <input
                        type="text"
                        placeholder={field.placeholder}
                        value={value || ""}
                        onChange={e => onChange(e.target.value)}
                        style={inputStyle}
                        onFocus={e => { e.target.style.borderColor = style.accentColor }}
                        onBlur={e => { e.target.style.borderColor = error ? "#ef4444" : "#d1d5db" }}
                    />
                )
            case "long_text":
                return (
                    <textarea
                        placeholder={field.placeholder}
                        value={value || ""}
                        onChange={e => onChange(e.target.value)}
                        rows={4}
                        style={{ ...inputStyle, resize: "vertical" as const, minHeight: "100px" }}
                        onFocus={e => { e.target.style.borderColor = style.accentColor }}
                        onBlur={e => { e.target.style.borderColor = error ? "#ef4444" : "#d1d5db" }}
                    />
                )
            case "email":
                return (
                    <input
                        type="email"
                        placeholder={field.placeholder || "email@example.com"}
                        value={value || ""}
                        onChange={e => onChange(e.target.value)}
                        style={inputStyle}
                        onFocus={e => { e.target.style.borderColor = style.accentColor }}
                        onBlur={e => { e.target.style.borderColor = error ? "#ef4444" : "#d1d5db" }}
                    />
                )
            case "phone":
                return (
                    <input
                        type="tel"
                        placeholder={field.placeholder || "(555) 123-4567"}
                        value={value || ""}
                        onChange={e => onChange(e.target.value)}
                        style={inputStyle}
                        onFocus={e => { e.target.style.borderColor = style.accentColor }}
                        onBlur={e => { e.target.style.borderColor = error ? "#ef4444" : "#d1d5db" }}
                    />
                )
            case "number":
                return (
                    <input
                        type="number"
                        placeholder={field.placeholder}
                        value={value || ""}
                        onChange={e => onChange(e.target.value)}
                        style={inputStyle}
                        onFocus={e => { e.target.style.borderColor = style.accentColor }}
                        onBlur={e => { e.target.style.borderColor = error ? "#ef4444" : "#d1d5db" }}
                    />
                )
            case "date":
                return (
                    <input
                        type="date"
                        value={value || ""}
                        onChange={e => onChange(e.target.value)}
                        style={inputStyle}
                        onFocus={e => { e.target.style.borderColor = style.accentColor }}
                        onBlur={e => { e.target.style.borderColor = error ? "#ef4444" : "#d1d5db" }}
                    />
                )
            case "dropdown":
                return (
                    <select
                        value={value || ""}
                        onChange={e => onChange(e.target.value)}
                        style={{ ...inputStyle, appearance: "auto" as const }}
                    >
                        <option value="">{field.placeholder || "Select..."}</option>
                        {field.options?.map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                        ))}
                    </select>
                )
            case "radio":
                return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {field.options?.map((opt, i) => (
                            <label key={i} style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "14px",
                                color: style.textColor,
                                fontFamily: style.fontFamily,
                                cursor: "pointer",
                            }}>
                                <input
                                    type="radio"
                                    name={field.id}
                                    value={opt}
                                    checked={value === opt}
                                    onChange={() => onChange(opt)}
                                    style={{ accentColor: style.accentColor, width: "16px", height: "16px" }}
                                />
                                {opt}
                            </label>
                        ))}
                    </div>
                )
            case "checkbox":
                return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {field.options?.map((opt, i) => {
                            const checked = Array.isArray(value) && value.includes(opt)
                            return (
                                <label key={i} style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    fontSize: "14px",
                                    color: style.textColor,
                                    fontFamily: style.fontFamily,
                                    cursor: "pointer",
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                            const arr = Array.isArray(value) ? [...value] : []
                                            if (checked) onChange(arr.filter(v => v !== opt))
                                            else onChange([...arr, opt])
                                        }}
                                        style={{ accentColor: style.accentColor, width: "16px", height: "16px" }}
                                    />
                                    {opt}
                                </label>
                            )
                        })}
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div>
            <label style={labelStyle}>
                {field.label}
                {field.required && <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>}
            </label>
            {renderInput()}
            {field.helpText && !error && <p style={helpStyle}>{field.helpText}</p>}
            {error && <p style={errorStyle}>{error}</p>}
        </div>
    )
}
