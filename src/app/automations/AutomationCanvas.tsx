"use client"

/**
 * Visual canvas view for an automation. Renders the linear node list as a
 * flow chart with branch_if nodes drawing two outgoing edges. Click a node
 * to edit it in the parent's side panel; click + edges to add steps.
 *
 * v2 capabilities:
 *   - Nodes are draggable; position persists on the node (via parent's
 *     onChange) so future loads remember it
 *   - branch_if nodes' true/false handles support drag-to-connect: drag
 *     from a green/red dot to another node to set trueNext/falseNext
 *   - Falls back to auto-layout (vertical) for any node without a saved
 *     position — typical first-time-on-canvas experience
 */

import { useCallback, useEffect, useMemo } from "react"
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
import { Plus, Zap } from "lucide-react"
import type { AutomationNode } from "@/lib/automations/types"

interface CanvasProps {
    nodes: AutomationNode[]
    selectedNodeId: string | null
    onSelectNode: (id: string | null) => void
    onAddNodeRequest: () => void
    onUpdateNode: (id: string, patch: Partial<AutomationNode>) => void
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
                className="!bg-muted-foreground !w-2 !h-2"
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

export function AutomationCanvas({
    nodes,
    selectedNodeId,
    onSelectNode,
    onAddNodeRequest,
    onUpdateNode,
    triggerLabel,
    actionMeta,
}: CanvasProps) {
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

        // Compute the lowest y to anchor the add-step button below everything
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
    const [rfEdges, , onRfEdgesChange] = useEdgesState(flowEdges)

    useEffect(() => {
        setRfNodes(flowNodes)
    }, [flowNodes, setRfNodes])

    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            // Pass through to react-flow's internal state
            onRfNodesChange(changes)
            // Persist position changes back to the parent on drag-end
            for (const c of changes) {
                if (c.type === "position" && c.dragging === false && c.position) {
                    if (c.id === "__trigger" || c.id === "__add") continue
                    onUpdateNode(c.id, {
                        position: { x: c.position.x, y: c.position.y },
                    })
                }
            }
        },
        [onRfNodesChange, onUpdateNode],
    )

    const handleNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            if (node.id === "__trigger" || node.id === "__add") return
            onSelectNode(node.id)
        },
        [onSelectNode],
    )

    const handleConnect = useCallback(
        (conn: Connection) => {
            // Drag-to-connect: only branch_if true/false handles are connectable.
            // Map the source handle to trueNext / falseNext on the source node.
            if (!conn.source || !conn.target) return
            if (conn.source === "__trigger" || conn.target === "__add") return
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

    return (
        <div className="w-full h-full">
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={handleNodesChange}
                onEdgesChange={onRfEdgesChange}
                onNodeClick={handleNodeClick}
                onPaneClick={() => onSelectNode(null)}
                onConnect={handleConnect}
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
        </div>
    )
}
