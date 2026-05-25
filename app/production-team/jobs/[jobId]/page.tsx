"use client";

import type { ReactElement } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import JobDetailWorkspace from "@/features/production-orchestration/components/JobDetailWorkspace";

export default function JobDetailPage(): ReactElement {
    return (
        <AdminLayout>
            <JobDetailWorkspace />
        </AdminLayout>
    );
}
