"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordContent />
        </Suspense>
    );
}

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") ?? "";

    const [validating, setValidating] = useState(true);
    const [isValid, setIsValid] = useState(false);
    const [validationError, setValidationError] = useState("");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!token) {
            setValidating(false);
            setValidationError("No reset token provided.");
            return;
        }
        validateToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    async function validateToken() {
        try {
            const res = await fetch("/api/proxy/api/auth/validate-reset-token/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
            const data = await res.json().catch(() => ({})) as { valid?: boolean; detail?: string };
            if (res.ok && data.valid) {
                setIsValid(true);
            } else {
                setValidationError(data.detail || "Invalid or expired reset link.");
            }
        } catch {
            setValidationError("Could not validate the reset link. Please try again.");
        } finally {
            setValidating(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/proxy/api/auth/reset-password/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json().catch(() => ({})) as { detail?: string };
            if (res.ok) {
                setDone(true);
                toast.success("Password reset successfully!");
                setTimeout(() => router.push("/login"), 3000);
            } else if (res.status === 429) {
                const msg = "Too many attempts. Please wait a minute and try again.";
                setError(msg);
                toast.error(msg);
            } else {
                const msg = data.detail || "Failed to reset password. Please try again.";
                setError(msg);
                toast.error(msg);
            }
        } catch {
            const msg = "Unable to reach the server. Please check your connection.";
            setError(msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    }

    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-brand-blue animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Validating reset link...</p>
                </div>
            </div>
        );
    }

    if (!isValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <XCircle className="w-9 h-9 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Link expired or invalid</h1>
                    <p className="text-gray-500 text-sm mb-6">
                        {validationError || "This password reset link has expired or already been used."}
                    </p>
                    <Link
                        href="/forgot-password"
                        className="inline-block w-full py-3 px-4 bg-brand-blue text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity text-center"
                    >
                        Request a new link
                    </Link>
                    <div className="mt-4">
                        <Link href="/login" className="text-sm text-gray-400 hover:text-gray-600">
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <CheckCircle className="w-9 h-9 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Password reset!</h1>
                    <p className="text-gray-500 text-sm mb-6">
                        Your password has been updated. You&apos;ll be redirected to sign in shortly.
                    </p>
                    <Link
                        href="/login"
                        className="inline-block w-full py-3 px-4 bg-brand-blue text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity text-center"
                    >
                        Sign in now
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-blue via-brand-blue/90 to-brand-blue/80 px-4 py-12">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <Image src="/logo/pd.png" alt="PrintDuka" width={200} height={60} className="h-20 w-auto" priority />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Set a new password</h1>
                    <p className="text-white/80 text-sm">Choose a strong password for your account.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                New password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    disabled={submitting}
                                    placeholder="Min. 8 characters"
                                    className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400">Must be at least 8 characters</p>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Confirm new password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    id="confirmPassword"
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    disabled={submitting}
                                    placeholder="Re-enter your password"
                                    className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {confirmPassword.length > 0 && password !== confirmPassword && (
                                <p className="text-xs text-red-500">Passwords do not match</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !password || !confirmPassword}
                            className="w-full py-3 px-4 bg-brand-blue text-white font-semibold rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Resetting password...
                                </>
                            ) : (
                                "Reset password"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                        <Link href="/login" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
