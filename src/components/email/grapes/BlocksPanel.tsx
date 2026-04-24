"use client"

import { BlocksProvider } from "@grapesjs/react"
import type { Block } from "grapesjs"
import { cn } from "@/lib/utils"

export function BlocksPanel() {
    return (
        <BlocksProvider>
            {({ mapCategoryBlocks, dragStart, dragStop }) => {
                const categories = Array.from(mapCategoryBlocks.entries())
                return (
                    <div className="flex flex-col h-full overflow-y-auto">
                        <div className="px-3 py-2.5 border-b bg-muted/30">
                            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Blocks
                            </div>
                            <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                                Drag onto the canvas
                            </div>
                        </div>
                        <div className="flex-1 p-2 space-y-3">
                            {categories.length === 0 && (
                                <div className="text-xs text-muted-foreground text-center py-8">
                                    No blocks registered
                                </div>
                            )}
                            {categories.map(([categoryName, blocks]) => (
                                <div key={categoryName || "uncategorized"}>
                                    {categoryName && (
                                        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 px-1 mb-1.5">
                                            {categoryName}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {blocks.map((block) => (
                                            <BlockTile
                                                key={block.getId()}
                                                block={block}
                                                onDragStart={dragStart}
                                                onDragStop={dragStop}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }}
        </BlocksProvider>
    )
}

function BlockTile({
    block,
    onDragStart,
    onDragStop,
}: {
    block: Block
    onDragStart: (block: Block, ev?: Event) => void
    onDragStop: (cancel?: boolean) => void
}) {
    const label = block.get("label") || block.getId()
    const media = block.get("media") as string | undefined

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(block, e.nativeEvent)}
            onDragEnd={() => onDragStop(false)}
            className={cn(
                "group flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-md border bg-background",
                "cursor-grab active:cursor-grabbing hover:border-primary/40 hover:bg-muted/40",
                "transition-colors text-center select-none",
            )}
            title={label}
        >
            <div
                className="w-8 h-8 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors [&_svg]:w-6 [&_svg]:h-6 [&_svg]:fill-current"
                dangerouslySetInnerHTML={{ __html: media || defaultIcon() }}
            />
            <div className="text-[10px] font-medium text-foreground/80 truncate w-full leading-tight">
                {label}
            </div>
        </div>
    )
}

function defaultIcon() {
    // Fallback cube icon when a block has no media
    return '<svg viewBox="0 0 24 24"><path d="M12 2 2 7v10l10 5 10-5V7zm0 2.236 7.5 3.75L12 11.736 4.5 7.986zM4 9.618l7 3.5v7.264l-7-3.5zm9 10.764v-7.264l7-3.5v7.264z"/></svg>'
}
