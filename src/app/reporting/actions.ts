"use server"

import { tenantDb } from "@/lib/tenant-db"
import { requireAuth } from "@/lib/auth-guard"

export async function getReportingData() {
    try {
        const session = await requireAuth()
        const workspaceId = session.user.workspaceId
        const db = tenantDb(workspaceId)

        // 1. Total Closed Profit (assuming 'Booked' or similar stage means closed)
        // First we need to find the IDs of stages that mean "closed/booked"
        const stagesSnap = await db.collectionGroup('stages').get();
        const bookedStageIds = stagesSnap.docs
            .filter(doc => ['Booked', 'Closed', 'Signed', 'Closed Won'].includes(doc.data().name))
            .map(doc => doc.id);

        let totalProfit = 0;
        let bookedCount = 0;
        let totalOpportunitiesCount = 0;

        const oppsSnap = await db.collection('opportunities').get();
        totalOpportunitiesCount = oppsSnap.size;

        oppsSnap.forEach(doc => {
            const data = doc.data();
            if (data.status === "closed_won" || bookedStageIds.includes(data.pipelineStageId)) {
                bookedCount++;
                totalProfit += (data.estimatedProfit || 0);
            }
        });

        const avgProfit = bookedCount > 0 ? totalProfit / bookedCount : 0;

        // 2. Conversion Rate (Total Opportunities vs Booked)
        const conversionRate = totalOpportunitiesCount > 0 ? (bookedCount / totalOpportunitiesCount) * 100 : 0;

        // 3. SEO Keywords & Base Performance (aggregate from contacts)
        const contactsSnap = await db.collection('contacts').get();
        
        const keywordCounts: Record<string, number> = {};

        contactsSnap.forEach(doc => {
            const data = doc.data();
            if (data.sourceKeyword) {
                keywordCounts[data.sourceKeyword] = (keywordCounts[data.sourceKeyword] || 0) + 1;
            }
        });

        const topKeywords = Object.entries(keywordCounts)
            .map(([keyword, count]) => ({ keyword, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            success: true,
            data: {
                totalProfit,
                avgProfit,
                bookedCount,
                conversionRate,
                topKeywords
            }
        };
    } catch (error) {
        console.error("Reporting data error:", error);
        return { success: false, error: "Failed to fetch reporting data" };
    }
}
