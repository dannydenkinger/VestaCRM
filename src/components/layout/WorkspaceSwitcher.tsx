"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { getUserWorkspaces } from "@/app/settings/users/workspace-actions"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Workspace {
    id: string
    name: string
    role: string
}

export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
    const { data: session, update } = useSession()
    const router = useRouter()
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [switching, setSwitching] = useState(false)

    const currentWorkspaceId = session?.user?.workspaceId
    const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId)

    useEffect(() => {
        getUserWorkspaces().then(setWorkspaces).catch(() => {})
    }, [])

    const handleSwitch = async (workspaceId: string) => {
        if (workspaceId === currentWorkspaceId || switching) return
        setSwitching(true)
        try {
            await update({ workspaceId })
            router.refresh()
        } catch (err) {
            console.error("Failed to switch workspace:", err)
        } finally {
            setSwitching(false)
        }
    }

    // Only show switcher if user has multiple workspaces
    if (workspaces.length <= 1) return null

    if (collapsed) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-secondary/50 mx-auto mb-2" title={currentWorkspace?.name || "Switch workspace"}>
                        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-56">
                    {workspaces.map(ws => (
                        <DropdownMenuItem key={ws.id} onClick={() => handleSwitch(ws.id)} disabled={switching}>
                            <span className="flex-1 truncate">{ws.name}</span>
                            {ws.id === currentWorkspaceId && <Check className="h-4 w-4 ml-2 text-primary" />}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-secondary/50 text-xs text-muted-foreground mb-2">
                    <span className="truncate flex-1 text-left">{currentWorkspace?.name || "Workspace"}</span>
                    <ChevronsUpDown className="h-3 w-3 shrink-0" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                {workspaces.map(ws => (
                    <DropdownMenuItem key={ws.id} onClick={() => handleSwitch(ws.id)} disabled={switching}>
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="truncate text-sm">{ws.name}</span>
                            <span className="text-xs text-muted-foreground capitalize">{ws.role.toLowerCase()}</span>
                        </div>
                        {ws.id === currentWorkspaceId && <Check className="h-4 w-4 ml-2 text-primary shrink-0" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
