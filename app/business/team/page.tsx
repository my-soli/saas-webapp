"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { toast } from "sonner";
import { Mail, Send, Users } from "lucide-react";
import BusinessLayout from "@/components/business/business-layout";

interface InviteFormState {
    accountManagerEmail: string;
    productionTeamEmail: string;
}

export default function BusinessTeamPage(): ReactElement {
    const [form, setForm] = useState<InviteFormState>({
        accountManagerEmail: "",
        productionTeamEmail: "",
    });
    const [sendingAccountManager, setSendingAccountManager] = useState(false);
    const [sendingProductionTeam, setSendingProductionTeam] = useState(false);

    const handleInviteAccountManager = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (!form.accountManagerEmail.trim()) return;
        setSendingAccountManager(true);
        await new Promise((resolve) => setTimeout(resolve, 800));
        toast.success(`Invite sent to ${form.accountManagerEmail}`);
        setForm((prev) => ({ ...prev, accountManagerEmail: "" }));
        setSendingAccountManager(false);
    };

    const handleInviteProductionTeam = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (!form.productionTeamEmail.trim()) return;
        setSendingProductionTeam(true);
        await new Promise((resolve) => setTimeout(resolve, 800));
        toast.success(`Invite sent to ${form.productionTeamEmail}`);
        setForm((prev) => ({ ...prev, productionTeamEmail: "" }));
        setSendingProductionTeam(false);
    };

    return (
        <BusinessLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <a href="/business/dashboard" className="hover:text-brand-blue">
                            Business Portal
                        </a>
                        <span>/</span>
                        <span className="text-gray-900">Team</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Invite your team members to manage your print shop
                        </p>
                    </div>
                </div>
            </header>

            <main className="bg-gray-50 min-h-screen">
                <div className="px-4 lg:px-8 py-4 lg:py-6 space-y-6 max-w-3xl">
                    {/* Invite cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Account Manager */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue/10">
                                    <Users className="h-5 w-5 text-brand-blue" />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-gray-900">Account Manager</h2>
                                    <p className="text-xs text-gray-500">Full access to clients, quotes & jobs</p>
                                </div>
                            </div>
                            <form onSubmit={handleInviteAccountManager} className="space-y-3">
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="colleague@company.com"
                                        value={form.accountManagerEmail}
                                        onChange={(e) =>
                                            setForm((prev) => ({ ...prev, accountManagerEmail: e.target.value }))
                                        }
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={sendingAccountManager || !form.accountManagerEmail.trim()}
                                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send className="h-4 w-4" />
                                    {sendingAccountManager ? "Sending..." : "Send Invite"}
                                </button>
                            </form>
                        </div>

                        {/* Production Team */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-yellow/10">
                                    <Users className="h-5 w-5 text-brand-yellow" />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-gray-900">Production Team</h2>
                                    <p className="text-xs text-gray-500">Access to jobs, LPOs & vendors</p>
                                </div>
                            </div>
                            <form onSubmit={handleInviteProductionTeam} className="space-y-3">
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="colleague@company.com"
                                        value={form.productionTeamEmail}
                                        onChange={(e) =>
                                            setForm((prev) => ({ ...prev, productionTeamEmail: e.target.value }))
                                        }
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={sendingProductionTeam || !form.productionTeamEmail.trim()}
                                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send className="h-4 w-4" />
                                    {sendingProductionTeam ? "Sending..." : "Send Invite"}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Current team members */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-base font-semibold text-gray-900">Current Team Members</h2>
                        </div>
                        <div className="px-6 py-12 text-center">
                            <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-500">No team members yet.</p>
                            <p className="text-sm text-gray-400 mt-1">
                                Invite your first team member above.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </BusinessLayout>
    );
}
