"use client";

import { useState, useRef, useEffect, Suspense, type ReactElement, type ChangeEvent, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Paperclip, Plus, Trash2, X, Info } from "lucide-react";
import { toast } from "sonner";
import AccountManagerLayout from "@/components/account-manager/account-manager-layout";
import { createJob, uploadJobAttachments } from "@/services/jobs";
import { fetchClients } from "@/services/clients";
import { fetchProducts } from "@/services/products";
import type { Job, JobStatus, JobPriority } from "@/types/jobs";
import type { ClientsResponse } from "@/types/clients";
import type { Quote } from "@/types/quotes";

interface ProductRow {
    name: string;
    quantity: number;
    unit: string;
    attachments: File[];
}

interface CreateJobForm {
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

const defaultForm = (): CreateJobForm => ({
    job_name: "",
    job_type: "printing",
    custom_job_type: "",
    priority: "normal",
    status: "pending",
    client_id: "",
    notes: "",
    start_date: new Date().toISOString().split("T")[0],
    expected_completion: "",
    delivery_date: "",
    delivery_method: "pickup",
    products: [{ name: "", quantity: 1, unit: "pcs", attachments: [] }],
});

const LABEL = "block text-sm font-medium text-gray-700 mb-1";
const INPUT = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue";
const SELECT = INPUT;

async function fetchQuote(quoteId: string): Promise<Quote> {
    const res = await fetch(`/api/proxy/api/v1/quotes/${quoteId}/`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch quote");
    return res.json();
}

function CreateJobPageInner(): ReactElement {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const quoteId = searchParams.get("quote_id");

    const [form, setForm] = useState<CreateJobForm>(defaultForm());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [jobAttachments, setJobAttachments] = useState<File[]>([]);
    const [quotePreFilled, setQuotePreFilled] = useState(false);
    const jobFileInputRef = useRef<HTMLInputElement>(null);

    const clientsQuery = useQuery({
        queryKey: ["clients-dropdown"],
        queryFn: (): Promise<ClientsResponse> =>
            fetchClients({ page: 1, pageSize: 200, search: "", status: "Active", clientType: "all" }),
    });

    const productsQuery = useQuery({
        queryKey: ["products-catalog-dropdown"],
        queryFn: () => fetchProducts({ page: 1, pageSize: 300, search: "", status: "all", pricingMode: "all", printCategory: "", category: "" }),
    });

    const quoteQuery = useQuery({
        queryKey: ["quote-prefill", quoteId],
        queryFn: () => fetchQuote(quoteId!),
        enabled: !!quoteId,
    });

    // Pre-populate form from quote when it loads
    useEffect(() => {
        const quote = quoteQuery.data;
        if (!quote || quotePreFilled) return;

        const lineItems = quote.line_items ?? [];
        const productRows: ProductRow[] = lineItems.length > 0
            ? lineItems.map((item) => ({
                name: item.product_name,
                quantity: item.quantity,
                unit: "pcs",
                attachments: [],
            }))
            : [{ name: "", quantity: 1, unit: "pcs", attachments: [] }];

        setForm((prev) => ({
            ...prev,
            job_name: `Job for ${quote.quote_id}`,
            client_id: quote.client ?? "",
            products: productRows,
        }));
        setQuotePreFilled(true);
    }, [quoteQuery.data, quotePreFilled]);

    const set = <K extends keyof CreateJobForm>(key: K, value: CreateJobForm[K]): void => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const updateProduct = (index: number, field: keyof ProductRow, value: string | number): void => {
        setForm((prev) => {
            const products = [...prev.products];
            products[index] = { ...products[index], [field]: value };
            return { ...prev, products };
        });
    };

    const addProduct = (): void => {
        setForm((prev) => ({
            ...prev,
            products: [...prev.products, { name: "", quantity: 1, unit: "pcs", attachments: [] }],
        }));
    };

    const addProductAttachment = (idx: number, files: FileList | null): void => {
        if (!files) return;
        setForm((prev) => {
            const products = [...prev.products];
            products[idx] = { ...products[idx], attachments: [...products[idx].attachments, ...Array.from(files)] };
            return { ...prev, products };
        });
    };

    const removeProductAttachment = (idx: number, fileIdx: number): void => {
        setForm((prev) => {
            const products = [...prev.products];
            products[idx] = { ...products[idx], attachments: products[idx].attachments.filter((_, i) => i !== fileIdx) };
            return { ...prev, products };
        });
    };

    const removeProduct = (index: number): void => {
        if (form.products.length <= 1) return;
        setForm((prev) => ({
            ...prev,
            products: prev.products.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();

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

            const jobPayload = {
                job_name: form.job_name,
                job_type: resolvedJobType,
                priority: form.priority,
                status: form.status,
                product: validProducts[0].name,
                quantity: validProducts[0].quantity,
                expected_completion: form.expected_completion || null,
                client_id: Number(form.client_id),
                start_date: form.start_date || null,
                delivery_method: form.delivery_method,
                delivery_date: form.delivery_date || null,
                notes: form.notes || null,
                job_products: validProducts.map((p) => ({
                    name: p.name,
                    quantity: p.quantity,
                    unit: p.unit,
                })),
            };

            const savedJob = await createJob(jobPayload as unknown as Partial<Job>);

            const allFiles = [
                ...form.products.flatMap((p) => p.attachments),
                ...jobAttachments,
            ];
            if (allFiles.length > 0 && savedJob?.id) {
                await uploadJobAttachments(savedJob.id, allFiles);
            }

            queryClient.invalidateQueries({ queryKey: ["account-manager-jobs"] });
            toast.success(`Job "${form.job_name}" created successfully!`);
            router.push("/account-manager/jobs");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to create job.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const clients = clientsQuery.data?.results ?? [];
    const catalogProducts = productsQuery.data?.results ?? [];

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
                    <h1 className="text-lg font-semibold text-gray-900">Create New Job</h1>
                </div>
            </header>

            {/* Quote pre-fill banner */}
            {quoteId && quotePreFilled && (
                <div className="mx-8 mt-6 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                        Pre-filled from quote <span className="font-semibold">{quoteQuery.data?.quote_id}</span> — review all products and adjust as needed before submitting.
                    </span>
                </div>
            )}
            {quoteId && quoteQuery.isLoading && (
                <div className="mx-8 mt-6 h-10 rounded-lg bg-gray-100 animate-pulse" />
            )}

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
                                <label className={LABEL}>Initial Status</label>
                                <select className={SELECT} value={form.status} onChange={(e): void => set("status", e.target.value as JobStatus)}>
                                    <option value="pending">Not Started</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="on_hold">On Hold</option>
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
                        </div>
                    </section>

                    {/* ── Section 3: Products / Services ── */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Products / Services</h2>
                                <p className="text-xs text-gray-400 mt-0.5">Search the catalog or type any product name — including items not in the catalog</p>
                            </div>
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

                    {/* ── Section 4: Description ── */}
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
                            <label
                                className="flex flex-col items-center justify-center gap-2 cursor-pointer rounded-lg border-2 border-dashed border-gray-300 px-4 py-8 hover:border-brand-blue hover:bg-brand-blue/5 transition-colors text-center"
                            >
                                <Paperclip className="w-6 h-6 text-gray-300" />
                                <span className="text-sm text-gray-500">
                                    Click to attach files
                                    <span className="block text-xs text-gray-400 mt-0.5">Multiple files allowed — PDFs, images, Word documents, etc.</span>
                                </span>
                                <input
                                    ref={jobFileInputRef}
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                                        if (e.target.files) {
                                            setJobAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
                                            e.target.value = "";
                                        }
                                    }}
                                />
                            </label>
                            {jobAttachments.length > 0 && (
                                <div className="flex flex-wrap gap-2">
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
                                <input type="date" className={INPUT} value={form.start_date} onChange={(e): void => set("start_date", e.target.value)} />
                            </div>
                            <div>
                                <label className={LABEL}>Due Date <span className="text-red-500">*</span></label>
                                <input type="date" required className={INPUT} value={form.expected_completion} onChange={(e): void => set("expected_completion", e.target.value)} />
                            </div>
                            <div>
                                <label className={LABEL}>Delivery Date <span className="text-gray-400 text-xs font-normal">(optional)</span></label>
                                <input type="date" className={INPUT} value={form.delivery_date} onChange={(e): void => set("delivery_date", e.target.value)} />
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

                    {/* ── Footer ── */}
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
                            {isSubmitting ? "Creating Job..." : "Create Job"}
                        </button>
                    </div>
                </form>
            </main>
        </AccountManagerLayout>
    );
}

export default function CreateJobPage(): ReactElement {
    return (
        <Suspense fallback={null}>
            <CreateJobPageInner />
        </Suspense>
    );
}
