"use client"

import { useState, useCallback, useMemo } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { Loader2 } from "lucide-react"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

function getProxiedUrl(url: string): string {
    if (url.includes("firebasestorage.app") || url.includes("storage.googleapis.com")) {
        return `/api/documents/pdf-proxy?url=${encodeURIComponent(url)}`
    }
    return url
}

interface PdfViewerProps {
    url: string
    width?: number
    renderOverlay?: (pageNumber: number, pageWidth: number, pageHeight: number) => React.ReactNode
    onPageClick?: (pageNumber: number, xPercent: number, yPercent: number) => void
}

export function PdfViewer({ url, width = 700, renderOverlay, onPageClick }: PdfViewerProps) {
    const proxiedUrl = useMemo(() => getProxiedUrl(url), [url])
    const [numPages, setNumPages] = useState<number>(0)
    const [pageDimensions, setPageDimensions] = useState<Record<number, { width: number; height: number }>>({})

    const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
        setNumPages(n)
    }, [])

    const handlePageLoadSuccess = useCallback((page: { pageNumber: number; width: number; height: number }) => {
        setPageDimensions(prev => ({
            ...prev,
            [page.pageNumber]: { width: page.width, height: page.height },
        }))
    }, [])

    const handlePageClick = useCallback((pageNumber: number, e: React.MouseEvent<HTMLDivElement>) => {
        if (!onPageClick) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        onPageClick(pageNumber, x, y)
    }, [onPageClick])

    return (
        <div className="flex flex-col items-center gap-4 py-4">
            <Document
                file={proxiedUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                }
                error={
                    <div className="flex items-center justify-center py-20 text-sm text-destructive">
                        Failed to load PDF
                    </div>
                }
            >
                {Array.from({ length: numPages }, (_, i) => {
                    const pageNum = i + 1
                    const dims = pageDimensions[pageNum]

                    return (
                        <div
                            key={pageNum}
                            className="relative mb-4 shadow-md bg-white"
                            onClick={(e) => handlePageClick(pageNum, e)}
                        >
                            <Page
                                pageNumber={pageNum}
                                width={width}
                                onLoadSuccess={handlePageLoadSuccess}
                                loading={
                                    <div className="flex items-center justify-center" style={{ width, height: width * 1.4 }}>
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                }
                            />
                            {/* Overlay for signature blocks */}
                            {renderOverlay && dims && (
                                <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{ width: dims.width, height: dims.height }}
                                >
                                    <div className="relative w-full h-full pointer-events-auto">
                                        {renderOverlay(pageNum, dims.width, dims.height)}
                                    </div>
                                </div>
                            )}
                            {/* Page number label */}
                            <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground/50">
                                Page {pageNum} of {numPages}
                            </div>
                        </div>
                    )
                })}
            </Document>
        </div>
    )
}
