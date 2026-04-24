"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, ListPlus } from "lucide-react"
import { saveListAction } from "../actions"

export function NewListForm() {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")

    const handleSave = () => {
        if (!name.trim()) {
            toast.error("Name is required")
            return
        }
        startTransition(async () => {
            const result = await saveListAction({
                name: name.trim(),
                description: description.trim() || undefined,
            })
            if (!result.success || !result.list) {
                toast.error(result.error || "Failed to create list")
                return
            }
            toast.success("List created")
            router.push(`/email-marketing/lists/${result.list.id}`)
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>List details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Monthly newsletter subscribers"
                        disabled={isPending}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="People who opted in via the website"
                        disabled={isPending}
                    />
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isPending || !name.trim()}>
                        {isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <ListPlus className="w-4 h-4 mr-2" />
                        )}
                        Create list
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
