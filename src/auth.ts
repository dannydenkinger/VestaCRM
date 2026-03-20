import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

// NOTE: firebase-admin is imported dynamically inside callbacks
// to avoid bundling Node.js modules into the edge runtime (middleware).

// Build providers list — Google is optional (only if CLIENT_ID is configured)
const providers = [
    Credentials({
        credentials: {
            email: { type: "email" },
            password: { type: "password" },
        },
        async authorize(credentials) {
            if (!credentials?.email || !credentials?.password) return null
            try {
                const { adminDb } = await import(/* webpackIgnore: true */ "@/lib/firebase-admin")
                const snap = await adminDb.collection("users")
                    .where("email", "==", credentials.email)
                    .limit(1)
                    .get()
                if (snap.empty) return null
                const doc = snap.docs[0]
                const data = doc.data()
                if (!data.passwordHash) return null
                const valid = await bcrypt.compare(String(credentials.password), data.passwordHash)
                if (!valid) return null
                return { id: doc.id, email: data.email, name: data.name, role: data.role }
            } catch (err) {
                console.error("[AUTH] Credentials authorize error:", err)
                return null
            }
        },
    }),
]

// Only add Google provider if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        }) as any
    )
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers,
    session: { strategy: "jwt" },
    pages: {
        signIn: "/",
    },
    callbacks: {
        async jwt({ token, user, trigger, account, session }) {
            // On Google OAuth sign-in, store OAuth tokens and persist to Firestore
            if (account && account.provider === "google") {
                token.accessToken = account.access_token
                token.refreshToken = account.refresh_token
                token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0

                // Persist tokens to Firestore using workspace-scoped key
                try {
                    const { adminDb } = await import(/* webpackIgnore: true */ "@/lib/firebase-admin")
                    const email = token.email || user?.email || account.providerAccountId
                    if (email && token.refreshToken && token.workspaceId) {
                        await adminDb.collection("oauth_tokens").doc(`${token.workspaceId}_gmail`).set({
                            accessToken: token.accessToken,
                            refreshToken: token.refreshToken,
                            accessTokenExpires: token.accessTokenExpires,
                            email,
                            workspaceId: token.workspaceId,
                            updatedAt: new Date().toISOString(),
                        }, { merge: true })
                    }
                } catch (err) {
                    console.error("[AUTH] Failed to persist Gmail tokens:", err)
                }
            }

            // Refresh Google access token if expired
            if (token.accessTokenExpires && Date.now() > (token.accessTokenExpires as number)) {
                try {
                    const response = await fetch("https://oauth2.googleapis.com/token", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({
                            client_id: process.env.GOOGLE_CLIENT_ID!,
                            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                            grant_type: "refresh_token",
                            refresh_token: token.refreshToken as string,
                        }),
                    })
                    const refreshed = await response.json()
                    if (refreshed.access_token) {
                        token.accessToken = refreshed.access_token
                        token.accessTokenExpires = Date.now() + refreshed.expires_in * 1000
                    }
                } catch (err) {
                    console.error("Failed to refresh access token:", err)
                }
            }

            // On sign-in: fetch user record + workspace membership
            // If Google OAuth user doesn't exist yet, auto-create user + workspace
            if (user || trigger === "signIn") {
                try {
                    const { adminDb } = await import(/* webpackIgnore: true */ "@/lib/firebase-admin")
                    const email = token.email || user?.email
                    if (email) {
                        let usersSnap = await adminDb.collection("users")
                            .where("email", "==", email)
                            .limit(1)
                            .get()

                        // Auto-create user + workspace for new Google OAuth sign-ins
                        if (usersSnap.empty && account?.provider === "google") {
                            const now = new Date()
                            const userName = token.name || user?.name || email.split("@")[0]

                            // Create user doc
                            const userRef = await adminDb.collection("users").add({
                                name: userName,
                                email,
                                createdAt: now,
                                updatedAt: now,
                            })

                            // Create workspace
                            const wsName = `${userName}'s Workspace`
                            const slug = wsName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)
                            const workspaceRef = await adminDb.collection("workspaces").add({
                                name: wsName,
                                slug,
                                ownerId: userRef.id,
                                plan: "free",
                                status: "active",
                                memberCount: 1,
                                contactCount: 0,
                                createdAt: now,
                                updatedAt: now,
                            })

                            // Create workspace membership
                            await adminDb.collection("workspace_members").add({
                                workspaceId: workspaceRef.id,
                                userId: userRef.id,
                                role: "OWNER",
                                status: "active",
                                joinedAt: now,
                                invitedBy: null,
                            })

                            // Provision default workspace data
                            const { provisionWorkspace } = await import(/* webpackIgnore: true */ "@/lib/workspace-defaults")
                            await provisionWorkspace(workspaceRef.id, wsName)

                            token.dbUserId = userRef.id
                            token.workspaceId = workspaceRef.id
                            token.role = "OWNER"
                        } else if (!usersSnap.empty) {
                            const userDoc = usersSnap.docs[0]
                            token.dbUserId = userDoc.id

                            // Fetch workspace membership
                            const memberSnap = await adminDb.collection("workspace_members")
                                .where("userId", "==", userDoc.id)
                                .where("status", "==", "active")
                                .limit(1)
                                .get()

                            if (!memberSnap.empty) {
                                const membership = memberSnap.docs[0].data()
                                token.workspaceId = membership.workspaceId
                                token.role = membership.role || "AGENT"
                            } else {
                                // Fallback: legacy user without workspace membership
                                token.role = userDoc.data().role || "AGENT"
                            }
                        } else {
                            token.role = "AGENT"
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch user/workspace for JWT:", err)
                    token.role = token.role || "AGENT"
                }
            }
            // Handle workspace switching
            if (trigger === "update" && session?.workspaceId) {
                try {
                    const { adminDb } = await import(/* webpackIgnore: true */ "@/lib/firebase-admin")
                    const memberSnap = await adminDb.collection("workspace_members")
                        .where("userId", "==", token.dbUserId)
                        .where("workspaceId", "==", session.workspaceId)
                        .where("status", "==", "active")
                        .limit(1)
                        .get()
                    if (!memberSnap.empty) {
                        const membership = memberSnap.docs[0].data()
                        token.workspaceId = session.workspaceId
                        token.role = membership.role || "AGENT"
                    }
                } catch (err) {
                    console.error("[AUTH] Workspace switch error:", err)
                }
            }
            if (user) {
                token.id = user.id
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string
                session.user.id = (token.dbUserId as string) || (token.id as string)
                session.user.workspaceId = token.workspaceId as string
            }
            // Expose OAuth tokens for server-side use (already encrypted in JWT cookie)
            ;(session as any).accessToken = token.accessToken
            ;(session as any).refreshToken = token.refreshToken
            ;(session as any).accessTokenExpires = token.accessTokenExpires
            return session
        },
    },
})
