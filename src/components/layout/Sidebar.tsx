"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Calendar, ListTodo, BarChart3, Settings, Plane, ChevronLeft, ChevronRight, Megaphone, LayoutGrid, Wrench, Workflow, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSession } from "next-auth/react"
import { getCurrentUserRole } from "@/app/settings/users/actions"

const rootLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Communications", href: "/communications", icon: MessageSquare },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Tasks", href: "/tasks", icon: ListTodo },
    { name: "Pipeline", href: "/pipeline", icon: LayoutGrid },
    { name: "Reporting", href: "/reporting", icon: BarChart3 },
    { name: "Marketing", href: "/marketing", icon: Megaphone },
    { name: "Tools", href: "/tools", icon: Wrench },
    { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()
    const { data: session } = useSession()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [realRole, setRealRole] = useState("Agent")

    useEffect(() => {
        const timer = setTimeout(() => {
            setMounted(true)
            const saved = localStorage.getItem("sidebar-collapsed")
            if (saved) {
                setIsCollapsed(saved === "true")
            }
        }, 0)

        async function fetchRole() {
            if (session?.user?.id) {
                const role = await getCurrentUserRole()
                setRealRole(role)
            }
        }
        fetchRole()

        return () => clearTimeout(timer)
    }, [session])

    useEffect(() => {
        if (mounted) {
            localStorage.setItem("sidebar-collapsed", String(isCollapsed))
        }
    }, [isCollapsed, mounted])

    const toggleCollapse = () => {
        const newValue = !isCollapsed
        setIsCollapsed(newValue)
        localStorage.setItem("sidebar-collapsed", String(newValue))
    }

    return (
        <div className={cn("relative flex flex-col h-full border-r bg-background transition-all duration-300", isCollapsed ? "w-[72px] px-2 py-6" : "w-64 px-4 py-6")}>
            <button
                onClick={toggleCollapse}
                className="absolute -right-3 top-8 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground shadow-sm z-10"
            >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            <div className={cn("flex items-center mb-10", isCollapsed ? "justify-center" : "gap-3 px-2")}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow">
                    <Plane className="h-6 w-6" />
                </div>
                {!isCollapsed && (
                    <div className="overflow-hidden">
                        <h2 className="text-lg font-semibold tracking-tight whitespace-nowrap">AFCrashpad</h2>
                        <p className="text-xs text-muted-foreground font-medium whitespace-nowrap">CRM Portal</p>
                    </div>
                )}
            </div>

            <nav className="flex-1 space-y-1">
                {rootLinks.map((link) => {
                    const isActive = pathname.startsWith(link.href)
                    const Icon = link.icon

                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            title={isCollapsed ? link.name : undefined}
                            className={cn(
                                "flex items-center rounded-md font-medium transition-colors",
                                isCollapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2 text-sm",
                                isActive
                                    ? "bg-secondary text-secondary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
                            {!isCollapsed && <span>{link.name}</span>}
                        </Link>
                    )
                })}
            </nav>

            <div className={cn("mt-auto flex items-center border-t pt-4", isCollapsed ? "justify-center" : "gap-3 px-2")}>
                <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarImage src={session?.user?.image || undefined} />
                    <AvatarFallback>{session?.user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                    <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm font-medium">
                            {session?.user?.name || "Loading..."}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                            {realRole}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
