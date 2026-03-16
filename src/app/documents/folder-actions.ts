"use server"

import { adminDb } from "@/lib/firebase-admin"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

// ── Types ──

export interface FolderRecord {
    id: string
    name: string
    path: string        // "/Contracts" or "/Contracts/2024"
    parentPath: string  // "/" for root, "/Contracts" for children
    createdAt: string
}

// ── Get All Folders ──

export async function getFolders(): Promise<{ success: boolean; folders: FolderRecord[] }> {
    const session = await auth()
    if (!session?.user) return { success: false, folders: [] }

    try {
        const snapshot = await adminDb.collection("document_folders")
            .orderBy("path")
            .get()

        const folders: FolderRecord[] = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                name: (data.name as string) || "",
                path: (data.path as string) || "/",
                parentPath: (data.parentPath as string) || "/",
                createdAt: data.createdAt?.toDate?.().toISOString() || "",
            }
        })

        return { success: true, folders }
    } catch (error) {
        console.error("Failed to fetch folders:", error)
        return { success: false, folders: [] }
    }
}

// ── Create Folder ──

export async function createFolder(parentPath: string, name: string): Promise<{ success: boolean; error?: string; folderId?: string }> {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    if (!name.trim()) return { success: false, error: "Folder name is required" }

    // Sanitize folder name (no slashes)
    const safeName = name.trim().replace(/\//g, "-")
    const path = parentPath === "/" ? `/${safeName}` : `${parentPath}/${safeName}`

    try {
        // Check for duplicate path
        const existing = await adminDb.collection("document_folders")
            .where("path", "==", path)
            .limit(1)
            .get()

        if (!existing.empty) {
            return { success: false, error: "A folder with this name already exists here" }
        }

        const docRef = await adminDb.collection("document_folders").add({
            name: safeName,
            path,
            parentPath,
            createdAt: new Date(),
            createdBy: session.user.email || "",
        })

        revalidatePath("/documents")
        return { success: true, folderId: docRef.id }
    } catch (error) {
        console.error("Failed to create folder:", error)
        return { success: false, error: "Failed to create folder" }
    }
}

// ── Rename Folder ──

export async function renameFolder(folderPath: string, newName: string): Promise<{ success: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    if (!newName.trim()) return { success: false, error: "Folder name is required" }

    const safeName = newName.trim().replace(/\//g, "-")

    try {
        // Find the folder doc
        const folderSnap = await adminDb.collection("document_folders")
            .where("path", "==", folderPath)
            .limit(1)
            .get()

        if (folderSnap.empty) return { success: false, error: "Folder not found" }

        const folderDoc = folderSnap.docs[0]
        const folderData = folderDoc.data()
        const parentPath = folderData.parentPath as string
        const newPath = parentPath === "/" ? `/${safeName}` : `${parentPath}/${safeName}`

        // Check for duplicate
        if (newPath !== folderPath) {
            const existing = await adminDb.collection("document_folders")
                .where("path", "==", newPath)
                .limit(1)
                .get()
            if (!existing.empty) {
                return { success: false, error: "A folder with this name already exists here" }
            }
        }

        const batch = adminDb.batch()

        // Update the folder itself
        batch.update(folderDoc.ref, { name: safeName, path: newPath })

        // Update all child folders (paths that start with old path + "/")
        const childFolders = await adminDb.collection("document_folders")
            .where("path", ">=", folderPath + "/")
            .where("path", "<", folderPath + "0") // lexicographic range
            .get()

        for (const child of childFolders.docs) {
            const childPath = child.data().path as string
            const updatedPath = newPath + childPath.slice(folderPath.length)
            const updatedParent = updatedPath.slice(0, updatedPath.lastIndexOf("/")) || "/"
            batch.update(child.ref, { path: updatedPath, parentPath: updatedParent })
        }

        // Update documents with folderPath starting with old path
        const standaloneDocs = await adminDb.collection("documents")
            .where("folderPath", ">=", folderPath)
            .where("folderPath", "<", folderPath + "0")
            .get()

        for (const doc of standaloneDocs.docs) {
            const docPath = doc.data().folderPath as string
            const updatedPath = docPath === folderPath ? newPath : newPath + docPath.slice(folderPath.length)
            batch.update(doc.ref, { folderPath: updatedPath })
        }

        await batch.commit()

        revalidatePath("/documents")
        return { success: true }
    } catch (error) {
        console.error("Failed to rename folder:", error)
        return { success: false, error: "Failed to rename folder" }
    }
}

// ── Delete Folder (moves contents to parent) ──

export async function deleteFolder(folderPath: string): Promise<{ success: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    try {
        const folderSnap = await adminDb.collection("document_folders")
            .where("path", "==", folderPath)
            .limit(1)
            .get()

        if (folderSnap.empty) return { success: false, error: "Folder not found" }

        const folderDoc = folderSnap.docs[0]
        const parentPath = folderDoc.data().parentPath as string

        const batch = adminDb.batch()

        // Delete the folder itself
        batch.delete(folderDoc.ref)

        // Delete all child folders
        const childFolders = await adminDb.collection("document_folders")
            .where("path", ">=", folderPath + "/")
            .where("path", "<", folderPath + "0")
            .get()

        for (const child of childFolders.docs) {
            batch.delete(child.ref)
        }

        // Move documents in this folder (and children) to parent
        const standaloneDocs = await adminDb.collection("documents")
            .where("folderPath", ">=", folderPath)
            .where("folderPath", "<", folderPath + "0")
            .get()

        for (const doc of standaloneDocs.docs) {
            batch.update(doc.ref, { folderPath: parentPath, folder: parentPath === "/" ? "General" : parentPath.split("/").pop() })
        }

        // Also move docs with exact match
        const exactDocs = await adminDb.collection("documents")
            .where("folderPath", "==", folderPath)
            .get()

        for (const doc of exactDocs.docs) {
            batch.update(doc.ref, { folderPath: parentPath, folder: parentPath === "/" ? "General" : parentPath.split("/").pop() })
        }

        await batch.commit()

        revalidatePath("/documents")
        return { success: true }
    } catch (error) {
        console.error("Failed to delete folder:", error)
        return { success: false, error: "Failed to delete folder" }
    }
}

// ── Move Document to Folder ──

export async function moveDocumentToFolder(
    docId: string,
    contactId: string,
    folderPath: string
): Promise<{ success: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    try {
        const docRef = contactId
            ? adminDb.collection("contacts").doc(contactId).collection("documents").doc(docId)
            : adminDb.collection("documents").doc(docId)

        const folderName = folderPath === "/" ? "General" : folderPath.split("/").pop() || "General"

        await docRef.update({
            folderPath,
            folder: folderName,
            updatedAt: new Date(),
        })

        revalidatePath("/documents")
        revalidatePath("/contacts")
        return { success: true }
    } catch (error) {
        console.error("Failed to move document:", error)
        return { success: false, error: "Failed to move document" }
    }
}
