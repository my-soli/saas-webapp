"use client";

import type { ReactElement } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import OrchestrationControlTowerWorkspace from "@/features/production-orchestration/components/OrchestrationControlTowerWorkspace";

export default function AdminOrchestrationPage(): ReactElement {
    return (
        <AdminLayout>
            <OrchestrationControlTowerWorkspace basePath="/admin" />
        </AdminLayout>
    );
}
