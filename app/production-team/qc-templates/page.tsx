"use client";

import type { ReactElement } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import QCTemplatesWorkspace from "@/features/production-orchestration/components/QCTemplatesWorkspace";

export default function QCTemplatesPage(): ReactElement {
    return (
        <AdminLayout>
            <QCTemplatesWorkspace />
        </AdminLayout>
    );
}
