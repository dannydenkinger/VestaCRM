"use server"

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// --- Automation Settings ---

export async function getAutomationSettings() {
    try {
        const doc = await adminDb.collection('settings').doc('automations').get();
        if (!doc.exists) {
            return {
                success: true,
                settings: {
                    autoReplyEnabled: false,
                    autoReplyTemplateId: null,
                    autoAdvanceEnabled: false,
                }
            };
        }
        const data = doc.data()!;
        return {
            success: true,
            settings: {
                autoReplyEnabled: data.autoReplyEnabled ?? false,
                autoReplyTemplateId: data.autoReplyTemplateId ?? null,
                autoAdvanceEnabled: data.autoAdvanceEnabled ?? false,
            }
        };
    } catch (error) {
        console.error("Failed to get automation settings:", error);
        return { success: false, error: "Failed to get settings" };
    }
}

export async function updateAutomationSettings(updates: {
    autoReplyEnabled?: boolean;
    autoReplyTemplateId?: string | null;
    autoAdvanceEnabled?: boolean;
}) {
    try {
        const session = await auth();
        if (!session?.user?.email) return { success: false, error: "Unauthorized" };

        const usersSnap = await adminDb.collection('users').where('email', '==', session.user.email).limit(1).get();
        if (usersSnap.empty) return { success: false, error: "Unauthorized" };

        const role = usersSnap.docs[0].data()?.role;
        if (role !== "OWNER" && role !== "ADMIN") {
            return { success: false, error: "Only Owners and Admins can update automation settings." };
        }

        await adminDb.collection('settings').doc('automations').set(
            { ...updates, updatedAt: new Date() },
            { merge: true }
        );

        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to update automation settings:", error);
        return { success: false, error: "Failed to update settings" };
    }
}

// --- Email Templates ---

export async function getEmailTemplates() {
    try {
        const snap = await adminDb.collection('email_templates').orderBy('createdAt', 'desc').get();
        const templates = snap.docs.map(doc => {
            const data = doc.data();
            const ts = data.createdAt;
            const createdAt = ts?.toDate ? ts.toDate().toISOString() : (ts instanceof Date ? ts.toISOString() : ts || null);
            return {
                id: doc.id,
                name: data.name || "",
                subject: data.subject || "",
                body: data.body || "",
                createdAt,
            };
        });
        return { success: true, templates };
    } catch (error) {
        console.error("Failed to get email templates:", error);
        return { success: false, error: "Failed to get templates" };
    }
}

export async function createEmailTemplate(data: { name: string; subject: string; body: string }) {
    try {
        const session = await auth();
        if (!session?.user?.email) return { success: false, error: "Unauthorized" };

        const ref = await adminDb.collection('email_templates').add({
            name: data.name,
            subject: data.subject,
            body: data.body,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        revalidatePath("/settings");
        return { success: true, id: ref.id };
    } catch (error) {
        console.error("Failed to create email template:", error);
        return { success: false, error: "Failed to create template" };
    }
}

export async function updateEmailTemplate(id: string, data: { name?: string; subject?: string; body?: string }) {
    try {
        const session = await auth();
        if (!session?.user?.email) return { success: false, error: "Unauthorized" };

        await adminDb.collection('email_templates').doc(id).update({
            ...data,
            updatedAt: new Date(),
        });

        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to update email template:", error);
        return { success: false, error: "Failed to update template" };
    }
}

export async function deleteEmailTemplate(id: string) {
    try {
        const session = await auth();
        if (!session?.user?.email) return { success: false, error: "Unauthorized" };

        await adminDb.collection('email_templates').doc(id).delete();

        // If this was the active auto-reply template, clear it
        const settingsDoc = await adminDb.collection('settings').doc('automations').get();
        if (settingsDoc.exists && settingsDoc.data()?.autoReplyTemplateId === id) {
            await adminDb.collection('settings').doc('automations').update({
                autoReplyTemplateId: null,
                autoReplyEnabled: false,
                updatedAt: new Date(),
            });
        }

        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete email template:", error);
        return { success: false, error: "Failed to delete template" };
    }
}
