import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
    if (!resend) {
        const key = process.env.RESEND_API_KEY;
        if (!key) throw new Error("RESEND_API_KEY is not set");
        resend = new Resend(key);
    }
    return resend;
}

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

    const { data, error } = await getResend().emails.send({
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
