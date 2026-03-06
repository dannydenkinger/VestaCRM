import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
    to,
    subject,
    html,
}: {
    to: string;
    subject: string;
    html: string;
}) {
    const from = process.env.RESEND_FROM_EMAIL || "AFCrashpad CRM <noreply@afcrashpad.com>";

    const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
    });

    if (error) {
        console.error("Resend email error:", error);
        throw new Error(error.message || "Failed to send email");
    }

    return data;
}
