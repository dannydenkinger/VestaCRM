import { ICON, type VestaBlock } from "./types"

export const HEADER_BLOCKS: VestaBlock[] = [
    {
        id: "vesta-preheader",
        label: "Pre-header",
        category: "Headers",
        media: ICON(
            '<line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/><text x="12" y="9" font-size="5" font-family="sans-serif" fill="currentColor" text-anchor="middle">HIDDEN</text>',
        ),
        content:
            '<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f4f4f7;opacity:0;">This text is shown in inbox previews but hidden in the email body.</div>',
    },
    {
        id: "vesta-header-logo",
        label: "Logo header",
        category: "Headers",
        media: ICON(
            '<rect x="3" y="4" width="18" height="6" rx="1" fill="currentColor" opacity="0.1"/><rect x="3" y="4" width="18" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/>',
        ),
        content:
            '<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:32px 24px;background:#ffffff;border-bottom:1px solid #e5e7eb;"><img src="https://placehold.co/140x40?text=LOGO" alt="Your logo" width="140" style="display:inline-block;" /></td></tr></table>',
    },
    {
        id: "vesta-header-nav",
        label: "Nav header",
        category: "Headers",
        media: ICON(
            '<rect x="3" y="4" width="18" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="7" cy="7" r="1" fill="currentColor"/><line x1="12" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1.2"/><line x1="15.5" y1="7" x2="17.5" y2="7" stroke="currentColor" stroke-width="1.2"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<tr>
<td valign="middle" style="padding:20px 24px;">
<img src="https://placehold.co/120x36?text=LOGO" alt="Logo" width="120" style="display:block;" />
</td>
<td valign="middle" align="right" style="padding:20px 24px;">
<a href="#" style="color:#0f172a;text-decoration:none;font-size:14px;font-weight:500;padding:0 12px;">Home</a>
<a href="#" style="color:#0f172a;text-decoration:none;font-size:14px;font-weight:500;padding:0 12px;">About</a>
<a href="#" style="color:#0f172a;text-decoration:none;font-size:14px;font-weight:500;padding:0 12px;">Contact</a>
</td>
</tr>
</table>`,
    },
]

export const FOOTER_BLOCKS: VestaBlock[] = [
    {
        id: "vesta-footer-simple",
        label: "Simple footer",
        category: "Footers",
        media: ICON(
            '<rect x="3" y="14" width="18" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="7" y1="17" x2="17" y2="17" stroke="currentColor" stroke-width="1.2"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<tr><td align="center" style="padding:24px;color:#64748b;font-size:12px;line-height:1.6;border-top:1px solid #e5e7eb;">
Your Company · 123 Main St, City, State 12345<br>
© <span>Your Company</span>. All rights reserved.
</td></tr>
</table>`,
    },
    {
        id: "vesta-footer-social",
        label: "Social footer",
        category: "Footers",
        media: ICON(
            '<rect x="3" y="10" width="18" height="10" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="9" cy="15" r="1.5" fill="currentColor"/><circle cx="12" cy="15" r="1.5" fill="currentColor"/><circle cx="15" cy="15" r="1.5" fill="currentColor"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<tr><td align="center" style="padding:32px 24px;border-top:1px solid #e5e7eb;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto 16px auto;">
<tr>
<td style="padding:0 6px;"><a href="https://facebook.com" style="display:inline-block;width:32px;height:32px;background:#1877f2;border-radius:50%;color:#fff;text-align:center;line-height:32px;font-weight:700;text-decoration:none;font-family:-apple-system,sans-serif;">f</a></td>
<td style="padding:0 6px;"><a href="https://twitter.com" style="display:inline-block;width:32px;height:32px;background:#000;border-radius:50%;color:#fff;text-align:center;line-height:32px;font-weight:700;text-decoration:none;font-family:-apple-system,sans-serif;">𝕏</a></td>
<td style="padding:0 6px;"><a href="https://linkedin.com" style="display:inline-block;width:32px;height:32px;background:#0a66c2;border-radius:50%;color:#fff;text-align:center;line-height:32px;font-weight:700;text-decoration:none;font-family:-apple-system,sans-serif;font-size:13px;">in</a></td>
</tr>
</table>
<div style="color:#64748b;font-size:12px;line-height:1.6;">
© <span>Your Company</span>. All rights reserved.<br>
123 Main St, City, State 12345
</div>
</td></tr>
</table>`,
    },
    {
        id: "vesta-footer-compliance",
        label: "Compliance footer",
        category: "Footers",
        media: ICON(
            '<rect x="3" y="8" width="18" height="12" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="1"/><line x1="6" y1="15" x2="16" y2="15" stroke="currentColor" stroke-width="1"/><line x1="6" y1="18" x2="12" y2="18" stroke="currentColor" stroke-width="1"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<tr><td align="center" style="padding:32px 24px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.7;">
<div style="margin-bottom:8px;"><strong>{{company}}</strong></div>
<div>123 Main Street · City, State 12345 · United States</div>
<div style="margin:12px 0;">
<a href="#" style="color:#64748b;text-decoration:underline;margin:0 8px;">Unsubscribe</a> ·
<a href="#" style="color:#64748b;text-decoration:underline;margin:0 8px;">View in browser</a> ·
<a href="#" style="color:#64748b;text-decoration:underline;margin:0 8px;">Privacy policy</a>
</div>
<div style="font-size:11px;color:#94a3b8;margin-top:8px;">You received this because you signed up on our website. © <span>Your Company</span>.</div>
</td></tr>
</table>`,
    },
]
