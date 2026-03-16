"use server"

import { adminDb } from "@/lib/firebase-admin"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { sendEmail } from "@/lib/email"
import crypto from "crypto"

// ── Types ──

export interface DocRecord {
    id: string
    contactId: string // "" for standalone docs
    contactName: string // "" for standalone
    contactEmail: string
    name: string
    url: string
    status: string // DRAFT | LINK | PENDING | SIGNED
    folder: string
    folderPath: string // hierarchical path e.g. "/Contracts/2024"
    createdAt: string
    updatedAt: string
    generatedContent?: string
    signatureUrl?: string
    signedPdfUrl?: string
    templateName?: string
    standalone: boolean
}

// ── Helpers to resolve doc ref ──

function getDocRef(contactId: string, docId: string) {
    if (!contactId) {
        return adminDb.collection("documents").doc(docId)
    }
    return adminDb.collection("contacts").doc(contactId).collection("documents").doc(docId)
}

// ── Get All Documents (standalone + contact-attached) ──

export async function getAllDocuments(statusFilter?: string) {
    const session = await auth()
    if (!session?.user) return { success: false, documents: [] as DocRecord[] }

    try {
        // 1. Fetch standalone documents (top-level "documents" collection)
        let standaloneDocs: DocRecord[] = []
        try {
            const standaloneSnap = await adminDb.collection("documents").orderBy("createdAt", "desc").get()
            standaloneDocs = standaloneSnap.docs.map(doc => {
                const data = doc.data()
                return {
                    id: doc.id,
                    contactId: "",
                    contactName: "",
                    contactEmail: "",
                    name: (data.name as string) || "Untitled",
                    url: (data.url as string) || "",
                    status: (data.status as string) || "LINK",
                    folder: (data.folder as string) || "General",
                    folderPath: (data.folderPath as string) || ("/" + ((data.folder as string) || "General")),
                    createdAt: data.createdAt?.toDate?.().toISOString() || "",
                    updatedAt: data.updatedAt?.toDate?.().toISOString() || "",
                    generatedContent: data.generatedContent as string | undefined,
                    signatureUrl: data.signatureUrl as string | undefined,
                    signedPdfUrl: data.signedPdfUrl as string | undefined,
                    templateName: data.templateName as string | undefined,
                    standalone: true,
                }
            })
        } catch (err) {
            console.error("Failed to fetch standalone documents:", err)
        }

        // 2. Fetch contact-attached documents via collectionGroup (requires Firestore index)
        let contactDocRecords: DocRecord[] = []
        try {
            const contactDocsSnap = await adminDb.collectionGroup("documents").orderBy("createdAt", "desc").get()

            // Filter out standalone docs from collectionGroup results (they share the collection name)
            const contactDocs = contactDocsSnap.docs.filter(doc => {
                const parentPath = doc.ref.parent.path
                return parentPath !== "documents" && parentPath.startsWith("contacts/")
            })

            // Batch-fetch contact names
            const contactIds = new Set<string>()
            for (const doc of contactDocs) {
                const cId = doc.ref.parent.parent?.id
                if (cId) contactIds.add(cId)
            }

            const contactMap: Record<string, { name: string; email: string }> = {}
            if (contactIds.size > 0) {
                const contactRefs = Array.from(contactIds).map(id =>
                    adminDb.collection("contacts").doc(id)
                )
                const batches: FirebaseFirestore.DocumentReference[][] = []
                for (let i = 0; i < contactRefs.length; i += 100) {
                    batches.push(contactRefs.slice(i, i + 100))
                }
                for (const batch of batches) {
                    const docs = await adminDb.getAll(...batch)
                    for (const cDoc of docs) {
                        if (cDoc.exists) {
                            const data = cDoc.data()!
                            contactMap[cDoc.id] = {
                                name: (data.name as string) || "Unknown",
                                email: (data.email as string) || "",
                            }
                        }
                    }
                }
            }

            contactDocRecords = contactDocs.map(doc => {
                const data = doc.data()
                const contactId = doc.ref.parent.parent?.id || ""
                return {
                    id: doc.id,
                    contactId,
                    contactName: contactMap[contactId]?.name || "Unknown",
                    contactEmail: contactMap[contactId]?.email || "",
                    name: (data.name as string) || "Untitled",
                    url: (data.url as string) || "",
                    status: (data.status as string) || "LINK",
                    folder: (data.folder as string) || "General",
                    folderPath: (data.folderPath as string) || ("/" + ((data.folder as string) || "General")),
                    createdAt: data.createdAt?.toDate?.().toISOString() || "",
                    updatedAt: data.updatedAt?.toDate?.().toISOString() || "",
                    generatedContent: data.generatedContent as string | undefined,
                    signatureUrl: data.signatureUrl as string | undefined,
                    signedPdfUrl: data.signedPdfUrl as string | undefined,
                    templateName: data.templateName as string | undefined,
                    standalone: false,
                }
            })
        } catch (err) {
            console.error("Failed to fetch contact documents (collectionGroup index may be needed):", err)
        }

        let allDocs = [...standaloneDocs, ...contactDocRecords]
            .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))

        if (statusFilter && statusFilter !== "ALL") {
            allDocs = allDocs.filter(d => d.status === statusFilter)
        }

        return { success: true, documents: allDocs }
    } catch (error) {
        console.error("Failed to fetch all documents:", error)
        return { success: false, documents: [] as DocRecord[] }
    }
}

