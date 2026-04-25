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
    /** Used to group templates on the picker. */
    category: "Onboarding" | "Marketing" | "Transactional" | "Engagement" | "Events"
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
        category: "Onboarding",
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
        category: "Marketing",
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
        category: "Marketing",
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
        category: "Engagement",
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
        slug: "product-launch",
        name: "Product launch",
        subject: "Introducing our biggest update yet",
        description: "Announce a launch with a hero, three benefits, and a CTA.",
        category: "Marketing",
        renderedHtml: wrap(
            "Something we've been working on for months — finally here.",
            `<div style="text-align:center;margin-bottom:32px;">
<span style="display:inline-block;background:#ede9fe;color:#5b46f6;font-size:11px;font-weight:600;padding:6px 12px;border-radius:999px;text-transform:uppercase;letter-spacing:0.08em;">Just launched</span>
</div>
<h1 style="margin:0 0 16px 0;font-size:30px;font-weight:700;color:#1a1a1a;text-align:center;line-height:1.2;letter-spacing:-0.02em;">A bold new way to {{company}}</h1>
<p style="margin:0 0 32px 0;font-size:17px;line-height:1.55;color:#444;text-align:center;">
Hi {{first_name}}, here's what we've been quietly building. Three things you'll notice right away:
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px 0;">
<tr><td style="padding:14px 0;border-bottom:1px solid #eef0f3;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td style="width:36px;vertical-align:top;font-size:22px;line-height:1;">⚡</td>
<td style="vertical-align:top;">
<div style="font-weight:600;font-size:15px;color:#1a1a1a;margin-bottom:4px;">Faster than ever</div>
<div style="font-size:14px;color:#666;line-height:1.55;">Specific, concrete benefit. One sentence is plenty.</div>
</td></tr></table>
</td></tr>
<tr><td style="padding:14px 0;border-bottom:1px solid #eef0f3;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td style="width:36px;vertical-align:top;font-size:22px;line-height:1;">🎯</td>
<td style="vertical-align:top;">
<div style="font-weight:600;font-size:15px;color:#1a1a1a;margin-bottom:4px;">Designed for your workflow</div>
<div style="font-size:14px;color:#666;line-height:1.55;">Specific, concrete benefit. Make it real.</div>
</td></tr></table>
</td></tr>
<tr><td style="padding:14px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td style="width:36px;vertical-align:top;font-size:22px;line-height:1;">🔒</td>
<td style="vertical-align:top;">
<div style="font-weight:600;font-size:15px;color:#1a1a1a;margin-bottom:4px;">Built for the long haul</div>
<div style="font-size:14px;color:#666;line-height:1.55;">Specific, concrete benefit. Why it matters.</div>
</td></tr></table>
</td></tr>
</table>
<div style="text-align:center;">
<a href="#" style="display:inline-block;background:#5b46f6;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 32px;border-radius:8px;font-size:16px;">See what's new</a>
</div>
<p style="margin:32px 0 0 0;font-size:14px;color:#888;text-align:center;">
Already a customer? It's live in your account. <a href="#" style="color:#5b46f6;">Try it now →</a>
</p>`,
        ),
    },
    {
        slug: "event-invite",
        name: "Event invitation",
        subject: "You're invited: {{company}} live event",
        description: "Drive RSVPs to a webinar, workshop, or in-person event.",
        category: "Events",
        renderedHtml: wrap(
            "Save your spot — limited capacity.",
            `<div style="text-align:center;margin-bottom:24px;">
<span style="display:inline-block;background:#fff4cc;color:#7a5b00;font-size:11px;font-weight:700;padding:6px 14px;border-radius:999px;text-transform:uppercase;letter-spacing:0.08em;">You're invited</span>
</div>
<h1 style="margin:0 0 12px 0;font-size:28px;font-weight:700;color:#1a1a1a;text-align:center;line-height:1.2;letter-spacing:-0.02em;">Join us for an exclusive session</h1>
<p style="margin:0 0 28px 0;font-size:16px;line-height:1.6;color:#444;text-align:center;">
Hi {{first_name}}, we'd love to have you at our upcoming event with founders, customers, and special guests.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f8fb;border-radius:12px;margin:0 0 28px 0;">
<tr><td style="padding:24px;text-align:center;">
<div style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:6px;">When</div>
<div style="font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:18px;">Thursday, April 18 · 2:00 PM EST</div>
<div style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:6px;">Where</div>
<div style="font-size:16px;color:#1a1a1a;">Live online — link emailed after RSVP</div>
</td></tr>
</table>
<div style="text-align:center;">
<a href="#" style="display:inline-block;background:#5b46f6;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 36px;border-radius:8px;font-size:16px;">RSVP — save my spot</a>
</div>
<p style="margin:24px 0 0 0;font-size:13px;color:#888;text-align:center;">
Can't make it? <a href="#" style="color:#5b46f6;">Add to calendar</a> &middot; <a href="#" style="color:#5b46f6;">Share with a friend</a>
</p>`,
        ),
    },
    {
        slug: "abandoned-cart",
        name: "Abandoned cart",
        subject: "{{first_name}}, you left something behind",
        description: "Win back shoppers who left items in their cart.",
        category: "Marketing",
        renderedHtml: wrap(
            "Your cart is still here. Don't worry — we saved it for you.",
            `<h1 style="margin:0 0 12px 0;font-size:24px;font-weight:600;color:#1a1a1a;">Forget something, {{first_name}}?</h1>
<p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#444;">
Looks like you left a few items in your cart. We held onto them for you — but they're going fast.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eef0f3;border-radius:12px;margin:0 0 24px 0;">
<tr><td style="padding:18px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td style="width:80px;vertical-align:top;">
<img src="https://placehold.co/72x72?bg=eef2ff&fg=5b46f6&font=raleway" alt="" width="72" style="border-radius:8px;display:block;" />
</td>
<td style="vertical-align:top;padding-left:14px;">
<div style="font-weight:600;font-size:15px;color:#1a1a1a;margin-bottom:4px;">Product name</div>
<div style="font-size:13px;color:#888;margin-bottom:8px;">Variant or size</div>
<div style="font-size:15px;font-weight:700;color:#1a1a1a;">$49.00</div>
</td>
</tr></table>
</td></tr>
</table>
<div style="text-align:center;margin-bottom:24px;">
<a href="#" style="display:inline-block;background:#5b46f6;color:#ffffff;text-decoration:none;font-weight:600;padding:13px 32px;border-radius:8px;font-size:16px;">Complete checkout</a>
</div>
<div style="background:#fff8e1;border:1px dashed #d4a017;border-radius:10px;padding:16px;text-align:center;margin:0 0 24px 0;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7a5b00;font-weight:700;margin-bottom:4px;">As a thank-you</div>
<div style="font-size:14px;color:#1a1a1a;">Use code <strong style="letter-spacing:0.1em;">COMEBACK10</strong> for 10% off</div>
</div>
<p style="margin:24px 0 0 0;font-size:13px;color:#888;text-align:center;">
Questions? Just reply — we'll help.
</p>`,
        ),
    },
    {
        slug: "survey",
        name: "Customer survey",
        subject: "Quick favor, {{first_name}}? (2 minutes)",
        description: "Gather customer feedback with a low-friction CTA.",
        category: "Engagement",
        renderedHtml: wrap(
            "Help us understand how to make {{company}} better for you.",
            `<h1 style="margin:0 0 16px 0;font-size:24px;font-weight:600;color:#1a1a1a;">We'd love your honest take, {{first_name}} 💭</h1>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;color:#333;">
You've been using {{company}} for a while now, and we're working on what comes next. We have a quick survey — 6 questions, ~2 minutes — and your answers shape what we build.
</p>
<p style="margin:0 0 24px 0;font-size:16px;line-height:1.65;color:#333;">
The first 50 responders get a free month on us.
</p>
<div style="text-align:center;margin:0 0 24px 0;">
<a href="#" style="display:inline-block;background:#5b46f6;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 32px;border-radius:8px;font-size:16px;">Take the 2-minute survey</a>
</div>
<p style="margin:0 0 0 0;font-size:14px;color:#666;line-height:1.6;">
Or just hit reply with your thoughts — I read every one.
</p>
<p style="margin:24px 0 0 0;font-size:14px;color:#888;line-height:1.6;">
Thanks for being part of {{company}},<br>
The team
</p>`,
        ),
    },
    {
        slug: "receipt",
        name: "Order receipt",
        subject: "Your {{company}} order #1042",
        description: "Transactional confirmation after purchase.",
        category: "Transactional",
        renderedHtml: wrap(
            "Order confirmed — here's your receipt.",
            `<h1 style="margin:0 0 8px 0;font-size:22px;font-weight:600;color:#1a1a1a;">Thanks for your order, {{first_name}}</h1>
<p style="margin:0 0 24px 0;font-size:14px;color:#666;">
Order <strong style="color:#1a1a1a;">#1042</strong> &middot; placed on Apr 12, 2026
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #eef0f3;margin:0 0 0 0;">
<tr><td style="padding:14px 0;border-bottom:1px solid #eef0f3;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td><div style="font-weight:500;color:#1a1a1a;font-size:15px;">Product name</div><div style="font-size:13px;color:#888;margin-top:2px;">Qty 1</div></td>
<td align="right" style="font-weight:600;color:#1a1a1a;font-size:15px;">$49.00</td>
</tr></table>
</td></tr>
<tr><td style="padding:14px 0;border-bottom:1px solid #eef0f3;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td><div style="font-weight:500;color:#1a1a1a;font-size:15px;">Another item</div><div style="font-size:13px;color:#888;margin-top:2px;">Qty 2</div></td>
<td align="right" style="font-weight:600;color:#1a1a1a;font-size:15px;">$30.00</td>
</tr></table>
</td></tr>
<tr><td style="padding:14px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td style="color:#666;font-size:14px;">Shipping</td>
<td align="right" style="color:#666;font-size:14px;">$5.00</td>
</tr><tr>
<td style="color:#666;font-size:14px;padding-top:6px;">Tax</td>
<td align="right" style="color:#666;font-size:14px;padding-top:6px;">$5.95</td>
</tr><tr>
<td style="font-weight:700;color:#1a1a1a;font-size:17px;padding-top:14px;border-top:2px solid #eef0f3;">Total</td>
<td align="right" style="font-weight:700;color:#1a1a1a;font-size:17px;padding-top:14px;border-top:2px solid #eef0f3;">$89.95</td>
</tr></table>
</td></tr>
</table>
<div style="text-align:center;margin:28px 0 0 0;">
<a href="#" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;font-weight:500;padding:12px 28px;border-radius:8px;font-size:15px;">View order details</a>
</div>
<p style="margin:32px 0 0 0;font-size:13px;color:#888;line-height:1.6;text-align:center;">
Questions about your order? <a href="#" style="color:#5b46f6;">Contact support</a>
</p>`,
        ),
    },
    {
        slug: "feature-spotlight",
        name: "Feature spotlight",
        subject: "Did you know about {{company}}'s {{feature}}?",
        description: "Educate users on a feature they may not have discovered.",
        category: "Engagement",
        renderedHtml: wrap(
            "A short walkthrough of one feature most people miss.",
            `<div style="margin-bottom:24px;text-align:center;">
<img src="https://placehold.co/520x280?bg=eef2ff&fg=5b46f6&font=raleway" alt="" width="520" style="max-width:100%;height:auto;display:block;border-radius:12px;margin:0 auto;" />
</div>
<h1 style="margin:0 0 12px 0;font-size:24px;font-weight:600;color:#1a1a1a;">The one feature most people miss</h1>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;color:#333;">
Hey {{first_name}} — quick one. We noticed many customers haven't tried <strong>this feature</strong> yet, and we think you'll like it.
</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;color:#333;">
In one sentence: <em>describe the value here</em>. The kind of thing that saves an hour a week if you set it up once.
</p>
<p style="margin:0 0 24px 0;font-size:16px;line-height:1.65;color:#333;">
We made a 90-second walkthrough so you can decide if it's worth turning on:
</p>
<div style="text-align:center;margin:0 0 24px 0;">
<a href="#" style="display:inline-block;background:#5b46f6;color:#ffffff;text-decoration:none;font-weight:600;padding:13px 28px;border-radius:8px;font-size:15px;">Watch the 90-second demo</a>
</div>
<p style="margin:0 0 0 0;font-size:14px;color:#666;line-height:1.6;text-align:center;">
Or skip the video — <a href="#" style="color:#5b46f6;">read how to set it up</a>.
</p>`,
        ),
    },
    {
        slug: "holiday-greeting",
        name: "Holiday greeting",
        subject: "From all of us at {{company}} — thank you, {{first_name}}",
        description: "A warm seasonal note — no sales push.",
        category: "Engagement",
        renderedHtml: wrap(
            "A small thank-you from the team.",
            `<div style="text-align:center;margin-bottom:24px;font-size:48px;line-height:1;">🎉</div>
<h1 style="margin:0 0 16px 0;font-size:26px;font-weight:600;color:#1a1a1a;text-align:center;line-height:1.3;">Thank you for being part of {{company}}</h1>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:#333;text-align:center;">
{{first_name}}, this is just a quick note from the whole team to say thanks. People like you — who try the product, give feedback, and reply to our emails — are why we get to do this work.
</p>
<p style="margin:0 0 24px 0;font-size:16px;line-height:1.7;color:#333;text-align:center;">
Wishing you a great rest of the year. We can't wait to share what's coming.
</p>
<p style="margin:32px 0 0 0;font-size:14px;color:#666;line-height:1.6;text-align:center;font-style:italic;">
— The {{company}} team
</p>`,
        ),
    },
    {
        slug: "re-engage",
        name: "Re-engagement (we miss you)",
        subject: "We've missed you, {{first_name}}",
        description: "Win back contacts who haven't been active in a while.",
        category: "Engagement",
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
