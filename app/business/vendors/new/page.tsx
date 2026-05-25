"use client";

import type { ReactElement } from "react";
import VendorFormRoutePage from "@/features/vendors/components/VendorFormRoutePage";

export default function BusinessNewVendorPage(): ReactElement {
    return <VendorFormRoutePage context="staff" mode="create" />;
}
