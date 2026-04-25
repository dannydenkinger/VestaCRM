"use client"

import { useEffect, useRef, useState } from "react"
import GjsEditor, { Canvas } from "@grapesjs/react"
import grapesjs from "grapesjs"
import type { Editor, Plugin, ProjectData } from "grapesjs"
import newsletterPreset from "grapesjs-preset-newsletter"
import "grapesjs/dist/css/grapes.min.css"
import "./grapes/grapes-theme.css"
import { vestaBlocksPlugin } from "./grapes/blocks"

import { TopBar } from "./grapes/TopBar"
import { BlocksPanel } from "./grapes/BlocksPanel"
import { RightPanel } from "./grapes/RightPanel"

export interface GrapesEmailEditorProps {
    /** Initial project JSON from a previously saved design (takes priority over initialHtml). */
    initialProject?: ProjectData | null
    /** Seed HTML when creating a new template (used only if initialProject is absent). */
    initialHtml?: string
    /**
     * Fired after every edit. Receives the rendered HTML and the project JSON.
     * The JSON is what you save to re-open for editing later.
     */
    onChange?: (html: string, projectJson: ProjectData) => void
    /** Fired once when the editor is mounted and ready. */
    onReady?: (editor: Editor) => void
    /** Optional: triggered when the user clicks the Save button in the editor TopBar. */
    onSave?: () => void
}

/**
 * GrapesJS-based drag-and-drop email editor with a shadcn-themed skin.
 * Heavy bundle (~300 KB) — parent should lazy-import via next/dynamic.
 */
export function GrapesEmailEditor({
    initialProject,
    initialHtml,
    onChange,
    onReady,
    onSave,
}: GrapesEmailEditorProps) {
    const editorRef = useRef<Editor | null>(null)
    const [fullscreen, setFullscreen] = useState(false)
    // Properties panel collapses by default; opens automatically when the
    // user selects something in the canvas, closes on deselect. User can
    // also toggle manually via the TopBar button.
    const [rightPanelOpen, setRightPanelOpen] = useState(false)

    // Lock body scroll while fullscreen so background scrolling can't drift
    // the iframe and throw off GrapesJS's drop-position math.
    useEffect(() => {
        if (!fullscreen) return
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setFullscreen(false)
        }
        window.addEventListener("keydown", onKey)
        return () => {
            document.body.style.overflow = prev
            window.removeEventListener("keydown", onKey)
        }
    }, [fullscreen])

    const handleEditor = (editor: Editor) => {
        editorRef.current = editor

        if (initialProject) {
            try {
                editor.loadProjectData(initialProject)
            } catch (err) {
                console.error("[GrapesEmailEditor] failed to load project:", err)
                if (initialHtml) editor.setComponents(initialHtml)
            }
        } else if (initialHtml) {
            editor.setComponents(initialHtml)
        }

        // Auto-open the properties panel when the user selects something,
        // close it on deselect. Gives users full canvas width when not
        // styling, and surfaces controls automatically when needed.
        editor.on("component:selected", () => setRightPanelOpen(true))
        editor.on("component:deselected", () => setRightPanelOpen(false))

        onReady?.(editor)
    }

    const handleUpdate = (projectData: ProjectData, editor: Editor) => {
        if (!onChange) return
        try {
            const html = editor.getHtml() + "<style>" + editor.getCss() + "</style>"
            onChange(html, projectData)
        } catch (err) {
            console.error("[GrapesEmailEditor] render failed:", err)
        }
    }

    // Inline mode fills its parent (TemplateEditor pins it in a fixed-height
    // flex region — the iframe never moves on page scroll, which keeps
    // GrapesJS's drop-position math accurate).
    // Fullscreen mode covers the whole viewport.
    const wrapperClass = fullscreen
        ? "grapes-editor-root fixed inset-0 z-50 bg-background flex flex-col"
        : "grapes-editor-root bg-background flex flex-col h-full w-full"

    return (
        <div className={wrapperClass}>
            <GjsEditor
                grapesjs={grapesjs}
                plugins={[newsletterPreset as Plugin, vestaBlocksPlugin]}
                options={{
                    height: "100%",
                    storageManager: false,
                    panels: { defaults: [] },
                    // Tell GrapesJS we're rendering each manager's UI ourselves
                    // (via the React providers in our left/right panels).
                    // Without this it ALSO renders its own native panels,
                    // causing the duplicate "two right sidebars" effect.
                    blockManager: { custom: true },
                    styleManager: { custom: true },
                    selectorManager: { custom: true },
                    traitManager: { custom: true },
                    layerManager: { custom: true },
                }}
                onEditor={handleEditor}
                onUpdate={handleUpdate}
                waitReady={
                    <div className="py-12 text-sm text-muted-foreground text-center">
                        Loading editor…
                    </div>
                }
            >
                <div className="flex flex-col h-full">
                    <TopBar
                        fullscreen={fullscreen}
                        onToggleFullscreen={() => setFullscreen((v) => !v)}
                        onSave={onSave}
                        rightPanelOpen={rightPanelOpen}
                        onToggleRightPanel={() => setRightPanelOpen((v) => !v)}
                    />
                    <div className="flex flex-1 min-h-0">
                        <div className="w-56 shrink-0 border-r bg-card">
                            <BlocksPanel />
                        </div>
                        <div className="flex-1 min-w-0 relative">
                            <Canvas className="h-full" />
                        </div>
                        {rightPanelOpen && (
                            <div className="w-72 shrink-0 border-l bg-card">
                                <RightPanel />
                            </div>
                        )}
                    </div>
                </div>
            </GjsEditor>
        </div>
    )
}
