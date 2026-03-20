"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    CheckCircle2, Circle, ChevronRight, ChevronLeft, ExternalLink, Loader2,
    Zap, Calendar, BarChart3, Search, Mail, Bot, Globe, Plug, Database,
    ArrowRight, Sparkles, AlertCircle, Eye, EyeOff, AlertTriangle
} from "lucide-react"
import { toast } from "sonner"

interface SetupStatus {
    firebaseConnected: boolean
    google: {
        connected: boolean
        calendarConnected: boolean
        ga4PropertyId: string | null
        gscSiteUrl: string | null
    }
    resend: { connected: boolean }
    anthropic: { connected: boolean }
    serper: { connected: boolean }
    wordpress: { connected: boolean }
    setupCompleted: boolean
}

const STEPS = [
    { id: "welcome", label: "Welcome" },
    { id: "google", label: "Google Services" },
    { id: "email", label: "Email" },
    { id: "tools", label: "AI & SEO" },
    { id: "complete", label: "Complete" },
]

/**
 * Dynamically import server actions — they depend on firebase-admin which
 * throws at module level if FIREBASE_DATABASE_ID is not set.
 * By importing lazily we let the wizard render even before Firebase is configured.
 */
async function importActions() {
    return await import("./actions")
}

export function SetupWizard({ initialStatus }: { initialStatus: SetupStatus }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    const stepFromUrl = searchParams.get("step")
    const [currentStep, setCurrentStep] = useState(() => {
        const idx = stepFromUrl ? parseInt(stepFromUrl) : 0
        return idx >= 0 && idx < STEPS.length ? idx : 0
    })

    const [status, setStatus] = useState<SetupStatus>(initialStatus)

    // Google state
    const [ga4Properties, setGa4Properties] = useState<{ id: string; displayName: string }[]>([])
    const [gscSites, setGscSites] = useState<{ siteUrl: string; permissionLevel: string }[]>([])
    const [selectedGA4, setSelectedGA4] = useState(initialStatus.google.ga4PropertyId || "")
    const [selectedGSC, setSelectedGSC] = useState(initialStatus.google.gscSiteUrl || "")
    const [loadingGoogleData, setLoadingGoogleData] = useState(false)

    // API key state
    const [resendKey, setResendKey] = useState("")
    const [wpUrl, setWpUrl] = useState("")
    const [wpUser, setWpUser] = useState("")
    const [wpPass, setWpPass] = useState("")

    // Testing state
    const [testing, setTesting] = useState<string | null>(null)
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

    // Load Google properties/sites after OAuth callback
    const googleConnected = searchParams.get("connected") === "true" || status.google.connected
    useEffect(() => {
        if (googleConnected && ga4Properties.length === 0 && gscSites.length === 0) {
            setLoadingGoogleData(true)
            importActions()
                .then(({ listGA4Properties, listGSCSites }) =>
                    Promise.all([listGA4Properties(), listGSCSites()])
                )
                .then(([ga4Res, gscRes]) => {
                    if (ga4Res.properties) setGa4Properties(ga4Res.properties)
                    if (gscRes.sites) setGscSites(gscRes.sites)
                    setStatus(prev => ({
                        ...prev,
                        google: { ...prev.google, connected: true },
                    }))
                })
                .catch(console.error)
                .finally(() => setLoadingGoogleData(false))
        }
    }, [googleConnected]) // eslint-disable-line react-hooks/exhaustive-deps

    const goNext = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
    const goBack = () => setCurrentStep(prev => Math.max(prev - 1, 0))

    const handleSaveApiKey = useCallback(async (service: string, config: Record<string, string>, testFn?: (actions: Awaited<ReturnType<typeof importActions>>) => Promise<{ success: boolean; message: string }>) => {
        let actions: Awaited<ReturnType<typeof importActions>>
        try {
            actions = await importActions()
        } catch {
            toast.error("Firebase is not configured yet. Complete Firebase setup first.")
            return
        }

        if (testFn) {
            setTesting(service)
            const result = await testFn(actions)
            setTesting(null)
            if (!result.success) {
                toast.error(`${service} connection failed: ${result.message}`)
                return
            }
        }

        startTransition(async () => {
            try {
                await actions.saveApiKey(service, config)
                setStatus(prev => ({ ...prev, [service]: { connected: true } }))
                toast.success(`${service.charAt(0).toUpperCase() + service.slice(1)} connected!`)
            } catch {
                toast.error("Failed to save configuration")
            }
        })
    }, [startTransition])

    const handleSelectGA4 = async (propertyId: string) => {
        setSelectedGA4(propertyId)
        startTransition(async () => {
            try {
                const { selectGA4Property } = await importActions()
                await selectGA4Property(propertyId)
                setStatus(prev => ({
                    ...prev,
                    google: { ...prev.google, ga4PropertyId: propertyId },
                }))
                toast.success("GA4 property selected")
            } catch {
                toast.error("Failed to save selection")
            }
        })
    }

    const handleSelectGSC = async (siteUrl: string) => {
        setSelectedGSC(siteUrl)
        startTransition(async () => {
            try {
                const { selectGSCSite } = await importActions()
                await selectGSCSite(siteUrl)
                setStatus(prev => ({
                    ...prev,
                    google: { ...prev.google, gscSiteUrl: siteUrl },
                }))
                toast.success("Search Console site selected")
            } catch {
                toast.error("Failed to save selection")
            }
        })
    }

    const handleComplete = () => {
        startTransition(async () => {
            try {
                const { completeSetup } = await importActions()
                await completeSetup()
                router.push("/dashboard")
            } catch {
                // If Firebase isn't configured, just set the cookie client-side and proceed
                document.cookie = "setup_completed=true;path=/;max-age=31536000"
                router.push("/dashboard")
            }
        })
    }

    const toggleShowKey = (key: string) => {
        setShowKeys(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const connectedCount = [
        status.google.connected,
        status.resend.connected,
        status.anthropic.connected,
        status.serper.connected,
        status.wordpress.connected,
    ].filter(Boolean).length

    const firebaseReady = status.firebaseConnected

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
                {STEPS.map((step, i) => (
                    <div key={step.id} className="flex items-center">
                        <button
                            onClick={() => setCurrentStep(i)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                                i === currentStep
                                    ? "text-primary bg-primary/10"
                                    : i < currentStep
                                    ? "text-muted-foreground hover:text-foreground"
                                    : "text-muted-foreground/50"
                            }`}
                        >
                            {i < currentStep ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : i === currentStep ? (
                                <Circle className="w-3.5 h-3.5 fill-primary/20" />
                            ) : (
                                <Circle className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">{step.label}</span>
                        </button>
                        {i < STEPS.length - 1 && (
                            <ChevronRight className="w-3 h-3 text-muted-foreground/30 mx-1" />
                        )}
                    </div>
                ))}
            </div>

            {/* Step content */}
            <div className="min-h-[400px]">
                {/* Step 0: Welcome */}
                {currentStep === 0 && (
                    <div className="text-center space-y-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
                            <Sparkles className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome to your CRM</h1>
                            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                                Let&apos;s connect your services to unlock the full power of your CRM. This takes about 5 minutes.
                            </p>
                        </div>

                        {/* Firebase status */}
                        <Card className={`text-left ${!firebaseReady ? "border-amber-500/30" : ""}`}>
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-background border">
                                            <Database className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium">Firebase Database</div>
                                            <div className="text-xs text-muted-foreground">Core data storage</div>
                                        </div>
                                        {firebaseReady ? (
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Connected
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Not configured
                                            </Badge>
                                        )}
                                    </div>

                                    {!firebaseReady && (
                                        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm space-y-2">
                                            <p className="font-medium text-amber-700 dark:text-amber-400">Firebase setup required</p>
                                            <p className="text-muted-foreground text-xs">
                                                Your Firebase environment variables are not configured yet. Follow the
                                                {" "}<a href="https://github.com" className="text-primary underline">SETUP.md</a>{" "}
                                                guide to configure Firebase, then restart the server. You can still explore the wizard steps below.
                                            </p>
                                        </div>
                                    )}

                                    <StepPreview icon={<Plug className="w-4 h-4" />} title="Google Services" description="Calendar, Analytics, and Search Console" />
                                    <StepPreview icon={<Mail className="w-4 h-4" />} title="Email" description="Send emails via Resend" />
                                    <StepPreview icon={<Bot className="w-4 h-4" />} title="AI & SEO Tools" description="AI writing, SERP tracking, and blog publishing" optional />
                                </div>
                            </CardContent>
                        </Card>

                        <Button size="lg" onClick={goNext} className="gap-2">
                            Get Started
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                {/* Step 1: Google Services */}
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold">Connect Google Services</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                One sign-in connects Calendar, Analytics, and Search Console.
                            </p>
                        </div>

                        {!firebaseReady && <FirebaseRequiredNotice />}

                        {!googleConnected ? (
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center space-y-4">
                                        <div className="flex justify-center gap-3">
                                            <ServiceIcon icon={<Calendar className="w-5 h-5" />} label="Calendar" />
                                            <ServiceIcon icon={<BarChart3 className="w-5 h-5" />} label="Analytics" />
                                            <ServiceIcon icon={<Search className="w-5 h-5" />} label="Search Console" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Sign in with the Google account that has access to your Analytics and Search Console properties.
                                        </p>
                                        <Button asChild size="lg" disabled={!firebaseReady}>
                                            <a href={firebaseReady ? "/api/auth/google-services" : undefined}>
                                                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                                Sign in with Google
                                            </a>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                <Card>
                                    <CardContent className="pt-4 pb-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="w-5 h-5 text-muted-foreground" />
                                                <div>
                                                    <div className="text-sm font-semibold">Google Calendar</div>
                                                    <div className="text-xs text-muted-foreground">Two-way sync for tasks and deals</div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1.5">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Connected
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-4 pb-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <BarChart3 className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <div className="text-sm font-semibold">Google Analytics</div>
                                                <div className="text-xs text-muted-foreground">Website traffic and conversion data</div>
                                            </div>
                                        </div>
                                        {loadingGoogleData ? (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Loading properties...
                                            </div>
                                        ) : ga4Properties.length > 0 ? (
                                            <select
                                                value={selectedGA4}
                                                onChange={(e) => handleSelectGA4(e.target.value)}
                                                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                                            >
                                                <option value="">Select a property...</option>
                                                {ga4Properties.map(p => (
                                                    <option key={p.id} value={p.id}>{p.displayName} ({p.id})</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                No GA4 properties found. You can configure this later in Settings.
                                            </p>
                                        )}
                                        {selectedGA4 && (
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1.5 mt-2">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Property selected
                                            </Badge>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-4 pb-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Search className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <div className="text-sm font-semibold">Google Search Console</div>
                                                <div className="text-xs text-muted-foreground">SEO performance and keyword rankings</div>
                                            </div>
                                        </div>
                                        {loadingGoogleData ? (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Loading sites...
                                            </div>
                                        ) : gscSites.length > 0 ? (
                                            <select
                                                value={selectedGSC}
                                                onChange={(e) => handleSelectGSC(e.target.value)}
                                                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                                            >
                                                <option value="">Select a site...</option>
                                                {gscSites.map(s => (
                                                    <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                No verified sites found. You can configure this later in Settings.
                                            </p>
                                        )}
                                        {selectedGSC && (
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1.5 mt-2">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Site selected
                                            </Badge>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <div className="flex justify-between pt-4">
                            <Button variant="ghost" onClick={goBack}>
                                <ChevronLeft className="w-4 h-4 mr-1" /> Back
                            </Button>
                            <div className="flex gap-2">
                                {!googleConnected && (
                                    <Button variant="ghost" onClick={goNext}>
                                        Skip for now
                                    </Button>
                                )}
                                {googleConnected && (
                                    <Button onClick={goNext}>
                                        Continue <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Email (Resend) */}
                {currentStep === 2 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold">Email Configuration</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Connect Resend to send emails from your CRM.
                            </p>
                        </div>

                        {!firebaseReady && <FirebaseRequiredNotice />}

                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <CardTitle className="text-sm">Resend</CardTitle>
                                            <CardDescription className="text-xs">Transactional email delivery</CardDescription>
                                        </div>
                                    </div>
                                    {status.resend.connected && (
                                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1.5">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Connected
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <a
                                    href="https://resend.com/api-keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    Get your API key from Resend <ExternalLink className="w-3 h-3" />
                                </a>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            type={showKeys.resend ? "text" : "password"}
                                            placeholder="re_..."
                                            value={resendKey}
                                            onChange={(e) => setResendKey(e.target.value)}
                                            className="pr-9"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => toggleShowKey("resend")}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showKeys.resend ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="h-10"
                                        disabled={!resendKey || testing === "resend" || isPending || !firebaseReady}
                                        onClick={() => handleSaveApiKey(
                                            "resend",
                                            { apiKey: resendKey },
                                            (actions) => actions.testResendConnection(resendKey)
                                        )}
                                    >
                                        {testing === "resend" ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            "Test & Save"
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-between pt-4">
                            <Button variant="ghost" onClick={goBack}>
                                <ChevronLeft className="w-4 h-4 mr-1" /> Back
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={goNext}>
                                    {status.resend.connected ? "Continue" : "Skip for now"}
                                </Button>
                                {status.resend.connected && (
                                    <Button onClick={goNext}>
                                        Continue <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: AI & SEO Tools (Optional) */}
                {currentStep === 3 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold">AI & SEO Tools</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                These are optional. Connect the services you use.
                            </p>
                        </div>

                        {!firebaseReady && <FirebaseRequiredNotice />}

                        <ApiKeyCard
                            icon={<Bot className="w-5 h-5" />}
                            title="Anthropic (Claude AI)"
                            description="AI-powered content generation and analysis"
                            linkUrl="https://console.anthropic.com/settings/keys"
                            linkText="Get API key from Anthropic"
                            placeholder="sk-ant-..."
                            connected={status.anthropic.connected}
                            testing={testing === "anthropic"}
                            isPending={isPending}
                            disabled={!firebaseReady}
                            showKey={showKeys.anthropic}
                            onToggleShow={() => toggleShowKey("anthropic")}
                            onSave={(key) => handleSaveApiKey(
                                "anthropic",
                                { apiKey: key },
                                (actions) => actions.testAnthropicConnection(key)
                            )}
                        />

                        <ApiKeyCard
                            icon={<Search className="w-5 h-5" />}
                            title="Serper (SERP Tracking)"
                            description="Google search results and keyword tracking"
                            linkUrl="https://serper.dev/api-key"
                            linkText="Get API key from Serper"
                            placeholder="Enter Serper API key..."
                            connected={status.serper.connected}
                            testing={testing === "serper"}
                            isPending={isPending}
                            disabled={!firebaseReady}
                            showKey={showKeys.serper}
                            onToggleShow={() => toggleShowKey("serper")}
                            onSave={(key) => handleSaveApiKey(
                                "serper",
                                { apiKey: key },
                                (actions) => actions.testSerperConnection(key)
                            )}
                        />

                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Globe className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <CardTitle className="text-sm">WordPress</CardTitle>
                                            <CardDescription className="text-xs">Publish blog posts directly from your CRM</CardDescription>
                                        </div>
                                    </div>
                                    {status.wordpress.connected && (
                                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1.5">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Connected
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <a
                                    href="https://wordpress.org/documentation/article/application-passwords/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    How to create a WordPress Application Password <ExternalLink className="w-3 h-3" />
                                </a>
                                <Input
                                    type="url"
                                    placeholder="https://yourblog.com"
                                    value={wpUrl}
                                    onChange={(e) => setWpUrl(e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder="Username"
                                        value={wpUser}
                                        onChange={(e) => setWpUser(e.target.value)}
                                    />
                                    <div className="relative">
                                        <Input
                                            type={showKeys.wordpress ? "text" : "password"}
                                            placeholder="App Password"
                                            value={wpPass}
                                            onChange={(e) => setWpPass(e.target.value)}
                                            className="pr-9"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => toggleShowKey("wordpress")}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showKeys.wordpress ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    disabled={!wpUrl || !wpUser || !wpPass || testing === "wordpress" || isPending || !firebaseReady}
                                    onClick={() => handleSaveApiKey(
                                        "wordpress",
                                        { url: wpUrl, username: wpUser, appPassword: wpPass },
                                        (actions) => actions.testWordPressConnection(wpUrl, wpUser, wpPass)
                                    )}
                                >
                                    {testing === "wordpress" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        "Test & Save"
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="flex justify-between pt-4">
                            <Button variant="ghost" onClick={goBack}>
                                <ChevronLeft className="w-4 h-4 mr-1" /> Back
                            </Button>
                            <Button onClick={goNext}>
                                Continue <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 4: Complete */}
                {currentStep === 4 && (
                    <div className="text-center space-y-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 mb-2">
                            <Zap className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">You&apos;re all set!</h1>
                            <p className="text-muted-foreground mt-2">
                                {connectedCount > 0
                                    ? `You've connected ${connectedCount} service${connectedCount > 1 ? "s" : ""}. You can always update these in Settings.`
                                    : "You can connect services anytime from Settings."}
                            </p>
                        </div>

                        <Card className="text-left">
                            <CardContent className="pt-6 space-y-2">
                                <SummaryRow label="Firebase Database" connected={firebaseReady} />
                                <SummaryRow label="Google Services" connected={status.google.connected} />
                                <SummaryRow label="Email (Resend)" connected={status.resend.connected} />
                                <SummaryRow label="AI (Anthropic)" connected={status.anthropic.connected} />
                                <SummaryRow label="SERP Tracking (Serper)" connected={status.serper.connected} />
                                <SummaryRow label="WordPress" connected={status.wordpress.connected} />
                            </CardContent>
                        </Card>

                        <div className="flex flex-col gap-2">
                            <Button size="lg" onClick={handleComplete} disabled={isPending} className="gap-2">
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Go to Dashboard
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                            <Button variant="link" size="sm" onClick={() => router.push("/settings?tab=integrations")} className="text-muted-foreground">
                                Go to Settings instead
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Helper Components ──

function FirebaseRequiredNotice() {
    return (
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-muted-foreground flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>Firebase is not configured. Integration features require a connected database. See <strong>SETUP.md</strong> for instructions.</span>
        </div>
    )
}

function StepPreview({ icon, title, description, optional }: { icon: React.ReactNode; title: string; description: string; optional?: boolean }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-background border">
                {icon}
            </div>
            <div className="flex-1">
                <div className="text-sm font-medium">{title}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
            </div>
            {optional && (
                <Badge variant="secondary" className="text-[10px]">Optional</Badge>
            )}
        </div>
    )
}

function ServiceIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl border bg-muted/30">
                {icon}
            </div>
            <span className="text-xs text-muted-foreground">{label}</span>
        </div>
    )
}

function SummaryRow({ label, connected }: { label: string; connected: boolean }) {
    return (
        <div className="flex items-center justify-between py-1.5">
            <span className="text-sm">{label}</span>
            {connected ? (
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                </Badge>
            ) : (
                <Badge variant="secondary" className="text-muted-foreground gap-1">
                    <Circle className="w-3 h-3" />
                    Not configured
                </Badge>
            )}
        </div>
    )
}

function ApiKeyCard({
    icon, title, description, linkUrl, linkText, placeholder, connected, testing, isPending, disabled, showKey, onToggleShow, onSave,
}: {
    icon: React.ReactNode
    title: string
    description: string
    linkUrl: string
    linkText: string
    placeholder: string
    connected: boolean
    testing: boolean
    isPending: boolean
    disabled?: boolean
    showKey: boolean
    onToggleShow: () => void
    onSave: (key: string) => void
}) {
    const [key, setKey] = useState("")

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {icon}
                        <div>
                            <CardTitle className="text-sm">{title}</CardTitle>
                            <CardDescription className="text-xs">{description}</CardDescription>
                        </div>
                    </div>
                    {connected && (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1.5">
                            <CheckCircle2 className="w-3 h-3" />
                            Connected
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <a
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                    {linkText} <ExternalLink className="w-3 h-3" />
                </a>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            type={showKey ? "text" : "password"}
                            placeholder={placeholder}
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            className="pr-9"
                        />
                        <button
                            type="button"
                            onClick={onToggleShow}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <Button
                        size="sm"
                        className="h-10"
                        disabled={!key || testing || isPending || disabled}
                        onClick={() => onSave(key)}
                    >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test & Save"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
