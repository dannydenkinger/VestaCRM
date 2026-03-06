import { adminDb, adminMessaging } from "@/lib/firebase-admin";
import { sendEmail } from "@/lib/email";

/**
 * Sends an email notification to all users who have email notifications enabled
 * for the given notification type.
 */
export async function sendEmailToEligibleUsers(notification: {
    title: string;
    message: string;
    type: string;
    linkUrl?: string | null;
}) {
    try {
        const usersSnap = await adminDb.collection("users").get();
        if (usersSnap.empty) return;

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        // Map notification type to preference key
        const typeToKey: Record<string, string> = {
            opportunity: "email_opportunity",
            contact: "email_contact",
            checkin: "email_checkin",
            checkout: "email_checkout",
            task: "email_task",
        };

        const prefKey = typeToKey[notification.type];

        for (const userDoc of usersSnap.docs) {
            const user = userDoc.data();
            if (!user.email) continue;

            const prefs = user.notificationPreferences;

            // If user has no preferences set, default to email enabled
            if (prefs) {
                // Master email toggle
                if (prefs.emailEnabled === false) continue;
                // Per-type toggle
                if (prefKey && prefs[prefKey] === false) continue;
            }

            const linkHtml = notification.linkUrl
                ? `<p style="margin-top: 16px;"><a href="${baseUrl}${notification.linkUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View in CRM</a></p>`
                : "";

            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="padding: 24px; background-color: #0a0a0a; border-radius: 8px;">
                        <h2 style="color: #f5f5f5; margin: 0 0 8px;">${notification.title}</h2>
                        <p style="color: #a3a3a3; margin: 0; font-size: 15px;">${notification.message}</p>
                        ${linkHtml}
                    </div>
                    <p style="color: #737373; font-size: 12px; margin-top: 16px; text-align: center;">
                        AFCrashpad CRM &bull; You can manage email preferences in Settings
                    </p>
                </div>
            `;

            try {
                await sendEmail({
                    to: user.email,
                    subject: `${notification.title} — ${notification.message}`,
                    html,
                });
            } catch (emailErr) {
                console.error(`Failed to send notification email to ${user.email}:`, emailErr);
            }
        }
    } catch (err) {
        console.error("Email dispatch error:", err);
    }
}

/**
 * Sends a push notification to all users who have push enabled
 * for the given notification type and have FCM tokens stored.
 */
export async function sendPushToEligibleUsers(notification: {
    title: string;
    message: string;
    type: string;
    linkUrl?: string | null;
}) {
    try {
        const usersSnap = await adminDb.collection("users").get();
        if (usersSnap.empty) return;

        const typeToKey: Record<string, string> = {
            opportunity: "push_opportunity",
            contact: "push_contact",
            checkin: "push_checkin",
            checkout: "push_checkout",
            task: "push_task",
        };

        const prefKey = typeToKey[notification.type];

        for (const userDoc of usersSnap.docs) {
            const user = userDoc.data();
            const fcmTokens: string[] = user.fcmTokens || [];
            if (fcmTokens.length === 0) continue;

            const prefs = user.notificationPreferences;

            // Push requires explicit opt-in (unlike email which defaults on)
            if (!prefs || prefs.pushEnabled !== true) continue;
            if (prefKey && prefs[prefKey] === false) continue;

            const tokensToRemove: string[] = [];

            for (const token of fcmTokens) {
                try {
                    await adminMessaging.send({
                        token,
                        data: {
                            title: notification.title,
                            body: notification.message,
                            url: notification.linkUrl || "/pipeline",
                        },
                    });
                } catch (err: any) {
                    if (
                        err?.code === "messaging/invalid-registration-token" ||
                        err?.code === "messaging/registration-token-not-registered"
                    ) {
                        tokensToRemove.push(token);
                    } else {
                        console.error(`Push failed for token ${token.slice(0, 10)}...`, err);
                    }
                }
            }

            // Clean up stale tokens
            if (tokensToRemove.length > 0) {
                const validTokens = fcmTokens.filter(t => !tokensToRemove.includes(t));
                await adminDb.collection("users").doc(userDoc.id).update({
                    fcmTokens: validTokens,
                });
            }
        }
    } catch (err) {
        console.error("Push dispatch error:", err);
    }
}
