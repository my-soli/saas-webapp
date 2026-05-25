"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
    User, Mail, Lock, Phone, Building2, ArrowRight, ArrowLeft,
    CheckCircle, Loader2, Star, Users, Zap, Globe,
} from "lucide-react";
import { registerAccount, fetchSubscriptionPlans, createSubscription } from "@/services/subscription";
import { loginUserSession } from "@/lib/api/auth";
import type { SubscriptionPlan } from "@/types/subscription";

type Step = "type" | "details" | "plan" | "done";
type AccountType = "personal" | "subscriber";

interface FormState {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    confirm_password: string;
    phone: string;
    company: string;
}

const EMPTY_FORM: FormState = {
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
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
        if (form.password.length < 8) return "Password must be at least 8 characters.";
        if (form.password !== form.confirm_password) return "Passwords do not match.";
        if (accountType === "subscriber" && !form.company.trim()) return "Company name is required for subscriber accounts.";
        return null;
    }

    async function handleSubmitPersonal() {
        const err = validateDetails();
        if (err) { setError(err); return; }
        setError(null);
        setLoading(true);
        try {
            await registerAccount({
                first_name: form.first_name,
                last_name: form.last_name,
                email: form.email,
                password: form.password,
                phone: form.phone,
                company: form.company,
                portal_tier: "personal",
            });
            await loginUserSession({ username: form.email, password: form.password });
            setStep("done");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Registration failed");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmitSubscriber() {
        if (!selectedPlanId) { setError("Please select a plan."); return; }
        setError(null);
        setLoading(true);
        try {
            await registerAccount({
                first_name: form.first_name,
                last_name: form.last_name,
                email: form.email,
                password: form.password,
                phone: form.phone,
                company: form.company,
                portal_tier: "subscriber",
            });
            await loginUserSession({ username: form.email, password: form.password });
            await createSubscription({ plan: selectedPlanId, billing_cycle: billingCycle });
            setStep("done");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Registration failed");
        } finally {
            setLoading(false);
        }
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
                                    <p className="text-sm text-gray-500 mt-1">Full access to print management, multi-user team, analytics, and priority support. Subscription required.</p>
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
                                    onClick={() => setStep("details")}
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
                                <p className="text-sm text-gray-500">Fill in your information to create your account</p>
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
                                            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
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
                                            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
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
                                            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
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
                                            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
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
                                                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="password"
                                            value={form.password}
                                            onChange={(e) => setField("password", e.target.value)}
                                            placeholder="Min. 8 characters"
                                            autoComplete="new-password"
                                            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="password"
                                            value={form.confirm_password}
                                            onChange={(e) => setField("confirm_password", e.target.value)}
                                            placeholder="Re-enter password"
                                            autoComplete="new-password"
                                            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                        />
                                    </div>
                                    {form.confirm_password.length > 0 && form.password !== form.confirm_password && (
                                        <p className="text-xs text-red-500">Passwords do not match</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setStep("type"); setError(null); }}
                                    className="flex items-center gap-2 px-4 py-2.5 text-gray-600 text-sm hover:text-gray-900 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                                {accountType === "personal" ? (
                                    <button
                                        type="button"
                                        onClick={handleSubmitPersonal}
                                        disabled={loading}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white font-medium text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        Create Account
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const err = validateDetails();
                                            if (err) { setError(err); return; }
                                            setError(null);
                                            setStep("plan");
                                        }}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white font-medium text-sm rounded-lg hover:opacity-90 transition-opacity"
                                    >
                                        Choose Plan <ArrowRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step: Plan selection (subscriber only) */}
                    {step === "plan" && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-1">Choose your plan</h2>
                                <p className="text-sm text-gray-500">Start with a free 14-day trial — no payment required now</p>
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
                                    className="flex items-center gap-2 px-4 py-2.5 text-gray-600 text-sm hover:text-gray-900 transition-colors"
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
                                    Start Free Trial
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step: Done */}
                    {step === "done" && (
                        <div className="py-8 text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Welcome to PrintDuka!</h2>
                            <p className="text-gray-500 text-sm max-w-sm mx-auto">
                                {accountType === "subscriber"
                                    ? "Your business account and 14-day free trial have been set up. Explore your dashboard to get started."
                                    : "Your personal account is ready. You can now track orders, review proofs, and pay invoices."}
                            </p>
                            <button
                                type="button"
                                onClick={() => router.push(accountType === "subscriber" ? "/business/dashboard" : "/portal")}
                                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-brand-blue text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Go to Dashboard <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-6 text-center">
                    <p className="text-sm text-white/70">
                        Already have an account?{" "}
                        <Link href="/login" className="text-white font-medium hover:underline">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
