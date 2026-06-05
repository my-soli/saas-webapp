"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, ChevronUp } from "lucide-react";
import { checkSession } from "@/lib/api/auth";
import type { StaffGroup } from "@/types/auth";

interface PortalDef {
    group: StaffGroup;
    label: string;
    href: string;
}

const PORTALS: PortalDef[] = [
    { group: "Admin",           label: "Admin Portal",       href: "/admin/dashboard" },
    { group: "Account Manager", label: "Account Manager",    href: "/account-manager" },
    { group: "Production Team", label: "Production Team",    href: "/production-team/dashboard" },
];

interface PortalSwitcherProps {
    current: StaffGroup;
}

export default function PortalSwitcher({ current }: PortalSwitcherProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const { data: session } = useQuery({
        queryKey: ["staff-session"],
        queryFn: checkSession,
        staleTime: 300_000,
        retry: false,
    });

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    if (!session?.user) return null;

    const { groups } = session.user;
    const accessible = PORTALS.filter((p) => groups.includes(p.group));

    // Only show if the user has access to more than one portal
    if (accessible.length <= 1) return null;

    const others = accessible.filter((p) => p.group !== current);

    return (
        <div ref={ref} className="relative px-4 pb-2">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
            >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">Switch Portal</span>
                <ChevronUp className={`w-3.5 h-3.5 transition-transform ${open ? "" : "rotate-180"}`} />
            </button>

            {open && (
                <div className="absolute bottom-full left-4 right-4 mb-1 bg-[#1e2433] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                        Switch to
                    </p>
                    {others.map((portal) => (
                        <button
                            key={portal.href}
                            onClick={() => {
                                setOpen(false);
                                localStorage.setItem("active-portal", portal.group);
                                window.location.href = portal.href;
                            }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <LayoutGrid className="w-3.5 h-3.5 shrink-0 text-brand-blue" />
                            {portal.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
