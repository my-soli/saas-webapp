"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/admin-layout";
import Tabs from "@/components/admin/tabs";
import { fetchSettings, updateSettings } from "@/lib/api/settings";
import { SystemSettings, UpdateSettingsPayload } from "@/types/settings";
import { LoaderOne } from "@/components/ui/loader";
import { Save, Settings as SettingsIcon, Bell, Shield, CheckCircle2, AlertCircle, SlidersHorizontal } from "lucide-react";
import TotpSetupCard from "@/components/settings/TotpSetupCard";

type TabType = "general" | "notifications" | "security" | "platform";

export default function SettingsPage() {
    return (
        <Suspense fallback={<LoaderOne />}>
            <SettingsPageInner />
        </Suspense>
    );
}

function SettingsPageInner() {
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const requestedTab = searchParams.get("tab");
    const require2fa = searchParams.get("require2fa") === "1";
    const [activeTab, setActiveTab] = useState<TabType>(requestedTab === "security" ? "security" : "general");
    const [formData, setFormData] = useState<SystemSettings>({});
    const [hasChanges, setHasChanges] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const { data: settings, isLoading, error } = useQuery({
        queryKey: ["settings"],
        queryFn: fetchSettings,
        retry: 1,
    });

    const updateMutation = useMutation({
        mutationFn: updateSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settings"] });
            setHasChanges(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        },
    });

    useEffect(() => {
        if (settings) {
            setFormData(settings);
        }
    }, [settings]);

    const handleChange = (key: string, value: string | boolean | number) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        await updateMutation.mutateAsync(formData as UpdateSettingsPayload);
    };

    const tabs = [
        {
            key: "general" as TabType,
            label: "General",
            icon: SettingsIcon,
            description: "Basic site configuration and branding settings"
        },
        {
            key: "notifications" as TabType,
            label: "Notifications",
            icon: Bell,
            description: "Email notifications and digest preferences"
        },
        {
            key: "security" as TabType,
            label: "Security",
            icon: Shield,
            description: "User authentication and session management"
        },
        {
            key: "platform" as TabType,
            label: "Platform",
            icon: SlidersHorizontal,
            description: "Tax rates, turnaround times, and business rules"
        },
    ];

    if (isLoading) {
        return (
            <AdminLayout>
                <header className="border-b border-gray-200 bg-white">
                    <div className="px-4 lg:px-8 py-4 lg:py-6">
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-3"></div>
                        <div className="h-4 w-96 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                </header>
                <div className="p-4 lg:p-8">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 lg:p-8">
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i}>
                                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                                    <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div className="p-4 lg:p-8">
                    <div className="text-center py-12">
                        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load settings</h3>
                        <p className="text-sm text-gray-500">Please refresh the page or try again later.</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 lg:px-8 py-4 lg:py-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Configure system-wide settings and preferences.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {saveSuccess && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-sm font-medium">Saved</span>
                            </div>
                        )}
                        {hasChanges && (
                            <button
                                onClick={handleSave}
                                disabled={updateMutation.isPending}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                            >
                                {updateMutation.isPending ? (
                                    <>
                                        <LoaderOne variant="light" />
                                        <span className="ml-2">Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="p-4 lg:p-8">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <Tabs
                        tabs={tabs.map(tab => ({
                            id: tab.key,
                            label: tab.label,
                            icon: tab.icon,
                            description: tab.description,
                        }))}
                        activeTab={activeTab}
                        onTabChange={(key) => setActiveTab(key as TabType)}
                    />

                    <div className="p-4 lg:p-8">
                        {activeTab === "general" && (
                            <div className="space-y-6 max-w-2xl">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Site Title
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.site_title || ""}
                                        onChange={(e) => handleChange("site_title", e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                        placeholder="Print Duka"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Support Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.support_email || ""}
                                            onChange={(e) => handleChange("support_email", e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                            placeholder="support@printduka.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Default Currency
                                        </label>
                                        <select
                                            value={formData.currency || "KES"}
                                            onChange={(e) => handleChange("currency", e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                        >
                                            <option value="KES">KES (Kenyan Shilling)</option>
                                            <option value="USD">USD (US Dollar)</option>
                                            <option value="EUR">EUR (Euro)</option>
                                            <option value="GBP">GBP (British Pound)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Timezone
                                    </label>
                                    <select
                                        value={formData.timezone || "Africa/Nairobi"}
                                        onChange={(e) => handleChange("timezone", e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                    >
                                        <option value="Africa/Nairobi">Africa/Nairobi (GMT+3)</option>
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">America/New York (EST/EDT)</option>
                                        <option value="Europe/London">Europe/London (GMT/BST)</option>
                                    </select>
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.maintenance_mode || false}
                                            onChange={(e) => handleChange("maintenance_mode", e.target.checked)}
                                            className="mt-1 h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                                        />
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">Maintenance Mode</div>
                                            <div className="text-sm text-gray-500">Only admins can access the site when enabled</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === "notifications" && (
                            <div className="space-y-6 max-w-2xl">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.email_on_order || false}
                                        onChange={(e) => handleChange("email_on_order", e.target.checked)}
                                        className="mt-1 h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">New Order Alerts</div>
                                        <div className="text-sm text-gray-500">Receive email when a new LPO is created</div>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.email_on_quote || false}
                                        onChange={(e) => handleChange("email_on_quote", e.target.checked)}
                                        className="mt-1 h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">Quote Approval Alerts</div>
                                        <div className="text-sm text-gray-500">Receive email when a client approves a quote</div>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.daily_digest || false}
                                        onChange={(e) => handleChange("daily_digest", e.target.checked)}
                                        className="mt-1 h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">Daily Digest</div>
                                        <div className="text-sm text-gray-500">Receive a daily summary of all activities at 8:00 AM</div>
                                    </div>
                                </label>
                            </div>
                        )}

                        {activeTab === "security" && (
                            <div className="space-y-6 max-w-2xl">
                                {require2fa && (
                                    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-amber-900">Two-factor authentication is required for your role</p>
                                            <p className="text-sm text-amber-700 mt-0.5">Admin and Account Manager accounts must set up an authenticator app before continuing.</p>
                                        </div>
                                    </div>
                                )}
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.allow_registration || false}
                                        onChange={(e) => handleChange("allow_registration", e.target.checked)}
                                        className="mt-1 h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">Allow Public Registration</div>
                                        <div className="text-sm text-gray-500">If disabled, only admins can create new user accounts</div>
                                    </div>
                                </label>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Session Timeout (Minutes)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.session_timeout || 60}
                                        onChange={(e) => handleChange("session_timeout", parseInt(e.target.value))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                        min="5"
                                        max="1440"
                                    />
                                    <p className="mt-1 text-sm text-gray-500">Users will be logged out after this period of inactivity</p>
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Your Account Security</h3>
                                    <TotpSetupCard />
                                </div>
                            </div>
                        )}

                        {activeTab === "platform" && (
                            <div className="space-y-8 max-w-2xl">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 mb-4">Tax Rates</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Kenya VAT Rate (%)
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.tax_rate_ke ?? 16}
                                                onChange={(e) => handleChange("tax_rate_ke", parseFloat(e.target.value))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                            />
                                            <p className="mt-1 text-sm text-gray-500">Applied to all Kenya-based quotes</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Export VAT Rate (%)
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.tax_rate_export ?? 0}
                                                onChange={(e) => handleChange("tax_rate_export", parseFloat(e.target.value))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                            />
                                            <p className="mt-1 text-sm text-gray-500">Applied to export orders (usually 0%)</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <h3 className="text-base font-semibold text-gray-900 mb-4">Turnaround Times (Days)</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Standard
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.turnaround_standard ?? 7}
                                                onChange={(e) => handleChange("turnaround_standard", parseInt(e.target.value))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                                min="1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Rush
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.turnaround_rush ?? 3}
                                                onChange={(e) => handleChange("turnaround_rush", parseInt(e.target.value))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                                min="1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Expedited
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.turnaround_expedited ?? 1}
                                                onChange={(e) => handleChange("turnaround_expedited", parseInt(e.target.value))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                                min="1"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <h3 className="text-base font-semibold text-gray-900 mb-4">Quote &amp; OTP Settings</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Quote Validity (Days)
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.quote_validity_days ?? 30}
                                                onChange={(e) => handleChange("quote_validity_days", parseInt(e.target.value))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                                min="1"
                                            />
                                            <p className="mt-1 text-sm text-gray-500">How long a quote stays valid after creation</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                OTP Expiry (Minutes)
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.otp_expiry_minutes ?? 10}
                                                onChange={(e) => handleChange("otp_expiry_minutes", parseInt(e.target.value))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                                min="1"
                                                max="60"
                                            />
                                            <p className="mt-1 text-sm text-gray-500">Time before a one-time password expires</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-4">
                                    <p className="text-xs text-gray-400">
                                        Note: Tax rates and turnaround times stored here are informational. Changes take effect on new quotes and jobs after saving.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
