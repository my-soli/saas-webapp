"use client";

import { useState, type ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import AdminLayout from "@/components/admin/admin-layout";
import StatusPill from "@/components/admin/status-pill";
import { ArrowLeft, Loader2, Wifi } from "lucide-react";
import {
    fetchEtimsSettings,
    updateEtimsSettings,
    testEtimsConnection,
    type EtimsSettingsPayload,
} from "@/services/etims-settings";

const MASKED = "••••••••";

export default function EtimsSettingsPage(): ReactElement {
    const queryClient = useQueryClient();
    const { data: settings, isLoading } = useQuery({ queryKey: ["etims-settings"], queryFn: fetchEtimsSettings });

    const [editedFields, setEditedFields] = useState<EtimsSettingsPayload>({});
    const form: EtimsSettingsPayload = { ...settings, ...editedFields };

    const saveMutation = useMutation({
        mutationFn: (payload: EtimsSettingsPayload) => updateEtimsSettings(payload),
        onSuccess: (data) => {
            queryClient.setQueryData(["etims-settings"], data);
            setEditedFields({});
            toast.success("eTIMS settings saved");
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const testMutation = useMutation({
        mutationFn: testEtimsConnection,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["etims-settings"] });
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    function set<K extends keyof EtimsSettingsPayload>(key: K, value: EtimsSettingsPayload[K]) {
        setEditedFields((prev) => ({ ...prev, [key]: value }));
    }

    if (isLoading || !settings) {
        return (
            <AdminLayout>
                <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 lg:py-6">
                    <Link href="/admin/financial" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-1">
                        <ArrowLeft className="w-3.5 h-3.5" /> Invoices
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">eTIMS Settings</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        KRA eTIMS (OSCU/VSCU) connection. This is scaffolding only — no real KRA credentials are wired up yet.
                    </p>
                </div>
            </header>

            <div className="p-4 lg:p-8 max-w-2xl">
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-900">Connection Status</p>
                            <p className="text-xs text-gray-400">Last checked: {settings.last_connection_check_at ? new Date(settings.last_connection_check_at).toLocaleString() : "Never"}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <StatusPill
                                label={settings.last_connection_status === "ok" ? "Connected" : settings.last_connection_status === "failed" ? "Failed" : "Not Tested"}
                                tone={settings.last_connection_status === "ok" ? "success" : settings.last_connection_status === "failed" ? "danger" : "neutral"}
                            />
                            <button type="button" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}
                                className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60">
                                {testMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                                Test Connection
                            </button>
                        </div>
                    </div>

                    <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 cursor-pointer w-fit">
                        <input type="checkbox" checked={!!form.is_enabled} onChange={(e) => set("is_enabled", e.target.checked)} />
                        <span className="text-sm font-medium text-gray-700">Enable eTIMS submissions</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Environment</label>
                            <select value={form.environment ?? "sandbox"} onChange={(e) => set("environment", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent">
                                <option value="sandbox">Sandbox</option>
                                <option value="production">Production</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Device Type</label>
                            <select value={form.device_type ?? "vscu"} onChange={(e) => set("device_type", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent">
                                <option value="vscu">VSCU</option>
                                <option value="oscu">OSCU</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">KRA PIN</label>
                            <input type="text" value={form.kra_pin ?? ""} onChange={(e) => set("kra_pin", e.target.value)}
                                placeholder="P000111222X"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent font-mono" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Branch ID</label>
                            <input type="text" value={form.branch_id ?? ""} onChange={(e) => set("branch_id", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Device Serial Number</label>
                        <input type="text" value={form.device_serial_number ?? ""} onChange={(e) => set("device_serial_number", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">API Base URL</label>
                        <input type="text" value={form.api_base_url ?? ""} onChange={(e) => set("api_base_url", e.target.value)}
                            placeholder="Issued by KRA once onboarded"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">API Key</label>
                            <input type="password" value={form.api_key ?? ""} onChange={(e) => set("api_key", e.target.value)}
                                placeholder={settings.api_key === MASKED ? MASKED : ""}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">API Secret</label>
                            <input type="password" value={form.api_secret ?? ""} onChange={(e) => set("api_secret", e.target.value)}
                                placeholder={settings.api_secret === MASKED ? MASKED : ""}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Notes</label>
                        <textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none" />
                    </div>

                    <div className="flex justify-end pt-2 border-t border-gray-100">
                        <button type="button" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}
                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Settings
                        </button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
