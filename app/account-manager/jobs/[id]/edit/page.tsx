"use client";

import { useState, useEffect, useRef, type ReactElement, type ChangeEvent, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Paperclip, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import AccountManagerLayout from "@/components/account-manager/account-manager-layout";
import { fetchJob, updateJob, uploadJobAttachments, fetchJobAttachments, type JobAttachment } from "@/services/jobs";
import { uploadComponentFile } from "@/services/orchestration";
import { fetchClients } from "@/services/clients";
import { fetchProducts } from "@/services/products";
import type { JobStatus, JobPriority } from "@/types/jobs";
import type { ClientsResponse } from "@/types/clients";

interface ProductRow {
    job_product_id?: number;
    name: string;
    quantity: number;
    unit: string;
    attachments: File[];
}

interface EditJobForm {
    job_name: string;
    job_type: string;
    custom_job_type: string;
    priority: JobPriority;
    status: JobStatus;
    client_id: number | "";
    notes: string;
    start_date: string;
    expected_completion: string;
    delivery_date: string;
    delivery_method: string;
    products: ProductRow[];
}

const LABEL = "block text-sm font-medium text-gray-700 mb-1";
const INPUT = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue";
const SELECT = INPUT;

export default function EditJobPage(): ReactElement {
    const router = useRouter();
    const params = useParams();
    const queryClient = useQueryClient();
    const jobId = Number(params.id);

    const [form, setForm] = useState<EditJobForm | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [jobAttachments, setJobAttachments] = useState<File[]>([]);
    const [isUploadingNow, setIsUploadingNow] = useState(false);
    const jobFileInputRef = useRef<HTMLInputElement>(null);

    const { data: job, isLoading: jobLoading } = useQuery({
        queryKey: ["job", jobId],
        queryFn: () => fetchJob(jobId),
        enabled: !!jobId,
    });

    const { data: existingAttachments = [] } = useQuery({
        queryKey: ["job-attachments", jobId],
        queryFn: () => fetchJobAttachments(jobId),
        enabled: !!jobId,
    });

    const clientsQuery = useQuery({
        queryKey: ["clients-dropdown"],
        queryFn: (): Promise<ClientsResponse> =>
            fetchClients({ page: 1, pageSize: 200, search: "", status: "Active", clientType: "all" }),
    });

    const productsQuery = useQuery({
        queryKey: ["products-catalog-dropdown"],
        queryFn: () => fetchProducts({ page: 1, pageSize: 300, search: "", status: "all", pricingMode: "all", printCategory: "", category: "" }),
    });

    useEffect((): void => {
        if (!job) return;
        const knownTypes = ["printing", "design", "branding", "packaging", "signage", "other"];
        const isCustomType = !knownTypes.includes(job.job_type);

        const prefillProducts: ProductRow[] =
            job.job_products && job.job_products.length > 0
                ? job.job_products.map((jp) => ({
                      job_product_id: jp.id,
                      name: jp.product_name,
                      quantity: jp.quantity,
                      unit: jp.unit || "pcs",
                      attachments: [],
                  }))
                : [{ name: job.product, quantity: job.quantity, unit: "pcs", attachments: [] }];

        setForm({
            job_name: job.job_name,
            job_type: isCustomType ? "other" : job.job_type,
            custom_job_type: isCustomType ? job.job_type : "",
            priority: job.priority,
            status: job.status,
            client_id: job.client?.id ?? "",
            notes: job.notes ?? "",
            start_date: job.start_date ?? new Date().toISOString().split("T")[0],
            expected_completion: job.expected_completion ?? "",
            delivery_date: job.delivery_date ?? "",
            delivery_method: job.delivery_method ?? "pickup",
            products: prefillProducts,
        });
    }, [job]);

    const set = <K extends keyof EditJobForm>(key: K, value: EditJobForm[K]): void => {
        setForm((prev) => prev ? { ...prev, [key]: value } : prev);
    };

    const updateProduct = (index: number, field: keyof ProductRow, value: string | number): void => {
        setForm((prev) => {
            if (!prev) return prev;
            const products = [...prev.products];
            products[index] = { ...products[index], [field]: value };
            return { ...prev, products };
        });
    };

    const addProduct = (): void => {
        setForm((prev) => {
            if (!prev) return prev;
            return { ...prev, products: [...prev.products, { name: "", quantity: 1, unit: "pcs", attachments: [] }] };
        });
    };

    const addProductAttachment = (idx: number, files: FileList | null): void => {
        if (!files) return;
        setForm((prev) => {
            if (!prev) return prev;
            const products = [...prev.products];
            products[idx] = { ...products[idx], attachments: [...products[idx].attachments, ...Array.from(files)] };
            return { ...prev, products };
        });
    };

    const removeProductAttachment = (idx: number, fileIdx: number): void => {
        setForm((prev) => {
            if (!prev) return prev;
            const products = [...prev.products];
            products[idx] = { ...products[idx], attachments: products[idx].attachments.filter((_, i) => i !== fileIdx) };
            return { ...prev, products };
        });
    };

    const removeProduct = (index: number): void => {
        setForm((prev) => {
            if (!prev || prev.products.length <= 1) return prev;
            return { ...prev, products: prev.products.filter((_, i) => i !== index) };
        });
    };

    const handleUploadNow = async (): Promise<void> => {
        if (jobAttachments.length === 0) return;
        setIsUploadingNow(true);
        try {
            await uploadJobAttachments(jobId, jobAttachments);
            const count = jobAttachments.length;
            setJobAttachments([]);
            queryClient.invalidateQueries({ queryKey: ["job-attachments", jobId] });
            toast.success(`${count} file${count !== 1 ? "s" : ""} uploaded successfully.`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to upload attachments.");
        } finally {
            setIsUploadingNow(false);
        }
    };

    const handleSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        if (!form) return;

        if (!form.client_id) {
            toast.error("Please select a client.");
            return;
        }

        const validProducts = form.products.filter((p) => p.name.trim());
        if (validProducts.length === 0) {
            toast.error("Please add at least one product/service.");
            return;
        }

        setIsSubmitting(true);
        try {
            const resolvedJobType =
                form.job_type === "other" && form.custom_job_type.trim()
                    ? form.custom_job_type.trim()
                    : form.job_type;

            const savedJob = await updateJob(jobId, {
                job_name: form.job_name,
                job_type: resolvedJobType,
                priority: form.priority,
                status: form.status,
                product: validProducts[0].name,
                quantity: validProducts[0].quantity,
                expected_completion: form.expected_completion || null,
                notes: form.notes || "",
                start_date: form.start_date || null,
                delivery_date: form.delivery_date || null,
                delivery_method: form.delivery_method || null,
                job_products: validProducts.map((p) => ({
                    job_product_id: p.job_product_id ?? null,
                    name: p.name,
                    quantity: p.quantity,
                    unit: p.unit,
                })),
            } as unknown as Parameters<typeof updateJob>[1]);

            // Job-level attachments (general files)
            if (jobAttachments.length > 0) {
                await uploadJobAttachments(jobId, jobAttachments);
                queryClient.invalidateQueries({ queryKey: ["job-attachments", jobId] });
            }

            // Per-product attachments → component artwork files (visible in Control Tower)
            const returnedProducts = savedJob.job_products ?? [];
            for (const row of validProducts) {
                if (row.attachments.length === 0) continue;
                const compId = row.job_product_id
                    ?? returnedProducts.find((rp) => rp.product_name === row.name)?.id;
                if (compId) {
                    for (const file of row.attachments) {
                        await uploadComponentFile(compId, "artwork", file);
                    }
                    queryClient.invalidateQueries({ queryKey: ["component-files", compId] });
                }
            }

            queryClient.invalidateQueries({ queryKey: ["account-manager-jobs"] });
            queryClient.invalidateQueries({ queryKey: ["job", jobId] });
            toast.success("Job updated successfully!");
            router.push("/account-manager/jobs");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update job.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const clients = clientsQuery.data?.results ?? [];
    const catalogProducts = productsQuery.data?.results ?? [];

    if (jobLoading || !form) {
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

    return (
        <AccountManagerLayout>
            <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
                <div className="px-4 lg:px-8 py-4 flex items-center gap-4">
                    <button
                        type="button"
                        onClick={(): void => router.back()}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Jobs
                    </button>
                    <span className="text-gray-300">/</span>
                    <h1 className="text-lg font-semibold text-gray-900">
                        Edit Job {job?.job_number ? `— ${job.job_number}` : ""}
                    </h1>
                </div>
            </header>

            {/* Datalist for product autocomplete */}
            <datalist id="product-catalog">
                {catalogProducts.map((p) => (
                    <option key={p.id} value={p.name} />
                ))}
            </datalist>

            <main className="p-8 max-w-4xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* ── Section 1: Job Overview ── */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Job Overview</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="md:col-span-3">
                                <label className={LABEL}>Job Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className={INPUT}
                                    placeholder="e.g. Business Cards for Acme Corp"
                                    value={form.job_name}
                                    onChange={(e: ChangeEvent<HTMLInputElement>): void => set("job_name", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className={LABEL}>Job Type</label>
                                <select
                                    className={SELECT}
                                    value={form.job_type}
                                    onChange={(e): void => {
                                        set("job_type", e.target.value);
                                        if (e.target.value !== "other") set("custom_job_type", "");
                                    }}
                                >
                                    <option value="printing">Printing</option>
                                    <option value="design">Design</option>
                                    <option value="branding">Branding</option>
                                    <option value="packaging">Packaging</option>
                                    <option value="signage">Signage</option>
                                    <option value="other">Other</option>
                                </select>
                                {form.job_type === "other" && (
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        className={`${INPUT} mt-2`}
                                        placeholder="Specify job type..."
                                        value={form.custom_job_type}
                                        onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                                            set("custom_job_type", e.target.value)
                                        }
                                    />
                                )}
                            </div>

                            <div>
                                <label className={LABEL}>Priority</label>
                                <select className={SELECT} value={form.priority} onChange={(e): void => set("priority", e.target.value as JobPriority)}>
                                    <option value="urgent">Urgent</option>
                                    <option value="high">High</option>
                                    <option value="normal">Normal</option>
                                </select>
                            </div>

                            <div>
                                <label className={LABEL}>Status</label>
                                <select className={SELECT} value={form.status} onChange={(e): void => set("status", e.target.value as JobStatus)}>
                                    <option value="pending">Not Started</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="blocked">Blocked</option>
                                    <option value="qc_hold">QC Hold</option>
                                    <option value="ready">Ready for Dispatch</option>
                                    <option value="dispatched">Dispatched</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* ── Section 2: Client ── */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Client</h2>
                        </div>
                        <div className="p-6">
                            <label className={LABEL}>Client <span className="text-red-500">*</span></label>
                            {job?.quote ? (
                                <div className="flex items-center gap-2">
                                    <div className={`${INPUT} bg-gray-50 text-gray-700 cursor-not-allowed`}>
                                        {job.client?.name ?? "—"}
                                    </div>
                                    <span className="text-xs text-gray-400 whitespace-nowrap">Locked — from quote</span>
                                </div>
                            ) : (
                                <select
                                    required
                                    className={SELECT}
                                    value={form.client_id}
                                    onChange={(e): void => set("client_id", e.target.value ? Number(e.target.value) : "")}
                                >
                                    <option value="">Select client...</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </section>

                    {/* ── Section 3: Products / Services ── */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Products / Services</h2>
                            <button
                                type="button"
                                onClick={addProduct}
                                className="flex items-center gap-1 text-sm text-brand-blue hover:text-brand-blue/80 font-medium"
                            >
                                <Plus className="w-4 h-4" /> Add row
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide px-1">
                                <span className="col-span-5">Product / Service</span>
                                <span className="col-span-2">Quantity</span>
                                <span className="col-span-2">Unit</span>
                                <span className="col-span-3" />
                            </div>

                            {form.products.map((product, idx) => (
                                <div key={idx} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                                    <div className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-5">
                                            <input
                                                type="text"
                                                list="product-catalog"
                                                required={idx === 0}
                                                className={INPUT}
                                                placeholder={idx === 0 ? "Search catalog or type name *" : "Search catalog or type name"}
                                                value={product.name}
                                                onChange={(e): void => updateProduct(idx, "name", e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                required={idx === 0}
                                                min={1}
                                                className={INPUT}
                                                value={product.quantity}
                                                onChange={(e): void => updateProduct(idx, "quantity", Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <select
                                                className={SELECT}
                                                value={product.unit}
                                                onChange={(e): void => updateProduct(idx, "unit", e.target.value)}
                                            >
                                                <option value="pcs">pcs</option>
                                                <option value="sets">sets</option>
                                                <option value="boxes">boxes</option>
                                                <option value="reams">reams</option>
                                                <option value="copies">copies</option>
                                                <option value="rolls">rolls</option>
                                            </select>
                                        </div>
                                        <div className="col-span-3 flex justify-end">
                                            {form.products.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={(): void => removeProduct(idx)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {/* Per-line-item attachments */}
                                    <div className="flex items-center gap-2 flex-wrap pt-1">
                                        <label className="flex items-center gap-1 cursor-pointer rounded border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 hover:border-brand-blue hover:text-brand-blue transition-colors">
                                            <Paperclip className="w-3 h-3" />
                                            Attach files
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                onChange={(e): void => addProductAttachment(idx, e.target.files)}
                                            />
                                        </label>
                                        {product.attachments.map((file, fileIdx) => (
                                            <span key={fileIdx} className="flex items-center gap-1 rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs text-brand-blue">
                                                {file.name}
                                                <button
                                                    type="button"
                                                    onClick={(): void => removeProductAttachment(idx, fileIdx)}
                                                    className="ml-0.5 hover:text-red-500"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ── Section 4: Job Description ── */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Job Description</h2>
                        </div>
                        <div className="p-6">
                            <label className={LABEL}>Notes / Instructions</label>
                            <textarea
                                rows={4}
                                className={INPUT}
                                placeholder="Describe the job in detail — requirements, special instructions, materials, and expected outcome..."
                                value={form.notes}
                                onChange={(e): void => set("notes", e.target.value)}
                            />
                        </div>
                    </section>

                    {/* ── Section 5: Attachments ── */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Attachments</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Artworks, briefs, or any other job-related files — optional</p>
                        </div>
                        <div className="p-6 space-y-3">
                            {/* Previously uploaded attachments */}
                            {existingAttachments.length > 0 && (
                                <div className="space-y-1.5 pb-3 border-b border-gray-100">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Uploaded files</p>
                                    {existingAttachments.map((att: JobAttachment) => (
                                        <div key={att.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 border border-gray-100">
                                            <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
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
                            )}
                            {/* Input is a sibling (not child) of the drop zone to avoid click-bubbling loop */}
                            <input
                                ref={jobFileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                                    const files = e.target.files;
                                    if (files && files.length > 0) {
                                        setJobAttachments((prev) => [...prev, ...Array.from(files)]);
                                    }
                                }}
                            />
                            <div
                                role="button"
                                tabIndex={0}
                                className="flex flex-col items-center justify-center gap-2 cursor-pointer rounded-lg border-2 border-dashed border-gray-300 px-4 py-8 hover:border-brand-blue hover:bg-brand-blue/5 transition-colors text-center"
                                onClick={(): void => jobFileInputRef.current?.click()}
                                onKeyDown={(e): void => { if (e.key === "Enter" || e.key === " ") jobFileInputRef.current?.click(); }}
                            >
                                <Paperclip className="w-6 h-6 text-gray-300" />
                                <span className="text-sm text-gray-500">
                                    Click to attach files
                                    <span className="block text-xs text-gray-400 mt-0.5">Multiple files allowed — PDFs, images, Word documents, etc.</span>
                                </span>
                            </div>
                            {jobAttachments.length > 0 && (
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex flex-wrap gap-2 flex-1">
                                        {jobAttachments.map((file, i) => (
                                            <span key={i} className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                                                {file.name}
                                                <button
                                                    type="button"
                                                    onClick={(): void => setJobAttachments((prev) => prev.filter((_, j) => j !== i))}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleUploadNow}
                                        disabled={isUploadingNow}
                                        className="shrink-0 flex items-center gap-1.5 rounded-md bg-brand-blue px-3 py-2 text-xs font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isUploadingNow ? (
                                            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                        ) : (
                                            <Upload className="w-3 h-3" />
                                        )}
                                        {isUploadingNow ? "Uploading…" : "Upload Now"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ── Section 6: Timeline & Delivery ── */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Timeline & Delivery</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className={LABEL}>Start Date</label>
                                <input
                                    type="date"
                                    className={INPUT}
                                    value={form.start_date}
                                    onChange={(e): void => set("start_date", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className={LABEL}>Due Date (Expected Completion) <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    required
                                    className={INPUT}
                                    value={form.expected_completion}
                                    onChange={(e): void => set("expected_completion", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className={LABEL}>Delivery Date <span className="text-gray-400 text-xs font-normal">(optional)</span></label>
                                <input
                                    type="date"
                                    className={INPUT}
                                    value={form.delivery_date}
                                    onChange={(e): void => set("delivery_date", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className={LABEL}>Delivery Method</label>
                                <select className={SELECT} value={form.delivery_method} onChange={(e): void => set("delivery_method", e.target.value)}>
                                    <option value="pickup">Pickup</option>
                                    <option value="delivery">Delivery</option>
                                    <option value="courier">Courier</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* ── Footer Actions ── */}
                    <div className="flex items-center justify-between pb-8">
                        <button
                            type="button"
                            onClick={(): void => router.back()}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isSubmitting && (
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </main>
        </AccountManagerLayout>
    );
}
