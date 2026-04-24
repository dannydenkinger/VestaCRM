import { ICON, type VestaBlock } from "./types"

export const ACTIONS_BLOCKS: VestaBlock[] = [
    {
        id: "vesta-button-primary",
        label: "Button",
        category: "Actions",
        media: ICON(
            '<rect x="4" y="8" width="16" height="8" rx="4" fill="currentColor"/>',
        ),
        content:
            '<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:16px auto;"><tr><td align="center" style="border-radius:8px;background:#0f172a;"><a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:15px;font-weight:500;text-decoration:none;border-radius:8px;">Call to action</a></td></tr></table>',
    },
    {
        id: "vesta-button-secondary",
        label: "Button (outline)",
        category: "Actions",
        media: ICON(
            '<rect x="4" y="8" width="16" height="8" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>',
        ),
        content:
            '<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:16px auto;"><tr><td align="center" style="border-radius:8px;border:1px solid #0f172a;"><a href="#" style="display:inline-block;padding:11px 27px;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:15px;font-weight:500;text-decoration:none;border-radius:8px;">Learn more</a></td></tr></table>',
    },
    {
        id: "vesta-button-pill",
        label: "Pill button",
        category: "Actions",
        media: ICON(
            '<rect x="4" y="8" width="16" height="8" rx="8" fill="currentColor"/>',
        ),
        content:
            '<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:16px auto;"><tr><td align="center" style="border-radius:999px;background:#0f172a;"><a href="#" style="display:inline-block;padding:12px 32px;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:15px;font-weight:500;text-decoration:none;border-radius:999px;">Get started</a></td></tr></table>',
    },
    {
        id: "vesta-button-row",
        label: "Button row",
        category: "Actions",
        media: ICON(
            '<rect x="2" y="9" width="8" height="6" rx="2" fill="currentColor"/><rect x="14" y="9" width="8" height="6" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:16px auto;">
<tr>
<td style="padding:0 6px;"><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td align="center" style="border-radius:8px;background:#0f172a;"><a href="#" style="display:inline-block;padding:12px 24px;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;">Primary</a></td></tr></table></td>
<td style="padding:0 6px;"><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td align="center" style="border-radius:8px;border:1px solid #0f172a;"><a href="#" style="display:inline-block;padding:11px 23px;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;">Secondary</a></td></tr></table></td>
</tr>
</table>`,
    },
    {
        id: "vesta-social-icons",
        label: "Social icons",
        category: "Actions",
        media: ICON(
            '<circle cx="6" cy="12" r="2.5" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="18" cy="12" r="2.5" stroke="currentColor" stroke-width="1.5" fill="none"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:16px auto;">
<tr>
<td style="padding:0 6px;"><a href="https://facebook.com" style="display:inline-block;width:32px;height:32px;background:#1877f2;border-radius:50%;color:#fff;text-align:center;line-height:32px;font-weight:700;text-decoration:none;font-family:-apple-system,sans-serif;">f</a></td>
<td style="padding:0 6px;"><a href="https://twitter.com" style="display:inline-block;width:32px;height:32px;background:#000;border-radius:50%;color:#fff;text-align:center;line-height:32px;font-weight:700;text-decoration:none;font-family:-apple-system,sans-serif;">𝕏</a></td>
<td style="padding:0 6px;"><a href="https://linkedin.com" style="display:inline-block;width:32px;height:32px;background:#0a66c2;border-radius:50%;color:#fff;text-align:center;line-height:32px;font-weight:700;text-decoration:none;font-family:-apple-system,sans-serif;font-size:13px;">in</a></td>
<td style="padding:0 6px;"><a href="https://instagram.com" style="display:inline-block;width:32px;height:32px;background:#e4405f;border-radius:50%;color:#fff;text-align:center;line-height:32px;font-weight:700;text-decoration:none;font-family:-apple-system,sans-serif;">IG</a></td>
<td style="padding:0 6px;"><a href="https://youtube.com" style="display:inline-block;width:32px;height:32px;background:#ff0000;border-radius:50%;color:#fff;text-align:center;line-height:32px;font-weight:700;text-decoration:none;font-family:-apple-system,sans-serif;">▶</a></td>
</tr>
</table>`,
    },
    {
        id: "vesta-nav-menu",
        label: "Nav menu",
        category: "Actions",
        media: ICON(
            '<line x1="3" y1="12" x2="8" y2="12" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="12" x2="15" y2="12" stroke="currentColor" stroke-width="1.5"/><line x1="17" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:16px auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<tr>
<td style="padding:0 12px;"><a href="#" style="color:#0f172a;text-decoration:none;font-size:14px;font-weight:500;">Home</a></td>
<td style="padding:0 12px;"><a href="#" style="color:#0f172a;text-decoration:none;font-size:14px;font-weight:500;">Features</a></td>
<td style="padding:0 12px;"><a href="#" style="color:#0f172a;text-decoration:none;font-size:14px;font-weight:500;">Pricing</a></td>
<td style="padding:0 12px;"><a href="#" style="color:#0f172a;text-decoration:none;font-size:14px;font-weight:500;">Contact</a></td>
</tr>
</table>`,
    },
]
