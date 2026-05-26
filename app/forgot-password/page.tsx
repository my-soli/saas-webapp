"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ForgotPasswordContent />
        </Suspense>
    );
}

function ForgotPasswordContent() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (!email.trim()) {
            setError("Please enter your email address.");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/proxy/api/auth/forgot-password/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });

            if (response.ok) {
                setSubmitted(true);
                toast.success("Check your email for a reset link.");
            } else if (response.status === 429) {
                const msg = "Too many attempts. Please wait a minute and try again.";
                setError(msg);
                toast.error(msg);
            } else {
                const data = await response.json().catch(() => ({})) as { detail?: string };
                const msg = data.detail || "Something went wrong. Please try again.";
                setError(msg);
                toast.error(msg);
            }
        } catch {
            const msg = "Unable to reach the server. Please check your connection.";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-blue via-brand-blue/90 to-brand-blue/80 px-4 py-12">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                            <CheckCircle className="w-9 h-9 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-3">Check your email</h1>
                        <p className="text-gray-500 text-sm mb-2">
                            If an account exists for <span className="font-semibold text-gray-700">{email}</span>, we&apos;ve sent a password reset link.
                        </p>
                        <p className="text-gray-400 text-xs mb-8">
                            The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => { setSubmitted(false); setEmail(""); }}
                                className="w-full py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Try a different email
                            </button>
                            <Link
                                href="/login"
                                className="block w-full py-2.5 px-4 bg-brand-blue text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity text-center"
                            >
                                Back to sign in
                            </Link>
                        </div>
                    </div>
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
                    <h1 className="text-3xl font-bold text-white mb-2">Forgot your password?</h1>
                    <p className="text-white/80 text-sm">
                        Enter your email and we&apos;ll send you a reset link.
                    </p>
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
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    disabled={loading}
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email.trim()}
                            className="w-full py-3 px-4 bg-brand-blue text-white font-semibold rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sending reset link...
                                </>
                            ) : (
                                "Send reset link"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
