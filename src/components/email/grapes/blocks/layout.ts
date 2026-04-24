import { ICON, type VestaBlock, section } from "./types"

export const LAYOUT_BLOCKS: VestaBlock[] = [
    {
        id: "vesta-section",
        label: "Section",
        category: "Layout",
        media: ICON(
            '<rect x="3" y="5" width="18" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>',
        ),
        content: section(
            '<div style="padding:8px;color:#555;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;">Drop blocks here</div>',
        ),
    },
    {
        id: "vesta-columns-2",
        label: "2 columns",
        category: "Layout",
        media: ICON(
            '<rect x="3" y="5" width="8" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="13" y="5" width="8" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;">
<tr>
<td valign="top" style="width:50%;padding:12px;">Column 1</td>
<td valign="top" style="width:50%;padding:12px;">Column 2</td>
</tr>
</table>`,
    },
    {
        id: "vesta-columns-3",
        label: "3 columns",
        category: "Layout",
        media: ICON(
            '<rect x="2" y="5" width="6" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="9" y="5" width="6" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="16" y="5" width="6" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;">
<tr>
<td valign="top" style="width:33.33%;padding:12px;">Column 1</td>
<td valign="top" style="width:33.33%;padding:12px;">Column 2</td>
<td valign="top" style="width:33.33%;padding:12px;">Column 3</td>
</tr>
</table>`,
    },
    {
        id: "vesta-columns-4",
        label: "4 columns",
        category: "Layout",
        media: ICON(
            '<rect x="1.5" y="5" width="4.5" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="7" y="5" width="4.5" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="12.5" y="5" width="4.5" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="18" y="5" width="4.5" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;">
<tr>
<td valign="top" style="width:25%;padding:8px;">C1</td>
<td valign="top" style="width:25%;padding:8px;">C2</td>
<td valign="top" style="width:25%;padding:8px;">C3</td>
<td valign="top" style="width:25%;padding:8px;">C4</td>
</tr>
</table>`,
    },
    {
        id: "vesta-divider",
        label: "Divider",
        category: "Layout",
        media: ICON('<line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2"/>'),
        content:
            '<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;"><tr><td style="padding:16px 0;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" /></td></tr></table>',
    },
    {
        id: "vesta-spacer",
        label: "Spacer",
        category: "Layout",
        media: ICON(
            '<line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-dasharray="2 3"/>',
        ),
        content:
            '<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;"><tr><td style="height:40px;line-height:40px;font-size:1px;">&nbsp;</td></tr></table>',
    },
    {
        id: "vesta-hero",
        label: "Hero",
        category: "Layout",
        media: ICON(
            '<rect x="3" y="4" width="18" height="10" rx="1" fill="currentColor" opacity="0.2"/><rect x="3" y="4" width="18" height="10" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="8" y="16" width="8" height="3" rx="0.5" fill="currentColor"/>',
        ),
        content: section(
            `<div style="text-align:center;padding:56px 24px;background:#f8fafc;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<h1 style="margin:0 0 12px 0;font-size:32px;font-weight:700;color:#0f172a;">Headline that sells</h1>
<p style="margin:0 0 24px 0;font-size:16px;color:#475569;line-height:1.5;">A short, specific subheading that says who this is for and what problem it solves.</p>
<a href="#" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:500;font-size:15px;">Get started</a>
</div>`,
        ),
    },
]
