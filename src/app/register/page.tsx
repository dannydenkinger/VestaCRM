"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Hexagon, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { registerUser } from "./actions"

export default function RegisterPage() {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [workspaceName, setWorkspaceName] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        startTransition(async () => {
            const result = await registerUser({ name, email, password, workspaceName: workspaceName || undefined })

            if (!result.success) {
                setError(result.error || "Registration failed")
                return
            }

            // Auto sign in after registration
            const signInResult = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            if (signInResult?.error) {
                setError("Account created but sign-in failed. Try signing in manually.")
                return
            }

            // Set setup cookie so middleware doesn't redirect
            document.cookie = "setup_completed=true;path=/;max-age=31536000"
            router.push("/dashboard")
        })
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-4 sm:p-6">
            {/* Animated gradient background */}
            <div className="landing-gradient absolute inset-0" />
            <div className="landing-orb landing-orb-1" />
            <div className="landing-orb landing-orb-2" />
            <div className="landing-orb landing-orb-3" />

            <div className="relative z-10 mx-auto w-full max-w-sm landing-fade-in">
                {/* Logo */}
                <div className="flex flex-col items-center space-y-4 text-center mb-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-lg shadow-indigo-500/10">
                        <Hexagon className="h-9 w-9 text-violet-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                            Vesta CRM
                        </h1>
                        <p className="text-sm text-zinc-400 mt-1.5 font-medium tracking-wide">
                            Create your account
                        </p>
                    </div>
                </div>

                {/* Glass card */}
                <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
                    <div className="text-center">
                        <h2 className="text-lg font-semibold text-white">Get Started</h2>
                        <p className="text-sm text-zinc-400 mt-1">
                            Set up your CRM account
                        </p>
                    </div>

                    {error && (
                        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-center">
                            <p className="text-sm text-rose-400">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Input
                                type="text"
                                placeholder="Company / workspace name"
                                value={workspaceName}
                                onChange={(e) => setWorkspaceName(e.target.value)}
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 min-h-[44px]"
                            />
                        </div>
                        <div>
                            <Input
                                type="text"
                                placeholder="Full name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 min-h-[44px]"
                            />
                        </div>
                        <div>
                            <Input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 min-h-[44px]"
                            />
                        </div>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password (min 8 characters)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
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
                        <div>
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Confirm password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 min-h-[44px]"
                            />
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            disabled={isPending}
                            className="w-full font-medium min-h-[48px] touch-manipulation bg-white text-black hover:bg-zinc-200 transition-colors"
                        >
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Create Account
                        </Button>

                        <p className="text-xs text-center text-zinc-500">
                            By creating an account, you agree to our{" "}
                            <a href="/terms" className="text-violet-400 hover:underline">Terms of Service</a>
                            {" "}and{" "}
                            <a href="/privacy" className="text-violet-400 hover:underline">Privacy Policy</a>.
                        </p>
                    </form>

                    <div className="text-center">
                        <button
                            onClick={() => router.push("/login")}
                            className="text-sm text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to sign in
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
