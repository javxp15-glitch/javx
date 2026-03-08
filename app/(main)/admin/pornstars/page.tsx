"use client"

import { useState } from "react"
import { PornstarGrid } from "@/components/pornstar-grid"
import { PornstarForm } from "@/components/pornstar-form"
import { AdminLayout } from "@/components/admin-layout"

export default function PornstarsPage() {
    const [formOpen, setFormOpen] = useState(false)
    const [editingPornstar, setEditingPornstar] = useState<any>(null)
    const [refreshKey, setRefreshKey] = useState(0)

    const handleAdd = () => {
        setEditingPornstar(null)
        setFormOpen(true)
    }

    const handleEdit = (pornstar: any) => {
        setEditingPornstar({
            id: pornstar.id,
            name: pornstar.name,
            nameJp: pornstar.nameJp,
            slug: pornstar.slug,
            avatar: pornstar.avatar,
            height: pornstar.height?.toString() || "",
            cupSize: pornstar.cupSize,
            bust: pornstar.bust?.toString() || "",
            waist: pornstar.waist?.toString() || "",
            hip: pornstar.hip?.toString() || "",
            birthday: pornstar.birthday ? new Date(pornstar.birthday).toISOString().split("T")[0] : "",
            debutYear: pornstar.debutYear?.toString() || "",
            nationality: pornstar.nationality,
            bio: pornstar.bio,
        })
        setFormOpen(true)
    }

    const handleSuccess = () => {
        setRefreshKey(prev => prev + 1)
    }

    return (
        <AdminLayout>
            <PornstarGrid
                key={refreshKey}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={() => setRefreshKey(prev => prev + 1)}
            />

            <PornstarForm
                open={formOpen}
                onOpenChange={setFormOpen}
                initialData={editingPornstar}
                onSuccess={handleSuccess}
            />
        </AdminLayout>
    )
}

