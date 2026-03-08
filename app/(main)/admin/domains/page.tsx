"use client"

import { DomainManager } from "@/components/domain-manager"
import { AdminLayout } from "@/components/admin-layout"

export default function DomainsPage() {
  return (
    <AdminLayout>
      <DomainManager />
    </AdminLayout>
  )
}
