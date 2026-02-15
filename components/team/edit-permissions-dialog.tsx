"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { updateUserRoles, getUserRolesForUser } from "@/app/actions/user-roles"
import { ROLE_DISPLAY_NAMES } from "@/lib/role-permissions"

interface EditPermissionsDialogProps {
    isOpen: boolean
    onClose: () => void
    user: {
        name: string // This is the email in Frappe
        full_name: string
        roles?: string[]
    } | null
    onSave: () => void
}

export function EditPermissionsDialog({
    isOpen,
    onClose,
    user,
    onSave,
}: EditPermissionsDialogProps) {
    const [selectedRoles, setSelectedRoles] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Initialize roles when user changes
    useEffect(() => {
        async function fetchRoles() {
            if (user) {
                setLoading(true)
                try {
                    const roles = await getUserRolesForUser(user.name)
                    setSelectedRoles(roles)
                } catch (error) {
                    console.error("Failed to fetch user roles", error)
                } finally {
                    setLoading(false)
                }
            }
        }

        if (isOpen && user) {
            fetchRoles()
        }
    }, [user, isOpen])

    const handleToggleRole = (role: string) => {
        setSelectedRoles((prev) =>
            prev.includes(role)
                ? prev.filter((r) => r !== role)
                : [...prev, role]
        )
    }

    const handleSave = async () => {
        if (!user) return

        setSaving(true)
        try {
            const result = await updateUserRoles(user.name, selectedRoles)
            if (result.success) {
                onSave()
                onClose()
            } else {
                alert(result.error || "Failed to update roles")
            }
        } catch (error) {
            console.error("Failed to update roles:", error)
            alert("An error occurred while updating roles")
        } finally {
            setSaving(false)
        }
    }

    if (!user) return null

    // List of roles to manage - verified against ERPNext standard roles + custom ones
    const MANAGED_ROLES = [
        "System Manager",
        "Sales Manager",
        "Sales User",
        "Accounts Manager",
        "Accounts User",
        "Projects Manager",
        "Projects User",
        "Stock Manager",
        "Stock User",
    ]

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                        Edit Permissions
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        Manage access roles for <span className="font-medium text-slate-700 dark:text-slate-300">{user.full_name}</span> ({user.name}).
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="space-y-4">
                        {MANAGED_ROLES.map((role) => {
                            const isSelected = selectedRoles.includes(role)
                            return (
                                <div
                                    key={role}
                                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${isSelected
                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                                        : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
                                        }`}
                                    onClick={() => handleToggleRole(role)}
                                >
                                    <div
                                        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected
                                            ? "bg-blue-600 border-blue-600"
                                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                            }`}
                                    >
                                        {isSelected && (
                                            <span className="material-symbols-outlined text-white text-[16px] font-bold">
                                                check
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-medium ${isSelected ? "text-blue-900 dark:text-blue-100" : "text-slate-900 dark:text-slate-100"}`}>
                                            {ROLE_DISPLAY_NAMES[role] || role}
                                        </h4>
                                        <p className={`text-xs ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"}`}>
                                            {role === "System Manager" ? "Full administrative access to all modules." : `Access to ${role.replace(" Manager", "").replace(" User", "")} module.`}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
