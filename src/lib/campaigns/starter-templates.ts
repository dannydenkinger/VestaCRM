/**
 * Starter email templates shipped with the app.
 *
 * These are intentionally simple, mobile-friendly, inline-styled HTML so they
 * render correctly across Gmail / Outlook / Apple Mail without juice having to
 * do much work. Use them as forks for new templates instead of starting blank.
 *
 * All copy uses personalization tokens so users see the feature in action.
 */

export interface StarterTemplate {
    slug: string
    name: string
    subject: string
    description: string
    renderedHtml: string
}

const wrap = (preheader: string, body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{company}}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
<div style="display:none;font-size:1px;color:#f4f4f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
<tr><td style="padding:40px 48px;">
${body}
</td></tr>
</table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin-top:24px;">
<tr><td style="padding:0 48px;text-align:center;font-size:12px;color:#777;line-height:1.6;">
{{company}}<br>
<a href="#" style="color:#777;text-decoration:underline;">Unsubscribe</a> &middot; <a href="#" style="color:#777;text-decoration:underline;">View in browser</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

export const STARTER_TEMPLATES: StarterTemplate[] = [
    {
        slug: "welcome",
        name: "Welcome email",
        subject: "Welcome to {{company}}, {{first_name}}!",
        description: "Greet new contacts and orient them to your product.",
        renderedHtml: wrap(
            "Glad to have you with us. Here's where to start.",
            `<h1 style="margin:0 0 16px 0;font-size:24px;font-weight:600;color:#1a1a1a;">Hi {{first_name}}, welcome aboard 👋</h1>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#333;">
Thanks for joining {{company}}. We're glad you're here. Here's a quick rundown of what to do next:
</p>
<ul style="margin:0 0 24px 0;padding-left:20px;font-size:16px;line-height:1.7;color:#333;">
<li>Complete your profile so we can personalize your experience.</li>
<li>Explore the dashboard — most of the magic happens there.</li>
<li>Reply to this email if you have questions; we read everything.</li>
</ul>
<p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#333;">
Looking forward to working with you.
</p>
<a href="#" style="display:inline-block;background:#5b46f6;color:#ffffff;text-decoration:none;font-weight:500;padding:12px 24px;border-radius:8px;">Get started</a>
<p style="margin:32px 0 0 0;font-size:14px;color:#666;">
— The {{company}} team
</p>`,
        ),
    },
    {
        slug: "newsletter",
        name: "Monthly newsletter",
        subject: "{{company}} — what's new this month",
        description: "Round up of updates and stories for your contact list.",
        renderedHtml: wrap(
            "Three updates worth your time, plus what's coming next.",
            `<h1 style="margin:0 0 16px 0;font-size:24px;font-weight:600;color:#1a1a1a;">Hey {{first_name}}, here's what's new</h1>
<p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#333;">
A short roundup of what we shipped, learned, and are working on at {{company}}.
</p>
<h2 style="margin:24px 0 8px 0;font-size:18px;font-weight:600;color:#1a1a1a;">📦 What we shipped</h2>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#333;">
Brief description of the feature/product update. <a href="#" style="color:#5b46f6;text-decoration:underline;">Read more →</a>
</p>
<h2 style="margin:24px 0 8px 0;font-size:18px;font-weight:600;color:#1a1a1a;">🧠 What we learned</h2>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#333;">
Brief insight or article. <a href="#" style="color:#5b46f6;text-decoration:underline;">Read more →</a>
</p>
<h2 style="margin:24px 0 8px 0;font-size:18px;font-weight:600;color:#1a1a1a;">📅 What's next</h2>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#333;">
Upcoming launches, events, or webinars. <a href="#" style="color:#5b46f6;text-decoration:underline;">Read more →</a>
</p>
<p style="margin:32px 0 0 0;font-size:14px;color:#666;">
Thanks for reading.<br>— {{company}}
</p>`,
        ),
    },
    {
        slug: "promo",
        name: "Promo / sale",
        subject: "{{first_name}}, your exclusive offer ends Friday",
        description: "Drive a time-limited offer with a clear CTA.",
        renderedHtml: wrap(
            "Your exclusive offer is waiting — but not for long.",
            `<div style="text-align:center;margin-bottom:32px;">
<span style="display:inline-block;background:#fff3cd;color:#664d03;font-size:12px;font-weight:600;padding:6px 12px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;">Limited time</span>
</div>
<h1 style="margin:0 0 16px 0;font-size:28px;font-weight:700;color:#1a1a1a;text-align:center;">Save 25% — for you only</h1>
<p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#333;text-align:center;">
{{first_name}}, we're sending this offer to a small group of customers. Use the code below before Friday and get 25% off your next order.
</p>
<div style="background:#f8f8fb;border:1px dashed #c1c7d0;border-radius:8px;padding:24px;text-align:center;margin:0 0 24px 0;">
<div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Your code</div>
<div style="font-size:28px;font-weight:700;color:#1a1a1a;letter-spacing:0.15em;">SAVE25</div>
</div>
<div style="text-align:center;margin:32px 0 0 0;">
<a href="#" style="display:inline-block;background:#5b46f6;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 32px;border-radius:8px;font-size:16px;">Shop now</a>
</div>
<p style="margin:32px 0 0 0;font-size:14px;color:#888;text-align:center;">
Offer expires Friday at midnight. Reply if you have questions.
</p>`,
        ),
    },
    {
        slug: "follow-up",
        name: "Thank you / follow-up",
        subject: "Quick follow-up, {{first_name}}",
        description: "Personal one-to-one touch after a meeting or signup.",
        renderedHtml: wrap(
            "Just wanted to say thanks and share next steps.",
            `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:#1a1a1a;">
Hi {{first_name}},
</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:#1a1a1a;">
Just wanted to send a quick note to say thanks for connecting. Here are a couple of next steps based on what we discussed:
</p>
<ol style="margin:0 0 16px 0;padding-left:20px;font-size:16px;line-height:1.7;color:#1a1a1a;">
<li>Item one — what to do next.</li>
<li>Item two — what I'll send over.</li>
<li>Item three — when we'll talk again.</li>
</ol>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:#1a1a1a;">
Reply to this email anytime — it lands directly in my inbox.
</p>
<p style="margin:32px 0 0 0;font-size:16px;line-height:1.7;color:#1a1a1a;">
Talk soon,<br>
{{company}}
</p>`,
        ),
    },
    {
        slug: "re-engage",
        name: "Re-engagement (we miss you)",
        subject: "We've missed you, {{first_name}}",
        description: "Win back contacts who haven't been active in a while.",
        renderedHtml: wrap(
            "Here's what's changed since you've been away.",
            `<h1 style="margin:0 0 16px 0;font-size:24px;font-weight:600;color:#1a1a1a;">It's been a minute, {{first_name}} 👋</h1>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#333;">
We noticed you haven't been around lately, and we wanted to share what's new at {{company}} since you've been away.
</p>
<ul style="margin:0 0 24px 0;padding-left:20px;font-size:16px;line-height:1.7;color:#333;">
<li><strong>Faster, simpler workflow</strong> — we shipped a major update.</li>
<li><strong>New integrations</strong> — work with the tools you already use.</li>
<li><strong>Better support</strong> — same-day reply guarantee.</li>
</ul>
<p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#333;">
We'd love to have you back. Click below for an exclusive 15% discount on your next month.
</p>
<a href="#" style="display:inline-block;background:#5b46f6;color:#ffffff;text-decoration:none;font-weight:500;padding:12px 24px;border-radius:8px;">Welcome me back</a>
<p style="margin:32px 0 0 0;font-size:14px;color:#666;">
Or just reply and let us know what would make {{company}} useful for you again.<br>
— The {{company}} team
</p>`,
        ),
    },
]
