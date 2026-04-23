import { requireAuth } from "@/lib/auth-guard"
import { TemplateEditor } from "../TemplateEditor"

export const dynamic = "force-dynamic"

export default async function NewTemplatePage() {
    const session = await requireAuth()
    const userId = (session.user as { id: string }).id

    return (
        <div className="container mx-auto max-w-6xl py-10 px-4 space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">New template</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Build a reusable email template. Use it as the starting point for campaigns.
                </p>
            </div>
            <TemplateEditor
                topolApiKey={process.env.NEXT_PUBLIC_TOPOL_API_KEY || null}
                topolUserId={`ws-${userId}`}
            />
        </div>
    )
}
