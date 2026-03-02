"use server"

import { adminDb } from "@/lib/firebase-admin"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function getCurrentUserRole() {
    const session = await auth()
    if (!session?.user?.email) return "AGENT"

    try {
        const usersSnap = await adminDb.collection('users').where('email', '==', session.user.email).limit(1).get()
        if (!usersSnap.empty) {
            return usersSnap.docs[0].data()?.role || "AGENT"
        }
    } catch (err) {
        console.error("Error getting user role:", err)
    }
    
    return "AGENT"
}

export async function updateUserRole(userId: string, newRole: string) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const usersSnap = await adminDb.collection('users').where('email', '==', session.user.email).limit(1).get()
    
    if (usersSnap.empty || usersSnap.docs[0].data()?.role !== "OWNER") {
        throw new Error("Unauthorized: Only owners can manage roles.")
    }

    try {
        await adminDb.collection('users').doc(userId).update({
            role: newRole,
            updatedAt: new Date()
        })
        revalidatePath("/settings/users")
        return { success: true }
    } catch (error) {
        console.error("Error updating user role:", error)
        throw new Error("Failed to update user role")
    }
}

export async function deleteUser(userId: string) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const usersSnap = await adminDb.collection('users').where('email', '==', session.user.email).limit(1).get()

    if (usersSnap.empty || usersSnap.docs[0].data()?.role !== "OWNER") {
        throw new Error("Unauthorized: Only owners can manage roles.")
    }

    try {
        await adminDb.collection('users').doc(userId).delete()
        revalidatePath("/settings/users")
        return { success: true }
    } catch (error) {
        console.error("Error deleting user:", error)
        throw new Error("Failed to delete user")
    }
}

export async function updateProfile(name: string, phone: string) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    try {
        const usersSnap = await adminDb.collection('users').where('email', '==', session.user.email).limit(1).get()
        if (usersSnap.empty) throw new Error("User not found in DB")
        
        await adminDb.collection('users').doc(usersSnap.docs[0].id).update({
            name,
            phone,
            updatedAt: new Date()
        })
        revalidatePath("/settings")
        return { success: true }
    } catch (error) {
        console.error("Error updating profile:", error)
        throw new Error("Failed to update profile")
    }
}

export async function disconnectGoogleCalendar() {
    const session = await auth();
    if (!session?.user?.email) throw new Error("Unauthorized");

    try {
        const usersSnap = await adminDb.collection('users').where('email', '==', session.user.email).limit(1).get()
        if (usersSnap.empty) throw new Error("User not found in DB")

        const dbUserId = usersSnap.docs[0].id;

        const querySnapshot = await adminDb.collection('calendar_integrations')
            .where('userId', '==', dbUserId)
            .get();

        const batch = adminDb.batch();
        querySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();

        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Error disconnecting Google Calendar:", error);
        throw new Error("Failed to disconnect calendar");
    }
}

export async function createUser(data: { name: string, email: string, role: string }) {
    const session = await auth()
    if (!session?.user?.email) return { success: false, error: "Unauthorized" }

    const usersSnap = await adminDb.collection('users').where('email', '==', session.user.email).limit(1).get()

    if (usersSnap.empty || usersSnap.docs[0].data()?.role !== "OWNER") {
        return { success: false, error: "Unauthorized: Only owners can create users." }
    }

    try {
        // Check if user already exists
        const existingUsers = await adminDb.collection('users')
            .where('email', '==', data.email)
            .get();
            
        if (!existingUsers.empty) {
            return { success: false, error: "A user with this email already exists." }
        }

        // We use doc() with no args to generate a new ID, but typically Firebase Auth users
        // will log in with Google and NextAuth will create the user document with its own ID.
        // For pre-created users, we can just create a document and NextAuth firestore adapter
        // should link it if the email matches.
        await adminDb.collection('users').add({
            name: data.name,
            email: data.email,
            role: data.role,
            createdAt: new Date(),
            updatedAt: new Date()
        })
        revalidatePath("/settings")
        return { success: true }
    } catch (error: any) {
        console.error("Error creating user:", error)
        return { success: false, error: "Failed to create user" }
    }
}
