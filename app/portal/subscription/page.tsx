"use client";

import { useState, type ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    CreditCard, CheckCircle, AlertCircle, Loader2, RefreshCw,
    CalendarDays, Users, Zap, Globe, ArrowUpRight, XCircle,
} from "lucide-react";
import { fetchMySubscription, fetchSubscriptionPlans, updateSubscription, cancelSubscription, createSubscription } from "@/services/subscription";
import type { SubscriptionPlan, BillingCycle } from "@/types/subscription";

function StatusBadge({ status }: { status: string }): ReactElement {
    const map: Record<string, string> = {
        trial: "bg-blue-100 text-blue-700",
        active: "bg-green-100 text-green-700",
        past_due: "bg-orange-100 text-orange-700",
        cancelled: "bg-gray-100 text-gray-600",
        expired: "bg-red-100 text-red-700",
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
            {status.replace("_", " ")}
        </span>
    );
}

function PlanCard({ plan, currentPlanId, billingCycle, onSelect, loading }: {
    plan: SubscriptionPlan;
    currentPlanId: number;
    billingCycle: BillingCycle;
    onSelect: (id: number) => void;
    loading: boolean;
}): ReactElement {
    const isCurrent = plan.id === currentPlanId;
    const price = billingCycle === "annually" ? plan.price_annually : plan.price_monthly;
    const period = billingCycle === "annually" ? "yr" : "mo";

    return (
        <div className={`relative rounded-xl border-2 p-5 ${isCurrent ? "border-brand-blue bg-brand-blue/5" : "border-gray-200"} ${plan.is_featured ? "ring-2 ring-brand-yellow ring-offset-1" : ""}`}>
            {plan.is_featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-yellow text-brand-blue text-xs font-bold px-3 py-0.5 rounded-full">
                    Most Popular
                </span>
            )}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-semibold text-gray-900">{plan.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-brand-blue">KES {Number(price).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">/{period}</p>
                </div>
            </div>
            <ul className="mt-3 space-y-1 mb-4">
                {plan.features.slice(0, 4).map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> {f}
                    </li>
                ))}
                <li className="flex items-center gap-2 text-xs text-gray-600">
                    <Users className="w-3.5 h-3.5 text-brand-blue shrink-0" /> Up to {plan.max_users} users
                </li>
                {plan.api_access && (
                    <li className="flex items-center gap-2 text-xs text-gray-600">
                        <Zap className="w-3.5 h-3.5 text-brand-blue shrink-0" /> API access
                    </li>
                )}
                {plan.white_label && (
                    <li className="flex items-center gap-2 text-xs text-gray-600">
                        <Globe className="w-3.5 h-3.5 text-brand-blue shrink-0" /> White-label branding
                    </li>
                )}
            </ul>
            {isCurrent ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-brand-blue">
                    <CheckCircle className="w-4 h-4" /> Current plan
                </span>
            ) : (
                <button
                    type="button"
                    onClick={() => onSelect(plan.id)}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:underline disabled:opacity-50"
                >
                    <ArrowUpRight className="w-4 h-4" /> Switch to this plan
                </button>
            )}
        </div>
    );
}

