"use client";

import { useState, useEffect, type ReactElement, type ChangeEvent, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/admin-layout";
import { fetchJob, updateJob } from "@/services/jobs";
import { fetchAllUsers } from "@/services/users";
import { fetchClients } from "@/services/clients";
import { fetchProducts } from "@/services/products";
import type { JobStatus, JobPriority } from "@/types/jobs";
import type { ProductionUsersResponse } from "@/types/users";
import type { ClientsResponse } from "@/types/clients";

interface ProductRow {
    job_product_id?: number;
    name: string;
    quantity: number;
    unit: string;
    user_id: number | "";
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

export default function PTEditJobPage(): ReactElement {
    const router = useRouter();
    const params = useParams();
    const queryClient = useQueryClient();
    const jobId = Number(params.id);

    const [form, setForm] = useState<EditJobForm | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: job, isLoading: jobLoading } = useQuery({
        queryKey: ["job", jobId],
        queryFn: () => fetchJob(jobId),
        enabled: !!jobId,
    });

    const usersQuery = useQuery({
        queryKey: ["all-users"],
        queryFn: (): Promise<ProductionUsersResponse> => fetchAllUsers(),
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
                      user_id: jp.assigned_to ?? "",
                  }))
                : [{ name: job.product, quantity: job.quantity, unit: "pcs", user_id: "" }];

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
            return { ...prev, products: [...prev.products, { name: "", quantity: 1, unit: "pcs", user_id: "" }] };
        });
    };

    const removeProduct = (index: number): void => {
        setForm((prev) => {
            if (!prev || prev.products.length <= 1) return prev;
            return { ...prev, products: prev.products.filter((_, i) => i !== index) };
        });
    };

    const handleSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        if (!form) return;
        if (!form.client_id) { toast.error("Please select a client."); return; }

        const validProducts = form.products.filter((p) => p.name.trim());
        if (validProducts.length === 0) { toast.error("Please add at least one product/service."); return; }

        setIsSubmitting(true);
        try {
            const resolvedJobType =
                form.job_type === "other" && form.custom_job_type.trim()
                    ? form.custom_job_type.trim()
                    : form.job_type;

            await updateJob(jobId, {
                job_name: form.job_name,
                job_type: resolvedJobType,
                priority: form.priority,
                status: form.status,
                product: validProducts[0].name,
                quantity: validProducts[0].quantity,
                expected_completion: form.expected_completion || null,
                notes: form.notes || null,
                start_date: form.start_date || null,
                delivery_date: form.delivery_date || null,
                delivery_method: form.delivery_method || null,
                job_products: validProducts.map((p) => ({
                    job_product_id: p.job_product_id ?? null,
                    name: p.name,
                    quantity: p.quantity,
                    unit: p.unit,
                    user_id: p.user_id || null,
                })),
            } as unknown as Parameters<typeof updateJob>[1]);

            queryClient.invalidateQueries({ queryKey: ["production-active-jobs"] });
            queryClient.invalidateQueries({ queryKey: ["job", jobId] });
            toast.success("Job updated successfully!");
            router.push("/staff/production/my-jobs");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to update job.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const users = usersQuery.data?.users ?? [];
    const clients = clientsQuery.data?.results ?? [];
    const catalogProducts = productsQuery.data?.results ?? [];

    if (jobLoading || !form) {
        return (
            <AdminLayout>
                <div className="p-8 flex items-center justify-center min-h-[400px]">
                    <div className="animate-pulse space-y-4 w-full max-w-4xl">
                        <div className="h-8 bg-gray-200 rounded w-1/3" />
                        <div className="h-64 bg-gray-200 rounded" />
                        <div className="h-48 bg-gray-200 rounded" />
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
                <div className="px-4 lg:px-8 py-4 flex items-center gap-4">
                    <button type="button" onClick={(): void => router.back()}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Jobs
                    </button>
                    <span className="text-gray-300">/</span>
                    <h1 className="text-lg font-semibold text-gray-900">
                        Edit Job {job?.job_number ? `— ${job.job_number}` : ""}
                    </h1>
                </div>
            </header>

            <datalist id="product-catalog">
                {catalogProducts.map((p) => (<option key={p.id} value={p.name} />))}
            </datalist>

            <main className="p-8 max-w-4xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-8">

                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Job Overview</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="md:col-span-3">
                                <label className={LABEL}>Job Title <span className="text-red-500">*</span></label>
                                <input type="text" required className={INPUT} placeholder="e.g. Business Cards for Acme Corp"
                                    value={form.job_name} onChange={(e: ChangeEvent<HTMLInputElement>): void => set("job_name", e.target.value)} />
                            </div>
                            <div>
                                <label className={LABEL}>Job Type</label>
                                <select className={SELECT} value={form.job_type} onChange={(e): void => {
                                    set("job_type", e.target.value);
                                    if (e.target.value !== "other") set("custom_job_type", "");
                                }}>
                                    <option value="printing">Printing</option>
                                    <option value="design">Design</option>
                                    <option value="branding">Branding</option>
                                    <option value="packaging">Packaging</option>
                                    <option value="signage">Signage</option>
                                    <option value="other">Other</option>
                                </select>
                                {form.job_type === "other" && (
                                    <input type="text" required autoFocus className={`${INPUT} mt-2`} placeholder="Specify job type..."
                                        value={form.custom_job_type} onChange={(e: ChangeEvent<HTMLInputElement>): void => set("custom_job_type", e.target.value)} />
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
                                    <option value="on_hold">On Hold</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Client</h2>
                        </div>
                        <div className="p-6">
                            <label className={LABEL}>Client <span className="text-red-500">*</span></label>
                            {/* If job already has a client (assigned by AM), show it locked */}
                            {job?.client ? (
                                <div className="flex items-center gap-3">
                                    <div className={`${INPUT} bg-gray-50 text-gray-700 cursor-not-allowed flex-1`}>
                                        {job.client.name}
                                    </div>
                                    <span className="text-xs text-gray-400 whitespace-nowrap">Auto-filled from job</span>
                                </div>
                            ) : (
                                <select required className={SELECT} value={form.client_id}
                                    onChange={(e): void => set("client_id", e.target.value ? Number(e.target.value) : "")}>
                                    <option value="">Select client...</option>
                                    {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                </select>
                            )}
                        </div>
                    </section>

                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Products / Services</h2>
                            <button type="button" onClick={addProduct} className="flex items-center gap-1 text-sm text-brand-blue hover:text-brand-blue/80 font-medium">
                                <Plus className="w-4 h-4" /> Add row
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide px-1">
                                <span className="col-span-4">Product / Service</span>
                                <span className="col-span-2">Quantity</span>
                                <span className="col-span-2">Unit</span>
                                <span className="col-span-3">Assigned To</span>
                                <span className="col-span-1" />
                            </div>
                            {form.products.map((product, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-4">
                                        <input type="text" list="product-catalog" required={idx === 0} className={INPUT}
                                            placeholder={idx === 0 ? "Search catalog or type name *" : "Search catalog or type name"}
                                            value={product.name} onChange={(e): void => updateProduct(idx, "name", e.target.value)} />
                                    </div>
                                    <div className="col-span-2">
                                        <input type="number" required={idx === 0} min={1} className={INPUT} value={product.quantity}
                                            onChange={(e): void => updateProduct(idx, "quantity", Number(e.target.value))} />
                                    </div>
                                    <div className="col-span-2">
                                        <select className={SELECT} value={product.unit} onChange={(e): void => updateProduct(idx, "unit", e.target.value)}>
                                            <option value="pcs">pcs</option>
                                            <option value="sets">sets</option>
                                            <option value="boxes">boxes</option>
                                            <option value="reams">reams</option>
                                            <option value="copies">copies</option>
                                            <option value="rolls">rolls</option>
                                        </select>
                                    </div>
                                    <div className="col-span-3">
                                        <select className={SELECT} value={product.user_id}
                                            onChange={(e): void => updateProduct(idx, "user_id", e.target.value ? Number(e.target.value) : "")}>
                                            <option value="">Unassigned</option>
                                            {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                                        </select>
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        {form.products.length > 1 && (
                                            <button type="button" onClick={(): void => removeProduct(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Job Description</h2>
                        </div>
                        <div className="p-6">
                            <label className={LABEL}>Notes / Instructions</label>
                            <textarea rows={4} className={INPUT}
                                placeholder="Describe the job in detail — requirements, special instructions, materials, and expected outcome..."
                                value={form.notes} onChange={(e): void => set("notes", e.target.value)} />
                        </div>
                    </section>

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
                                <label className={LABEL}>Due Date (Expected Completion) <span className="text-red-500">*</span></label>
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

                    <div className="flex items-center justify-between pb-8">
                        <button type="button" onClick={(): void => router.back()}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
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
        </AdminLayout>
    );
}
