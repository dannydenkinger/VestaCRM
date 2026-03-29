"use client"

import type { FormStyle } from "@/app/settings/lead-forms/types"

export function FormSuccess({ style }: { style: FormStyle }) {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 24px",
            textAlign: "center",
            fontFamily: style.fontFamily,
        }}>
            {/* Checkmark circle */}
            <div style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                backgroundColor: style.accentColor + "15",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
            }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={style.accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            </div>
            <h2 style={{
                fontSize: "22px",
                fontWeight: 700,
                color: style.textColor,
                margin: "0 0 8px 0",
            }}>
                Thank you!
            </h2>
            <p style={{
                fontSize: "15px",
                color: "#6b7280",
                maxWidth: "400px",
                lineHeight: "1.5",
                margin: 0,
            }}>
                {style.successMessage}
            </p>
        </div>
    )
}
