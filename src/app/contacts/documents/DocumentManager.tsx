"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    FileText,
    Plus,
    Trash2,
    Link as LinkIcon,
    ExternalLink,
    Loader2,
    Calendar,
    CheckCircle2,
    Clock
} from "lucide-react"
import { getContactDocuments, addDocument, deleteDocument, updateDocumentStatus } from "./actions"

interface Document {
    id: string;
    name: string;
    url: string;
    status: string;
    createdAt: string;
}

export function DocumentManager({ contactId }: { contactId: string }) {
    const [documents, setDocuments] = useState<Document[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [newName, setNewName] = useState("")
    const [newUrl, setNewUrl] = useState("")
    const [isSaving, setIsSaving] = useState(false)

    const fetchDocs = async () => {
        setIsLoading(true)
        const res = await getContactDocuments(contactId)
        if (res.success) setDocuments(res.documents as unknown as Document[])
        setIsLoading(false)
    }

    useEffect(() => {
        if (contactId) fetchDocs()
    }, [contactId])

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim() || !newUrl.trim()) return

        setIsSaving(true)
        const res = await addDocument(contactId, newName.trim(), newUrl.trim())
        if (res.success) {
            setNewName("")
            setNewUrl("")
            setIsAdding(false)
            fetchDocs()
        } else {
            alert(res.error)
        }
        setIsSaving(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this document link?")) return
        const res = await deleteDocument(contactId, id)
        if (res.success) fetchDocs()
    }

    const toggleStatus = async (doc: Document) => {
        const nextStatus = doc.status === "LINK" ? "PENDING" : doc.status === "PENDING" ? "SIGNED" : "LINK"
        const res = await updateDocumentStatus(contactId, doc.id, nextStatus)
        if (res.success) fetchDocs()
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "SIGNED": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            case "PENDING": return <Clock className="h-4 w-4 text-amber-500" />
            default: return <LinkIcon className="h-4 w-4 text-blue-500" />
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "SIGNED": return "Signed"
            case "PENDING": return "Pending Signature"
            default: return "Link"
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Upload & Links</h3>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50/50"
                    onClick={() => setIsAdding(!isAdding)}
                >
                    {isAdding ? "Cancel" : <><Plus className="h-3.5 w-3.5 mr-1" /> Add New</>}
                </Button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="p-4 rounded-xl border border-blue-200/20 bg-blue-50/5 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <Input
                            placeholder="Document Name (e.g. Orders, Flight Itinerary)"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="h-9 text-sm"
                            required
                        />
                        <Input
                            placeholder="URL (Google Drive, Dropbox, etc.)"
                            value={newUrl}
                            onChange={e => setNewUrl(e.target.value)}
                            className="h-9 text-sm"
                            type="url"
                            required
                        />
                    </div>
                    <div className="flex justify-end pt-1">
                        <Button size="sm" type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                            Save Link
                        </Button>
                    </div>
                </form>
            )}

            <div className="space-y-2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
                    </div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-10 px-4 border border-dashed rounded-xl bg-muted/5">
                        <FileText className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No custom documents linked yet.</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Add orders, itineraries, or waivers here.</p>
                    </div>
                ) : (
                    documents.map((doc) => (
                        <div key={doc.id} className="group relative flex items-center justify-between p-3 rounded-xl border bg-background hover:bg-muted/10 transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 rounded-lg bg-muted shrink-0">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium truncate pr-4">{doc.name}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <button
                                            onClick={() => toggleStatus(doc)}
                                            className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-tight hover:opacity-80 transition-opacity"
                                        >
                                            {getStatusIcon(doc.status)}
                                            <span className={
                                                doc.status === "SIGNED" ? "text-emerald-600" :
                                                    doc.status === "PENDING" ? "text-amber-600" : "text-blue-600"
                                            }>
                                                {getStatusLabel(doc.status)}
                                            </span>
                                        </button>
                                        <span className="text-[10px] text-muted-foreground/40">•</span>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-2.5 w-2.5" />
                                            {new Date(doc.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDelete(doc.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
