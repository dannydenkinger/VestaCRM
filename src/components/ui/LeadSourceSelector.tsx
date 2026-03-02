"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getLeadSources } from "@/app/settings/leadsources/actions"

interface LeadSource {
    id: string;
    name: string;
}

export function LeadSourceSelector({ value, onChange }: { value: string | null, onChange: (val: string) => void }) {
    const [sources, setSources] = useState<LeadSource[]>([])

    useEffect(() => {
        getLeadSources().then(res => {
            if (res.success) setSources(res.sources as LeadSource[])
        })
    }, [])

    return (
        <Select value={value || "0"} onValueChange={onChange}>
            <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select a lead source" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="0">No Source</SelectItem>
                {sources.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
