"use client"

import { useState, useCallback } from "react"
import { PdfViewer } from "@/app/documents/components/PdfViewer"
import { ReadOnlySignatureBlock } from "@/app/documents/components/SignatureBlock"
import { SignaturePadModal } from "./SignaturePadModal"
import type { SignatureBlockData } from "@/app/documents/components/SignatureBlock"

interface SignerBlockOverlayProps {
    pdfUrl: string
    signerBlocks: SignatureBlockData[]
    allBlocks: SignatureBlockData[]
    signerEmail: string
    signers: string[]
    onBlockSigned: (blockId: string, dataUrl: string) => void
}

export function SignerBlockOverlay({
    pdfUrl,
    signerBlocks,
    allBlocks,
    signerEmail,
    signers,
    onBlockSigned,
}: SignerBlockOverlayProps) {
    const [activeBlock, setActiveBlock] = useState<SignatureBlockData | null>(null)

    const handleApply = useCallback((dataUrl: string) => {
        if (!activeBlock) return
        onBlockSigned(activeBlock.id, dataUrl)
        setActiveBlock(null)
    }, [activeBlock, onBlockSigned])

    const renderOverlay = useCallback((pageNumber: number) => {
        const pageBlocks = allBlocks.filter(b => b.pageNumber === pageNumber)

        return (
            <>
                {pageBlocks.map(block => {
                    const isCurrentSigner = block.assignedTo === signerEmail
                    // Check if this block has been signed by looking in signerBlocks
                    const signerBlock = signerBlocks.find(b => b.id === block.id)
                    const displayBlock = signerBlock || block

                    return (
                        <ReadOnlySignatureBlock
                            key={block.id}
                            block={displayBlock}
                            signers={signers}
                            isCurrentSigner={isCurrentSigner}
                            onClick={() => {
                                if (isCurrentSigner && !displayBlock.signed) {
                                    setActiveBlock(displayBlock)
                                }
                            }}
                        />
                    )
                })}
            </>
        )
    }, [allBlocks, signerBlocks, signerEmail, signers])

    return (
        <>
            <div className="overflow-auto flex-1">
                <PdfViewer url={pdfUrl} width={650} renderOverlay={renderOverlay} />
            </div>

            {activeBlock && (
                <SignaturePadModal
                    type={activeBlock.type}
                    onApply={handleApply}
                    onClose={() => setActiveBlock(null)}
                />
            )}
        </>
    )
}