export default function SubscriptionPage(): ReactElement {
    const queryClient = useQueryClient();
    const [cancelConfirm, setCancelConfirm] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [newPlanId, setNewPlanId] = useState<number | null>(null);
    const [newBillingCycle, setNewBillingCycle] = useState<BillingCycle>("monthly");

    function showToast(type: "success" | "error", message: string) {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    }

    const {
        data: subscription,
        isLoading: subLoading,
        isError: subError,
        error: subErrorObj,
    } = useQuery({
        queryKey: ["my-subscription"],
        queryFn: fetchMySubscription,
        retry: 1,
    });

    const { data: plans = [] } = useQuery({
        queryKey: ["subscription-plans"],
        queryFn: fetchSubscriptionPlans,
    });

    const changePlanMutation = useMutation({
        mutationFn: (plan_id: number) => updateSubscription({ plan_id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
            queryClient.invalidateQueries({ queryKey: ["portal-me"] });
            showToast("success", "Plan updated successfully.");
        },
        onError: (e: Error) => showToast("error", e.message),
    });

    const cancelMutation = useMutation({
        mutationFn: () => cancelSubscription(cancelReason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
            queryClient.invalidateQueries({ queryKey: ["portal-me"] });
            setCancelConfirm(false);
            showToast("success", "Subscription cancelled. Access continues until end of billing period.");
        },
        onError: (e: Error) => showToast("error", e.message),
    });

    const createMutation = useMutation({
        mutationFn: () => createSubscription({ plan: newPlanId!, billing_cycle: newBillingCycle }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
            queryClient.invalidateQueries({ queryKey: ["portal-me"] });
            showToast("success", "Subscription created! Your 14-day free trial has started.");
        },
        onError: (e: Error) => showToast("error", e.message),
    });

    const isCancelled = subscription?.status === "cancelled" || subscription?.status === "expired";

    return (
        <>
            <div className="p-4 lg:p-8 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-brand-black">Subscription</h1>
                    <p className="text-gray-600 mt-1">Manage your PrintDuka subscription and billing</p>
                </div>

                {toast && (
                    <div className={`flex items-center gap-3 p-4 rounded-lg border text-sm ${
                        toast.type === "success"
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-red-50 border-red-200 text-red-700"
                    }`}>
                        {toast.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                        {toast.message}
                    </div>
                )}

                {subLoading && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex items-center justify-center gap-3 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading subscription…</span>
                    </div>
                )}

                {subError && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-brand-blue" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">Choose a plan to get started</p>
                                    <p className="text-sm text-gray-500 mt-0.5">Start with a free 14-day trial — no payment required now</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 w-fit mb-5">
                                {(["monthly", "annually"] as BillingCycle[]).map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setNewBillingCycle(c)}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                            newBillingCycle === c ? "bg-white text-brand-blue shadow-sm" : "text-gray-500"
                                        }`}
                                    >
                                        {c === "monthly" ? "Monthly" : "Annually"}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {plans.map((plan) => {
                                    const price = newBillingCycle === "annually" ? plan.price_annually : plan.price_monthly;
                                    const period = newBillingCycle === "annually" ? "yr" : "mo";
                                    const isSelected = newPlanId === plan.id;
                                    return (
                                        <button
                                            key={plan.id}
                                            type="button"
                                            onClick={() => setNewPlanId(plan.id)}
                                            className={`relative w-full text-left rounded-xl border-2 p-5 transition-all ${
                                                isSelected ? "border-brand-blue bg-brand-blue/5" : "border-gray-200 hover:border-gray-300"
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
                                                    <p className="text-xl font-bold text-brand-blue">KES {Number(price).toLocaleString()}</p>
                                                    <p className="text-xs text-gray-400">/{period}</p>
                                                </div>
                                            </div>
                                            <ul className="mt-3 space-y-1">
                                                {plan.features.slice(0, 4).map((f, i) => (
                                                    <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> {f}
                                                    </li>
                                                ))}
                                                <li className="flex items-center gap-2 text-xs text-gray-600">
                                                    <Users className="w-3.5 h-3.5 text-brand-blue shrink-0" /> Up to {plan.max_users} users
                                                </li>
                                            </ul>
                                            {isSelected && (
                                                <div className="absolute top-3 right-3">
                                                    <CheckCircle className="w-5 h-5 text-brand-blue" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {plans.length === 0 && (
                                <p className="text-center text-sm text-gray-400 py-6">No plans available yet. Please contact us.</p>
                            )}

                            {plans.length > 0 && (
                                <div className="mt-5 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => createMutation.mutate()}
                                        disabled={!newPlanId || createMutation.isPending}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        Start Free Trial
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {subscription && (
                    <>
                        {/* Current plan summary */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                                        <CreditCard className="w-5 h-5 text-brand-blue" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{subscription.plan.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <StatusBadge status={subscription.status} />
                                            <span className="text-xs text-gray-400 capitalize">{subscription.billing_cycle}</span>
                                        </div>
                                    </div>
                                </div>
                                {!isCancelled && (
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-brand-blue">
                                            KES {Number(
                                                subscription.billing_cycle === "annually"
                                                    ? subscription.plan.price_annually
                                                    : subscription.plan.price_monthly
                                            ).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-400">/{subscription.billing_cycle === "annually" ? "yr" : "mo"}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <p className="text-xs text-gray-500">Status</p>
                                    <p className="text-sm font-medium text-gray-900 capitalize mt-0.5">{subscription.status.replace("_", " ")}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <CalendarDays className="w-3.5 h-3.5" /> Renews
                                    </div>
                                    <p className="text-sm font-medium text-gray-900 mt-0.5">
                                        {new Date(subscription.end_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <p className="text-xs text-gray-500">Days remaining</p>
                                    <p className={`text-sm font-medium mt-0.5 ${subscription.days_remaining <= 7 ? "text-orange-600" : "text-gray-900"}`}>
                                        {subscription.days_remaining} days
                                    </p>
                                </div>
                            </div>

                            {subscription.trial_ends_at && subscription.status === "trial" && (
                                <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700">
                                    <RefreshCw className="w-4 h-4 shrink-0" />
                                    Trial ends {new Date(subscription.trial_ends_at).toLocaleDateString("en-KE", { day: "numeric", month: "long" })} — no charge until then.
                                </div>
                            )}

                            {!isCancelled && (
                                <div className="mt-5 pt-5 border-t border-gray-100 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setCancelConfirm(true)}
                                        className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 transition-colors"
                                    >
                                        <XCircle className="w-4 h-4" /> Cancel subscription
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Plan switcher */}
                        {!isCancelled && plans.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Change plan</h2>
                                        <p className="text-sm text-gray-500 mt-0.5">Switch plans any time — changes take effect on next billing date</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                                        {(["monthly", "annually"] as BillingCycle[]).map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setBillingCycle(c)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                                    billingCycle === c ? "bg-white text-brand-blue shadow-sm" : "text-gray-500"
                                                }`}
                                            >
                                                {c === "monthly" ? "Monthly" : "Annually"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {plans.map((plan) => (
                                        <PlanCard
                                            key={plan.id}
                                            plan={plan}
                                            currentPlanId={subscription.plan.id}
                                            billingCycle={billingCycle}
                                            onSelect={(id) => changePlanMutation.mutate(id)}
                                            loading={changePlanMutation.isPending}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Payment history */}
                        {subscription.payments.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                                <h2 className="text-lg font-semibold text-gray-900">Payment history</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                                                <th className="pb-2 font-medium">Date</th>
                                                <th className="pb-2 font-medium">Amount</th>
                                                <th className="pb-2 font-medium">Method</th>
                                                <th className="pb-2 font-medium">Reference</th>
                                                <th className="pb-2 font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {subscription.payments.map((p) => (
                                                <tr key={p.id}>
                                                    <td className="py-3 text-gray-600">
                                                        {new Date(p.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                                                    </td>
                                                    <td className="py-3 font-medium">KES {Number(p.amount).toLocaleString()}</td>
                                                    <td className="py-3 capitalize text-gray-600">{p.payment_method.replace("_", " ")}</td>
                                                    <td className="py-3 text-gray-500 font-mono text-xs">{p.reference_number || "—"}</td>
                                                    <td className="py-3">
                                                        <StatusBadge status={p.status} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Cancel confirmation modal */}
                {cancelConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                    <XCircle className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Cancel subscription?</h3>
                                    <p className="text-sm text-gray-500">You will keep access until the end of your billing period.</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Reason (optional)</label>
                                <textarea
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    rows={3}
                                    placeholder="Tell us why you're cancelling…"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCancelConfirm(false)}
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    Keep subscription
                                </button>
                                <button
                                    type="button"
                                    onClick={() => cancelMutation.mutate()}
                                    disabled={cancelMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
                                >
                                    {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    Yes, cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
