import { BetaAnalyticsDataClient } from "@google-analytics/data";

/**
 * Google Analytics 4 (GA4) Data API Client
 * 
 * Requirements:
 * 1. GA_PROPERTY_ID
 * 2. GA_CLIENT_EMAIL
 * 3. GA_PRIVATE_KEY
 */

const propertyId = process.env.GA_PROPERTY_ID;
const clientEmail = process.env.GA_CLIENT_EMAIL;
const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, "\n");

export const gaClient = new BetaAnalyticsDataClient({
    credentials: {
        client_email: clientEmail,
        private_key: privateKey,
    },
});

export async function getTrafficMetrics(days: number = 7) {
    if (!propertyId || !clientEmail || !privateKey) {
        console.warn("GA4 credentials missing. Returning mock data.");
        return null;
    }

    try {
        const [response] = await gaClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [
                {
                    startDate: `${days}daysAgo`,
                    endDate: "today",
                },
            ],
            dimensions: [
                {
                    name: "date",
                },
            ],
            metrics: [
                {
                    name: "sessions",
                },
                {
                    name: "activeUsers",
                },
                {
                    name: "conversions",
                },
            ],
            orderBys: [
                {
                    dimension: {
                        dimensionName: "date",
                    },
                },
            ],
        });

        return response.rows?.map(row => ({
            date: row.dimensionValues?.[0]?.value,
            sessions: parseInt(row.metricValues?.[0]?.value || "0"),
            users: parseInt(row.metricValues?.[1]?.value || "0"),
            conversions: parseInt(row.metricValues?.[2]?.value || "0"),
        })) || [];
    } catch (error) {
        console.error("Error fetching GA4 metrics:", error);
        return null;
    }
}

export async function getTrafficSources(days: number = 30) {
    if (!propertyId || !clientEmail || !privateKey) return null;

    try {
        const [response] = await gaClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [
                {
                    startDate: `${days}daysAgo`,
                    endDate: "today",
                },
            ],
            dimensions: [
                {
                    name: "sessionSource",
                },
            ],
            metrics: [
                {
                    name: "sessions",
                },
            ],
        });

        return response.rows?.map(row => ({
            source: row.dimensionValues?.[0]?.value,
            value: parseInt(row.metricValues?.[0]?.value || "0"),
        })) || [];
    } catch (error) {
        console.error("Error fetching GA4 sources:", error);
        return null;
    }
}

export async function getCoreMetrics(days: number = 7) {
    if (!propertyId || !clientEmail || !privateKey) return null;

    try {
        const [response] = await gaClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
            metrics: [
                { name: "activeUsers" },
                { name: "averageSessionDuration" },
                { name: "sessions" },
                { name: "conversions" },
            ],
        });

        const row = response.rows?.[0];
        if (!row) return null;

        // Fetch organic traffic for percentage calculation
        const [organicResponse] = await gaClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
            dimensions: [{ name: "sessionDefaultChannelGroup" }],
            metrics: [{ name: "sessions" }],
        });

        let organicSessions = 0;
        let totalSessions = 0;

        organicResponse.rows?.forEach(r => {
            const count = parseInt(r.metricValues?.[0]?.value || "0");
            totalSessions += count;
            if (r.dimensionValues?.[0]?.value === "Organic Search") {
                organicSessions += count;
            }
        });

        return {
            totalUsers: parseInt(row.metricValues?.[0]?.value || "0"),
            avgSessionDuration: parseFloat(row.metricValues?.[1]?.value || "0"),
            totalSessions: parseInt(row.metricValues?.[2]?.value || "0"),
            totalConversions: parseInt(row.metricValues?.[3]?.value || "0"),
            organicPercentage: totalSessions > 0 ? (organicSessions / totalSessions) * 100 : 0,
        };
    } catch (error) {
        console.error("Error fetching core GA4 metrics:", error);
        return null;
    }
}
