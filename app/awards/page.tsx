"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Award, Medal, Star } from "lucide-react";
import { checkSession } from "@/lib/api/auth";
import Navbar from "@/components/ui/navbar";
import FooterSection from "@/components/ui/footer-section";
import type { PortalRole } from "@/types/auth";

const PORTAL_ROLE_LABELS: Record<PortalRole, string> = {
    admin: "Admin Portal",
    account_manager: "Account Manager Portal",
    production_team: "Staff Portal",
    business_admin: "Business Portal",
    client: "Client Portal",
    vendor: "Vendor Portal",
};

const ROLE_DASHBOARD: Record<PortalRole, string> = {
    client: "/portal",
    admin: "/admin/dashboard",
    account_manager: "/account-manager",
    production_team: "/production/dashboard",
    business_admin: "/business/dashboard",
    vendor: "/vendors",
};

// Dummy placeholders — swap in the real awards/recognitions when available.
const awards = [
    { icon: Trophy, title: "Best Print Innovator", year: "2024" },
    { icon: Award, title: "Excellence in Branding", year: "2023" },
    { icon: Medal, title: "Top SME Printer, Nairobi", year: "2023" },
    { icon: Star, title: "Customer Choice Award", year: "2022" },
];

export default function AwardsPage() {
    const { data: session } = useQuery({
        queryKey: ["home-session"],
        queryFn: checkSession,
        staleTime: 60_000,
        retry: false,
    });

    const portalLabel: string =
        session?.authenticated && session.user?.portal_role
            ? PORTAL_ROLE_LABELS[session.user.portal_role]
            : "Sign In";

    const portalHref: string =
        session?.authenticated && session.user?.portal_role
            ? ROLE_DASHBOARD[session.user.portal_role]
            : "/login";

    return (
        <>
            <Navbar portalLabel={portalLabel} portalHref={portalHref} />

            <section className="py-16 sm:py-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-xl text-center">
                        <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-blue">
                            Recognition
                        </span>
                        <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
                            Awards &amp; Recognition
                        </h1>
                        <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
                            A few of the milestones we&apos;re proudest of, on the way to
                            building brands through print.
                        </p>
                    </div>

                    <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {awards.map((award, index) => (
                            <motion.div
                                key={award.title}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
                                className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 sm:p-8 text-center shadow-sm ring-1 ring-black/5"
                            >
                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-yellow/15">
                                    <award.icon className="h-6 w-6 text-brand-yellow" strokeWidth={1.75} />
                                </span>
                                <p className="text-sm font-semibold text-foreground leading-snug">{award.title}</p>
                                <p className="text-xs text-muted-foreground">{award.year}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <FooterSection />
        </>
    );
}
