"use client";

import type { ReactElement } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import DispatchWorkspace from "@/features/production-orchestration/components/DispatchWorkspace";

export default function AdminDispatchPage(): ReactElement {
    return (
        <AdminLayout>
            <DispatchWorkspace />
        </AdminLayout>
    );
}
