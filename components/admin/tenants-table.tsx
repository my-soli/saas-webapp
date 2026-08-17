"use client";

import { useRef, useState } from "react";
import { MoreHorizontalIcon, PencilIcon, PowerIcon, Building2 } from "lucide-react";
import type { Tenant } from "@/types/tenant";

interface TenantsTableProps {
    tenants: Tenant[];
    onEditTenant: (tenant: Tenant) => void;
    onDeactivateTenant: (tenant: Tenant) => void;
}

function formatDate(dateString: string | undefined | null): string {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function TenantRowMenu({ onEdit, onDeactivate, isActive }: { onEdit: () => void; onDeactivate: () => void; isActive: boolean }) {
    const [open, setOpen] = useState<boolean>(false);
    const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);

    const handleOpen = (): void => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setMenuPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right });
        }
        setOpen((prev) => !prev);
    };

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={handleOpen}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
                <MoreHorizontalIcon className="h-4 w-4" />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div
                        style={{ top: menuPos.top, right: menuPos.right }}
                        className="fixed z-50 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                    >
                        <button
                            type="button"
                            onClick={() => { onEdit(); setOpen(false); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            <PencilIcon className="h-4 w-4" />
                            Edit
                        </button>
                        <div className="my-1 border-t border-gray-100" />
                        <button
                            type="button"
                            onClick={() => { onDeactivate(); setOpen(false); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
                        >
                            <PowerIcon className="h-4 w-4" />
                            {isActive ? "Deactivate" : "Reactivate"}
                        </button>
                    </div>
                </>
            )}
        </>
    );
}

export default function TenantsTable({ tenants, onEditTenant, onDeactivateTenant }: TenantsTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Tenant
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hidden md:table-cell">
                            Subdomain
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hidden lg:table-cell">
                            Contact
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hidden lg:table-cell">
                            Members
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hidden md:table-cell">
                            Joined
                        </th>
                        <th className="px-4 py-3" />
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {tenants.map((tenant) => (
                        <tr key={tenant.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-blue/10">
                                        {tenant.logo ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={tenant.logo} alt={tenant.name} className="h-9 w-9 rounded-lg object-cover" />
                                        ) : (
                                            <Building2 className="h-4 w-4 text-brand-blue" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-gray-900">{tenant.name}</p>
                                        <p className="truncate text-xs text-gray-500 md:hidden">{tenant.subdomain}.printduka.co.ke</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                                <span className="text-sm text-gray-600">{tenant.subdomain}.printduka.co.ke</span>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                                <span className="text-sm text-gray-600">{tenant.contact_email || "—"}</span>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                                <span className="text-sm text-gray-600">{tenant.member_count}</span>
                            </td>
                            <td className="px-4 py-3">
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tenant.is_active
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-100 text-gray-600"
                                        }`}
                                >
                                    <span className={`h-1.5 w-1.5 rounded-full ${tenant.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                                    {tenant.is_active ? "Active" : "Inactive"}
                                </span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                                <span className="text-sm text-gray-600">{formatDate(tenant.created_at)}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <TenantRowMenu
                                    isActive={tenant.is_active}
                                    onEdit={() => onEditTenant(tenant)}
                                    onDeactivate={() => onDeactivateTenant(tenant)}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
