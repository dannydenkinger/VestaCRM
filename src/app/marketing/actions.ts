"use server"

import { getTrafficMetrics, getTrafficSources, getCoreMetrics } from "@/lib/ga4";

export async function fetchMarketingData(days: number = 7) {
    const trafficData = await getTrafficMetrics(days);
    const sourcesData = await getTrafficSources(30);
    const coreMetrics = await getCoreMetrics(days);

    return {
        traffic: trafficData,
        sources: sourcesData,
        kpis: coreMetrics,
    };
}
