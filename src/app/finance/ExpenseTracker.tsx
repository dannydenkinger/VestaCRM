"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, DollarSign, Tag, TrendingDown } from "lucide-react"
import { toast } from "sonner"
import { getExpenses, createExpense, updateExpense, deleteExpense } from "./expense-actions"

export interface Expense {
    id: string
    description: string
    amount: number
    category: string
    date: string
    notes?: string
    createdAt?: string
}

const CATEGORIES = [
    "Property Maintenance",
    "Utilities",
    "Marketing & Advertising",
    "Software & Tools",
    "Travel",
    "Insurance",
    "Furnishings",
    "Cleaning",
    "Office Supplies",
    "Professional Services",
    "Taxes & Fees",
    "Other",
]

const CATEGORY_COLORS: Record<string, string> = {
    "Property Maintenance": "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "Utilities": "bg-amber-500/10 text-amber-600 border-amber-500/20",
    "Marketing & Advertising": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "Software & Tools": "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    "Travel": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    "Insurance": "bg-rose-500/10 text-rose-600 border-rose-500/20",
    "Furnishings": "bg-orange-500/10 text-orange-600 border-orange-500/20",
    "Cleaning": "bg-teal-500/10 text-teal-600 border-teal-500/20",
    "Office Supplies": "bg-gray-500/10 text-gray-600 border-gray-500/20",
    "Professional Services": "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    "Taxes & Fees": "bg-red-500/10 text-red-600 border-red-500/20",
    "Other": "bg-slate-500/10 text-slate-600 border-slate-500/20",
}

interface ExpenseTrackerProps {
    dateFilter: { start: string; end: string } | null
}

