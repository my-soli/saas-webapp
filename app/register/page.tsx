"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
    User, Mail, Phone, Building2, ArrowRight, ArrowLeft,
    CheckCircle, Loader2, Star, Users, Zap, Globe, MailCheck,
} from "lucide-react";
import { fetchSubscriptionPlans } from "@/services/subscription";
import type { SubscriptionPlan } from "@/types/subscription";

type Step = "type" | "details" | "plan" | "check-email";
type AccountType = "personal" | "subscriber";

interface FormState {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company: string;
}

const EMPTY_FORM: FormState = {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
};

function PlanCard({ plan, selected, onSelect, billingCycle }: {
    plan: SubscriptionPlan;
    selected: boolean;
    onSelect: () => void;
    billingCycle: "monthly" | "annually";
}): ReactElement {
    const price = billingCycle === "annually" ? plan.price_annually : plan.price_monthly;
    const period = billingCycle === "annually" ? "yr" : "mo";

    return (
        <button
            type="button"
            onClick={onSelect}
            className={`relative w-full text-left rounded-xl border-2 p-5 transition-all ${
                selected
                    ? "border-brand-blue bg-brand-blue/5"
                    : "border-gray-200 hover:border-gray-300"
            } ${plan.is_featured ? "ring-2 ring-brand-yellow ring-offset-1" : ""}`}
        >
            {plan.is_featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-yellow text-brand-blue text-xs font-bold px-3 py-0.5 rounded-full">
                    Most Popular
                </span>
            )}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-semibold text-gray-900">{plan.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-brand-blue">
                        KES {Number(price).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">/{period}</p>
                </div>
            </div>
            <ul className="mt-3 space-y-1">
                {plan.features.slice(0, 4).map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        {f}
                    </li>
                ))}
                <li className="flex items-center gap-2 text-xs text-gray-600">
                    <Users className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                    Up to {plan.max_users} users
                </li>
                {plan.api_access && (
                    <li className="flex items-center gap-2 text-xs text-gray-600">
                        <Zap className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                        API access
                    </li>
                )}
                {plan.white_label && (
                    <li className="flex items-center gap-2 text-xs text-gray-600">
                        <Globe className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                        White-label branding
                    </li>
                )}
            </ul>
            {selected && (
                <div className="absolute top-3 right-3">
                    <CheckCircle className="w-5 h-5 text-brand-blue" />
                </div>
            )}
        </button>
    );
}

