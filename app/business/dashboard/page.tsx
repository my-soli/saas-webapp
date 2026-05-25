"use client";

import { type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import BusinessLayout from "@/components/business/business-layout";
import {
    Users, FileText, Briefcase, CreditCard,
    ArrowRight, CheckCircle, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { fetchMySubscription } from "@/services/subscription";

function StatCard({ label, value, icon: Icon, href }: {
    label: string;
    value: string | number;
    icon: typeof Users;
    href: string;
}): ReactElement {
    return (
        <Link href={href} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-brand-blue" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-blue transition-colors" />
        </Link>
    );
}

export default function BusinessDashboardPage(): ReactElement {
    const { data: subscription, isError: noSubscription } = useQuery({
        queryKey: ["my-subscription"],
        queryFn: fetchMySubscription,
        retry: 1,
    });

    return (
        <BusinessLayout>
            <div className="p-8 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-brand-black">Business Dashboard</h1>
                    <p className="text-gray-500 mt-1">Manage your print shop operations</p>
                </div>

                {/* Subscription status banner */}
                {subscription && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm ${
                        subscription.status === "trial"
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : subscription.status === "active"
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-orange-50 border-orange-200 text-orange-700"
                    }`}>
                        <CheckCircle className="w-5 h-5 shrink-0" />
                        <span>
                            <strong>{subscription.plan.name}</strong> plan —{" "}
                            {subscription.status === "trial"
                                ? `Free trial · ${subscription.days_remaining} days remaining`
                                : `${subscription.status} · renews ${new Date(subscription.end_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`}
                        </span>
                        <Link href="/portal/subscription" className="ml-auto font-medium underline underline-offset-2 hover:opacity-80 whitespace-nowrap">
                            Manage
                        </Link>
                    </div>
                )}

                {noSubscription && (
                    <div className="flex items-center gap-3 p-4 rounded-xl border bg-amber-50 border-amber-200 text-sm text-amber-700">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>No active subscription found.</span>
                        <Link href="/portal/subscription" className="ml-auto font-medium underline underline-offset-2 hover:opacity-80">
                            Set up billing
                        </Link>
                    </div>
                )}

                {/* Quick links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Clients"   value="—" icon={Users}    href="/business/clients" />
                    <StatCard label="Quotes"    value="—" icon={FileText} href="/business/quotes" />
                    <StatCard label="Jobs"      value="—" icon={Briefcase} href="/business/jobs" />
                    <StatCard label="Billing"   value="—" icon={CreditCard} href="/portal/subscription" />
                </div>

                {/* Getting started */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Getting started</h2>
                    <ul className="space-y-3">
                        {[
                            { label: "Invite your Account Manager", href: "/business/team", done: false },
                            { label: "Invite your Production Team", href: "/business/team", done: false },
                            { label: "Add your first client",       href: "/business/clients", done: false },
                            { label: "Set up your product catalog", href: "/business/products", done: false },
                        ].map((step) => (
                            <li key={step.label}>
                                <Link href={step.href} className="flex items-center gap-3 text-sm text-gray-600 hover:text-brand-blue transition-colors group">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        step.done ? "bg-green-500 border-green-500" : "border-gray-300 group-hover:border-brand-blue"
                                    }`}>
                                        {step.done && <CheckCircle className="w-3 h-3 text-white" />}
                                    </div>
                                    <span>{step.label}</span>
                                    <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </BusinessLayout>
    );
}
