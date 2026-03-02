"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Tag as TagIcon } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { getTags } from "@/app/settings/tags/actions"

interface Tag {
    id: string;
    name: string;
    color: string;
}

export function TagPicker({
    selectedTagIds,
    onAdd,
    onRemove
}: {
    selectedTagIds: string[],
    onAdd: (tagId: string) => void,
    onRemove: (tagId: string) => void
}) {
    const [allTags, setAllTags] = useState<Tag[]>([])

    useEffect(() => {
        getTags().then(res => {
            if (res.success) setAllTags(res.tags as Tag[])
        })
    }, [])

    const availableTags = allTags.filter(t => !selectedTagIds.includes(t.id))
    const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id))

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
                {selectedTags.map(tag => (
                    <Badge
                        key={tag.id}
                        style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: `${tag.color}40` }}
                        className="flex items-center gap-1 pr-1 border"
                    >
                        {tag.name}
                        <button onClick={() => onRemove(tag.id)} className="hover:bg-black/5 rounded-full p-0.5">
                            <X className="h-2.5 w-2.5" />
                        </button>
                    </Badge>
                ))}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/30">
                            <Plus className="h-2.5 w-2.5" />
                            Add Tag
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                        {availableTags.length === 0 ? (
                            <div className="p-2 text-xs text-muted-foreground text-center italic">No more tags</div>
                        ) : (
                            availableTags.map(tag => (
                                <DropdownMenuItem key={tag.id} onClick={() => onAdd(tag.id)} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                    {tag.name}
                                </DropdownMenuItem>
                            ))
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
