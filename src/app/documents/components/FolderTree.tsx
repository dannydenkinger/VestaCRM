"use client"

import { useState } from "react"
import {
    ChevronRight, ChevronDown, Folder, FolderOpen, FolderPlus,
    MoreHorizontal, Pencil, Trash2, Plus,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDroppable } from "@dnd-kit/core"

// ── Types ──

export interface FolderNode {
    name: string
    path: string
    children: FolderNode[]
    documentCount: number
}

interface FolderTreeProps {
    folders: FolderNode[]
    activePath: string
    totalCount: number
    onSelectFolder: (path: string) => void
    onCreateFolder: (parentPath: string, name: string) => void
    onRenameFolder: (path: string, newName: string) => void
    onDeleteFolder: (path: string) => void
}

// ── Build tree from flat folder list ──

export function buildFolderTree(
    folders: { path: string; name: string }[],
    documentCounts: Record<string, number>
): FolderNode[] {
    const nodeMap = new Map<string, FolderNode>()

    // Sort by depth so parents are processed first
    const sorted = [...folders].sort((a, b) => {
        const aDepth = a.path.split("/").filter(Boolean).length
        const bDepth = b.path.split("/").filter(Boolean).length
        return aDepth - bDepth || a.path.localeCompare(b.path)
    })

    const roots: FolderNode[] = []

    for (const folder of sorted) {
        const node: FolderNode = {
            name: folder.name,
            path: folder.path,
            children: [],
            documentCount: documentCounts[folder.path] || 0,
        }
        nodeMap.set(folder.path, node)

        const parentPath = folder.path.slice(0, folder.path.lastIndexOf("/")) || "/"
        const parent = nodeMap.get(parentPath)
        if (parent) {
            parent.children.push(node)
        } else {
            roots.push(node)
        }
    }

    return roots
}

// ── Droppable Folder Node ──

