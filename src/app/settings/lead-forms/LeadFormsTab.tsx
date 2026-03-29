"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"
import { toast } from "sonner"
import { getLeadForms, createLeadForm } from "./actions"
import { FormList } from "./FormList"
import { FormBuilder } from "./FormBuilder"
import type { LeadForm } from "./types"

export function LeadFormsTab() {
    const [forms, setForms] = useState<LeadForm[]>([])
    const [loading, setLoading] = useState(true)
    const [editingFormId, setEditingFormId] = useState<string | null>(null)

    useEffect(() => { loadForms() }, [])

    async function loadForms() {
        setLoading(true)
        const data = await getLeadForms()
        setForms(data)
        setLoading(false)
    }

    async function handleCreate() {
        const name = prompt("Form name:", "Contact Form")
        if (!name?.trim()) return
        try {
            const res = await createLeadForm(name.trim())
            toast.success("Form created")
            setEditingFormId(res.formId)
            loadForms()
        } catch (err: any) {
            toast.error(err.message || "Failed to create form")
        }
    }

    if (editingFormId) {
        return (
            <FormBuilder
                formId={editingFormId}
                onBack={() => { setEditingFormId(null); loadForms() }}
            />
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Lead Forms
                </CardTitle>
                <CardDescription>
                    Create customizable lead capture forms. Share them as links or embed on your website.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">Loading forms...</div>
                ) : (
                    <FormList
                        forms={forms}
                        onEdit={setEditingFormId}
                        onCreate={handleCreate}
                        onRefresh={loadForms}
                    />
                )}
            </CardContent>
        </Card>
    )
}
