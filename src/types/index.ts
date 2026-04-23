export interface Contact {
    id: string
    name: string
    email: string
    phone: string
    status: string
    tags: string[]
    leadSource: string
    assigneeId: string | null
    notes: string
    createdAt: string
    updatedAt: string
    [key: string]: any // allow extra fields for flexibility
}

export type DealStatus = "open" | "closed_won" | "closed_lost" | "archive"

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
    open: "Open",
    closed_won: "Closed (Won)",
    closed_lost: "Closed (Lost)",
    archive: "Archived",
}

export const DEAL_STATUS_COLORS: Record<DealStatus, string> = {
    open: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    closed_won: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    closed_lost: "bg-red-500/10 text-red-600 border-red-500/20",
    archive: "bg-gray-500/10 text-gray-600 border-gray-500/20",
}

export interface Opportunity {
    id: string
    name: string
    email: string
    phone: string
    stage: string
    status: DealStatus
    priority: string
    startDate: string
    endDate: string
    value: number
    margin: number
    notes: string
    assigneeId: string | null
    contactId: string | null
    tags: string[]
    expenses?: {
        monthlyCost: number
        cleaningFee: number
        otherFee: number
        deposit: number
    }
    unread?: boolean
    lastSeenAt?: string
    createdAt: string
    updatedAt: string
    [key: string]: any
}

export interface Pipeline {
    name: string
    stages: PipelineStage[]
    deals: Opportunity[]
}

export interface PipelineStage {
    id: string
    name: string
    order: number
}

export interface TimelineItem {
    id: string
    type: string
    content: string
    createdAt: string
    userId?: string
    userName?: string
}

export interface AppUser {
    id: string
    name: string
    email: string
    role: string
    image?: string
}

export interface Notification {
    id: string
    title: string
    message: string
    type: string
    linkUrl: string | null
    isRead: boolean
    createdAt: string | null
}

export type MarketingTier = "none" | "basic" | "pro"

export interface WorkspaceDoc {
    id: string
    name: string
    slug: string
    ownerId: string
    plan: string
    status: string
    memberCount: number
    contactCount: number
    email_credit_balance: number
    marketing_tier: MarketingTier
    createdAt: Date | string
    updatedAt: Date | string
}

export type ActivitySource = "ses" | "zernio" | "system"

export type ActivityType =
    | "email_sent"
    | "email_bounced"
    | "email_opened"
    | "email_clicked"
    | "social_post_scheduled"
    | "social_post_published"
    | "social_post_failed"
    | "social_post_canceled"

export interface Activity {
    id: string
    workspaceId: string
    type: ActivityType
    source: ActivitySource
    contactId?: string | null
    subject: string
    body?: string
    metadata?: Record<string, unknown>
    sourceRef?: string
    createdAt: string
}

export type EmailLogStatus = "sent" | "bounced" | "complained" | "failed" | "delivered"

export interface EmailLog {
    id: string
    workspaceId: string
    campaignId?: string | null
    contactId?: string | null
    to: string
    fromAddress: string
    subject: string
    messageId?: string
    status: EmailLogStatus
    errorMessage?: string
    sentAt: string
    deliveredAt?: string
    bouncedAt?: string
    openedAt?: string
    clickedAt?: string
}

export interface EmailTemplate {
    id: string
    workspaceId: string
    name: string
    description?: string
    subject: string
    topolJson: Record<string, unknown> | null
    renderedHtml: string
    createdBy: string | null
    createdAt: string
    updatedAt: string
}

export type CampaignAudienceType = "all_contacts" | "by_tag" | "by_ids"

export type CampaignStatus =
    | "draft"
    | "scheduled"
    | "sending"
    | "sent"
    | "sent_with_errors"
    | "failed"
    | "canceled"

export interface EmailCampaign {
    id: string
    workspaceId: string
    name: string
    subject: string
    templateId: string | null
    renderedHtml: string
    audienceType: CampaignAudienceType
    audienceValue: string[] | null
    status: CampaignStatus
    scheduledAt?: string
    stats: {
        targeted: number
        sent: number
        failed: number
        skipped: number
    }
    createdBy: string | null
    createdAt: string
    updatedAt: string
    sentAt?: string
}

export type SocialPlatform =
    | "facebook"
    | "instagram"
    | "twitter"
    | "linkedin"
    | "tiktok"
    | "pinterest"
    | "youtube"
    | "threads"

export interface SocialAccount {
    platform: SocialPlatform
    handle: string
    externalId: string
    connectedAt: string
}

export interface SocialConnection {
    id: string
    workspaceId: string
    zernioAccountId: string
    accounts: SocialAccount[]
    connectedAt: string
    updatedAt: string
}

export type SocialPostStatus =
    | "draft"
    | "scheduled"
    | "publishing"
    | "published"
    | "failed"
    | "canceled"

export interface SocialPost {
    id: string
    workspaceId: string
    zernioPostId: string | null
    platforms: SocialPlatform[]
    content: string
    mediaUrls: string[]
    scheduledAt: string | null
    publishedAt: string | null
    status: SocialPostStatus
    contactId: string | null
    errorMessage: string | null
    zernioAccountId: string | null
    createdBy: string | null
    createdAt: string
    updatedAt: string
}

export type CreditLedgerReason = "send" | "reserve" | "refund" | "topup" | "grant" | "adjust"

export interface CreditLedgerEntry {
    id: string
    workspaceId: string
    delta: number
    balanceAfter: number
    reason: CreditLedgerReason
    refId?: string
    note?: string
    createdAt: string
}
