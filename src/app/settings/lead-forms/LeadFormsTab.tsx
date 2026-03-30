"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
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
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [newFormName, setNewFormName] = useState("")
    const [creating, setCreating] = useState(false)

    useEffect(() => { loadForms() }, [])

    async function loadForms() {
        setLoading(true)
        const data = await getLeadForms()
        setForms(data)
        setLoading(false)
    }

    async function handleCreate() {
        if (!newFormName.trim()) {
            toast.error("Please enter a form name")
            return
        }
        setCreating(true)
        try {
            const res = await createLeadForm(newFormName.trim())
            toast.success("Form created")
            setShowCreateDialog(false)
            setNewFormName("")
            setEditingFormId(res.formId)
            loadForms()
        } catch (err: any) {
            toast.error(err.message || "Failed to create form")
        }
        setCreating(false)
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
        <>
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
                            onCreate={() => setShowCreateDialog(true)}
                            onRefresh={loadForms}
                        />
                    )}
                </CardContent>
            </Card>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Form</DialogTitle>
                        <DialogDescription>
                            Give your form a name. You can customize everything in the builder.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label>Form Name</Label>
                            <Input
                                value={newFormName}
                                onChange={e => setNewFormName(e.target.value)}
                                placeholder="e.g., Contact Form, Get a Quote, Book a Call"
                                onKeyDown={e => e.key === "Enter" && handleCreate()}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={creating || !newFormName.trim()}>
                            {creating ? "Creating..." : "Create Form"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
