import type { ReactElement } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import type { DashboardOverview } from "@/types/dashboard";

interface QuotePipelineProps {
    overview: DashboardOverview;
    basePath?: string;
}

/** Quote → job flow at a glance; every stage links to the filtered list. */
export default function QuotePipeline({ overview, basePath = "/admin" }: QuotePipelineProps): ReactElement {
    const stages = [
        { label: "Draft quotes", value: overview.quotes.draft, href: `${basePath}/quotes?status=Draft`, color: "bg-gray-400" },
        { label: "Sent to client", value: overview.quotes.sent_to_customer, href: `${basePath}/quotes?status=Sent%20to%20Customer`, color: "bg-brand-purple" },
        { label: "Approved", value: overview.quotes.approved, href: `${basePath}/quotes?status=Approved`, color: "bg-brand-green" },
        { label: "Jobs pending", value: overview.jobs.pending, href: `${basePath}/jobs`, color: "bg-brand-yellow" },
        { label: "In production", value: overview.jobs.in_progress, href: `${basePath}/jobs`, color: "bg-brand-blue" },
        { label: "Completed", value: overview.jobs.completed, href: `${basePath}/jobs`, color: "bg-brand-green" },
    ];

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-900">Quote → job pipeline</h2>
                <p className="text-xs text-gray-500">Click a stage to open the list behind it</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                {stages.map((stage, index): ReactElement => (
                    <div key={stage.label} className="flex flex-1 items-center gap-2">
                        <Link
                            href={stage.href}
                            className="flex-1 rounded-xl border border-gray-200 p-3 transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-md"
                        >
                            <span className={`mb-2 block h-1 w-8 rounded-full ${stage.color}`} />
                            <span className="block text-xl font-bold text-gray-900">{stage.value.toLocaleString("en-US")}</span>
                            <span className="block text-xs font-medium text-gray-600">{stage.label}</span>
                        </Link>
                        {index < stages.length - 1 && <ChevronRightIcon className="hidden h-4 w-4 shrink-0 text-gray-300 sm:block" />}
                    </div>
                ))}
            </div>
        </section>
    );
}
