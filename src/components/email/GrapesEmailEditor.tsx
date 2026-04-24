"use client"

import { useRef } from "react"
import GjsEditor from "@grapesjs/react"
import grapesjs from "grapesjs"
import type { Editor, Plugin, ProjectData } from "grapesjs"
import newsletterPreset from "grapesjs-preset-newsletter"
import "grapesjs/dist/css/grapes.min.css"

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
 * GrapesJS-based drag-and-drop email editor. This is Phase 1 — default
 * UI from the newsletter preset. Phase 2 replaces the panels with our own.
 *
 * Heavy bundle (~300KB): the parent should lazy-import this component via
 * next/dynamic so /dashboard etc. don't pay the cost.
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

        // Seed content: prefer stored project JSON; fall back to HTML.
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
        <div className="grapes-editor-root" style={{ minHeight: 760 }}>
            <GjsEditor
                grapesjs={grapesjs}
                plugins={[newsletterPreset as Plugin]}
                options={{
                    height: "760px",
                    storageManager: false, // we handle persistence
                    // Disable the default top panels & leave room for our custom ones later
                    panels: { defaults: [] },
                }}
                onEditor={handleEditor}
                onUpdate={handleUpdate}
                waitReady={<div className="py-12 text-sm text-muted-foreground text-center">Loading editor…</div>}
            />
        </div>
    )
}
