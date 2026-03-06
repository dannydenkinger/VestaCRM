"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, GripVertical, HelpCircle } from "lucide-react"
import type { FAQ } from "./types"

interface FAQEditorProps {
    faqs: FAQ[]
    onChange: (faqs: FAQ[]) => void
}

export default function FAQEditor({ faqs, onChange }: FAQEditorProps) {
    const addFAQ = () => {
        onChange([
            ...faqs,
            {
                id: crypto.randomUUID(),
                question: "",
                answer: "",
            },
        ])
    }

    const updateFAQ = (id: string, field: "question" | "answer", value: string) => {
        onChange(faqs.map((faq) => (faq.id === id ? { ...faq, [field]: value } : faq)))
    }

    const removeFAQ = (id: string) => {
        onChange(faqs.filter((faq) => faq.id !== id))
    }

    return (
        <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-semibold">FAQ Section</CardTitle>
                        <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                            {faqs.length} question{faqs.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addFAQ}>
                        <Plus className="h-3 w-3" />
                        Add FAQ
                    </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                    Add frequently asked questions. These generate FAQPage schema markup for rich snippets.
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {faqs.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                        <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">No FAQs added yet. Add at least 3 for best SEO.</p>
                    </div>
                )}
                {faqs.map((faq, index) => (
                    <div
                        key={faq.id}
                        className="p-3 rounded-lg border border-border/50 bg-background/30 space-y-2"
                    >
                        <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                            <span className="text-[10px] font-bold text-muted-foreground w-5">Q{index + 1}</span>
                            <Input
                                value={faq.question}
                                onChange={(e) => updateFAQ(faq.id, "question", e.target.value)}
                                placeholder="Enter question..."
                                className="h-8 text-xs flex-1"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeFAQ(faq.id)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="pl-11">
                            <Textarea
                                value={faq.answer}
                                onChange={(e) => updateFAQ(faq.id, "answer", e.target.value)}
                                placeholder="Enter answer..."
                                className="text-xs min-h-[60px] resize-none"
                                rows={2}
                            />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
