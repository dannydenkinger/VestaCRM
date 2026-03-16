"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Send, Loader2 } from "lucide-react"
import { getSignerColor } from "./SignatureBlock"
import type { SignatureBlockData } from "./SignatureBlock"

interface SignerPanelProps {
    signers: string[]
    blocks: SignatureBlockData[]
    activeSigner: string
    sending: boolean
    onAddSigner: (email: string) => void
    onRemoveSigner: (email: string) => void
    onSetActiveSigner: (email: string) => void
    onSend: () => void
}

export function SignerPanel({
    signers, blocks, activeSigner, sending,
    onAddSigner, onRemoveSigner, onSetActiveSigner, onSend,
}: SignerPanelProps) {
    const [emailInput, setEmailInput] = useState("")

    const handleAdd = () => {
        const email = emailInput.trim().toLowerCase()
        if (!email || !email.includes("@")) return
        if (signers.includes(email)) return
        onAddSigner(email)
        setEmailInput("")
    }

    const allSignersHaveBlocks = signers.length > 0 && signers.every(s =>
        blocks.some(b => b.assignedTo === s)
    )

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b">
                <p className="text-xs font-semibold mb-2">Signers</p>
                <div className="flex gap-1.5">
                    <Input
                        type="email"
                        placeholder="email@example.com"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAdd())}
                        className="h-7 text-xs flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={handleAdd} className="h-7 text-xs px-2">
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-3 space-y-1.5">
                {signers.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                        Add signers above, then place signature blocks on the document
                    </p>
                )}
                {signers.map(email => {
                    const color = getSignerColor(email, signers)
                    const blockCount = blocks.filter(b => b.assignedTo === email).length
                    const isActive = activeSigner === email

                    return (
                        <div
                            key={email}
                            role="button"
                            tabIndex={0}
                            className={`flex items-center gap-2 p-2 rounded-md text-xs transition-colors cursor-pointer ${
                                isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50 border border-transparent"
                            }`}
                            onClick={() => onSetActiveSigner(email)}
                            onKeyDown={(e) => { if (e.key === "Enter") onSetActiveSigner(email) }}
                        >
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`} />
                            <span className="truncate flex-1 font-medium">{email}</span>
                            <Badge variant="secondary" className="text-[10px] px-1 h-4 shrink-0">
                                {blockCount} {blockCount === 1 ? "block" : "blocks"}
                            </Badge>
                            <button
                                className="p-0.5 rounded hover:bg-destructive/10 shrink-0"
                                onClick={(e) => { e.stopPropagation(); onRemoveSigner(email) }}
                            >
                                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                            </button>
                        </div>
                    )
                })}
            </div>

            <div className="p-3 border-t">
                <Button
                    className="w-full h-9 text-xs"
                    disabled={!allSignersHaveBlocks || sending}
                    onClick={onSend}
                >
                    {sending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                        <Send className="h-3 w-3 mr-1" />
                    )}
                    Send for Signatures ({signers.length})
                </Button>
                {signers.length > 0 && !allSignersHaveBlocks && (
                    <p className="text-[10px] text-amber-500 mt-1 text-center">
                        All signers need at least one block
                    </p>
                )}
            </div>
        </div>
    )
}
