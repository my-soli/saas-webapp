"use client";

import type { ReactElement } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import ReconciliationWorkspace from "@/features/production-orchestration/components/ReconciliationWorkspace";

export default function AdminReconciliationPage(): ReactElement {
    return (
        <AdminLayout>
            <ReconciliationWorkspace />
        </AdminLayout>
    );
}
