"use client"

import { useState, useCallback, useRef } from "react"
import { PenLine, Type, Calendar, X, GripVertical } from "lucide-react"

// ── Types ──

export interface SignatureBlockData {
    id: string
    assignedTo: string      // signer email
    pageNumber: number      // 1-indexed
    x: number               // % from left (0-100)
    y: number               // % from top (0-100)
    width: number            // % of page width
    height: number           // % of page height
    type: "signature" | "initials" | "date"
    label?: string
    signed?: boolean
    signatureDataUrl?: string
}

// Color assignments per signer
const SIGNER_COLORS = [
    { bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
    { bg: "bg-green-500/20", border: "border-green-500", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
    { bg: "bg-purple-500/20", border: "border-purple-500", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
    { bg: "bg-orange-500/20", border: "border-orange-500", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
    { bg: "bg-pink-500/20", border: "border-pink-500", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
    { bg: "bg-cyan-500/20", border: "border-cyan-500", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
]

export function getSignerColor(email: string, signers: string[]) {
    const idx = signers.indexOf(email)
    return SIGNER_COLORS[idx >= 0 ? idx % SIGNER_COLORS.length : 0]
}

// ── Block Icons ──

function BlockTypeIcon({ type, className }: { type: SignatureBlockData["type"]; className?: string }) {
    switch (type) {
        case "signature": return <PenLine className={className} />
        case "initials": return <Type className={className} />
        case "date": return <Calendar className={className} />
    }
}

// ── Interactive Signature Block (for editor) ──

interface SignatureBlockProps {
    block: SignatureBlockData
    signers: string[]
    selected: boolean
    readOnly?: boolean
    onSelect: () => void
    onMove: (x: number, y: number) => void
    onResize: (width: number, height: number) => void
    onDelete: () => void
}

export function SignatureBlockComponent({
    block, signers, selected, readOnly, onSelect, onMove, onResize, onDelete,
}: SignatureBlockProps) {
    const color = getSignerColor(block.assignedTo, signers)
    const [dragging, setDragging] = useState(false)
    const [resizing, setResizing] = useState(false)
    const dragRef = useRef({ startX: 0, startY: 0, blockX: 0, blockY: 0 })
    const resizeRef = useRef({ startX: 0, startY: 0, blockW: 0, blockH: 0 })
    const containerRef = useRef<HTMLDivElement>(null)

    const getParentSize = useCallback(() => {
        const parent = containerRef.current?.parentElement
        if (!parent) return { w: 1, h: 1 }
        return { w: parent.clientWidth, h: parent.clientHeight }
    }, [])

    // ── Drag ──
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        if (readOnly) return
        e.preventDefault()
        e.stopPropagation()
        setDragging(true)
        onSelect()
        dragRef.current = { startX: e.clientX, startY: e.clientY, blockX: block.x, blockY: block.y }

        const handleMove = (ev: MouseEvent) => {
            const { w, h } = getParentSize()
            const dx = ((ev.clientX - dragRef.current.startX) / w) * 100
            const dy = ((ev.clientY - dragRef.current.startY) / h) * 100
            const newX = Math.max(0, Math.min(100 - block.width, dragRef.current.blockX + dx))
            const newY = Math.max(0, Math.min(100 - block.height, dragRef.current.blockY + dy))
            onMove(newX, newY)
        }
        const handleUp = () => {
            setDragging(false)
            window.removeEventListener("mousemove", handleMove)
            window.removeEventListener("mouseup", handleUp)
        }
        window.addEventListener("mousemove", handleMove)
        window.addEventListener("mouseup", handleUp)
    }, [block.x, block.y, block.width, block.height, readOnly, onSelect, onMove, getParentSize])

    // ── Resize ──
    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        if (readOnly) return
        e.preventDefault()
        e.stopPropagation()
        setResizing(true)
        resizeRef.current = { startX: e.clientX, startY: e.clientY, blockW: block.width, blockH: block.height }

        const handleMove = (ev: MouseEvent) => {
            const { w, h } = getParentSize()
            const dw = ((ev.clientX - resizeRef.current.startX) / w) * 100
            const dh = ((ev.clientY - resizeRef.current.startY) / h) * 100
            const newW = Math.max(8, Math.min(100 - block.x, resizeRef.current.blockW + dw))
            const newH = Math.max(3, Math.min(100 - block.y, resizeRef.current.blockH + dh))
            onResize(newW, newH)
        }
        const handleUp = () => {
            setResizing(false)
            window.removeEventListener("mousemove", handleMove)
            window.removeEventListener("mouseup", handleUp)
        }
        window.addEventListener("mousemove", handleMove)
        window.addEventListener("mouseup", handleUp)
    }, [block.width, block.height, block.x, block.y, readOnly, onResize, getParentSize])

    const emailLabel = block.assignedTo.split("@")[0]

    return (
        <div
            ref={containerRef}
            className={`absolute group ${color.bg} ${color.border} border-2 rounded transition-shadow ${
                selected ? "ring-2 ring-primary shadow-lg z-20" : "z-10"
            } ${dragging || resizing ? "opacity-80" : ""} ${readOnly ? "cursor-default" : "cursor-move"}`}
            style={{
                left: `${block.x}%`,
                top: `${block.y}%`,
                width: `${block.width}%`,
                height: `${block.height}%`,
            }}
            onClick={(e) => { e.stopPropagation(); onSelect() }}
            onMouseDown={handleDragStart}
            onKeyDown={(e) => { if (e.key === "Delete" || e.key === "Backspace") onDelete() }}
            tabIndex={0}
        >
            {/* Drag handle */}
            {!readOnly && (
                <div className="absolute -top-5 left-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className={`flex items-center gap-0.5 px-1 py-0.5 rounded-t text-[9px] font-medium ${color.bg} ${color.text}`}>
                        <GripVertical className="h-2.5 w-2.5" />
                        <BlockTypeIcon type={block.type} className="h-2.5 w-2.5" />
                        <span className="truncate max-w-[80px]">{emailLabel}</span>
                    </div>
                    <button
                        className="p-0.5 rounded-full bg-destructive/80 text-white hover:bg-destructive"
                        onClick={(e) => { e.stopPropagation(); onDelete() }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <X className="h-2.5 w-2.5" />
                    </button>
                </div>
            )}

            {/* Content */}
            <div className={`flex items-center justify-center h-full gap-1 ${color.text} select-none`}>
                {block.signed && block.signatureDataUrl ? (
                    <img src={block.signatureDataUrl} alt="Signature" className="max-w-full max-h-full object-contain" />
                ) : (
                    <>
                        <BlockTypeIcon type={block.type} className="h-3.5 w-3.5 opacity-50" />
                        <span className="text-[10px] opacity-60">
                            {block.type === "signature" ? "Sign here" : block.type === "initials" ? "Initials" : "Date"}
                        </span>
                    </>
                )}
            </div>

            {/* Resize handle */}
            {!readOnly && (
                <div
                    className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize opacity-0 group-hover:opacity-100"
                    onMouseDown={handleResizeStart}
                >
                    <svg viewBox="0 0 12 12" className="w-full h-full">
                        <path d="M10 2L2 10M10 6L6 10M10 10L10 10" stroke="currentColor" strokeWidth="1.5" className={color.text} />
                    </svg>
                </div>
            )}
        </div>
    )
}

// ── Read-Only Block (for signer view) ──

interface ReadOnlyBlockProps {
    block: SignatureBlockData
    signers: string[]
    isCurrentSigner: boolean
    onClick?: () => void
}

export function ReadOnlySignatureBlock({ block, signers, isCurrentSigner, onClick }: ReadOnlyBlockProps) {
    const color = isCurrentSigner ? getSignerColor(block.assignedTo, signers) : {
        bg: "bg-gray-500/10", border: "border-gray-400/50", text: "text-gray-500", dot: "bg-gray-400",
    }

    return (
        <div
            className={`absolute ${color.bg} ${color.border} border-2 rounded flex items-center justify-center ${
                isCurrentSigner && !block.signed ? "cursor-pointer hover:shadow-md animate-pulse" : ""
            }`}
            style={{
                left: `${block.x}%`,
                top: `${block.y}%`,
                width: `${block.width}%`,
                height: `${block.height}%`,
            }}
            onClick={() => isCurrentSigner && !block.signed && onClick?.()}
        >
            {block.signed && block.signatureDataUrl ? (
                <img src={block.signatureDataUrl} alt="Signature" className="max-w-full max-h-full object-contain" />
            ) : isCurrentSigner ? (
                <span className={`text-[10px] font-medium ${color.text}`}>
                    {block.type === "signature" ? "Click to sign" : block.type === "initials" ? "Click for initials" : "Click for date"}
                </span>
            ) : (
                <span className="text-[10px] text-gray-400">
                    Awaiting {block.assignedTo.split("@")[0]}
                </span>
            )}
        </div>
    )
}
