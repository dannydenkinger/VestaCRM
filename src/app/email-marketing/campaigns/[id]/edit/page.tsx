import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-guard"
import { getCampaign } from "@/lib/campaigns/campaigns"
import { listTemplates } from "@/lib/campaigns/templates"
import { getBalance } from "@/lib/credits/email-credits"
import { getIdentity } from "@/lib/ses/identities"
import { CampaignBuilder } from "../../../CampaignBuilder"

export const dynamic = "force-dynamic"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditCampaignPage({ params }: PageProps) {
    const { id } = await params
    const session = await requireAuth()
    const workspaceId = (session.user as { workspaceId: string }).workspaceId

    const campaign = await getCampaign(workspaceId, id)
    if (!campaign) notFound()
    if (campaign.status !== "draft") {
        return (
            <div className="container mx-auto max-w-3xl py-10 px-4">
                <p>Only drafts can be edited. This campaign is <strong>{campaign.status}</strong>.</p>
            </div>
        )
    }

    const [templates, balance, identity] = await Promise.all([
        listTemplates(workspaceId),
        getBalance(workspaceId),
        getIdentity(workspaceId),
    ])

    const allowedAudience: "all_contacts" | "by_tag" =
        campaign.audienceType === "by_tag" ? "by_tag" : "all_contacts"

    return (
        <div className="container mx-auto max-w-5xl py-10 px-4 space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Edit campaign</h1>
            </div>
            <CampaignBuilder
                initialCampaign={{
                    id: campaign.id,
                    name: campaign.name,
                    subject: campaign.subject,
                    templateId: campaign.templateId,
                    renderedHtml: campaign.renderedHtml,
                    audienceType: allowedAudience,
                    audienceValue: campaign.audienceValue,
                }}
                templates={templates.map((t) => ({
                    id: t.id,
                    name: t.name,
                    subject: t.subject,
                    renderedHtml: t.renderedHtml,
                }))}
                balance={balance}
                sesReady={identity?.status === "VERIFIED"}
            />
        </div>
    )
}
