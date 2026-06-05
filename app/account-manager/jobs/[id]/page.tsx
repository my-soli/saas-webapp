"use client";

import { type ReactElement } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, File as FileIcon } from "lucide-react";
import AccountManagerLayout from "@/components/account-manager/account-manager-layout";
import { fetchJob, fetchJobAttachments, type JobAttachment } from "@/services/jobs";
import type { JobProduct } from "@/types/jobs";

const SECTION_HEADER = "px-6 py-4 border-b border-gray-100 bg-gray-50";
const LABEL = "text-xs font-medium text-gray-500 uppercase tracking-wide";
const VALUE = "text-sm text-gray-900 mt-1";
const VALUE_EMPTY = "text-sm text-gray-400 italic mt-1";

const statusStyles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    in_progress: "bg-blue-100 text-blue-700",
    on_hold: "bg-orange-100 text-orange-700",
    blocked: "bg-red-100 text-red-700",
    qc_hold: "bg-orange-100 text-orange-700",
    ready: "bg-teal-100 text-teal-700",
    dispatched: "bg-green-100 text-green-700",
    completed: "bg-green-100 text-green-700",
};

const priorityStyles: Record<string, string> = {
    urgent: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    normal: "bg-gray-100 text-gray-600",
};

function formatDate(value: string | null | undefined): string | null {
    if (!value) return null;
    return new Date(value).toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function Field({ label, value, empty = "Not set" }: { label: string; value?: string | null; empty?: string }): ReactElement {
    return (
        <div>
            <div className={LABEL}>{label}</div>
            {value ? (
                <div className={VALUE}>{value}</div>
            ) : (
                <div className={VALUE_EMPTY}>{empty}</div>
            )}
        </div>
    );
}

export default function JobViewPage(): ReactElement {
    const router = useRouter();
    const params = useParams();
    const jobId = Number(params.id);

    const { data: job, isLoading } = useQuery({
        queryKey: ["job", jobId],
        queryFn: () => fetchJob(jobId),
        enabled: !!jobId,
    });

    const { data: attachments = [] } = useQuery({
        queryKey: ["job-attachments", jobId],
        queryFn: () => fetchJobAttachments(jobId),
        enabled: !!jobId,
    });

    if (isLoading || !job) {
        return (
            <AccountManagerLayout>
                <div className="p-8 flex items-center justify-center min-h-[400px]">
                    <div className="animate-pulse space-y-4 w-full max-w-4xl">
                        <div className="h-8 bg-gray-200 rounded w-1/3" />
                        <div className="h-64 bg-gray-200 rounded" />
                        <div className="h-48 bg-gray-200 rounded" />
                    </div>
                </div>
            </AccountManagerLayout>
        );
    }

    const jobProducts: JobProduct[] = job.job_products ?? [];

    const clientName = job.client?.name ?? null;
    const clientEmail = job.client?.email ?? null;
    const ownerName = job.person_in_charge
        ? (`${job.person_in_charge.first_name} ${job.person_in_charge.last_name}`.trim() || job.person_in_charge.username)
        : null;

    const deliveryMethodLabel: Record<string, string> = {
        pickup: "Pickup",
        delivery: "Delivery",
        courier: "Courier",
    };

    const jobTypeLabel: Record<string, string> = {
        printing: "Printing",
        design: "Design",
        branding: "Branding",
        packaging: "Packaging",
        signage: "Signage",
        other: "Other",
    };

    return (
        <AccountManagerLayout>
            <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
                <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Jobs
                        </button>
                        <span className="text-gray-300">/</span>
                        <div>
                            <span className="text-xs text-gray-500">{job.job_number}</span>
                            <h1 className="text-lg font-semibold text-gray-900 leading-tight">{job.job_name}</h1>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.push(`/account-manager/jobs/${jobId}/edit`)}
                        className="flex items-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 transition-colors"
                    >
                        <Pencil className="w-4 h-4" />
                        Edit Job
                    </button>
                </div>
            </header>

            <main className="p-8 max-w-4xl mx-auto space-y-6">

                {/* ── Section 1: Job Overview ── */}
                <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className={SECTION_HEADER}>
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Job Overview</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="md:col-span-3">
                            <div className={LABEL}>Job Title</div>
                            <div className="text-base font-semibold text-gray-900 mt-1">{job.job_name}</div>
                        </div>
                        <div>
                            <div className={LABEL}>Job Type</div>
                            <div className={VALUE}>{jobTypeLabel[job.job_type] ?? job.job_type}</div>
                        </div>
                        <div>
                            <div className={LABEL}>Priority</div>
                            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${priorityStyles[job.priority] ?? "bg-gray-100 text-gray-600"}`}>
                                {job.priority}
                            </span>
                        </div>
                        <div>
                            <div className={LABEL}>Status</div>
                            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusStyles[job.status] ?? "bg-gray-100 text-gray-600"}`}>
                                {job.status.replace(/_/g, " ")}
                            </span>
                        </div>
                    </div>
                </section>

                {/* ── Section 2: Client ── */}
                <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className={SECTION_HEADER}>
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Client</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <div className={LABEL}>Client Name</div>
                            {clientName ? (
                                <div className={VALUE}>{clientName}</div>
                            ) : (
                                <div className={VALUE_EMPTY}>Not set</div>
                            )}
                        </div>
                        {clientEmail && (
                            <div>
                                <div className={LABEL}>Email</div>
                                <div className={VALUE}>{clientEmail}</div>
                            </div>
                        )}
                        {ownerName && (
                            <div>
                                <div className={LABEL}>Job Owner (Person in Charge)</div>
                                <div className={VALUE}>{ownerName}</div>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Section 3: Products / Services ── */}
                <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className={SECTION_HEADER}>
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            Products / Services
                            <span className="ml-2 text-gray-400 font-normal normal-case text-xs">({jobProducts.length} item{jobProducts.length !== 1 ? "s" : ""})</span>
                        </h2>
                    </div>
                    <div className="p-6">
                        {jobProducts.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No line items on this job.</p>
                        ) : (
                            <div className="space-y-1">
                                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide px-3 pb-2">
                                    <span className="col-span-5">Product / Service</span>
                                    <span className="col-span-2">Quantity</span>
                                    <span className="col-span-2">Unit</span>
                                    <span className="col-span-3">Assigned To</span>
                                </div>
                                {jobProducts.map((item: JobProduct) => (
                                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg px-3 py-3 border border-gray-100">
                                        <div className="col-span-5 text-sm font-medium text-gray-900">{item.product_name}</div>
                                        <div className="col-span-2 text-sm text-gray-700">{item.quantity}</div>
                                        <div className="col-span-2 text-sm text-gray-700">{item.unit || "pcs"}</div>
                                        <div className="col-span-3 text-sm">
                                            {item.assigned_to_name ? (
                                                <span className="text-gray-900">{item.assigned_to_name}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">Unassigned</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Section 4: Job Description ── */}
                {job.notes && (
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className={SECTION_HEADER}>
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Job Description</h2>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.notes}</p>
                        </div>
                    </section>
                )}

                {/* ── Section 5: Attachments ── */}
                {attachments.length > 0 && (
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className={SECTION_HEADER}>
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                Attachments
                                <span className="ml-2 text-gray-400 font-normal normal-case text-xs">
                                    ({attachments.length} file{attachments.length !== 1 ? "s" : ""})
                                </span>
                            </h2>
                        </div>
                        <div className="p-6 space-y-2">
                            {attachments.map((att: JobAttachment) => (
                                <div key={att.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2.5 border border-gray-100">
                                    <FileIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                    <span className="flex-1 text-sm text-gray-700 truncate">{att.file_name}</span>
                                    <span className="text-xs text-gray-400">{(att.file_size / 1024).toFixed(1)} KB</span>
                                    {att.file_url && (
                                        <a
                                            href={att.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="shrink-0 text-xs font-semibold text-brand-blue hover:underline"
                                        >
                                            Download
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Section 6: Timeline & Delivery ── */}
                <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className={SECTION_HEADER}>
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Timeline & Delivery</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Start Date" value={formatDate(job.start_date)} />
                        <Field label="Due Date (Expected Completion)" value={formatDate(job.expected_completion)} />
                        <Field label="Delivery Date" value={formatDate(job.delivery_date)} />
                        <Field label="Delivery Method" value={deliveryMethodLabel[job.delivery_method ?? ""] ?? job.delivery_method} />
                    </div>
                </section>

            </main>
        </AccountManagerLayout>
    );
}
