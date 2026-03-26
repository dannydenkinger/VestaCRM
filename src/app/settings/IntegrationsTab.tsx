"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { disconnectGoogleCalendar } from "./users/actions"
import { useState, useTransition } from "react"
import {
    Loader2, CalendarSync, Apple, MessageSquare, CreditCard,
    ExternalLink, Copy, Check, Mail, Bot, Search, Globe, Eye, EyeOff,
    BarChart3, Image
} from "lucide-react"
import { toast } from "sonner"

interface IntegrationStatus {
    google: {
        connected: boolean
        ga4PropertyId: string | null
        gscSiteUrl: string | null
    }
    gmail: { connected: boolean; email: string | null }
    resend: { connected: boolean }
    anthropic: { connected: boolean }
    serper: { connected: boolean }
    wordpress: { connected: boolean }
}

export function IntegrationsTab({
    calendarConnected,
    icsFeedUrl,
    integrationStatus,
}: {
    calendarConnected: boolean
    icsFeedUrl: string
    integrationStatus: IntegrationStatus
}) {
    const [isDisconnecting, setIsDisconnecting] = useState(false)
    const [copied, setCopied] = useState(false)
    const [testing, setTesting] = useState<string | null>(null)
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
    const [status, setStatus] = useState(integrationStatus)
    const [isPending, startTransition] = useTransition()

    const handleDisconnect = async () => {
        setIsDisconnecting(true)
        try {
            await disconnectGoogleCalendar()
        } catch (error) {
            console.error(error)
        } finally {
            setIsDisconnecting(false)
        }
    }

    const handleCopy = async () => {
        await navigator.clipboard.writeText(icsFeedUrl)
        setCopied(true)
        toast.success("Feed URL copied to clipboard")
        setTimeout(() => setCopied(false), 2000)
    }

    const toggleShowKey = (key: string) => {
        setShowKeys(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const handleSaveApiKey = async (
        service: string,
        config: Record<string, string>,
        testFn?: (actions: any) => Promise<{ success: boolean; message: string }>
    ) => {
        const actions = await import("@/app/setup/actions")

        if (testFn) {
            setTesting(service)
            const result = await testFn(actions)
            setTesting(null)
            if (!result.success) {
                toast.error(`Connection failed: ${result.message}`)
                return
            }
        }

        startTransition(async () => {
            try {
                await actions.saveApiKey(service, config)
                setStatus(prev => ({ ...prev, [service]: { connected: true } }))
                toast.success("Connected successfully!")
            } catch {
                toast.error("Failed to save configuration")
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* ── Calendar ── */}
            <Section title="Calendar">
                {/* Google Calendar */}
                <IntegrationRow
                    icon={<CalendarSync className="h-4.5 w-4.5 text-muted-foreground" />}
                    name="Google Calendar"
                    description="Two-way sync for opportunities and tasks."
                    connected={calendarConnected}
                    action={
                        calendarConnected ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDisconnect}
                                disabled={isDisconnecting}
                                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                            >
                                {isDisconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
                            </Button>
                        ) : (
                            <Button asChild size="sm" className="h-8">
                                <a href="/api/auth/google-calendar">
                                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                    Connect
                                </a>
                            </Button>
                        )
                    }
                />

                {/* Apple Calendar */}
                <div className="p-4 border rounded-lg bg-card space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-9 w-9 rounded-md bg-muted/50">
                            <Apple className="h-4.5 w-4.5 text-muted-foreground" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold">Apple Calendar</div>
                            <div className="text-xs text-muted-foreground">One-way sync. Subscribe to this feed on your Apple device.</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Input readOnly value={icsFeedUrl} className="font-mono text-xs bg-muted/30 focus-visible:ring-0" />
                        <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5" onClick={handleCopy}>
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? "Copied" : "Copy"}
                        </Button>
                    </div>
                </div>
            </Section>

            {/* ── Google Services ── */}
            <Section title="Google Services">
                <IntegrationRow
                    icon={<BarChart3 className="h-4.5 w-4.5 text-muted-foreground" />}
                    name="Google Analytics"
                    description={status.google.ga4PropertyId
                        ? `Property: ${status.google.ga4PropertyId}`
                        : "Website traffic and conversion data."}
                    connected={!!status.google.ga4PropertyId}
                    action={
                        !status.google.connected ? (
                            <Button asChild size="sm" className="h-8">
                                <a href="/api/auth/google-services">
                                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                    Connect Google
                                </a>
                            </Button>
                        ) : !status.google.ga4PropertyId ? (
                            <Button asChild size="sm" variant="outline" className="h-8">
                                <a href="/setup?step=1">
                                    Configure
                                </a>
                            </Button>
                        ) : null
                    }
                />

                <IntegrationRow
                    icon={<Search className="h-4.5 w-4.5 text-muted-foreground" />}
                    name="Google Search Console"
                    description={status.google.gscSiteUrl
                        ? `Site: ${status.google.gscSiteUrl}`
                        : "SEO performance and keyword rankings."}
                    connected={!!status.google.gscSiteUrl}
                    action={
                        !status.google.connected ? (
                            <Button asChild size="sm" className="h-8">
                                <a href="/api/auth/google-services">
                                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                    Connect Google
                                </a>
                            </Button>
                        ) : !status.google.gscSiteUrl ? (
                            <Button asChild size="sm" variant="outline" className="h-8">
                                <a href="/setup?step=1">
                                    Configure
                                </a>
                            </Button>
                        ) : null
                    }
                />
            </Section>

            {/* ── Email ── */}
            <Section title="Email">
                {/* Gmail Integration */}
                <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted">
                            <Mail className="h-4.5 w-4.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">Gmail</p>
                                {status.gmail?.connected ? (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 bg-emerald-500/10 gap-1">
                                        <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span>
                                        Connected
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                        Not connected
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {status.gmail?.connected
                                    ? `Send and receive emails as ${status.gmail.email}. Connected automatically via Google sign-in.`
                                    : "Sign in with Google to send and receive emails from your Gmail account."
                                }
                            </p>
                        </div>
                    </div>
                </div>
                <ApiKeyRow
                    icon={<Mail className="h-4.5 w-4.5 text-muted-foreground" />}
                    name="Resend"
                    description="Transactional email delivery for sequences and notifications."
                    linkUrl="https://resend.com/api-keys"
                    linkText="Get API key from Resend"
                    placeholder="re_..."
                    connected={status.resend.connected}
                    testing={testing === "resend"}
                    isPending={isPending}
                    showKey={showKeys.resend}
                    onToggleShow={() => toggleShowKey("resend")}
                    onSave={(key) => handleSaveApiKey(
                        "resend",
                        { apiKey: key },
                        (actions) => actions.testResendConnection(key)
                    )}
                />
            </Section>

            {/* ── AI & SEO ── */}
            <Section title="AI & SEO">
                <ApiKeyRow
                    icon={<Bot className="h-4.5 w-4.5 text-muted-foreground" />}
                    name="Anthropic (Claude AI)"
                    description="AI-powered blog content generation."
                    linkUrl="https://console.anthropic.com/settings/keys"
                    linkText="Get API key from Anthropic"
                    placeholder="sk-ant-..."
                    connected={status.anthropic.connected}
                    testing={testing === "anthropic"}
                    isPending={isPending}
                    showKey={showKeys.anthropic}
                    onToggleShow={() => toggleShowKey("anthropic")}
                    onSave={(key) => handleSaveApiKey(
                        "anthropic",
                        { apiKey: key },
                        (actions) => actions.testAnthropicConnection(key)
                    )}
                />

                <ApiKeyRow
                    icon={<Search className="h-4.5 w-4.5 text-muted-foreground" />}
                    name="Serper (SERP Tracking)"
                    description="Google search results and keyword rank tracking."
                    linkUrl="https://serper.dev/api-key"
                    linkText="Get API key from Serper"
                    placeholder="Enter Serper API key..."
                    connected={status.serper.connected}
                    testing={testing === "serper"}
                    isPending={isPending}
                    showKey={showKeys.serper}
                    onToggleShow={() => toggleShowKey("serper")}
                    onSave={(key) => handleSaveApiKey(
                        "serper",
                        { apiKey: key },
                        (actions) => actions.testSerperConnection(key)
                    )}
                />

                <IntegrationRow
                    icon={<Image className="h-4.5 w-4.5 text-muted-foreground" />}
                    name="Google Gemini"
                    description="AI image generation for blog featured images."
                    connected={false}
                    comingSoon
                />
            </Section>

            {/* ── Publishing ── */}
            <Section title="Publishing">
                <WordPressRow
                    connected={status.wordpress.connected}
                    testing={testing === "wordpress"}
                    isPending={isPending}
                    showKey={showKeys.wordpress}
                    onToggleShow={() => toggleShowKey("wordpress")}
                    onSave={(url, user, pass) => handleSaveApiKey(
                        "wordpress",
                        { url, username: user, appPassword: pass },
                        (actions) => actions.testWordPressConnection(url, user, pass)
                    )}
                />
            </Section>

            {/* ── Coming Soon ── */}
            <Section title="Coming Soon">
                <IntegrationRow
                    icon={<MessageSquare className="h-4.5 w-4.5 text-muted-foreground" />}
                    name="Twilio SMS"
                    description="Send automated text updates to contacts."
                    connected={false}
                    comingSoon
                />
                <IntegrationRow
                    icon={<CreditCard className="h-4.5 w-4.5 text-muted-foreground" />}
                    name="Stripe Billing"
                    description="Collect deposits and invoice payments."
                    connected={false}
                    comingSoon
                />
            </Section>
        </div>
    )
}

// ── Helper Components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
            {children}
        </div>
    )
}

function IntegrationRow({
    icon, name, description, connected, comingSoon, action,
}: {
    icon: React.ReactNode
    name: string
    description: string
    connected: boolean
    comingSoon?: boolean
    action?: React.ReactNode
}) {
    return (
        <div className={`flex items-center justify-between p-4 border rounded-lg bg-card ${comingSoon ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-9 w-9 rounded-md bg-muted/50">
                    {icon}
                </div>
                <div>
                    <div className={`text-sm font-semibold ${comingSoon ? "text-muted-foreground" : ""}`}>{name}</div>
                    <div className="text-xs text-muted-foreground">{description}</div>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {connected && (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected
                    </Badge>
                )}
                {comingSoon && (
                    <Badge variant="secondary" className="text-muted-foreground/60 text-[10px]">Coming Soon</Badge>
                )}
                {action}
            </div>
        </div>
    )
}

function ApiKeyRow({
    icon, name, description, linkUrl, linkText, placeholder,
    connected, testing, isPending, showKey, onToggleShow, onSave,
}: {
    icon: React.ReactNode
    name: string
    description: string
    linkUrl: string
    linkText: string
    placeholder: string
    connected: boolean
    testing: boolean
    isPending: boolean
    showKey: boolean
    onToggleShow: () => void
    onSave: (key: string) => void
}) {
    const [key, setKey] = useState("")

    return (
        <div className="p-4 border rounded-lg bg-card space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-9 w-9 rounded-md bg-muted/50">
                        {icon}
                    </div>
                    <div>
                        <div className="text-sm font-semibold">{name}</div>
                        <div className="text-xs text-muted-foreground">{description}</div>
                    </div>
                </div>
                {connected && (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1.5 shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected
                    </Badge>
                )}
            </div>
            {!connected && (
                <>
                    <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
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
                            disabled={!key || testing || isPending}
                            onClick={() => onSave(key)}
                        >
                            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test & Save"}
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}

function WordPressRow({
    connected, testing, isPending, showKey, onToggleShow, onSave,
}: {
    connected: boolean
    testing: boolean
    isPending: boolean
    showKey: boolean
    onToggleShow: () => void
    onSave: (url: string, user: string, pass: string) => void
}) {
    const [wpUrl, setWpUrl] = useState("")
    const [wpUser, setWpUser] = useState("")
    const [wpPass, setWpPass] = useState("")

    return (
        <div className="p-4 border rounded-lg bg-card space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-9 w-9 rounded-md bg-muted/50">
                        <Globe className="h-4.5 w-4.5 text-muted-foreground" />
                    </div>
                    <div>
                        <div className="text-sm font-semibold">WordPress</div>
                        <div className="text-xs text-muted-foreground">Publish blog posts directly from your CRM.</div>
                    </div>
                </div>
                {connected && (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1.5 shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected
                    </Badge>
                )}
            </div>
            {!connected && (
                <>
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
                                type={showKey ? "text" : "password"}
                                placeholder="App Password"
                                value={wpPass}
                                onChange={(e) => setWpPass(e.target.value)}
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
                    </div>
                    <Button
                        size="sm"
                        disabled={!wpUrl || !wpUser || !wpPass || testing || isPending}
                        onClick={() => onSave(wpUrl, wpUser, wpPass)}
                    >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test & Save"}
                    </Button>
                </>
            )}
        </div>
    )
}
