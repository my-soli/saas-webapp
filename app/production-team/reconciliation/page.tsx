"use client";

import type { ReactElement } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import ReconciliationWorkspace from "@/features/production-orchestration/components/ReconciliationWorkspace";

export default function ReconciliationPage(): ReactElement {
    return (
        <AdminLayout>
            <ReconciliationWorkspace />
        </AdminLayout>
    );
}
