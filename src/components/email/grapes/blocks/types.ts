/**
 * Shared types for Vesta's GrapesJS block library.
 *
 * Every block definition has:
 *   id        — unique identifier, prefixed "vesta-" to avoid collision with
 *               blocks added by the newsletter preset.
 *   label     — shown in the blocks palette.
 *   category  — groups blocks in the palette.
 *   media     — inline SVG icon shown in the block tile.
 *   content   — HTML string inserted when dropped. Must be email-safe:
 *               inline styles only, table-based layout for structural blocks,
 *               max 600px container width, web-safe fonts.
 */

export interface VestaBlock {
    id: string
    label: string
    category: VestaBlockCategory
    media: string
    content: string
}

export type VestaBlockCategory =
    | "Layout"
    | "Content"
    | "Media"
    | "Actions"
    | "Commerce"
    | "Headers"
    | "Footers"
    | "Advanced"
    | "Tokens"

/** Shared SVG wrapper so every icon has consistent viewBox + fill. */
export const ICON = (path: string, viewBox = "0 0 24 24") =>
    `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">${path}</svg>`

/** Email-safe 600px container wrapper. */
export const section = (inner: string, extraStyle = "") =>
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;${extraStyle}"><tr><td align="center" style="padding:24px;"><table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;"><tr><td>${inner}</td></tr></table></td></tr></table>`
