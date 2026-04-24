"use client"

import { useRef } from "react"
import GjsEditor, { Canvas } from "@grapesjs/react"
import grapesjs from "grapesjs"
import type { Editor, Plugin, ProjectData } from "grapesjs"
import newsletterPreset from "grapesjs-preset-newsletter"
import "grapesjs/dist/css/grapes.min.css"
import "./grapes/grapes-theme.css"

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
}: GrapesEmailEditorProps) {
    const editorRef = useRef<Editor | null>(null)

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

    return (
        <div className="grapes-editor-root border rounded-md overflow-hidden bg-background">
            <GjsEditor
                grapesjs={grapesjs}
                plugins={[newsletterPreset as Plugin]}
                options={{
                    height: "760px",
                    storageManager: false,
                    panels: { defaults: [] },
                }}
                onEditor={handleEditor}
                onUpdate={handleUpdate}
                waitReady={
                    <div className="py-12 text-sm text-muted-foreground text-center">
                        Loading editor…
                    </div>
                }
            >
                <div className="flex flex-col" style={{ height: "760px" }}>
                    <TopBar />
                    <div className="flex flex-1 min-h-0">
                        <div className="w-56 shrink-0 border-r bg-card">
                            <BlocksPanel />
                        </div>
                        <div className="flex-1 min-w-0 relative">
                            <Canvas className="h-full" />
                        </div>
                        <div className="w-72 shrink-0 border-l bg-card">
                            <RightPanel />
                        </div>
                    </div>
                </div>
            </GjsEditor>
        </div>
    )
}
