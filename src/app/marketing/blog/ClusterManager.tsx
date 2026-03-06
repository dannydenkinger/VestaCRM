"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Network,
    Plus,
    FileText,
    Crown,
    Trash2,
    ChevronRight,
    LinkIcon,
    Unlink,
    Wand2,
    MoreHorizontal,
} from "lucide-react"
import { toast } from "sonner"
import {
    createCluster,
    deleteCluster,
    updateCluster,
    setPillarArticle,
    addArticleToCluster,
    removeArticleFromCluster,
} from "./actions"
import type { ContentCluster, BlogArticle } from "./types"

interface ClusterManagerProps {
    clusters: ContentCluster[]
    articles: BlogArticle[]
    onRefresh: () => void
    onEditArticle: (id: string) => void
    onNewClusterArticle: (clusterId: string) => void
    onGenerateClusterArticle: (clusterId: string) => void
}

export default function ClusterManager({
    clusters,
    articles,
    onRefresh,
    onEditArticle,
    onNewClusterArticle,
    onGenerateClusterArticle,
}: ClusterManagerProps) {
    const [showCreate, setShowCreate] = useState(false)
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [keywords, setKeywords] = useState("")
    const [creating, setCreating] = useState(false)

    // Assign pillar dialog
    const [showAssignPillar, setShowAssignPillar] = useState<string | null>(null)
    const [selectedPillarId, setSelectedPillarId] = useState("")

    // Add existing article dialog
    const [showAddArticle, setShowAddArticle] = useState<string | null>(null)
    const [selectedArticleId, setSelectedArticleId] = useState("")

    const handleCreate = async () => {
        if (!name.trim()) {
            toast.error("Cluster name is required")
            return
        }
        setCreating(true)
        try {
            const result = await createCluster({
                name: name.trim(),
                description: description.trim(),
                targetKeywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
            })
            if (result.success) {
                toast.success("Cluster created")
                setShowCreate(false)
                setName("")
                setDescription("")
                setKeywords("")
                onRefresh()
            } else {
                toast.error(result.error || "Failed to create cluster")
            }
        } catch (error: any) {
            toast.error(error.message)
        }
        setCreating(false)
    }

    const handleDelete = async (id: string) => {
        try {
            const result = await deleteCluster(id)
            if (result.success) {
                toast.success("Cluster deleted")
                onRefresh()
            } else {
                toast.error(result.error || "Failed to delete")
            }
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const handleSetPillar = async () => {
        if (!showAssignPillar || !selectedPillarId) return
        try {
            const result = await setPillarArticle(showAssignPillar, selectedPillarId)
            if (result.success) {
                toast.success("Pillar article set")
                setShowAssignPillar(null)
                setSelectedPillarId("")
                onRefresh()
            } else {
                toast.error(result.error || "Failed to set pillar")
            }
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const handleAddExistingArticle = async () => {
        if (!showAddArticle || !selectedArticleId) return
        try {
            const result = await addArticleToCluster(showAddArticle, selectedArticleId)
            if (result.success) {
                toast.success("Article added to cluster")
                setShowAddArticle(null)
                setSelectedArticleId("")
                onRefresh()
            } else {
                toast.error(result.error || "Failed to add article")
            }
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const handleRemoveArticle = async (clusterId: string, articleId: string) => {
        try {
            const result = await removeArticleFromCluster(clusterId, articleId)
            if (result.success) {
                toast.success("Article removed from cluster")
                onRefresh()
            } else {
                toast.error(result.error || "Failed to remove article")
            }
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const getClusterArticles = (cluster: ContentCluster) => {
        return articles.filter(
            (a) => a.clusterId === cluster.id || cluster.clusterArticleIds.includes(a.id)
        )
    }

    const getPillarArticle = (cluster: ContentCluster) => {
        if (!cluster.pillarArticleId) return null
        return articles.find((a) => a.id === cluster.pillarArticleId)
    }

    // Articles not assigned to any cluster (available for assignment)
    const getUnassignedArticles = (excludeClusterId?: string) => {
        return articles.filter((a) => {
            // Not already in a cluster
            if (a.clusterId && a.clusterId !== excludeClusterId) return false
            // Not already assigned to the current cluster
            const cluster = clusters.find((c) => c.id === excludeClusterId)
            if (cluster?.clusterArticleIds.includes(a.id)) return false
            if (cluster?.pillarArticleId === a.id) return false
            return true
        })
    }

    const handleStatusChange = async (clusterId: string, newStatus: string) => {
        try {
            const result = await updateCluster(clusterId, { status: newStatus as ContentCluster["status"] })
            if (result.success) {
                toast.success("Cluster status updated")
                onRefresh()
            } else {
                toast.error(result.error || "Failed to update status")
            }
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const statusColors = {
        planning: "bg-muted text-muted-foreground",
        in_progress: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        complete: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Content Clusters</h3>
                    <span className="text-[10px] text-muted-foreground">
                        {clusters.length} cluster{clusters.length !== 1 ? "s" : ""}
                    </span>
                </div>
                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            <Plus className="h-3 w-3" />
                            New Cluster
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Content Cluster</DialogTitle>
                            <DialogDescription>
                                Group related articles around a pillar topic for better topical authority.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label className="text-xs font-semibold">Cluster Name</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder='e.g., "Air Force PCS Guide"'
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">Description</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe the topic cluster..."
                                    className="mt-1"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">Target Keywords</Label>
                                <Input
                                    value={keywords}
                                    onChange={(e) => setKeywords(e.target.value)}
                                    placeholder="Comma-separated keywords..."
                                    className="mt-1"
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    Keywords this cluster should rank for
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCreate(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={creating}>
                                {creating ? "Creating..." : "Create Cluster"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {clusters.length === 0 ? (
                <Card className="border-border/50 bg-card/50">
                    <CardContent className="py-10 text-center">
                        <Network className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground mb-1">No content clusters yet</p>
                        <p className="text-[10px] text-muted-foreground">
                            Create a cluster to organize related articles around a pillar topic.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {clusters.map((cluster) => {
                        const clusterArticles = getClusterArticles(cluster)
                        const pillar = getPillarArticle(cluster)

                        return (
                            <Card key={cluster.id} className="border-border/50 bg-card/50">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-semibold">{cluster.name}</CardTitle>
                                        <div className="flex items-center gap-1.5">
                                            <Select
                                                value={cluster.status}
                                                onValueChange={(v) => handleStatusChange(cluster.id, v)}
                                            >
                                                <SelectTrigger className={`h-5 w-auto text-[8px] font-semibold border px-1.5 gap-0.5 ${statusColors[cluster.status]}`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="planning">Planning</SelectItem>
                                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                                    <SelectItem value="complete">Complete</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(cluster.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    {cluster.description && (
                                        <CardDescription className="text-[10px]">
                                            {cluster.description}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {/* Target keywords */}
                                    {cluster.targetKeywords.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {cluster.targetKeywords.map((kw, i) => (
                                                <Badge key={i} variant="secondary" className="text-[8px] h-4 px-1.5">
                                                    {kw}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    {/* Pillar article */}
                                    {pillar ? (
                                        <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
                                            <div className="flex items-center gap-2">
                                                <Crown className="h-3 w-3 text-primary flex-shrink-0" />
                                                <span
                                                    className="text-[10px] font-semibold truncate cursor-pointer hover:underline"
                                                    onClick={() => onEditArticle(pillar.id)}
                                                >
                                                    {pillar.title}
                                                </span>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto flex-shrink-0">
                                                            <MoreHorizontal className="h-3 w-3" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => onEditArticle(pillar.id)}>
                                                            <FileText className="h-3 w-3 mr-2" />
                                                            Edit Pillar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => handleRemoveArticle(cluster.id, pillar.id)}
                                                        >
                                                            <Unlink className="h-3 w-3 mr-2" />
                                                            Remove as Pillar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[7px] h-3.5 px-1">
                                                    {pillar.wordCount?.toLocaleString() || 0} words
                                                </Badge>
                                                <Badge variant="outline" className={`text-[7px] h-3.5 px-1 ${pillar.seoScore >= 70 ? "text-emerald-500" : "text-amber-500"}`}>
                                                    SEO: {pillar.seoScore}
                                                </Badge>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-2 rounded-lg bg-muted/20 border border-dashed border-border/50">
                                            <p className="text-[10px] text-muted-foreground text-center mb-2">
                                                No pillar article assigned
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full h-7 text-[10px] gap-1"
                                                onClick={() => {
                                                    setShowAssignPillar(cluster.id)
                                                    setSelectedPillarId("")
                                                }}
                                            >
                                                <Crown className="h-3 w-3" />
                                                Set Pillar Article
                                            </Button>
                                        </div>
                                    )}

                                    {/* Cluster articles */}
                                    <div className="space-y-1">
                                        {clusterArticles
                                            .filter((a) => a.id !== cluster.pillarArticleId)
                                            .map((a) => (
                                                <div
                                                    key={a.id}
                                                    className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/20 transition-colors group"
                                                >
                                                    <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                    <span
                                                        className="text-[10px] truncate cursor-pointer hover:underline"
                                                        onClick={() => onEditArticle(a.id)}
                                                    >
                                                        {a.title}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[7px] h-3.5 px-1 ml-auto flex-shrink-0 ${
                                                            a.status === "published"
                                                                ? "text-emerald-500"
                                                                : "text-muted-foreground"
                                                        }`}
                                                    >
                                                        {a.status}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                        onClick={() => handleRemoveArticle(cluster.id, a.id)}
                                                        title="Remove from cluster"
                                                    >
                                                        <Unlink className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                                                    </Button>
                                                </div>
                                            ))}
                                    </div>

                                    <div className="pt-1 text-[10px] text-muted-foreground">
                                        {clusterArticles.length} article{clusterArticles.length !== 1 ? "s" : ""} in cluster
                                    </div>

                                    {/* Action buttons */}
                                    <div className="pt-2 border-t border-border/30 flex flex-wrap gap-1.5">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[10px] gap-1 flex-1"
                                            onClick={() => onNewClusterArticle(cluster.id)}
                                        >
                                            <Plus className="h-3 w-3" />
                                            New Article
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[10px] gap-1 flex-1"
                                            onClick={() => onGenerateClusterArticle(cluster.id)}
                                        >
                                            <Wand2 className="h-3 w-3" />
                                            AI Generate
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[10px] gap-1 flex-1"
                                            onClick={() => {
                                                setShowAddArticle(cluster.id)
                                                setSelectedArticleId("")
                                            }}
                                        >
                                            <LinkIcon className="h-3 w-3" />
                                            Link Existing
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Assign Pillar Article Dialog */}
            <Dialog open={!!showAssignPillar} onOpenChange={(open) => { if (!open) setShowAssignPillar(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Pillar Article</DialogTitle>
                        <DialogDescription>
                            Choose an existing article to serve as the pillar (cornerstone) page for this cluster.
                            The pillar article should be a comprehensive guide (2000+ words) covering the main topic.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label className="text-xs font-semibold">Select Article</Label>
                        <Select value={selectedPillarId} onValueChange={setSelectedPillarId}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Choose an article..." />
                            </SelectTrigger>
                            <SelectContent>
                                {getUnassignedArticles(showAssignPillar || undefined).map((a) => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.title}
                                        <span className="text-muted-foreground ml-1">
                                            ({a.wordCount?.toLocaleString() || 0} words)
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {getUnassignedArticles(showAssignPillar || undefined).length === 0 && (
                            <p className="text-[10px] text-muted-foreground mt-2">
                                No unassigned articles available. Create a new article first.
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssignPillar(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSetPillar} disabled={!selectedPillarId}>
                            Set as Pillar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Existing Article Dialog */}
            <Dialog open={!!showAddArticle} onOpenChange={(open) => { if (!open) setShowAddArticle(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Article to Cluster</DialogTitle>
                        <DialogDescription>
                            Link an existing article to this cluster as a supporting cluster post.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label className="text-xs font-semibold">Select Article</Label>
                        <Select value={selectedArticleId} onValueChange={setSelectedArticleId}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Choose an article..." />
                            </SelectTrigger>
                            <SelectContent>
                                {getUnassignedArticles(showAddArticle || undefined).map((a) => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.title}
                                        <span className="text-muted-foreground ml-1">
                                            ({a.wordCount?.toLocaleString() || 0} words)
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {getUnassignedArticles(showAddArticle || undefined).length === 0 && (
                            <p className="text-[10px] text-muted-foreground mt-2">
                                No unassigned articles available. Create a new article first.
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddArticle(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddExistingArticle} disabled={!selectedArticleId}>
                            Add to Cluster
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