export function ExpenseTracker({ dateFilter }: ExpenseTrackerProps) {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [showDialog, setShowDialog] = useState(false)
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [categoryFilter, setCategoryFilter] = useState("all")

    // Form fields
    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [category, setCategory] = useState(CATEGORIES[0])
    const [date, setDate] = useState(new Date().toISOString().split("T")[0])
    const [notes, setNotes] = useState("")
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadExpenses()
    }, [])

    const loadExpenses = async () => {
        setLoading(true)
        const res = await getExpenses()
        if (res.success && res.data) {
            setExpenses(res.data as Expense[])
        }
        setLoading(false)
    }

    const filteredExpenses = useMemo(() => {
        let filtered = expenses
        if (categoryFilter !== "all") {
            filtered = filtered.filter(e => e.category === categoryFilter)
        }
        if (dateFilter) {
            const start = new Date(dateFilter.start)
            const end = new Date(dateFilter.end)
            filtered = filtered.filter(e => {
                const d = new Date(e.date)
                return d >= start && d <= end
            })
        }
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [expenses, categoryFilter, dateFilter])

    const totalExpenses = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses])

    const categoryBreakdown = useMemo(() => {
        const map: Record<string, number> = {}
        filteredExpenses.forEach(e => {
            map[e.category] = (map[e.category] || 0) + e.amount
        })
        return Object.entries(map).sort(([, a], [, b]) => b - a)
    }, [filteredExpenses])

    const resetForm = () => {
        setShowDialog(false)
        setEditingExpense(null)
        setDescription("")
        setAmount("")
        setCategory(CATEGORIES[0])
        setDate(new Date().toISOString().split("T")[0])
        setNotes("")
    }

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense)
        setDescription(expense.description)
        setAmount(String(expense.amount))
        setCategory(expense.category)
        setDate(expense.date)
        setNotes(expense.notes || "")
        setShowDialog(true)
    }

    const handleSave = async () => {
        if (!description.trim() || !amount) return
        setSaving(true)
        const data = {
            description: description.trim(),
            amount: Number(amount),
            category,
            date,
            notes: notes.trim() || undefined,
        }

        if (editingExpense) {
            const res = await updateExpense(editingExpense.id, data)
            if (res.success) {
                toast.success("Expense updated")
                loadExpenses()
            } else {
                toast.error(res.error || "Failed to update")
            }
        } else {
            const res = await createExpense(data)
            if (res.success) {
                toast.success("Expense added")
                loadExpenses()
            } else {
                toast.error(res.error || "Failed to add")
            }
        }
        setSaving(false)
        resetForm()
    }

    const handleDelete = async (id: string) => {
        const res = await deleteExpense(id)
        if (res.success) {
            toast.success("Expense deleted")
            setExpenses(prev => prev.filter(e => e.id !== id))
        } else {
            toast.error("Failed to delete")
        }
        setDeleteConfirm(null)
    }

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted/20 rounded-lg animate-pulse" />
                ))}
            </div>
        )
    }

    return (
        <>
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="border-none shadow-sm bg-card/40">
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Expenses</span>
                            <TrendingDown className="h-4 w-4 text-rose-500 opacity-70" />
                        </div>
                        <div className="text-xl font-bold text-rose-600 mt-1">${totalExpenses.toLocaleString()}</div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{filteredExpenses.length} entries</p>
                    </CardContent>
                </Card>
                {categoryBreakdown.slice(0, 3).map(([cat, total]) => (
                    <Card key={cat} className="border-none shadow-sm bg-card/40">
                        <CardContent className="pt-4 pb-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{cat}</span>
                                <Tag className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                            </div>
                            <div className="text-xl font-bold mt-1">${total.toLocaleString()}</div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0}% of total</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[200px] h-8 text-xs">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {CATEGORIES.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { resetForm(); setShowDialog(true); }}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Expense
                </Button>
            </div>

            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
                <Card className="border-none shadow-sm bg-card/40">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">By Category</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-3">
                            {categoryBreakdown.map(([cat, total]) => (
                                <div key={cat} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[cat] || ""}`}>{cat}</Badge>
                                        </div>
                                        <span className="font-bold">${total.toLocaleString()}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-primary/60 transition-all duration-500"
                                            style={{ width: `${totalExpenses > 0 ? (total / totalExpenses) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Expenses Table */}
            <Card className="border-none shadow-sm bg-card/40">
                <CardContent className="pt-4">
                    {filteredExpenses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm font-medium">No expenses recorded</p>
                            <p className="text-xs mt-1">Add your first expense to start tracking.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-xs text-muted-foreground">
                                        <th className="text-left py-2 font-semibold">Date</th>
                                        <th className="text-left py-2 font-semibold">Description</th>
                                        <th className="text-left py-2 font-semibold">Category</th>
                                        <th className="text-right py-2 font-semibold">Amount</th>
                                        <th className="text-right py-2 font-semibold w-20"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExpenses.map((expense) => (
                                        <tr key={expense.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors group">
                                            <td className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                                {new Date(expense.date).toLocaleDateString()}
                                            </td>
                                            <td className="py-2.5 text-xs font-medium">
                                                {expense.description}
                                                {expense.notes && (
                                                    <span className="text-[10px] text-muted-foreground ml-2">({expense.notes})</span>
                                                )}
                                            </td>
                                            <td className="py-2.5">
                                                <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[expense.category] || ""}`}>
                                                    {expense.category}
                                                </Badge>
                                            </td>
                                            <td className="py-2.5 text-xs font-bold text-right font-mono">${expense.amount.toLocaleString()}</td>
                                            <td className="py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(expense)}>
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteConfirm(expense.id)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div>
                        <label className="text-xs font-medium mb-1.5 block">Description</label>
                        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Plumbing repair" className="h-9" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium mb-1.5 block">Amount ($)</label>
                            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" className="h-9" />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1.5 block">Date</label>
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1.5 block">Category</label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1.5 block">Notes (optional)</label>
                        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." className="h-9" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving || !description.trim() || !amount}>
                        {saving ? "Saving..." : editingExpense ? "Update" : "Add"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    )
}
