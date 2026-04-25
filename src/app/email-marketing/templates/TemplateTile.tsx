"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react"
import { deleteTemplateAction } from "../actions"

interface Props {
    template: {
        id: string
        name: string
        subject: string
        description?: string
        updatedAt: string
    }
}

export function TemplateTile({ template }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [removed, setRemoved] = useState(false)

    const handleDelete = () => {
        if (
            !confirm(
                `Delete "${template.name}"? This can't be undone — campaigns referencing it will keep their saved HTML.`,
            )
        ) {
            return
        }
        startTransition(async () => {
            const result = await deleteTemplateAction(template.id)
            if (!result.success) {
                toast.error(result.error || "Failed to delete")
                return
            }
            setRemoved(true)
            toast.success("Template deleted")
            router.refresh()
        })
    }

    if (removed) return null

    return (
        <Card
            className={`relative group transition-all duration-150 h-full overflow-hidden ${
                isPending
                    ? "opacity-60"
                    : "hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40"
            }`}
        >
            <Link href={`/email-marketing/templates/${template.id}`} className="block">
                <CardHeader className="pb-2 pr-12">
                    <CardTitle className="text-base truncate">{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground truncate">
                        {template.subject || "(no subject)"}
                    </div>
                    {template.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {template.description}
                        </div>
                    )}
                    <div className="mt-3 text-[11px] text-muted-foreground">
                        Updated {new Date(template.updatedAt).toLocaleDateString()}
                    </div>
                </CardContent>
            </Link>

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-background/80 backdrop-blur"
                            onClick={(e) => e.stopPropagation()}
                            disabled={isPending}
                        >
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <MoreHorizontal className="w-4 h-4" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <DropdownMenuItem
                            onSelect={() =>
                                router.push(`/email-marketing/templates/${template.id}`)
                            }
                        >
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={handleDelete}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </Card>
    )
}
