import { ICON, type VestaBlock } from "./types"

export const CONTENT_BLOCKS: VestaBlock[] = [
    {
        id: "vesta-heading",
        label: "Heading",
        category: "Content",
        media: ICON(
            '<text x="4" y="18" font-size="16" font-family="sans-serif" font-weight="700" fill="currentColor">H1</text>',
        ),
        content:
            '<h1 style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:28px;font-weight:700;color:#0f172a;line-height:1.2;">Your heading here</h1>',
    },
    {
        id: "vesta-paragraph",
        label: "Paragraph",
        category: "Content",
        media: ICON(
            '<line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="1.5"/><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="1.5"/><line x1="4" y1="17" x2="14" y2="17" stroke="currentColor" stroke-width="1.5"/>',
        ),
        content:
            '<p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:16px;color:#334155;line-height:1.6;">A short paragraph with easy-to-read body copy. Replace this with your own text — keep lines around 65-75 characters for comfortable reading.</p>',
    },
    {
        id: "vesta-quote",
        label: "Block quote",
        category: "Content",
        media: ICON(
            '<path d="M6 7 4 11v6h5v-6H6.5L8 7zm8 0-2 4v6h5v-6h-2.5L16 7z" fill="currentColor"/>',
        ),
        content: `<blockquote style="margin:0 0 16px 0;padding:16px 20px;border-left:4px solid #0f172a;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<p style="margin:0;font-size:17px;font-style:italic;color:#1e293b;line-height:1.6;">&ldquo;The quote goes here. Attribute below.&rdquo;</p>
<footer style="margin-top:10px;font-size:13px;color:#64748b;">— Jane Doe, Role at Company</footer>
</blockquote>`,
    },
    {
        id: "vesta-list-ul",
        label: "Bullet list",
        category: "Content",
        media: ICON(
            '<circle cx="5" cy="7" r="1.5" fill="currentColor"/><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="5" cy="17" r="1.5" fill="currentColor"/><line x1="10" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="17" x2="17" y2="17" stroke="currentColor" stroke-width="1.5"/>',
        ),
        content:
            '<ul style="margin:0 0 16px 0;padding-left:20px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:16px;color:#334155;line-height:1.7;"><li>First item in the list</li><li>Second item in the list</li><li>Third item in the list</li></ul>',
    },
    {
        id: "vesta-list-ol",
        label: "Numbered list",
        category: "Content",
        media: ICON(
            '<text x="3" y="9" font-size="6" font-family="sans-serif" fill="currentColor">1.</text><text x="3" y="14" font-size="6" font-family="sans-serif" fill="currentColor">2.</text><text x="3" y="19" font-size="6" font-family="sans-serif" fill="currentColor">3.</text><line x1="10" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="17" x2="17" y2="17" stroke="currentColor" stroke-width="1.5"/>',
        ),
        content:
            '<ol style="margin:0 0 16px 0;padding-left:20px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:16px;color:#334155;line-height:1.7;"><li>First step</li><li>Second step</li><li>Third step</li></ol>',
    },
    {
        id: "vesta-feature-grid",
        label: "Feature grid",
        category: "Content",
        media: ICON(
            '<rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<tr>
<td valign="top" style="width:33.33%;padding:16px;text-align:center;">
<div style="font-size:32px;margin-bottom:8px;">⚡</div>
<h3 style="margin:0 0 6px 0;font-size:15px;color:#0f172a;">Fast</h3>
<p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">Short benefit statement for this feature.</p>
</td>
<td valign="top" style="width:33.33%;padding:16px;text-align:center;">
<div style="font-size:32px;margin-bottom:8px;">🔒</div>
<h3 style="margin:0 0 6px 0;font-size:15px;color:#0f172a;">Secure</h3>
<p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">Short benefit statement for this feature.</p>
</td>
<td valign="top" style="width:33.33%;padding:16px;text-align:center;">
<div style="font-size:32px;margin-bottom:8px;">🎯</div>
<h3 style="margin:0 0 6px 0;font-size:15px;color:#0f172a;">Simple</h3>
<p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">Short benefit statement for this feature.</p>
</td>
</tr>
</table>`,
    },
    {
        id: "vesta-testimonial",
        label: "Testimonial",
        category: "Content",
        media: ICON(
            '<path d="M6 7 4 11v6h5v-6H6.5L8 7z" fill="currentColor"/><circle cx="16" cy="15" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;">
<tr><td style="padding:24px;background:#f8fafc;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<p style="margin:0 0 16px 0;font-size:18px;color:#1e293b;line-height:1.5;font-style:italic;">&ldquo;This is a quote from a real happy customer. It should be specific, believable, and results-oriented.&rdquo;</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0">
<tr>
<td style="padding-right:12px;vertical-align:middle;"><img src="https://i.pravatar.cc/80" alt="Avatar" width="40" height="40" style="border-radius:50%;display:block;" /></td>
<td style="vertical-align:middle;">
<div style="font-size:14px;font-weight:600;color:#0f172a;">Jane Cooper</div>
<div style="font-size:12px;color:#64748b;">CEO, Acme Inc.</div>
</td>
</tr>
</table>
</td></tr>
</table>`,
    },
    {
        id: "vesta-star-rating",
        label: "Star rating",
        category: "Content",
        media: ICON(
            '<path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" fill="currentColor"/>',
        ),
        content:
            '<div style="text-align:center;padding:16px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;"><span style="font-size:28px;letter-spacing:4px;color:#f59e0b;">★★★★★</span><div style="margin-top:6px;font-size:13px;color:#64748b;">5.0 from 1,247 reviews</div></div>',
    },
    {
        id: "vesta-author-byline",
        label: "Author byline",
        category: "Content",
        media: ICON(
            '<circle cx="8" cy="10" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="14" y1="8" x2="22" y2="8" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="1.5"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<tr>
<td style="padding-right:12px;vertical-align:middle;"><img src="https://i.pravatar.cc/96?img=11" alt="Avatar" width="48" height="48" style="border-radius:50%;display:block;" /></td>
<td style="vertical-align:middle;">
<div style="font-size:14px;font-weight:600;color:#0f172a;">Written by John Smith</div>
<div style="font-size:12px;color:#64748b;">Head of Growth · 4 min read</div>
</td>
</tr>
</table>`,
    },
    {
        id: "vesta-checklist",
        label: "Checklist",
        category: "Content",
        media: ICON(
            '<path d="M4 7l2 2 3-3M4 13l2 2 3-3M4 19l2 2 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="13" y1="8" x2="21" y2="8" stroke="currentColor" stroke-width="1.5"/><line x1="13" y1="14" x2="21" y2="14" stroke="currentColor" stroke-width="1.5"/><line x1="13" y1="20" x2="19" y2="20" stroke="currentColor" stroke-width="1.5"/>',
        ),
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<tr><td style="padding:8px 0;">
<span style="display:inline-block;width:24px;color:#16a34a;font-weight:700;">✓</span>
<span style="font-size:15px;color:#334155;">Benefit or feature number one</span>
</td></tr>
<tr><td style="padding:8px 0;">
<span style="display:inline-block;width:24px;color:#16a34a;font-weight:700;">✓</span>
<span style="font-size:15px;color:#334155;">Benefit or feature number two</span>
</td></tr>
<tr><td style="padding:8px 0;">
<span style="display:inline-block;width:24px;color:#16a34a;font-weight:700;">✓</span>
<span style="font-size:15px;color:#334155;">Benefit or feature number three</span>
</td></tr>
</table>`,
    },
]
