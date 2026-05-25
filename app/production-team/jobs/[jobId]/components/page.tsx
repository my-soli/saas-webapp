"use client";

import type { ReactElement } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import ComponentsBoardWorkspace from "@/features/production-orchestration/components/ComponentsBoardWorkspace";

export default function ComponentsBoardPage(): ReactElement {
    return (
        <AdminLayout>
            <ComponentsBoardWorkspace />
        </AdminLayout>
    );
}
