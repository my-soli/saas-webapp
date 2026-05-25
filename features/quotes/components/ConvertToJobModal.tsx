"use client";

import { useState } from "react";
import { X, Briefcase } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { MultiProductQuote } from "@/types/quotes";

interface ProductionMember {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
}

interface ConvertToJobModalProps {
    quote: MultiProductQuote;
    onClose: () => void;
    onConfirm: (ownerUserId: number | null, lineItemAssignments: { line_item_id: number; user_id: number | null }[]) => void;
    isLoading?: boolean;
}

async function fetchProductionTeam(): Promise<{ results: ProductionMember[] }> {
    const response = await fetch("/api/proxy/api/v1/users/production_team/", {
        credentials: "include",
        cache: "no-store",
    });
    if (!response.ok) throw new Error("Failed to fetch production team");
    return response.json();
}

function getMemberName(member: ProductionMember): string {
    return `${member.first_name} ${member.last_name}`.trim() || member.username;
}

export default function ConvertToJobModal({ quote, onClose, onConfirm, isLoading }: ConvertToJobModalProps) {
    const [ownerUserId, setOwnerUserId] = useState<number | null>(null);

    const { data: teamData, isLoading: teamLoading } = useQuery({
        queryKey: ["production-team"],
        queryFn: fetchProductionTeam,
    });

    const members = teamData?.results ?? [];

    const handleConfirm = () => {
        onConfirm(ownerUserId, []);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-200 p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-brand-green/10 rounded-lg flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-brand-green" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Convert to Job</h2>
                            <p className="text-xs text-gray-500">{quote.quote_id}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    <p className="text-sm text-gray-600">
                        This will approve the quote and create a job. Assign a Production Team member as the job owner.
                    </p>

                    {/* Job Owner */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Job Owner (Production Team)
                            <span className="ml-1 text-gray-400 font-normal">— optional</span>
                        </label>
                        {teamLoading ? (
                            <div className="h-9 bg-gray-100 rounded animate-pulse" />
                        ) : (
                            <select
                                value={ownerUserId ?? ""}
                                onChange={(e) => setOwnerUserId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                            >
                                <option value="">Unassigned</option>
                                {members.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {getMemberName(m)}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-4 flex items-center justify-end gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-brand-green rounded-md hover:bg-brand-green/90 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? "Converting…" : "Convert to Job"}
                    </button>
                </div>
            </div>
        </div>
    );
}
