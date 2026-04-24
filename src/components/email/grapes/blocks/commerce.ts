import { ICON, type VestaBlock } from "./types"

export const COMMERCE_BLOCKS: VestaBlock[] = [
    {
        id: "vesta-product-card",
        label: "Product card",
        category: "Commerce",
        media: ICON(
            '<rect x="5" y="3" width="14" height="10" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="6" y1="16" x2="18" y2="16" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="19" x2="14" y2="19" stroke="currentColor" stroke-width="1.5"/><rect x="6" y="21" width="7" height="0.5" fill="currentColor"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:320px;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<tr><td><img src="https://placehold.co/320x220" alt="Product" width="320" style="width:100%;height:auto;display:block;" /></td></tr>
<tr><td style="padding:16px;">
<h3 style="margin:0 0 4px 0;font-size:15px;color:#0f172a;">Product name</h3>
<p style="margin:0 0 12px 0;font-size:13px;color:#64748b;line-height:1.5;">Short description of the product in one line or two.</p>
<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
<span style="font-size:18px;font-weight:700;color:#0f172a;">$49</span>
<a href="#" style="display:inline-block;padding:8px 14px;background:#0f172a;color:#fff;text-decoration:none;font-size:13px;font-weight:500;border-radius:6px;">Shop now</a>
</div>
</td></tr>
</table>`,
    },
    {
        id: "vesta-product-grid",
        label: "Product grid (3)",
        category: "Commerce",
        media: ICON(
            '<rect x="2" y="4" width="6" height="16" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="9" y="4" width="6" height="16" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="16" y="4" width="6" height="16" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<tr>
<td valign="top" style="width:33.33%;padding:8px;">
<img src="https://placehold.co/180x140" alt="" width="180" style="width:100%;height:auto;display:block;border-radius:8px;" />
<div style="padding:8px 4px;">
<div style="font-size:13px;color:#0f172a;font-weight:500;">Product one</div>
<div style="font-size:13px;color:#0f172a;font-weight:700;margin-top:2px;">$29</div>
</div>
</td>
<td valign="top" style="width:33.33%;padding:8px;">
<img src="https://placehold.co/180x140" alt="" width="180" style="width:100%;height:auto;display:block;border-radius:8px;" />
<div style="padding:8px 4px;">
<div style="font-size:13px;color:#0f172a;font-weight:500;">Product two</div>
<div style="font-size:13px;color:#0f172a;font-weight:700;margin-top:2px;">$49</div>
</div>
</td>
<td valign="top" style="width:33.33%;padding:8px;">
<img src="https://placehold.co/180x140" alt="" width="180" style="width:100%;height:auto;display:block;border-radius:8px;" />
<div style="padding:8px 4px;">
<div style="font-size:13px;color:#0f172a;font-weight:500;">Product three</div>
<div style="font-size:13px;color:#0f172a;font-weight:700;margin-top:2px;">$79</div>
</div>
</td>
</tr>
</table>`,
    },
    {
        id: "vesta-pricing-table",
        label: "Pricing table",
        category: "Commerce",
        media: ICON(
            '<rect x="3" y="4" width="8" height="16" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="13" y="4" width="8" height="16" rx="1" fill="currentColor" opacity="0.2"/><rect x="13" y="4" width="8" height="16" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<tr>
<td valign="top" style="width:50%;padding:8px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:12px;">
<tr><td style="padding:24px;">
<div style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Starter</div>
<div style="font-size:28px;font-weight:700;color:#0f172a;margin:4px 0 16px 0;">$19<span style="font-size:14px;font-weight:400;color:#64748b;">/mo</span></div>
<ul style="margin:0 0 16px 0;padding-left:18px;font-size:14px;color:#475569;line-height:1.8;">
<li>Up to 5 users</li>
<li>Basic support</li>
<li>Core features</li>
</ul>
<a href="#" style="display:block;text-align:center;padding:10px;background:#fff;border:1px solid #0f172a;color:#0f172a;text-decoration:none;font-size:14px;border-radius:6px;">Choose</a>
</td></tr>
</table>
</td>
<td valign="top" style="width:50%;padding:8px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;background:#0f172a;color:#fff;border-radius:12px;">
<tr><td style="padding:24px;">
<div style="font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Pro</div>
<div style="font-size:28px;font-weight:700;color:#fff;margin:4px 0 16px 0;">$49<span style="font-size:14px;font-weight:400;color:#94a3b8;">/mo</span></div>
<ul style="margin:0 0 16px 0;padding-left:18px;font-size:14px;color:#cbd5e1;line-height:1.8;">
<li>Unlimited users</li>
<li>Priority support</li>
<li>All features + API</li>
</ul>
<a href="#" style="display:block;text-align:center;padding:10px;background:#fff;color:#0f172a;text-decoration:none;font-size:14px;border-radius:6px;">Choose</a>
</td></tr>
</table>
</td>
</tr>
</table>`,
    },
    {
        id: "vesta-coupon",
        label: "Coupon code",
        category: "Commerce",
        media: ICON(
            '<rect x="3" y="7" width="18" height="10" rx="1" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="3 2"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;margin:16px auto;border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<tr><td style="padding:24px;border:2px dashed #0f172a;border-radius:12px;text-align:center;">
<div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Your exclusive offer</div>
<div style="font-size:28px;font-weight:800;color:#0f172a;letter-spacing:0.1em;">SAVE25</div>
<div style="font-size:13px;color:#64748b;margin-top:4px;">Valid through Friday</div>
</td></tr>
</table>`,
    },
    {
        id: "vesta-countdown",
        label: "Countdown",
        category: "Commerce",
        media: ICON(
            '<circle cx="12" cy="13" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="13" x2="15" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9 4h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:16px auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<tr>
<td align="center" style="padding:0 8px;">
<div style="background:#0f172a;color:#fff;padding:12px 16px;border-radius:8px;min-width:60px;">
<div style="font-size:24px;font-weight:700;">03</div>
<div style="font-size:11px;color:#94a3b8;text-transform:uppercase;margin-top:2px;">Days</div>
</div>
</td>
<td align="center" style="padding:0 8px;">
<div style="background:#0f172a;color:#fff;padding:12px 16px;border-radius:8px;min-width:60px;">
<div style="font-size:24px;font-weight:700;">12</div>
<div style="font-size:11px;color:#94a3b8;text-transform:uppercase;margin-top:2px;">Hours</div>
</div>
</td>
<td align="center" style="padding:0 8px;">
<div style="background:#0f172a;color:#fff;padding:12px 16px;border-radius:8px;min-width:60px;">
<div style="font-size:24px;font-weight:700;">45</div>
<div style="font-size:11px;color:#94a3b8;text-transform:uppercase;margin-top:2px;">Mins</div>
</div>
</td>
</tr>
</table>
<p style="text-align:center;font-size:12px;color:#64748b;margin:4px 0 0 0;font-family:-apple-system,sans-serif;">This is a static display. For live-updating countdowns in email, use a service like motioncdn.net.</p>`,
    },
]
