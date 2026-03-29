"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Globe, Copy, Check, RefreshCw, Code, Eye } from "lucide-react"
import { toast } from "sonner"
import { generateApiKey, getApiKeys } from "./actions"

export function WebsiteFormEmbed() {
    const [apiKey, setApiKey] = useState<string | null>(null)
    const [keyPrefix, setKeyPrefix] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [copied, setCopied] = useState(false)
    const [showPreview, setShowPreview] = useState(false)

    useEffect(() => {
        checkExistingKey()
    }, [])

    async function checkExistingKey() {
        setLoading(true)
        try {
            const keys = await getApiKeys()
            const formKey = keys.find(k => k.active && k.name === "Website Form")
            if (formKey) {
                setKeyPrefix(formKey.keyPrefix)
            }
        } catch {
            // ignore
        } finally {
            setLoading(false)
        }
    }

    async function handleSetup() {
        setGenerating(true)
        try {
            const result = await generateApiKey("Website Form")
            setApiKey(result.key)
            setKeyPrefix(result.key.substring(0, 12) + "...")
        } catch (err: any) {
            toast.error(err.message || "Failed to set up")
        } finally {
            setGenerating(false)
        }
    }

    const webhookUrl = typeof window !== "undefined"
        ? `${window.location.origin}/api/webhooks/leads`
        : "/api/webhooks/leads"

    const embedCode = apiKey
        ? generateEmbedCode(webhookUrl, apiKey)
        : null

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success("Copied to clipboard!")
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Loading...
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website Lead Form
                </CardTitle>
                <CardDescription>
                    Add a lead capture form to your website. New submissions automatically create contacts and opportunities in your CRM.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!apiKey && !keyPrefix ? (
                    // First time setup
                    <div className="text-center py-6 border rounded-lg border-dashed space-y-3">
                        <Globe className="h-10 w-10 mx-auto text-muted-foreground/30" />
                        <div>
                            <p className="text-sm font-medium">Capture leads from your website</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                Generate an embed code you can paste into any website — WordPress, Wix, Squarespace, or custom HTML.
                            </p>
                        </div>
                        <Button onClick={handleSetup} disabled={generating}>
                            {generating ? "Setting up..." : "Get Embed Code"}
                        </Button>
                    </div>
                ) : apiKey ? (
                    // Just generated — show the code
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800">
                                Active
                            </Badge>
                            <span className="text-xs text-muted-foreground">Your form is ready to use</span>
                        </div>

                        {/* Instructions */}
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <p className="text-sm font-medium">How to add to your website:</p>
                            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                                <li>Copy the code below</li>
                                <li>In your website editor, add an <strong>HTML</strong> or <strong>Code</strong> block</li>
                                <li>Paste the code and save</li>
                            </ol>
                            <p className="text-xs text-muted-foreground">
                                Works with WordPress, Wix, Squarespace, Webflow, Shopify, or any site that lets you add custom HTML.
                            </p>
                        </div>

                        {/* Code block */}
                        <div className="relative">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                    <Code className="h-3.5 w-3.5" />
                                    Embed Code
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => setShowPreview(!showPreview)}
                                    >
                                        <Eye className="h-3 w-3 mr-1" />
                                        {showPreview ? "Hide Preview" : "Preview"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => copyToClipboard(embedCode!)}
                                    >
                                        {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                                        {copied ? "Copied!" : "Copy Code"}
                                    </Button>
                                </div>
                            </div>
                            <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-[300px] overflow-y-auto border">
                                <code>{embedCode}</code>
                            </pre>
                        </div>

                        {/* Preview */}
                        {showPreview && (
                            <div className="border rounded-lg p-4">
                                <p className="text-xs text-muted-foreground mb-3 font-medium">Preview:</p>
                                <div className="max-w-md mx-auto" dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }} />
                            </div>
                        )}
                    </div>
                ) : (
                    // Already has a key but doesn't have the full key anymore
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800">
                                    Active
                                </Badge>
                                <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{keyPrefix}</code>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Your website form is set up. If you need a new embed code, generate a fresh one below.
                        </p>
                        <Button variant="outline" size="sm" onClick={handleSetup} disabled={generating}>
                            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generating ? "animate-spin" : ""}`} />
                            {generating ? "Generating..." : "Generate New Code"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function generateEmbedCode(webhookUrl: string, apiKey: string): string {
    return `<!-- Vesta CRM Lead Capture Form -->
<div id="vesta-lead-form">
  <form id="vesta-form" style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="margin-bottom:12px;">
      <input name="name" placeholder="Full Name" required
        style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;" />
    </div>
    <div style="margin-bottom:12px;">
      <input name="email" type="email" placeholder="Email Address" required
        style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;" />
    </div>
    <div style="margin-bottom:12px;">
      <input name="phone" type="tel" placeholder="Phone Number"
        style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;" />
    </div>
    <div style="margin-bottom:16px;">
      <textarea name="notes" placeholder="Message" rows="3"
        style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;resize:vertical;box-sizing:border-box;"></textarea>
    </div>
    <button type="submit"
      style="width:100%;padding:12px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
      Submit
    </button>
    <p id="vesta-msg" style="text-align:center;margin-top:12px;font-size:13px;display:none;"></p>
  </form>
</div>
<script>
document.getElementById('vesta-form').addEventListener('submit',async function(e){
  e.preventDefault();
  var b=this.querySelector('button');
  var m=document.getElementById('vesta-msg');
  b.disabled=true;b.textContent='Sending...';m.style.display='none';
  try{
    var d=Object.fromEntries(new FormData(this));
    var r=await fetch('${webhookUrl}',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer ${apiKey}'},
      body:JSON.stringify(d)
    });
    if(r.ok){
      m.style.color='#16a34a';m.textContent='Thank you! We\\'ll be in touch soon.';
      m.style.display='block';this.reset();
    }else{
      m.style.color='#dc2626';m.textContent='Something went wrong. Please try again.';
      m.style.display='block';
    }
  }catch(err){
    m.style.color='#dc2626';m.textContent='Something went wrong. Please try again.';
    m.style.display='block';
  }
  b.disabled=false;b.textContent='Submit';
});
</script>`
}

function generatePreviewHtml(): string {
    return `
    <form style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="margin-bottom:12px;">
            <input placeholder="Full Name" disabled
                style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;background:#f9fafb;" />
        </div>
        <div style="margin-bottom:12px;">
            <input placeholder="Email Address" disabled
                style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;background:#f9fafb;" />
        </div>
        <div style="margin-bottom:12px;">
            <input placeholder="Phone Number" disabled
                style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;background:#f9fafb;" />
        </div>
        <div style="margin-bottom:16px;">
            <textarea placeholder="Message" rows="3" disabled
                style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;resize:vertical;box-sizing:border-box;background:#f9fafb;"></textarea>
        </div>
        <button type="button" disabled
            style="width:100%;padding:12px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:not-allowed;opacity:0.8;">
            Submit
        </button>
    </form>`
}
