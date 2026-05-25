import ClientLayout from "@/components/client/client-layout";
import type { ReactNode } from "react";

export default function PortalLayout({ children }: { children: ReactNode }) {
    return <ClientLayout>{children}</ClientLayout>;
}
