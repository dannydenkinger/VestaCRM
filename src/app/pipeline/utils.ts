/** Compute days a deal has been in its current stage and return color info */
export function getAgingInfo(deal: any): { days: number; color: string; bgClass: string; label: string } {
    const enteredAt = deal.stageEnteredAt ? new Date(deal.stageEnteredAt) : null
    if (!enteredAt) return { days: 0, color: "bg-emerald-500", bgClass: "border-l-emerald-500", label: "Just entered" }
    const now = new Date()
    const days = Math.max(0, Math.floor((now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24)))
    if (days <= 7) return { days, color: "bg-emerald-500", bgClass: "border-l-emerald-500", label: `In this stage for ${days} day${days !== 1 ? "s" : ""}` }
    if (days <= 14) return { days, color: "bg-amber-400", bgClass: "border-l-amber-400", label: `In this stage for ${days} days` }
    if (days <= 30) return { days, color: "bg-orange-500", bgClass: "border-l-orange-500", label: `In this stage for ${days} days` }
    return { days, color: "bg-red-500", bgClass: "border-l-red-500", label: `In this stage for ${days} days` }
}

/** Compute priority color class for a deal based on dates */
export function getPriorityColor(deal: any, urgentDays = 7, soonDays = 14): { colorClass: string; label: string } {
    if (!deal.startDate || deal.startDate === "-") {
        if (deal.priority === "HIGH") return { colorClass: "bg-red-500", label: "HIGH" }
        if (deal.priority === "MEDIUM") return { colorClass: "bg-amber-500", label: "MEDIUM" }
        return { colorClass: "bg-blue-500", label: "" }
    }
    const start = new Date(deal.startDate)
    const end = deal.endDate && deal.endDate !== "-" ? new Date(deal.endDate) : null
    const now = new Date()
    const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (end && now > end) return { colorClass: "bg-gray-500", label: "EXPIRED" }
    if (now >= start && (!end || now <= end)) return { colorClass: "bg-emerald-500", label: "ACTIVE" }
    if (diffDays <= urgentDays) return { colorClass: "bg-red-500", label: "URGENT" }
    if (diffDays <= soonDays) return { colorClass: "bg-yellow-500", label: "SOON" }
    return { colorClass: "bg-blue-500", label: "PLANNED" }
}

export function getLengthOfStay(start: string, end: string) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "-"
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return `${diffDays} days`
}

export function formatDisplayDate(dateStr: string) {
    if (!dateStr) return "-";
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dateStr;
}
