"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Hexagon, Loader2, Eye, EyeOff } from "lucide-react"
import { signIn } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"

const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"

function SignInContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const error = searchParams.get("error")

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [authError, setAuthError] = useState<string | null>(null)

    const handleCredentialsSignIn = async (e: React.FormEvent) => {
        e.preventDefault()
        setAuthError(null)
        setLoading(true)

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        })

        setLoading(false)

        if (result?.error) {
            setAuthError("Invalid email or password")
            return
        }

        router.push("/dashboard")
    }

    const displayError = authError
        || (error === "AccessDenied" ? "Your account has not been added to this workspace. Contact your administrator." : null)
        || (error === "CredentialsSignin" ? "Invalid email or password" : null)

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-4 sm:p-6">
            {/* Animated gradient background */}
            <div className="landing-gradient absolute inset-0" />

            {/* Floating orbs */}
            <div className="landing-orb landing-orb-1" />
            <div className="landing-orb landing-orb-2" />
            <div className="landing-orb landing-orb-3" />

            {/* Content */}
            <div className="relative z-10 mx-auto w-full max-w-sm landing-fade-in">
                {/* Logo & Branding */}
                <div className="flex flex-col items-center space-y-4 text-center mb-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-lg shadow-indigo-500/10">
                        <Hexagon className="h-9 w-9 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                            Vesta CRM
                        </h1>
                        <p className="text-sm text-zinc-400 mt-1.5 font-medium tracking-wide">
                            Sales CRM
                        </p>
                    </div>
                </div>

                {/* Glass card */}
                <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
                    <div className="text-center">
                        <h2 className="text-lg font-semibold text-white">Welcome Back</h2>
                        <p className="text-sm text-zinc-400 mt-1">
                            Sign in to your CRM portal
                        </p>
                    </div>

                    {displayError && (
                        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-center">
                            <p className="text-sm font-medium text-rose-400">{displayError}</p>
                        </div>
                    )}

                    {/* Email/Password Form */}
                    <form onSubmit={handleCredentialsSignIn} className="space-y-3">
                        <Input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 min-h-[44px]"
                        />
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 pr-10 min-h-[44px]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <Button
                            type="submit"
                            size="lg"
                            disabled={loading}
                            className="w-full font-medium min-h-[48px] touch-manipulation bg-white text-black hover:bg-zinc-200 transition-colors"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Sign In
                        </Button>
                    </form>

                    {/* Google OAuth — only if configured */}
                    {googleEnabled && (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/10" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-2 text-zinc-500 bg-black/50 rounded">or</span>
                                </div>
                            </div>

                            <Button
                                size="lg"
                                variant="outline"
                                className="w-full font-medium min-h-[48px] touch-manipulation border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors"
                                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                            >
                                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                Sign in with Google
                            </Button>
                        </>
                    )}

                    {/* Create Account Link */}
                    <div className="text-center">
                        <button
                            onClick={() => router.push("/register")}
                            className="text-sm text-zinc-400 hover:text-white transition-colors"
                        >
                            Don&apos;t have an account? <span className="underline underline-offset-2">Create one</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function Home() {
    return (
        <Suspense>
            <SignInContent />
        </Suspense>
    )
}
