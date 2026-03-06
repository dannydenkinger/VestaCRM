"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, GripVertical, Lightbulb } from "lucide-react"

interface KeyTakeawaysEditorProps {
    takeaways: string[]
    onChange: (takeaways: string[]) => void
}

export default function KeyTakeawaysEditor({ takeaways, onChange }: KeyTakeawaysEditorProps) {
    const addTakeaway = () => {
        onChange([...takeaways, ""])
    }

    const updateTakeaway = (index: number, value: string) => {
        const updated = [...takeaways]
        updated[index] = value
        onChange(updated)
    }

    const removeTakeaway = (index: number) => {
        onChange(takeaways.filter((_, i) => i !== index))
    }

    return (
        <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        <CardTitle className="text-sm font-semibold">Key Takeaways</CardTitle>
                        <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                            {takeaways.length} item{takeaways.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addTakeaway}>
                        <Plus className="h-3 w-3" />
                        Add
                    </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                    Displayed as a highlighted box at the top of the article. Aim for 3-5 concise points.
                </p>
            </CardHeader>
            <CardContent className="space-y-2">
                {takeaways.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                        <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">No takeaways yet. Add at least 3 for best SEO.</p>
                    </div>
                )}
                {takeaways.map((takeaway, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                        <span className="text-[10px] font-bold text-amber-500 w-4">{index + 1}.</span>
                        <Input
                            value={takeaway}
                            onChange={(e) => updateTakeaway(index, e.target.value)}
                            placeholder="Enter key takeaway..."
                            className="h-8 text-xs flex-1"
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeTakeaway(index)}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