export default function RegisterPage(): ReactElement {
    const router = useRouter();
    const [step, setStep] = useState<Step>("type");
    const [accountType, setAccountType] = useState<AccountType>("personal");
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("monthly");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState("");

    const { data: plans = [] } = useQuery({
        queryKey: ["subscription-plans"],
        queryFn: fetchSubscriptionPlans,
        enabled: step === "plan",
    });

    function setField(key: keyof FormState, value: string) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function validateDetails(): string | null {
        if (!form.first_name.trim()) return "First name is required.";
        if (!form.last_name.trim()) return "Last name is required.";
        if (!form.email.trim()) return "Email is required.";
        if (!form.phone.trim()) return "Phone number is required.";
        if (accountType === "subscriber" && !form.company.trim()) return "Company name is required for subscriber accounts.";
        return null;
    }

    async function submitRegistration() {
        setError(null);
        setLoading(true);
        try {
            const payload: Record<string, string> = {
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim(),
                company: form.company.trim(),
                portal_tier: accountType === "subscriber" ? "subscriber" : "personal",
            };

            const res = await fetch("/api/proxy/api/v1/portal/register/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok || res.status === 200) {
                setSubmittedEmail(form.email.trim().toLowerCase());
                setStep("check-email");
            } else if (res.status === 429) {
                setError("Too many registration attempts. Please wait a minute and try again.");
            } else {
                const body = await res.json().catch(() => ({})) as Record<string, string | string[]>;
                const firstVal = Object.values(body)[0];
                const msg = Array.isArray(firstVal) ? firstVal[0] : (firstVal as string) ?? "Registration failed. Please try again.";
                setError(msg);
            }
        } catch {
            setError("Unable to reach the server. Please check your connection.");
        } finally {
            setLoading(false);
        }
    }

    function handleContinueToDetails() {
        setStep("details");
    }

    function handleDetailsNext() {
        const err = validateDetails();
        if (err) { setError(err); return; }
        setError(null);
        if (accountType === "personal") {
            submitRegistration();
        } else {
            setStep("plan");
        }
    }

    function handleSubmitSubscriber() {
        if (!selectedPlanId) { setError("Please select a plan."); return; }
        setError(null);
        submitRegistration();
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-blue via-brand-blue/90 to-brand-blue/80 px-4 py-12">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <Image src="/logo/pd.png" alt="PrintDuka" width={200} height={60} className="h-20 w-auto" priority />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Create Your Account</h1>
                    <p className="text-white/80">Join PrintDuka and manage your print projects</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Step: Type selection */}
                    {step === "type" && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-1">Choose account type</h2>
                                <p className="text-sm text-gray-500">Select how you want to use PrintDuka</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setAccountType("personal")}
                                    className={`p-5 rounded-xl border-2 text-left transition-all ${
                                        accountType === "personal"
                                            ? "border-brand-blue bg-brand-blue/5"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <User className="w-8 h-8 text-brand-blue mb-3" />
                                    <p className="font-semibold text-gray-900">Personal Account</p>
                                    <p className="text-sm text-gray-500 mt-1">Track your orders, pay invoices, and review proofs. Free, no subscription needed.</p>
                                    {accountType === "personal" && (
                                        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-blue">
                                            <CheckCircle className="w-3.5 h-3.5" /> Selected
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAccountType("subscriber")}
                                    className={`p-5 rounded-xl border-2 text-left transition-all relative ${
                                        accountType === "subscriber"
                                            ? "border-brand-blue bg-brand-blue/5"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <span className="absolute top-3 right-3 bg-brand-yellow text-brand-blue text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Star className="w-3 h-3" /> Business
                                    </span>
                                    <Building2 className="w-8 h-8 text-brand-blue mb-3" />
                                    <p className="font-semibold text-gray-900">Business Subscriber</p>
                                    <p className="text-sm text-gray-500 mt-1">Full access to print management, multi-user team, analytics, and priority support.</p>
                                    {accountType === "subscriber" && (
                                        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-blue">
                                            <CheckCircle className="w-3.5 h-3.5" /> Selected
                                        </span>
                                    )}
                                </button>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={handleContinueToDetails}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white font-medium text-sm rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Continue <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step: Details */}
                    {step === "details" && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                                    {accountType === "subscriber" ? "Business details" : "Your details"}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    We&apos;ll send a verification link to your email to activate your account.
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">First Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            value={form.first_name}
                                            onChange={(e) => setField("first_name", e.target.value)}
                                            placeholder="John"
                                            disabled={loading}
                                            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Last Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            value={form.last_name}
                                            onChange={(e) => setField("last_name", e.target.value)}
                                            placeholder="Doe"
                                            disabled={loading}
                                            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setField("email", e.target.value)}
                                            placeholder="john@company.com"
                                            disabled={loading}
                                            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="tel"
                                            value={form.phone}
                                            onChange={(e) => setField("phone", e.target.value)}
                                            placeholder="+254712345678"
                                            disabled={loading}
                                            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50"
                                        />
                                    </div>
                                </div>
                                {accountType === "subscriber" && (
                                    <div className="sm:col-span-2 space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Company Name</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                value={form.company}
                                                onChange={(e) => setField("company", e.target.value)}
                                                placeholder="Acme Ltd"
                                                disabled={loading}
                                                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setStep("type"); setError(null); }}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-4 py-2.5 text-gray-600 text-sm hover:text-gray-900 transition-colors disabled:opacity-50"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDetailsNext}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white font-medium text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {accountType === "personal" ? "Create Account" : <>Choose Plan <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step: Plan selection (subscriber only) */}
                    {step === "plan" && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-1">Choose your plan</h2>
                                <p className="text-sm text-gray-500">You&apos;ll set up billing after verifying your email.</p>
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
                            )}

                            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 w-fit">
                                <button
                                    type="button"
                                    onClick={() => setBillingCycle("monthly")}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                        billingCycle === "monthly" ? "bg-white text-brand-blue shadow-sm" : "text-gray-500"
                                    }`}
                                >
                                    Monthly
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBillingCycle("annually")}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                        billingCycle === "annually" ? "bg-white text-brand-blue shadow-sm" : "text-gray-500"
                                    }`}
                                >
                                    Annually <span className="text-xs text-green-600 font-semibold">Save up to 20%</span>
                                </button>
                            </div>

                            {plans.length === 0 ? (
                                <div className="py-8 text-center text-gray-400 text-sm">No plans available yet. Please contact us.</div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {plans.map((plan) => (
                                        <PlanCard
                                            key={plan.id}
                                            plan={plan}
                                            selected={selectedPlanId === plan.id}
                                            onSelect={() => setSelectedPlanId(plan.id)}
                                            billingCycle={billingCycle}
                                        />
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setStep("details"); setError(null); }}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-4 py-2.5 text-gray-600 text-sm hover:text-gray-900 transition-colors disabled:opacity-50"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmitSubscriber}
                                    disabled={loading || !selectedPlanId}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white font-medium text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    Create Account
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step: Check email */}
                    {step === "check-email" && (
                        <div className="py-6 text-center space-y-5">
                            <div className="flex justify-center">
                                <div className="w-20 h-20 rounded-full bg-brand-blue/10 flex items-center justify-center">
                                    <MailCheck className="w-10 h-10 text-brand-blue" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
                                <p className="text-gray-500 text-sm max-w-sm mx-auto">
                                    We&apos;ve sent a verification link to{" "}
                                    <span className="font-semibold text-gray-700">{submittedEmail}</span>.
                                    Click the link to set your password and activate your account.
                                </p>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left max-w-sm mx-auto">
                                <p className="text-xs text-amber-700 font-medium mb-1">Didn&apos;t receive the email?</p>
                                <ul className="text-xs text-amber-600 space-y-1 list-disc list-inside">
                                    <li>Check your spam or junk folder</li>
                                    <li>The link expires in 24 hours</li>
                                    <li>Contact us if you need help</li>
                                </ul>
                            </div>
                            <div className="pt-2">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-blue text-white font-medium rounded-lg hover:opacity-90 transition-opacity text-sm"
                                >
                                    Back to Sign In <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {step !== "check-email" && (
                    <div className="mt-6 text-center">
                        <p className="text-sm text-white/70">
                            Already have an account?{" "}
                            <Link href="/login" className="text-white font-medium hover:underline">Sign in</Link>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
