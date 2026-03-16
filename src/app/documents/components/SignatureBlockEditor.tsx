"use client"

import { useCallback } from "react"
import { PdfViewer } from "./PdfViewer"
import { SignatureBlockComponent, type SignatureBlockData } from "./SignatureBlock"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PenLine, Type, Calendar, Plus, ChevronDown } from "lucide-react"
import { getSignerColor } from "./SignatureBlock"

interface SignatureBlockEditorProps {
    pdfUrl: string
    blocks: SignatureBlockData[]
    signers: string[]
    activeSigner: string
    selectedBlockId: string | null
    onBlocksChange: (blocks: SignatureBlockData[]) => void
    onSelectBlock: (id: string | null) => void
}

export function SignatureBlockEditor({
    pdfUrl, blocks, signers, activeSigner, selectedBlockId,
    onBlocksChange, onSelectBlock,
}: SignatureBlockEditorProps) {

    // ── Add Block at Click Position ──
    const handlePageClick = useCallback((pageNumber: number, xPercent: number, yPercent: number) => {
        if (!activeSigner) return

        const newBlock: SignatureBlockData = {
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            assignedTo: activeSigner,
            pageNumber,
            x: Math.max(0, Math.min(75, xPercent - 12.5)), // center the block on click
            y: Math.max(0, Math.min(92, yPercent - 4)),
            width: 25,
            height: 8,
            type: "signature",
        }

        onBlocksChange([...blocks, newBlock])
        onSelectBlock(newBlock.id)
    }, [activeSigner, blocks, onBlocksChange, onSelectBlock])

    // ── Add Block of Specific Type ──
    const addBlock = useCallback((type: SignatureBlockData["type"]) => {
        if (!activeSigner) return

        // Find the first page, or default to 1
        const pageNumber = 1
        const defaultSizes = {
            signature: { width: 25, height: 8 },
            initials: { width: 12, height: 6 },
            date: { width: 18, height: 5 },
        }

        const size = defaultSizes[type]
        // Stack blocks vertically to avoid overlap
        const existingOnPage = blocks.filter(b => b.pageNumber === pageNumber)
        const yOffset = existingOnPage.length * 12

        const newBlock: SignatureBlockData = {
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            assignedTo: activeSigner,
            pageNumber,
            x: 60,
            y: Math.min(90, 10 + yOffset),
            width: size.width,
            height: size.height,
            type,
        }

        onBlocksChange([...blocks, newBlock])
        onSelectBlock(newBlock.id)
    }, [activeSigner, blocks, onBlocksChange, onSelectBlock])

    // ── Block Handlers ──
    const handleMove = useCallback((blockId: string, x: number, y: number) => {
        onBlocksChange(blocks.map(b => b.id === blockId ? { ...b, x, y } : b))
    }, [blocks, onBlocksChange])

    const handleResize = useCallback((blockId: string, width: number, height: number) => {
        onBlocksChange(blocks.map(b => b.id === blockId ? { ...b, width, height } : b))
    }, [blocks, onBlocksChange])

    const handleDelete = useCallback((blockId: string) => {
        onBlocksChange(blocks.filter(b => b.id !== blockId))
        if (selectedBlockId === blockId) onSelectBlock(null)
    }, [blocks, selectedBlockId, onBlocksChange, onSelectBlock])

    // ── Render Overlay for Each Page ──
    const renderOverlay = useCallback((pageNumber: number) => {
        const pageBlocks = blocks.filter(b => b.pageNumber === pageNumber)

        return (
            <>
                {pageBlocks.map(block => (
                    <SignatureBlockComponent
                        key={block.id}
                        block={block}
                        signers={signers}
                        selected={selectedBlockId === block.id}
                        onSelect={() => onSelectBlock(block.id)}
                        onMove={(x, y) => handleMove(block.id, x, y)}
                        onResize={(w, h) => handleResize(block.id, w, h)}
                        onDelete={() => handleDelete(block.id)}
                    />
                ))}
            </>
        )
    }, [blocks, signers, selectedBlockId, onSelectBlock, handleMove, handleResize, handleDelete])

    const activeColor = activeSigner ? getSignerColor(activeSigner, signers) : null

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-3 border-b bg-muted/20 shrink-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                            <Plus className="h-3 w-3" />
                            Add Block
                            <ChevronDown className="h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => addBlock("signature")} disabled={!activeSigner}>
                            <PenLine className="h-3.5 w-3.5 mr-2" /> Signature Block
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addBlock("initials")} disabled={!activeSigner}>
                            <Type className="h-3.5 w-3.5 mr-2" /> Initials Block
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addBlock("date")} disabled={!activeSigner}>
                            <Calendar className="h-3.5 w-3.5 mr-2" /> Date Block
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {activeSigner && activeColor && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className={`w-2 h-2 rounded-full ${activeColor.dot}`} />
                        <span>Placing for: <strong className={activeColor.text}>{activeSigner.split("@")[0]}</strong></span>
                    </div>
                )}

                {!activeSigner && signers.length === 0 && (
                    <span className="text-xs text-muted-foreground">Add a signer first, then click on the document to place blocks</span>
                )}

                <div className="flex-1" />

                <span className="text-xs text-muted-foreground">
                    {blocks.length} block{blocks.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* PDF with overlays */}
            <div
                className="flex-1 overflow-auto bg-muted/30"
                onClick={() => onSelectBlock(null)}
            >
                <PdfViewer
                    url={pdfUrl}
                    renderOverlay={renderOverlay}
                    onPageClick={activeSigner ? handlePageClick : undefined}
                />
            </div>
        </div>
    )
}
