"use client"

/**
 * Visual canvas view for an automation.
 *
 * v3 capabilities:
 *   - Nodes draggable; position persists via parent's onChange
 *   - branch_if true/false handles support drag-to-connect — wires
 *     trueNext / falseNext on the source node
 *   - Right-click any node → context menu with Delete
 *   - Drag a node onto the trash zone (bottom-right) → delete
 *   - Delete / Backspace key when a node is selected → delete
 *   - Auto-layout fallback for any node without a saved position
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
    Background,
    BackgroundVariant,
    Controls,
    Handle,
    Position,
    ReactFlow,
    type Connection,
    type Edge,
    type Node,
    type NodeChange,
    type NodeProps,
    useEdgesState,
    useNodesState,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Plus, Trash2, Zap } from "lucide-react"
import type { AutomationNode } from "@/lib/automations/types"

interface CanvasProps {
    nodes: AutomationNode[]
    selectedNodeId: string | null
    onSelectNode: (id: string | null) => void
    onAddNodeRequest: () => void
    onUpdateNode: (id: string, patch: Partial<AutomationNode>) => void
    onRemoveNode: (id: string) => void
    triggerLabel: string
    actionMeta: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> }>
}

interface FlowNodeData extends Record<string, unknown> {
    label: string
    step: number
    iconKey: string
    type: AutomationNode["type"]
    selected: boolean
    isBranch: boolean
    nodeId: string
}

const nodeTypes = {
    triggerNode: TriggerNode,
    actionNode: ActionNode,
    addNode: AddNode,
}

function TriggerNode({ data }: NodeProps<Node<{ label: string }>>) {
    return (
        <div className="rounded-lg border-l-4 border-l-primary bg-card shadow-sm px-3 py-2 min-w-[220px]">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Zap className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[9px] uppercase tracking-wider text-primary font-semibold">
                        Trigger
                    </div>
                    <div className="text-xs font-medium truncate">{data.label}</div>
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
        </div>
    )
}

function ActionNode({ data }: NodeProps<Node<FlowNodeData>>) {
    const Icon = ACTION_ICON_REGISTRY[data.iconKey] ?? Plus
    return (
        <div
            className={`rounded-lg border bg-card shadow-sm px-3 py-2 min-w-[220px] cursor-pointer transition-shadow ${
                data.selected
                    ? "border-primary ring-2 ring-primary/30"
                    : "hover:shadow-md hover:border-primary/40"
            }`}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-muted-foreground !w-3 !h-3"
            />
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground tabular-nums shrink-0">
                    {data.step}
                </div>
                <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium truncate flex-1">{data.label}</span>
            </div>
            {data.isBranch ? (
                <>
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="true"
                        style={{ left: "30%" }}
                        className="!bg-emerald-500 !w-3 !h-3"
                    />
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="false"
                        style={{ left: "70%" }}
                        className="!bg-red-500 !w-3 !h-3"
                    />
                </>
            ) : (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    className="!bg-muted-foreground !w-2 !h-2"
                    isConnectable={false}
                />
            )}
        </div>
    )
}

function AddNode({ data }: NodeProps<Node<{ onAdd: () => void }>>) {
    return (
        <div
            onClick={data.onAdd}
            className="rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/40 hover:bg-muted/30 px-4 py-3 min-w-[220px] cursor-pointer text-center transition-colors text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
        >
            <Handle type="target" position={Position.Top} className="!opacity-0" />
            <Plus className="w-3.5 h-3.5" />
            Add step
        </div>
    )
}

const ACTION_ICON_REGISTRY: Record<string, React.ComponentType<{ className?: string }>> = {}

const AUTO_LAYOUT_X = 0
const AUTO_LAYOUT_Y_STEP = 130

function positionFor(node: AutomationNode, idx: number): { x: number; y: number } {
    return node.position ?? { x: AUTO_LAYOUT_X, y: (idx + 1) * AUTO_LAYOUT_Y_STEP }
}

interface ContextMenu {
    nodeId: string
    x: number
    y: number
}

export function AutomationCanvas({
    nodes,
    selectedNodeId,
    onSelectNode,
    onAddNodeRequest,
    onUpdateNode,
    onRemoveNode,
    triggerLabel,
    actionMeta,
}: CanvasProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const trashRef = useRef<HTMLDivElement | null>(null)
    const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [trashHover, setTrashHover] = useState(false)

    Object.entries(actionMeta).forEach(([k, m]) => {
        ACTION_ICON_REGISTRY[k] = m.Icon
    })

    const flowNodes = useMemo<Node[]>(() => {
        const out: Node[] = []
        out.push({
            id: "__trigger",
            type: "triggerNode",
            position: { x: 0, y: 0 },
            data: { label: triggerLabel },
            draggable: false,
            selectable: false,
        })

        let maxY = 0
        nodes.forEach((n, idx) => {
            const pos = positionFor(n, idx)
            if (pos.y > maxY) maxY = pos.y
            out.push({
                id: n.id,
                type: "actionNode",
                position: pos,
                data: {
                    label: actionMeta[n.type]?.label ?? n.type,
                    step: idx + 1,
                    iconKey: n.type,
                    type: n.type,
                    selected: n.id === selectedNodeId,
                    isBranch: n.type === "branch_if",
                    nodeId: n.id,
                } as FlowNodeData,
                draggable: true,
            })
        })

        out.push({
            id: "__add",
            type: "addNode",
            position: {
                x: 0,
                y: nodes.length === 0 ? AUTO_LAYOUT_Y_STEP : maxY + AUTO_LAYOUT_Y_STEP,
            },
            data: { onAdd: onAddNodeRequest },
            draggable: false,
            selectable: false,
        })
        return out
    }, [nodes, selectedNodeId, triggerLabel, actionMeta, onAddNodeRequest])

    const flowEdges = useMemo<Edge[]>(() => {
        const out: Edge[] = []
        if (nodes.length > 0) {
            out.push({
                id: "e-trigger",
                source: "__trigger",
                target: nodes[0].id,
                type: "smoothstep",
            })
        } else {
            out.push({
                id: "e-trigger-add",
                source: "__trigger",
                target: "__add",
                type: "smoothstep",
            })
        }

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i]
            const next = nodes[i + 1]

            if (node.type === "branch_if") {
                if (node.trueNext) {
                    const target = nodes.find((n) => n.id === node.trueNext)
                    if (target) {
                        out.push({
                            id: `e-${node.id}-true`,
                            source: node.id,
                            sourceHandle: "true",
                            target: target.id,
                            type: "smoothstep",
                            label: "TRUE",
                            labelStyle: { fontSize: 10, fontWeight: 600, fill: "#16a34a" },
                            style: { stroke: "#16a34a" },
                        })
                    }
                } else if (next) {
                    out.push({
                        id: `e-${node.id}-true-next`,
                        source: node.id,
                        sourceHandle: "true",
                        target: next.id,
                        type: "smoothstep",
                        label: "TRUE → next",
                        labelStyle: { fontSize: 10, fontWeight: 600, fill: "#16a34a" },
                        style: { stroke: "#16a34a", strokeDasharray: "4 4" },
                    })
                }
                if (node.falseNext) {
                    const target = nodes.find((n) => n.id === node.falseNext)
                    if (target) {
                        out.push({
                            id: `e-${node.id}-false`,
                            source: node.id,
                            sourceHandle: "false",
                            target: target.id,
                            type: "smoothstep",
                            label: "FALSE",
                            labelStyle: { fontSize: 10, fontWeight: 600, fill: "#dc2626" },
                            style: { stroke: "#dc2626" },
                        })
                    }
                } else if (next) {
                    out.push({
                        id: `e-${node.id}-false-next`,
                        source: node.id,
                        sourceHandle: "false",
                        target: next.id,
                        type: "smoothstep",
                        label: "FALSE → next",
                        labelStyle: { fontSize: 10, fontWeight: 600, fill: "#dc2626" },
                        style: { stroke: "#dc2626", strokeDasharray: "4 4" },
                    })
                }
            } else {
                const target = next ?? { id: "__add" }
                out.push({
                    id: `e-${node.id}-next`,
                    source: node.id,
                    target: target.id,
                    type: "smoothstep",
                })
            }
        }

        return out
    }, [nodes])

    const [rfNodes, setRfNodes, onRfNodesChange] = useNodesState(flowNodes)
    const [rfEdges, setRfEdges, onRfEdgesChange] = useEdgesState(flowEdges)

    // Sync internal state when parent regenerates nodes/edges
    useEffect(() => {
        setRfNodes(flowNodes)
    }, [flowNodes, setRfNodes])

    // ★ THE FIX: also sync edges. Without this, drag-to-connect appeared to
    // succeed but the new edge vanished because rfEdges was stuck on the
    // original snapshot from useEdgesState's initializer.
    useEffect(() => {
        setRfEdges(flowEdges)
    }, [flowEdges, setRfEdges])

    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            onRfNodesChange(changes)
            for (const c of changes) {
                if (c.type === "position" && c.dragging === false && c.position) {
                    if (c.id === "__trigger" || c.id === "__add") continue
                    onUpdateNode(c.id, {
                        position: { x: c.position.x, y: c.position.y },
                    })
                }
                // Track ongoing drag for trash hover detection
                if (c.type === "position") {
                    if (c.dragging) setDraggingId(c.id)
                    else setDraggingId(null)
                }
            }
        },
        [onRfNodesChange, onUpdateNode],
    )

    const handleNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            if (node.id === "__trigger" || node.id === "__add") return
            setContextMenu(null)
            onSelectNode(node.id)
        },
        [onSelectNode],
    )

    const handleNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.preventDefault()
            if (node.id === "__trigger" || node.id === "__add") return
            // Position relative to canvas container so the menu floats correctly
            const rect = containerRef.current?.getBoundingClientRect()
            const x = rect ? event.clientX - rect.left : event.clientX
            const y = rect ? event.clientY - rect.top : event.clientY
            setContextMenu({ nodeId: node.id, x, y })
            onSelectNode(node.id)
        },
        [onSelectNode],
    )

    const handleConnect = useCallback(
        (conn: Connection) => {
            if (!conn.source || !conn.target) return
            if (conn.source === "__trigger" || conn.target === "__add") return
            if (conn.target === "__trigger") return
            if (conn.sourceHandle === "true") {
                onUpdateNode(conn.source, {
                    trueNext: conn.target,
                } as Partial<AutomationNode>)
            } else if (conn.sourceHandle === "false") {
                onUpdateNode(conn.source, {
                    falseNext: conn.target,
                } as Partial<AutomationNode>)
            }
        },
        [onUpdateNode],
    )

    // Track mouse during drag to detect trash hover
    const handleNodeDrag = useCallback((event: React.MouseEvent) => {
        if (!draggingId) return
        const trash = trashRef.current?.getBoundingClientRect()
        if (!trash) return
        const overTrash =
            event.clientX >= trash.left &&
            event.clientX <= trash.right &&
            event.clientY >= trash.top &&
            event.clientY <= trash.bottom
        setTrashHover(overTrash)
    }, [draggingId])

    const handleNodeDragStop = useCallback(
        (event: React.MouseEvent, node: Node) => {
            const trash = trashRef.current?.getBoundingClientRect()
            if (!trash) {
                setTrashHover(false)
                setDraggingId(null)
                return
            }
            const overTrash =
                event.clientX >= trash.left &&
                event.clientX <= trash.right &&
                event.clientY >= trash.top &&
                event.clientY <= trash.bottom
            if (overTrash && node.id !== "__trigger" && node.id !== "__add") {
                onRemoveNode(node.id)
                if (selectedNodeId === node.id) onSelectNode(null)
            }
            setTrashHover(false)
            setDraggingId(null)
        },
        [onRemoveNode, onSelectNode, selectedNodeId],
    )

    // Keyboard delete when a node is selected
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Delete" && e.key !== "Backspace") return
            const tag = (e.target as HTMLElement | null)?.tagName
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
            if (selectedNodeId) {
                e.preventDefault()
                onRemoveNode(selectedNodeId)
                onSelectNode(null)
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [selectedNodeId, onRemoveNode, onSelectNode])

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative"
            onMouseMove={handleNodeDrag}
            onClick={() => setContextMenu(null)}
        >
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={handleNodesChange}
                onEdgesChange={onRfEdgesChange}
                onNodeClick={handleNodeClick}
                onNodeContextMenu={handleNodeContextMenu}
                onPaneClick={() => {
                    onSelectNode(null)
                    setContextMenu(null)
                }}
                onConnect={handleConnect}
                onNodeDragStop={handleNodeDragStop}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.3, maxZoom: 1.1 }}
                minZoom={0.3}
                maxZoom={1.5}
                proOptions={{ hideAttribution: true }}
            >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
                <Controls showInteractive={false} />
            </ReactFlow>

            {/* Trash drop zone — visible always but pulses when dragging */}
            <div
                ref={trashRef}
                className={`absolute bottom-4 right-4 w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-md transition-all z-10 pointer-events-none ${
                    trashHover
                        ? "bg-destructive border-destructive scale-110 ring-4 ring-destructive/30"
                        : draggingId
                          ? "bg-card border-destructive/50 border-dashed"
                          : "bg-card/80 border-muted-foreground/30 opacity-50"
                }`}
                title="Drag a step here to delete"
            >
                <Trash2
                    className={`w-5 h-5 transition-colors ${
                        trashHover ? "text-white" : "text-muted-foreground"
                    }`}
                />
            </div>

            {/* Right-click context menu */}
            {contextMenu && (
                <div
                    className="absolute z-50 min-w-[140px] rounded-md bg-popover border shadow-lg py-1"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => {
                            onRemoveNode(contextMenu.nodeId)
                            if (selectedNodeId === contextMenu.nodeId) onSelectNode(null)
                            setContextMenu(null)
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-destructive hover:text-destructive-foreground flex items-center gap-2 text-destructive"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete step
                    </button>
                </div>
            )}
        </div>
    )
}
