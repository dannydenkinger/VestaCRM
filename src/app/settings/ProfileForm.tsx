"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateProfile } from "./users/actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function ProfileForm({ initialName, initialPhone, email, role }: { initialName: string | null, initialPhone: string | null, email: string, role: string }) {
    const [name, setName] = useState(initialName || "")
    const [phone, setPhone] = useState(initialPhone || "")
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await updateProfile(name, phone)
            toast.success("Profile Updated", {
                description: "Your personal information has been saved.",
            })
        } catch (error) {
            toast.error("Error", {
                description: "Failed to update profile.",
            })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6 max-w-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-muted/20 p-4 border rounded-lg mb-6">
                <div>
                    <div className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">Email Address</div>
                    <div className="font-medium text-muted-foreground mt-1">{email}</div>
                </div>
                <div>
                    <div className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">System Role</div>
                    <div className="font-medium text-primary bg-primary/10 inline-flex px-2 py-0.5 rounded-md font-bold text-xs mt-1">{role}</div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Display Name</label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Phone Number</label>
                    <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                    />
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <Button onClick={handleSave} disabled={isSaving || (!name && !phone)}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </div>
    )
}
