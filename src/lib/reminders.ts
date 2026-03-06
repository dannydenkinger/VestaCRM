import { adminDb } from "@/lib/firebase-admin";
import { createNotification } from "@/app/notifications/actions";

function toDate(val: unknown): Date | null {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof (val as any)?.toDate === "function") return (val as any).toDate();
    if (typeof val === "string") {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function diffDays(from: Date, to: Date): number {
    const msPerDay = 86400000;
    const fromNoon = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12);
    const toNoon = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 12);
    return Math.round((toNoon.getTime() - fromNoon.getTime()) / msPerDay);
}

const CHECK_IN_DAYS = [1, 3, 7];
const CHECK_OUT_DAYS = [1, 3, 7, 30];

export async function checkStayReminders() {
    const results = { checkinReminders: 0, checkoutReminders: 0 };

    try {
        const oppsSnap = await adminDb.collection("opportunities").get();
        const today = new Date();

        for (const doc of oppsSnap.docs) {
            const data = doc.data();
            const oppId = doc.id;

            // Get contact name for the notification message
            let contactName = data.name || "Unknown";
            if (data.contactId) {
                try {
                    const contactDoc = await adminDb.collection("contacts").doc(data.contactId).get();
                    if (contactDoc.exists) {
                        contactName = contactDoc.data()?.name || contactName;
                    }
                } catch { /* use fallback name */ }
            }

            const baseName = data.militaryBase || "";

            // Check-in reminders
            const startDate = toDate(data.stayStartDate);
            if (startDate) {
                const daysUntil = diffDays(today, startDate);
                for (const d of CHECK_IN_DAYS) {
                    if (daysUntil === d) {
                        const dedupeKey = `checkin_${oppId}_${d}d_${startDate.toISOString().slice(0, 10)}`;
                        await createNotification({
                            title: `Check-in in ${d} day${d > 1 ? "s" : ""}`,
                            message: `${contactName}${baseName ? ` — ${baseName}` : ""}`,
                            type: "checkin",
                            linkUrl: `/pipeline?deal=${oppId}`,
                            dedupeKey,
                        });
                        results.checkinReminders++;
                    }
                }
            }

            // Check-out reminders
            const endDate = toDate(data.stayEndDate);
            if (endDate) {
                const daysUntil = diffDays(today, endDate);
                for (const d of CHECK_OUT_DAYS) {
                    if (daysUntil === d) {
                        const dedupeKey = `checkout_${oppId}_${d}d_${endDate.toISOString().slice(0, 10)}`;
                        await createNotification({
                            title: `Check-out in ${d} day${d > 1 ? "s" : ""}`,
                            message: `${contactName}${baseName ? ` — ${baseName}` : ""}`,
                            type: "checkout",
                            linkUrl: `/pipeline?deal=${oppId}`,
                            dedupeKey,
                        });
                        results.checkoutReminders++;
                    }
                }
            }
        }
    } catch (err) {
        console.error("Check stay reminders error:", err);
    }

    return results;
}
