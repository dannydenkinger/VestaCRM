import Link from "next/link"
import { requireAuth } from "@/lib/auth-guard"
import { listLists } from "@/lib/lists/contact-lists"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ListPlus, Users } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ListsPage() {
    const session = await requireAuth()
    const workspaceId = (session.user as { workspaceId: string }).workspaceId
    const lists = await listLists(workspaceId)

    return (
        <div className="container mx-auto max-w-5xl py-10 px-4 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs text-muted-foreground mb-1">
                        <Link href="/email-marketing" className="hover:underline">
                            ← Email Marketing
                        </Link>
                    </div>
                    <h1 className="text-2xl font-semibold">Contact lists</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Group contacts into reusable audiences for campaigns.
                    </p>
                </div>
                <Link href="/email-marketing/lists/new">
                    <Button>
                        <ListPlus className="w-4 h-4 mr-2" />
                        New list
                    </Button>
                </Link>
            </div>

            {lists.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center space-y-3">
                        <Users className="w-10 h-10 mx-auto opacity-40" />
                        <div className="font-medium">No lists yet</div>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            Create your first list to start grouping contacts. Lists make it easy to
                            send campaigns to specific audiences.
                        </p>
                        <Link href="/email-marketing/lists/new">
                            <Button>
                                <ListPlus className="w-4 h-4 mr-2" />
                                Create your first list
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {lists.map((l) => (
                        <Link key={l.id} href={`/email-marketing/lists/${l.id}`}>
                            <Card className="hover:bg-muted/40 transition-colors cursor-pointer h-full">
                                <CardContent className="py-4">
                                    <div className="flex items-start justify-between gap-3 mb-1">
                                        <div className="font-medium truncate">{l.name}</div>
                                        <div className="text-xs text-muted-foreground tabular-nums shrink-0">
                                            {l.contactCount.toLocaleString()}
                                        </div>
                                    </div>
                                    {l.description && (
                                        <div className="text-xs text-muted-foreground line-clamp-2">
                                            {l.description}
                                        </div>
                                    )}
                                    <div className="text-[11px] text-muted-foreground mt-2">
                                        Updated {new Date(l.updatedAt).toLocaleDateString()}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
