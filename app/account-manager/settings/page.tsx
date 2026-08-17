"use client";

import type { ReactElement } from "react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import AccountManagerLayout from "@/components/account-manager/account-manager-layout";
import TotpSetupCard from "@/components/settings/TotpSetupCard";
import { changePassword } from "@/lib/api/auth";
import { Shield, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AccountManagerSettingsPage(): ReactElement {
    return (
        <Suspense fallback={null}>
            <AccountManagerSettingsPageInner />
        </Suspense>
    );
}

function AccountManagerSettingsPageInner(): ReactElement {
    const searchParams = useSearchParams();
    const require2fa = searchParams.get("require2fa") === "1";
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pwStatus, setPwStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const passwordMutation = useMutation({
        mutationFn: () => changePassword({ old_password: currentPassword, new_password: newPassword }),
        onSuccess: () => {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPwStatus({ type: "success", message: "Password updated successfully." });
            toast.success("Password changed.");
            setTimeout(() => setPwStatus(null), 4000);
        },
        onError: (err: Error) => {
            setPwStatus({ type: "error", message: err.message || "Failed to update password." });
            toast.error("Failed to update password.");
        },
    });

    function handleChangePassword() {
        setPwStatus(null);
        if (!currentPassword || !newPassword || !confirmPassword) {
            setPwStatus({ type: "error", message: "Please fill in all fields." });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwStatus({ type: "error", message: "New passwords do not match." });
            return;
        }
        if (newPassword.length < 8) {
            setPwStatus({ type: "error", message: "New password must be at least 8 characters." });
            return;
        }
        passwordMutation.mutate();
    }

    const inputClass = "w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent";

    return (
        <AccountManagerLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 lg:py-6">
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage your account security and preferences</p>
                </div>
            </header>

            <main className="p-4 lg:p-8 max-w-2xl space-y-6">
                {require2fa && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-amber-900">Two-factor authentication is required for your role</p>
                            <p className="text-sm text-amber-700 mt-0.5">Admin and Account Manager accounts must set up an authenticator app before continuing.</p>
                        </div>
                    </div>
                )}
                {/* Change Password */}
                <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                    <div className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-brand-blue" />
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
                            <p className="text-sm text-gray-500">Update your login password</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <div className="relative">
                                <input
                                    type={showCurrent ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    autoComplete="current-password"
                                    className={inputClass + " pr-10"}
                                />
                                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <div className="relative">
                                <input
                                    type={showNew ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    autoComplete="new-password"
                                    className={inputClass + " pr-10"}
                                />
                                <button type="button" onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                    className={inputClass + " pr-10"}
                                />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {pwStatus && (
                        <div className={`flex items-center gap-2 text-sm ${pwStatus.type === "success" ? "text-green-600" : "text-red-600"}`}>
                            {pwStatus.type === "success"
                                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                            {pwStatus.message}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            onClick={handleChangePassword}
                            disabled={passwordMutation.isPending}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {passwordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                            Update Password
                        </button>
                    </div>
                </section>

                {/* 2FA */}
                <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-brand-blue" />
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Two-Factor Authentication</h2>
                            <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                        </div>
                    </div>
                    <TotpSetupCard />
                </section>
            </main>
        </AccountManagerLayout>
    );
}
