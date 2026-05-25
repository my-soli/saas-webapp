"use client";

import type { ReactElement } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import ComponentDetailWorkspace from "@/features/production-orchestration/components/ComponentDetailWorkspace";

export default function ComponentDetailPage(): ReactElement {
    return (
        <AdminLayout>
            <ComponentDetailWorkspace />
        </AdminLayout>
    );
}
