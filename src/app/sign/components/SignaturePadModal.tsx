"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, RotateCcw } from "lucide-react"

interface SignaturePadModalProps {
    type: "signature" | "initials" | "date"
    onApply: (dataUrl: string) => void
    onClose: () => void
}

export function SignaturePadModal({ type, onApply, onClose }: SignaturePadModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [hasDrawn, setHasDrawn] = useState(false)
    const [isDrawing, setIsDrawing] = useState(false)
    const [dateValue, setDateValue] = useState(new Date().toLocaleDateString())

    // If it's a date block, handle differently
    if (type === "date") {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
                <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold">Enter Date</h3>
                        <button onClick={onClose} className="p-1 hover:bg-muted rounded">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <input
                        type="text"
                        value={dateValue}
                        onChange={e => setDateValue(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border text-sm mb-4"
                    />
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                        <Button className="flex-1" onClick={() => {
                            // Create a canvas with the date text
                            const canvas = document.createElement("canvas")
                            canvas.width = 400
                            canvas.height = 100
                            const ctx = canvas.getContext("2d")!
                            ctx.fillStyle = "white"
                            ctx.fillRect(0, 0, 400, 100)
                            ctx.fillStyle = "black"
                            ctx.font = "24px Arial"
                            ctx.textAlign = "center"
                            ctx.textBaseline = "middle"
                            ctx.fillText(dateValue, 200, 50)
                            onApply(canvas.toDataURL("image/png"))
                        }}>
                            Apply
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Signature / Initials canvas
    const canvasHeight = type === "initials" ? 120 : 160
    const canvasWidth = type === "initials" ? 200 : 500

    const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        if ("touches" in e) {
            const touch = e.touches[0]
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY,
            }
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        }
    }, [])

    const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")!
        const { x, y } = getPos(e)
        ctx.beginPath()
        ctx.moveTo(x, y)
        setIsDrawing(true)
        setHasDrawn(true)
    }, [getPos])

    const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return
        e.preventDefault()
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")!
        const { x, y } = getPos(e)
        ctx.strokeStyle = "#000"
        ctx.lineWidth = 2
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.lineTo(x, y)
        ctx.stroke()
    }, [isDrawing, getPos])

    const stopDrawing = useCallback(() => {
        setIsDrawing(false)
    }, [])

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")!
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        setHasDrawn(false)
    }, [])

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = canvasWidth * 2
        canvas.height = canvasHeight * 2
        const ctx = canvas.getContext("2d")!
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    }, [canvasWidth, canvasHeight])

    const handleApply = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        onApply(canvas.toDataURL("image/png"))
    }, [onApply])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">
                        {type === "signature" ? "Draw Your Signature" : "Draw Your Initials"}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="relative border-2 border-dashed rounded-lg mb-4">
                    <canvas
                        ref={canvasRef}
                        className="w-full cursor-crosshair touch-none"
                        style={{ height: `${canvasHeight}px` }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                    {!hasDrawn && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-sm text-muted-foreground/40">
                                {type === "signature" ? "Sign here" : "Initials here"}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearCanvas} disabled={!hasDrawn} className="h-8 text-xs">
                        <RotateCcw className="h-3 w-3 mr-1" /> Clear
                    </Button>
                    <div className="flex-1" />
                    <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">Cancel</Button>
                    <Button size="sm" onClick={handleApply} disabled={!hasDrawn} className="h-8 text-xs">Apply</Button>
                </div>
            </div>
        </div>
    )
}