// ── Update Document Content (for editing generated/draft docs) ──

export async function updateDocumentContent(contactId: string, docId: string, content: string, name?: string) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    try {
        const updateData: Record<string, unknown> = {
            generatedContent: content,
            updatedAt: new Date(),
        }
        if (name) updateData.name = name

        await getDocRef(contactId, docId).update(updateData)

        revalidatePath("/documents")
        revalidatePath("/contacts")
        return { success: true }
    } catch (error) {
        console.error("Failed to update document content:", error)
        return { success: false, error: "Failed to update document" }
    }
}

// ── Create Draft Document ──
// contactId is optional — empty string creates a standalone doc

export async function createDraftDocument(contactId: string, name: string, content: string, folder?: string) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    try {
        const docData = {
            name,
            url: "",
            status: "DRAFT",
            folder: folder || "General",
            generatedContent: content,
            createdBy: session.user.email || "",
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        const collection = contactId
            ? adminDb.collection("contacts").doc(contactId).collection("documents")
            : adminDb.collection("documents")

        const docRef = await collection.add(docData)

        revalidatePath("/documents")
        if (contactId) revalidatePath("/contacts")
        return { success: true, documentId: docRef.id }
    } catch (error) {
        console.error("Failed to create draft:", error)
        return { success: false, error: "Failed to create draft" }
    }
}

// ── Upload Standalone Document ──

export async function uploadStandaloneDocument(name: string, url: string, storagePath: string, folder?: string) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    try {
        await adminDb.collection("documents").add({
            name,
            url,
            storagePath,
            status: "LINK",
            folder: folder || "General",
            createdBy: session.user.email || "",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        revalidatePath("/documents")
        return { success: true }
    } catch (error) {
        console.error("Failed to save standalone document:", error)
        return { success: false, error: "Failed to save document" }
    }
}

// ── Send for Multi-Recipient Signature ──

export async function sendForSignatures(contactId: string, docId: string, emails: string[]) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    if (!emails.length) return { success: false, error: "No recipients provided" }

    try {
        const docRef = getDocRef(contactId, docId)
        const docSnap = await docRef.get()
        if (!docSnap.exists) return { success: false, error: "Document not found" }
        const document = docSnap.data()!

        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.afcrashpad.com"
        const requestIds: string[] = []

        for (const email of emails) {
            const token = crypto.randomBytes(32).toString("hex")

            const sigRef = await adminDb.collection("signature_requests").add({
                documentId: docId,
                contactId: contactId || "",
                standalone: !contactId,
                recipientEmail: email,
                contactEmail: email,
                contactName: email,
                documentName: document.name || "Untitled",
                documentUrl: document.url || "",
                generatedContent: document.generatedContent || "",
                token,
                status: "pending",
                requestedBy: session.user.email || session.user.name || "Unknown",
                requestedAt: new Date(),
                signedAt: null,
                signatureUrl: null,
            })

            requestIds.push(sigRef.id)

            const signingLink = `${baseUrl}/sign/${token}`
            await sendEmail({
                to: email,
                subject: `Signature Requested: ${document.name || "Document"}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #1a1a1a; margin-bottom: 16px;">Document Signature Request</h2>
                        <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                            ${session.user.name || session.user.email} has requested your signature on <strong>"${document.name || "a document"}"</strong>.
                        </p>
                        <div style="margin: 24px 0; text-align: center;">
                            <a href="${signingLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                                Review & Sign Document
                            </a>
                        </div>
                        <p style="color: #888; font-size: 12px;">
                            This link is unique to you. Please do not share it.
                        </p>
                    </div>
                `,
            })
        }

        await docRef.update({
            status: "PENDING",
            signatureRequestIds: requestIds,
            updatedAt: new Date(),
        })

        revalidatePath("/documents")
        revalidatePath("/contacts")
        return { success: true, sent: emails.length }
    } catch (error) {
        console.error("Failed to send for signatures:", error)
        return { success: false, error: "Failed to send signature requests" }
    }
}

// ── Bulk Delete ──

export async function bulkDeleteDocuments(items: { contactId: string; docId: string }[]) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    try {
        const batch = adminDb.batch()
        for (const item of items) {
            batch.delete(getDocRef(item.contactId, item.docId))
        }
        await batch.commit()

        revalidatePath("/documents")
        revalidatePath("/contacts")
        return { success: true, deleted: items.length }
    } catch (error) {
        console.error("Failed to bulk delete:", error)
        return { success: false, error: "Failed to delete documents" }
    }
}

// ── Bulk Status Update ──

export async function bulkUpdateStatus(items: { contactId: string; docId: string }[], status: string) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    try {
        const batch = adminDb.batch()
        for (const item of items) {
            batch.update(getDocRef(item.contactId, item.docId), { status, updatedAt: new Date() })
        }
        await batch.commit()

        revalidatePath("/documents")
        revalidatePath("/contacts")
        return { success: true, updated: items.length }
    } catch (error) {
        console.error("Failed to bulk update status:", error)
        return { success: false, error: "Failed to update documents" }
    }
}

// ── Get Contact List (lightweight, for contact selector) ──

export async function getContactList() {
    const session = await auth()
    if (!session?.user) return []

    try {
        const snapshot = await adminDb.collection("contacts").orderBy("name").get()
        return snapshot.docs.map(doc => ({
            id: doc.id,
            name: (doc.data().name as string) || "Unknown",
            email: (doc.data().email as string) || "",
        }))
    } catch {
        return []
    }
}
