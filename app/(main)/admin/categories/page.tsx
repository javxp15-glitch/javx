"use client"

import { CategoryManager } from "@/components/category-manager"
import { AdminLayout } from "@/components/admin-layout"

export default function CategoriesPage() {
    return (
        <AdminLayout>
            <CategoryManager />
        </AdminLayout>
    )
}