function DroppableFolderItem({
    node,
    activePath,
    expanded,
    onToggle,
    onSelect,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
    depth,
}: {
    node: FolderNode
    activePath: string
    expanded: Set<string>
    onToggle: (path: string) => void
    onSelect: (path: string) => void
    onCreateFolder: (parentPath: string, name: string) => void
    onRenameFolder: (path: string, newName: string) => void
    onDeleteFolder: (path: string) => void
    depth: number
}) {
    const [renaming, setRenaming] = useState(false)
    const [renameValue, setRenameValue] = useState(node.name)
    const [creating, setCreating] = useState(false)
    const [newFolderName, setNewFolderName] = useState("")

    const isExpanded = expanded.has(node.path)
    const isActive = activePath === node.path
    const hasChildren = node.children.length > 0

    const { setNodeRef, isOver } = useDroppable({ id: `folder:${node.path}` })

    const handleRename = () => {
        if (renameValue.trim() && renameValue !== node.name) {
            onRenameFolder(node.path, renameValue.trim())
        }
        setRenaming(false)
    }

    const handleCreateChild = () => {
        if (newFolderName.trim()) {
            onCreateFolder(node.path, newFolderName.trim())
            setNewFolderName("")
            setCreating(false)
            if (!isExpanded) onToggle(node.path)
        }
    }

    return (
        <div ref={setNodeRef}>
            <div
                role="button"
                tabIndex={0}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer group ${
                    isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : isOver
                        ? "bg-primary/5 border border-primary/30"
                        : "hover:bg-muted/50 text-foreground"
                }`}
                style={{ paddingLeft: `${8 + depth * 16}px` }}
                onClick={() => onSelect(node.path)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(node.path) } }}
            >
                <button
                    className="shrink-0 p-0.5 hover:bg-muted rounded"
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggle(node.path)
                    }}
                >
                    {hasChildren ? (
                        isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                    ) : (
                        <span className="w-3" />
                    )}
                </button>

                {isActive || isExpanded ? (
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                ) : (
                    <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500/70" />
                )}

                {renaming ? (
                    <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename()
                            if (e.key === "Escape") setRenaming(false)
                            e.stopPropagation()
                        }}
                        className="h-5 text-xs flex-1 px-1 py-0"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className="truncate flex-1">{node.name}</span>
                )}

                {node.documentCount > 0 && !renaming && (
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">{node.documentCount}</span>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="shrink-0 p-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreHorizontal className="h-3 w-3" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setCreating(true); if (!isExpanded) onToggle(node.path) }}>
                            <Plus className="h-3 w-3 mr-2" /> New Subfolder
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenaming(true); setRenameValue(node.name) }}>
                            <Pencil className="h-3 w-3 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteFolder(node.path) }}>
                            <Trash2 className="h-3 w-3 mr-2" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Inline new subfolder input */}
            {creating && (
                <div className="flex items-center gap-1 py-1" style={{ paddingLeft: `${24 + depth * 16}px` }}>
                    <FolderPlus className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Input
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onBlur={() => { if (!newFolderName.trim()) setCreating(false) }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateChild()
                            if (e.key === "Escape") { setCreating(false); setNewFolderName("") }
                        }}
                        placeholder="Folder name..."
                        className="h-5 text-xs flex-1 px-1 py-0"
                        autoFocus
                    />
                </div>
            )}

            {/* Children */}
            {isExpanded && node.children.map(child => (
                <DroppableFolderItem
                    key={child.path}
                    node={child}
                    activePath={activePath}
                    expanded={expanded}
                    onToggle={onToggle}
                    onSelect={onSelect}
                    onCreateFolder={onCreateFolder}
                    onRenameFolder={onRenameFolder}
                    onDeleteFolder={onDeleteFolder}
                    depth={depth + 1}
                />
            ))}
        </div>
    )
}

// ── Main FolderTree Component ──

export function FolderTree({
    folders,
    activePath,
    totalCount,
    onSelectFolder,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
}: FolderTreeProps) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set(["/"]));
    const [creatingRoot, setCreatingRoot] = useState(false)
    const [newRootName, setNewRootName] = useState("")

    const { setNodeRef: setAllRef, isOver: isOverAll } = useDroppable({ id: "folder:/" })

    const toggleExpanded = (path: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            if (next.has(path)) next.delete(path)
            else next.add(path)
            return next
        })
    }

    const handleCreateRoot = () => {
        if (newRootName.trim()) {
            onCreateFolder("/", newRootName.trim())
            setNewRootName("")
            setCreatingRoot(false)
        }
    }

    return (
        <div className="py-1 text-sm">
            {/* All Documents root */}
            <div
                ref={setAllRef}
                role="button"
                tabIndex={0}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                    activePath === "/"
                        ? "bg-primary/10 text-primary font-medium"
                        : isOverAll
                        ? "bg-primary/5"
                        : "hover:bg-muted/50"
                }`}
                onClick={() => onSelectFolder("/")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectFolder("/") } }}
            >
                <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1">All Documents</span>
                <span className="text-[10px] text-muted-foreground/60">{totalCount}</span>
            </div>

            {/* Folder tree */}
            {folders.map(node => (
                <DroppableFolderItem
                    key={node.path}
                    node={node}
                    activePath={activePath}
                    expanded={expanded}
                    onToggle={toggleExpanded}
                    onSelect={onSelectFolder}
                    onCreateFolder={onCreateFolder}
                    onRenameFolder={onRenameFolder}
                    onDeleteFolder={onDeleteFolder}
                    depth={0}
                />
            ))}

            {/* Create root folder */}
            {creatingRoot ? (
                <div className="flex items-center gap-1 px-3 py-1">
                    <FolderPlus className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Input
                        value={newRootName}
                        onChange={(e) => setNewRootName(e.target.value)}
                        onBlur={() => { if (!newRootName.trim()) setCreatingRoot(false) }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateRoot()
                            if (e.key === "Escape") { setCreatingRoot(false); setNewRootName("") }
                        }}
                        placeholder="Folder name..."
                        className="h-5 text-xs flex-1 px-1 py-0"
                        autoFocus
                    />
                </div>
            ) : (
                <button
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                    onClick={() => setCreatingRoot(true)}
                >
                    <FolderPlus className="h-3 w-3" />
                    New Folder
                </button>
            )}
        </div>
    )
}
