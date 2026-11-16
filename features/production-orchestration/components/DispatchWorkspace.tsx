"use client";

import { type ReactElement, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    PackageCheckIcon,
    TruckIcon,
    PrinterIcon,
    AlertCircleIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    InboxIcon,
    LoaderCircleIcon,
    PlusIcon,
    XIcon,
    PenLineIcon,
    HistoryIcon,
    LinkIcon,
    CopyIcon,
    UserIcon,
    BikeIcon,
    MapPinIcon,
    ImageIcon,
    Pencil,
    Trash2,
    SearchIcon,
} from "lucide-react";
import {
    fetchDispatchUnits,
    createDispatchUnit,
    updateDispatchUnit,
    deleteDispatchUnit,
    approveDispatch,
    markDelivered,
    flagDispatchException,
    fetchJobComponents,
    fetchActiveJobs,
    type DispatchUnit,
    type CreateDispatchUnitPayload,
    type JobComponent,
    type ActiveJobOption,
} from "@/services/orchestration";

// ── Helpers ───────────────────────────────────────────────────────────────────

const apiStatusToDisplay = (s: DispatchUnit["status"]) => {
    const map: Record<string, "READY" | "PENDING" | "PARTIAL" | "DISPATCHED" | "DELIVERED"> = {
        ready:      "READY",
        partial:    "PARTIAL",
        dispatched: "DISPATCHED",
        delivered:  "DELIVERED",
        pending:    "PENDING",
    };
    return map[s] ?? "PENDING";
};

const statusConfig = {
    READY:      { label: "Ready to Dispatch",  bg: "bg-brand-green/10",  text: "text-brand-green",  stripe: "bg-brand-green" },
    PENDING:    { label: "Pending",            bg: "bg-gray-100",        text: "text-gray-500",     stripe: "bg-gray-300" },
    PARTIAL:    { label: "Partially Ready",    bg: "bg-brand-orange/10", text: "text-brand-orange", stripe: "bg-brand-orange" },
    DISPATCHED: { label: "Dispatched",         bg: "bg-brand-blue/10",   text: "text-brand-blue",   stripe: "bg-brand-blue" },
    DELIVERED:  { label: "Delivered",          bg: "bg-brand-green/10",  text: "text-brand-green",  stripe: "bg-brand-green" },
};

const compStatusToReadyQty = (status: string, quantity: number): number => {
    if (["ready", "dispatched", "completed"].includes(status)) return quantity;
    if (status === "in_progress") return Math.floor(quantity * 0.5);
    return 0;
};

const formatDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const DISPATCH_TYPES: { value: string; label: string }[] = [
    { value: "full",         label: "Full Dispatch" },
    { value: "partial",      label: "Partial Dispatch" },
    { value: "blind",        label: "Blind Dispatch (Vendor → Client)" },
    { value: "warehouse",    label: "Warehouse Routing" },
    { value: "installation", label: "Installation Dispatch" },
];

// ── Delivery Note Printer ─────────────────────────────────────────────────────

const downloadDeliveryNote = async (unit: DispatchUnit) => {
    // Use absolute URL so the logo loads from the server when the HTML file is opened
    const logoSrc = `${window.location.origin}/logo/pd.png`;
    const logoHtml = `<img src="${logoSrc}" style="height:60px;width:auto;display:block;" alt="PrintDuka" onerror="this.style.display='none'" />`;

    const rows = unit.components_detail.map((c) => `
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee">${c.product_name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${c.quantity.toLocaleString()} ${c.unit}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${c.status.replace(/_/g, " ")}</td>
        </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Delivery Note — ${unit.dispatch_number}</title>
<style>body{font-family:Arial,sans-serif;margin:40px;color:#111}table{width:100%;border-collapse:collapse}th{background:#f5f5f5;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em}@media print{button{display:none}}</style></head>
<body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px">
  <div>
    ${logoHtml}
    <h1 style="margin:8px 0 2px;font-size:20px">Delivery Note</h1>
    <p style="margin:0;color:#666;font-size:13px">${unit.dispatch_number}</p>
  </div>
  <div style="text-align:right;font-size:13px;color:#444">
    <p style="margin:0"><strong>Client:</strong> ${unit.client_name ?? "—"}</p>
    <p style="margin:4px 0 0"><strong>Type:</strong> ${unit.dispatch_type}</p>
    <p style="margin:4px 0 0"><strong>Courier:</strong> ${unit.courier || "—"}</p>
    <p style="margin:4px 0 0"><strong>Delivery to:</strong> ${unit.delivery_location || "—"}</p>
    <p style="margin:4px 0 0"><strong>Date:</strong> ${formatDate(unit.dispatch_date)}</p>
  </div>
</div>
<table><thead><tr><th>Component</th><th style="text-align:right">Quantity</th><th style="text-align:center">Status</th></tr></thead><tbody>${rows}</tbody></table>
${unit.exception_notes ? `<div style="margin-top:24px;padding:12px;background:#fff3cd;border-radius:6px"><strong>Exception Notes:</strong> ${unit.exception_notes}</div>` : ""}
${unit.pod_signed_by ? `<p style="margin-top:24px;font-size:13px"><strong>POD Signed by:</strong> ${unit.pod_signed_by}${unit.pod_signed_at ? ` · ${formatDate(unit.pod_signed_at)}` : ""}</p>` : ""}
<div style="margin-top:48px;display:flex;gap:80px">
  <div>
    ${unit.rider_confirmed_by ? `<p style="margin:0 0 4px;font-size:13px;font-weight:bold">${unit.rider_confirmed_by}</p><p style="margin:0 0 6px;font-size:11px;color:#666">${unit.rider_confirmed_at ? formatDate(unit.rider_confirmed_at) : ""}</p>` : ""}
    <div style="border-top:1px solid #333;width:200px;padding-top:4px;font-size:12px">Dispatched by / Date</div>
  </div>
  <div>
    ${unit.recipient_confirmed_by ? `<p style="margin:0 0 4px;font-size:13px;font-weight:bold">${unit.recipient_confirmed_by}</p><p style="margin:0 0 6px;font-size:11px;color:#666">${unit.recipient_confirmed_at ? formatDate(unit.recipient_confirmed_at) : ""}</p>` : ""}
    <div style="border-top:1px solid #333;width:200px;padding-top:4px;font-size:12px">Received by / Date</div>
  </div>
</div>
<button onclick="window.print()" style="margin-top:32px;padding:8px 20px;background:#1d4ed8;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px">Print</button>
</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delivery-note-${unit.dispatch_number}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// ── New Dispatch Unit Modal ───────────────────────────────────────────────────

interface NewDispatchModalProps {
    onClose: () => void;
    editUnit?: DispatchUnit;
    /** Record a delivery that already happened but was never documented. */
    pastDelivery?: boolean;
}

function NewDispatchModal({ onClose, editUnit, pastDelivery = false }: NewDispatchModalProps): ReactElement {
    const queryClient = useQueryClient();
    const isEdit = !!editUnit;
    const todayIso = new Date().toISOString().slice(0, 10);
    const [deliveredOn, setDeliveredOn] = useState("");
    const [receivedBy, setReceivedBy] = useState("");

    const [selectedJob, setSelectedJob] = useState<number | "">(editUnit?.job ?? "");
    const [dispatchType, setDispatchType] = useState(editUnit?.dispatch_type ?? DISPATCH_TYPES[0].value);
    const [courier, setCourier] = useState(editUnit?.courier ?? "");
    const [deliveryLocation, setDeliveryLocation] = useState(editUnit?.delivery_location ?? "");
    const [dispatchDate, setDispatchDate] = useState(editUnit?.dispatch_date ?? "");
    const [selectedComponents, setSelectedComponents] = useState<number[]>(editUnit?.components ?? []);
    const [error, setError] = useState("");

    const jobsQuery = useQuery({
        queryKey: ["active-jobs-for-dispatch"],
        queryFn: fetchActiveJobs,
    });

    const componentsQuery = useQuery({
        queryKey: ["job-components-for-dispatch", selectedJob],
        queryFn: () => fetchJobComponents(selectedJob as number),
        enabled: typeof selectedJob === "number" && selectedJob > 0,
    });

    const createMut = useMutation({
        mutationFn: async (payload: CreateDispatchUnitPayload) => {
            const unit = await createDispatchUnit(payload);
            if (pastDelivery) {
                return markDelivered(unit.id, receivedBy.trim(), deliveredOn);
            }
            return unit;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dispatch-units"] }); onClose(); },
        onError: (err: Error) => setError(err.message),
    });

    const updateMut = useMutation({
        mutationFn: (payload: Partial<CreateDispatchUnitPayload>) => updateDispatchUnit(editUnit!.id, payload),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dispatch-units"] }); onClose(); },
        onError: (err: Error) => setError(err.message),
    });

    const readyComponents: JobComponent[] = componentsQuery.data ?? [];

    const toggleComponent = (id: number) => {
        setSelectedComponents((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = () => {
        setError("");
        if (!selectedJob) { setError("Please select a job."); return; }
        if (!deliveryLocation.trim()) { setError("Delivery location is required."); return; }
        if (pastDelivery) {
            if (!deliveredOn) { setError("Enter the date it was delivered."); return; }
            if (deliveredOn > todayIso) { setError("Delivery date can't be in the future."); return; }
            if (!receivedBy.trim()) { setError("Enter who received the delivery."); return; }
        }
        const payload = {
            job: selectedJob as number,
            dispatch_type: dispatchType,
            courier: courier.trim(),
            delivery_location: deliveryLocation.trim(),
            dispatch_date: (pastDelivery ? dispatchDate || deliveredOn : dispatchDate) || null,
            components: selectedComponents,
        };
        if (isEdit) updateMut.mutate(payload);
        else createMut.mutate(payload);
    };

    const isPending = createMut.isPending || updateMut.isPending;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        {pastDelivery ? <HistoryIcon className="h-5 w-5 text-brand-blue" /> : <PackageCheckIcon className="h-5 w-5 text-brand-green" />}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                {isEdit ? `Edit ${editUnit!.dispatch_number}` : pastDelivery ? "Record Past Delivery" : "New Dispatch Unit"}
                            </h2>
                            {pastDelivery && (
                                <p className="text-xs text-gray-500">For a delivery that already happened but wasn&apos;t recorded. It&apos;s saved as delivered.</p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto px-6 py-5 space-y-4">
                    {/* Master Job */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Master Job *</label>
                        <select
                            value={selectedJob}
                            onChange={(e) => {
                                setSelectedJob(e.target.value ? Number(e.target.value) : "");
                                setSelectedComponents([]);
                            }}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                        >
                            <option value="">— Select job —</option>
                            {jobsQuery.isLoading && <option disabled>Loading jobs…</option>}
                            {(jobsQuery.data ?? []).map((j) => (
                                <option key={j.id} value={j.id}>
                                    {j.job_number || j.job_name}{j.client?.name ? ` · ${j.client.name}` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Dispatch Type */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Dispatch Type</label>
                        <select
                            value={dispatchType}
                            onChange={(e) => setDispatchType(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                        >
                            {DISPATCH_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Courier + Date row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Courier</label>
                            <input
                                value={courier}
                                onChange={(e) => setCourier(e.target.value)}
                                placeholder="Courier or internal delivery"
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Dispatch Date</label>
                            <input
                                type="date"
                                value={dispatchDate}
                                onChange={(e) => setDispatchDate(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Delivery Location */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Delivery Location *</label>
                        <input
                            value={deliveryLocation}
                            onChange={(e) => setDeliveryLocation(e.target.value)}
                            placeholder="Client address or delivery point"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                        />
                    </div>

                    {/* Components */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                            Components Included
                            {typeof selectedJob === "number" && selectedJob > 0 && componentsQuery.data && (
                                <span className="ml-1 font-normal normal-case text-gray-400">
                                    — {readyComponents.length} component{readyComponents.length !== 1 ? "s" : ""} found
                                </span>
                            )}
                        </label>
                        {!selectedJob && (
                            <p className="text-xs text-gray-400 italic">Select a job first to see available components.</p>
                        )}
                        {selectedJob && componentsQuery.isLoading && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
                                Loading components…
                            </div>
                        )}
                        {selectedJob && !componentsQuery.isLoading && readyComponents.length === 0 && (
                            <p className="text-xs text-gray-400 italic">No components found for this job.</p>
                        )}
                        {readyComponents.length > 0 && (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto rounded-lg border border-gray-200 p-2">
                                {readyComponents.map((c) => (
                                    <label key={c.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedComponents.includes(c.id)}
                                            onChange={() => toggleComponent(c.id)}
                                            className="h-3.5 w-3.5 rounded border-gray-300 text-brand-blue"
                                        />
                                        <span className="text-sm text-gray-700">{c.product_name}</span>
                                        <span className="ml-auto text-xs text-gray-400">{c.quantity.toLocaleString()} {c.unit}</span>
                                        <span className="rounded-full bg-brand-green/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-green">
                                            {c.status.replace(/_/g, " ")}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {pastDelivery && (
                        <div className="grid grid-cols-1 gap-3 rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-3 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Delivered on *</label>
                                <input
                                    type="date"
                                    value={deliveredOn}
                                    max={todayIso}
                                    onChange={(e) => setDeliveredOn(e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Received by *</label>
                                <input
                                    type="text"
                                    value={receivedBy}
                                    onChange={(e) => setReceivedBy(e.target.value)}
                                    placeholder="Name of person who received it"
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                            <AlertCircleIcon className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="flex items-center gap-2 rounded-lg bg-brand-green px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green/90 disabled:opacity-50 transition-colors"
                    >
                        {isPending
                            ? <><LoaderCircleIcon className="h-4 w-4 animate-spin" /> {isEdit ? "Saving…" : pastDelivery ? "Recording…" : "Creating…"}</>
                            : <><PackageCheckIcon className="h-4 w-4" /> {isEdit ? "Save Changes" : pastDelivery ? "Record Delivery" : "Create Dispatch Unit"}</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Capture Signature / Mark Delivered Modal ──────────────────────────────────

interface CaptureSignatureModalProps {
    unit: DispatchUnit;
    onClose: () => void;
}

function CaptureSignatureModal({ unit, onClose }: CaptureSignatureModalProps): ReactElement {
    const queryClient = useQueryClient();
    const [signedBy, setSignedBy] = useState("");
    const [error, setError] = useState("");

    const deliverMut = useMutation({
        mutationFn: (podSignedBy: string) => markDelivered(unit.id, podSignedBy),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dispatch-units"] });
            onClose();
        },
        onError: (err: Error) => setError(err.message),
    });

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <PenLineIcon className="h-5 w-5 text-brand-blue" />
                        <h2 className="text-base font-bold text-gray-900">Capture POD Signature</h2>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
                        <XIcon className="h-4 w-4" />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <p className="text-sm text-gray-500">
                        Dispatch <span className="font-mono font-semibold text-gray-700">{unit.dispatch_number}</span> for{" "}
                        <span className="font-semibold text-gray-800">{unit.job_name}</span>
                    </p>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                            Received / Signed by *
                        </label>
                        <input
                            value={signedBy}
                            onChange={(e) => setSignedBy(e.target.value)}
                            placeholder="Full name of recipient"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                            autoFocus
                        />
                    </div>
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                            <AlertCircleIcon className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                    <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            setError("");
                            if (!signedBy.trim()) { setError("Recipient name is required."); return; }
                            deliverMut.mutate(signedBy.trim());
                        }}
                        disabled={deliverMut.isPending}
                        className="flex items-center gap-2 rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
                    >
                        {deliverMut.isPending
                            ? <><LoaderCircleIcon className="h-4 w-4 animate-spin" /> Saving…</>
                            : <><CheckCircleIcon className="h-4 w-4" /> Mark as Delivered</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Delivery Links Modal ──────────────────────────────────────────────────────

interface DeliveryLinksModalProps {
    dispatchNumber: string;
    riderLink: string;
    recipientLink: string;
    onClose: () => void;
}

function DeliveryLinksModal({ dispatchNumber, riderLink, recipientLink, onClose }: DeliveryLinksModalProps): ReactElement {
    const [copiedRider, setCopiedRider] = useState(false);
    const [copiedRecipient, setCopiedRecipient] = useState(false);

    const copy = (text: string, which: "rider" | "recipient") => {
        void navigator.clipboard.writeText(text);
        if (which === "rider") { setCopiedRider(true); setTimeout(() => setCopiedRider(false), 2000); }
        else { setCopiedRecipient(true); setTimeout(() => setCopiedRecipient(false), 2000); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <LinkIcon className="h-5 w-5 text-brand-blue" />
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Delivery Confirmation Links</h2>
                            <p className="text-xs text-gray-400">{dispatchNumber} · Copy each link and send to the respective party</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
                        <XIcon className="h-4 w-4" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <BikeIcon className="h-4 w-4 text-brand-blue" />
                            <span className="text-sm font-semibold text-gray-800">Rider / Courier Link</span>
                        </div>
                        <p className="text-xs text-gray-500">Send this to the rider. They will confirm delivery and record who received the items.</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-700 break-all font-mono select-all">{riderLink}</code>
                            <button onClick={() => copy(riderLink, "rider")}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors shrink-0 ${copiedRider ? "bg-brand-green text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-blue hover:text-white"}`}>
                                <CopyIcon className="h-3.5 w-3.5" />
                                {copiedRider ? "Copied!" : "Copy"}
                            </button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-brand-orange" />
                            <span className="text-sm font-semibold text-gray-800">Recipient / Client Link</span>
                        </div>
                        <p className="text-xs text-gray-500">Send this to the recipient. They will acknowledge receipt and can raise any issues.</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-700 break-all font-mono select-all">{recipientLink}</code>
                            <button onClick={() => copy(recipientLink, "recipient")}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors shrink-0 ${copiedRecipient ? "bg-brand-green text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-orange hover:text-white"}`}>
                                <CopyIcon className="h-3.5 w-3.5" />
                                {copiedRecipient ? "Copied!" : "Copy"}
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 text-center">These links expire in 30 days. When both parties confirm, the dispatch is automatically marked as delivered.</p>
                </div>

                <div className="flex justify-end border-t border-gray-100 px-6 py-4">
                    <button onClick={onClose} className="rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 transition-colors">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Workspace ────────────────────────────────────────────────────────────

export default function DispatchWorkspace(): ReactElement {
    const queryClient = useQueryClient();
    const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
    const [flagNotes, setFlagNotes] = useState<Record<number, string>>({});
    const [showFlagInput, setShowFlagInput] = useState<Set<number>>(() => new Set());
    const [showNewModal, setShowNewModal] = useState(false);
    const [showPastModal, setShowPastModal] = useState(false);
    const [editUnit, setEditUnit] = useState<DispatchUnit | null>(null);
    const [signatureUnit, setSignatureUnit] = useState<DispatchUnit | null>(null);
    const [deliveryLinks, setDeliveryLinks] = useState<{ dispatchNumber: string; riderLink: string; recipientLink: string } | null>(null);
    const [search, setSearch] = useState("");

    const dispatchQuery = useQuery({
        queryKey: ["dispatch-units"],
        queryFn: () => fetchDispatchUnits(),
        refetchInterval: 60_000,
    });

    const approveMut = useMutation({
        mutationFn: (unitId: number) => approveDispatch(unitId),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["dispatch-units"] });
            if (data.rider_link && data.recipient_link) {
                setDeliveryLinks({
                    dispatchNumber: data.dispatch_number,
                    riderLink: data.rider_link,
                    recipientLink: data.recipient_link,
                });
            }
        },
    });

    const flagMut = useMutation({
        mutationFn: ({ unitId, notes }: { unitId: number; notes: string }) => flagDispatchException(unitId, notes),
        onSuccess: (_data, { unitId }) => {
            queryClient.invalidateQueries({ queryKey: ["dispatch-units"] });
            setShowFlagInput((prev) => { const n = new Set(prev); n.delete(unitId); return n; });
            setFlagNotes((prev) => { const n = { ...prev }; delete n[unitId]; return n; });
        },
    });

    const deleteMut = useMutation({
        mutationFn: (unitId: number) => deleteDispatchUnit(unitId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dispatch-units"] }),
    });

    const allUnits: DispatchUnit[] = dispatchQuery.data ?? [];
    const units: DispatchUnit[] = search.trim()
        ? allUnits.filter((u) => {
            const q = search.toLowerCase();
            return (
                u.dispatch_number.toLowerCase().includes(q) ||
                u.job_name?.toLowerCase().includes(q) ||
                u.client_name?.toLowerCase().includes(q) ||
                u.courier?.toLowerCase().includes(q) ||
                u.delivery_location?.toLowerCase().includes(q)
            );
          })
        : allUnits;

    const toggle = (id: number) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const readyCount      = allUnits.filter((u) => u.status === "ready").length;
    const partialCount    = allUnits.filter((u) => u.status === "partial").length;
    const dispatchedCount = allUnits.filter((u) => u.status === "dispatched").length;
    const deliveredCount  = allUnits.filter((u) => u.status === "delivered").length;

    return (
        <>
            {showNewModal && <NewDispatchModal onClose={() => setShowNewModal(false)} />}
            {showPastModal && <NewDispatchModal pastDelivery onClose={() => setShowPastModal(false)} />}
            {editUnit && <NewDispatchModal onClose={() => setEditUnit(null)} editUnit={editUnit} />}
            {signatureUnit && (
                <CaptureSignatureModal
                    unit={signatureUnit}
                    onClose={() => setSignatureUnit(null)}
                />
            )}
            {deliveryLinks && (
                <DeliveryLinksModal
                    dispatchNumber={deliveryLinks.dispatchNumber}
                    riderLink={deliveryLinks.riderLink}
                    recipientLink={deliveryLinks.recipientLink}
                    onClose={() => setDeliveryLinks(null)}
                />
            )}

            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <PackageCheckIcon className="h-6 w-6 text-brand-green" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Dispatch Orchestration</h1>
                            <p className="mt-0.5 text-sm text-gray-500">
                                Three-way reconciliation · Delivery note generation · Dispatch sign-off
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {dispatchQuery.isFetching && <LoaderCircleIcon className="h-4 w-4 animate-spin text-gray-300" />}
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search dispatch, job, client…"
                                className="pl-9 pr-3 py-2 rounded-md border border-gray-200 text-sm focus:border-brand-blue focus:outline-none w-56"
                            />
                        </div>
                        <button
                            onClick={() => allUnits.forEach((u) => void downloadDeliveryNote(u))}
                            disabled={units.length === 0}
                            className="flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors disabled:opacity-40"
                        >
                            <PrinterIcon className="h-4 w-4" />
                            Download All Delivery Notes
                        </button>
                        <button
                            onClick={() => setShowPastModal(true)}
                            className="flex items-center gap-2 rounded-md border border-brand-blue px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5 transition-colors"
                            title="Record a delivery that already happened but wasn't documented"
                        >
                            <HistoryIcon className="h-4 w-4" />
                            Record Past Delivery
                        </button>
                        <button
                            onClick={() => setShowNewModal(true)}
                            className="flex items-center gap-2 rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green/90 transition-colors"
                        >
                            <PlusIcon className="h-4 w-4" />
                            New Dispatch Unit
                        </button>
                    </div>
                </div>
            </header>

            <main className="min-h-screen bg-gray-50 p-8 space-y-6">

                {/* KPI strip */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                        { label: "Ready to Dispatch", value: readyCount,      color: "bg-brand-green",  light: "border-brand-green/20" },
                        { label: "Partially Ready",   value: partialCount,    color: "bg-brand-orange", light: "border-brand-orange/20" },
                        { label: "Dispatched",        value: dispatchedCount, color: "bg-brand-blue",   light: "border-brand-blue/20" },
                        { label: "Delivered",         value: deliveredCount,  color: "bg-brand-green",  light: "border-brand-green/20" },
                    ].map((k) => (
                        <article key={k.label} className={`relative overflow-hidden rounded-xl border ${k.light} bg-white px-5 py-4 shadow-sm`}>
                            <div className={`absolute top-0 left-0 right-0 h-1 ${k.color}`} />
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{k.label}</p>
                            <p className="mt-2 text-3xl font-extrabold text-gray-900">{k.value}</p>
                        </article>
                    ))}
                </div>

                {/* Dispatch units */}
                <div className="space-y-4">
                    {dispatchQuery.isLoading && (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20">
                            <LoaderCircleIcon className="h-8 w-8 animate-spin text-gray-300" />
                            <p className="mt-3 text-sm text-gray-400">Loading dispatch units…</p>
                        </div>
                    )}

                    {!dispatchQuery.isLoading && units.length === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20">
                            <InboxIcon className="h-10 w-10 text-gray-200" />
                            <p className="mt-3 text-sm font-semibold text-gray-400">No dispatch units in queue</p>
                            <p className="mt-1 text-xs text-gray-300 text-center max-w-md">
                                Click "+ New Dispatch Unit" to create one from a ready job.
                            </p>
                        </div>
                    )}

                    {units.map((unit) => {
                        const displayStatus = apiStatusToDisplay(unit.status);
                        const sc = statusConfig[displayStatus];
                        const isOpen = expanded.has(unit.id);
                        const isDispatched = displayStatus === "DISPATCHED";
                        const isDelivered = displayStatus === "DELIVERED";

                        const items = unit.components_detail.map((c) => ({
                            id: c.id,
                            name: c.product_name,
                            quotedQty: c.quantity,
                            producedQty: c.produced_qty ?? compStatusToReadyQty(c.status, c.quantity),
                            invoicedQty: c.invoiced_qty ?? 0,
                            unit: c.unit,
                            status: c.status,
                        }));

                        const hasVariance = items.some((i) => i.producedQty < i.quotedQty);
                        const hasInvoiceVariance = items.some(
                            (i) => i.invoicedQty > 0 && i.invoicedQty !== i.producedQty
                        );
                        const canApprove = items.some((i) => i.producedQty > 0);

                        return (
                            <div key={unit.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                                {/* Unit header */}
                                <button
                                    onClick={() => toggle(unit.id)}
                                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                                >
                                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${sc.stripe}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-mono text-xs text-gray-400">{unit.dispatch_number}</p>
                                            {hasVariance && !isDispatched && !isDelivered && (
                                                <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
                                                    QTY VARIANCE
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 font-semibold text-gray-800">{unit.job_name}</p>
                                        <p className="text-xs text-gray-400">
                                            {unit.client_name ?? "—"} · {unit.dispatch_type}
                                            {unit.delivery_location ? ` · ${unit.delivery_location}` : ""}
                                            {unit.dispatch_date ? ` · SLA ${formatDate(unit.dispatch_date)}` : ""}
                                        </p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${sc.bg} ${sc.text}`}>
                                        {isDelivered ? "DELIVERED · POD SIGNED" : sc.label}
                                    </span>
                                    {isOpen
                                        ? <ChevronDownIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                        : <ChevronRightIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                    }
                                </button>

                                {/* Delivered banner (always visible) */}
                                {isDelivered && (
                                    <div className="flex items-center gap-2 border-t border-brand-green/20 bg-brand-green/5 px-5 py-2.5">
                                        <CheckCircleIcon className="h-4 w-4 text-brand-green shrink-0" />
                                        <p className="text-sm font-semibold text-brand-green">
                                            Delivered {unit.pod_signed_at ? formatDate(unit.pod_signed_at) : ""}
                                            {unit.pod_signed_by ? ` · POD signed by ${unit.pod_signed_by}` : ""}
                                            {" · Financial closure initiated."}
                                        </p>
                                        <button
                                            onClick={() => void downloadDeliveryNote(unit)}
                                            className="ml-auto flex items-center gap-1.5 text-xs text-brand-green font-semibold hover:underline"
                                        >
                                            <PrinterIcon className="h-3.5 w-3.5" />
                                            Download Note
                                        </button>
                                    </div>
                                )}

                                {/* Expanded content */}
                                {isOpen && (
                                    <div className="border-t border-gray-100">
                                        {hasInvoiceVariance && (
                                            <div className="flex items-center gap-2 border-b border-brand-orange/20 bg-brand-orange/5 px-5 py-2.5">
                                                <AlertCircleIcon className="h-4 w-4 text-brand-orange shrink-0" />
                                                <p className="text-xs font-semibold text-brand-orange">
                                                    Invoice/production quantity mismatch detected — reconcile before financial closure
                                                </p>
                                            </div>
                                        )}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-100">
                                                        <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Item</th>
                                                        <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Quoted</th>
                                                        <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Produced</th>
                                                        <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Invoiced</th>
                                                        <th className="px-5 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Match</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {items.map((item) => {
                                                        const qpMatch = item.producedQty >= item.quotedQty;
                                                        const piMatch = item.invoicedQty === 0 || item.invoicedQty === item.producedQty;
                                                        const allMatch = qpMatch && piMatch;
                                                        return (
                                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-5 py-3">
                                                                    <p className="font-semibold text-gray-800">{item.name}</p>
                                                                    <p className="font-mono text-[10px] text-gray-400">#{item.id}</p>
                                                                </td>
                                                                <td className="px-5 py-3 text-right text-gray-600">
                                                                    {item.quotedQty.toLocaleString()} {item.unit}
                                                                </td>
                                                                <td className={`px-5 py-3 text-right font-semibold ${
                                                                    item.producedQty === 0 ? "text-brand-red" :
                                                                    item.producedQty < item.quotedQty ? "text-brand-orange" : "text-brand-green"
                                                                }`}>
                                                                    {item.producedQty.toLocaleString()} {item.unit}
                                                                </td>
                                                                <td className={`px-5 py-3 text-right ${
                                                                    item.invoicedQty === 0 ? "text-gray-300 italic text-xs" :
                                                                    piMatch ? "font-semibold text-brand-green" : "font-semibold text-brand-orange"
                                                                }`}>
                                                                    {item.invoicedQty === 0 ? "—" : `${item.invoicedQty.toLocaleString()} ${item.unit}`}
                                                                </td>
                                                                <td className="px-5 py-3 text-center">
                                                                    {allMatch
                                                                        ? <span className="text-brand-green font-bold text-sm">✓</span>
                                                                        : item.producedQty === 0
                                                                            ? <span className="rounded-full bg-brand-red/10 px-2 py-0.5 text-[10px] font-bold text-brand-red">NOT READY</span>
                                                                            : <span className="text-brand-orange font-bold text-sm">✗</span>
                                                                    }
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {items.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-400">
                                                                No components linked to this dispatch unit
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Exception notes */}
                                        {unit.exception_notes && (
                                            <div className="flex items-start gap-2 border-t border-brand-orange/20 bg-brand-orange/5 px-5 py-3">
                                                <AlertCircleIcon className="h-4 w-4 text-brand-orange shrink-0 mt-0.5" />
                                                <p className="text-sm text-brand-orange">{unit.exception_notes}</p>
                                            </div>
                                        )}

                                        {/* Delivery confirmation details */}
                                        {(unit.rider_confirmed_by || unit.recipient_confirmed_by) && (
                                            <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Delivery Confirmation Details</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {/* Rider panel */}
                                                    {unit.rider_confirmed_by && (
                                                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                                                                <BikeIcon className="h-3.5 w-3.5" />
                                                                Rider
                                                            </div>
                                                            <div className="space-y-1 text-xs text-gray-600">
                                                                <div><span className="font-medium text-gray-700">By:</span> {unit.rider_confirmed_by}</div>
                                                                {unit.rider_confirmed_at && (
                                                                    <div><span className="font-medium text-gray-700">At:</span> {formatDate(unit.rider_confirmed_at)}</div>
                                                                )}
                                                                {unit.rider_notes && (
                                                                    <div><span className="font-medium text-gray-700">Notes:</span> {unit.rider_notes}</div>
                                                                )}
                                                                {unit.rider_gps_lat && unit.rider_gps_lng && (
                                                                    <a
                                                                        href={`https://maps.google.com/?q=${unit.rider_gps_lat},${unit.rider_gps_lng}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-1 text-brand-blue hover:underline font-medium"
                                                                    >
                                                                        <MapPinIcon className="h-3 w-3" />
                                                                        View on Google Maps
                                                                    </a>
                                                                )}
                                                            </div>
                                                            {unit.rider_photos && unit.rider_photos.length > 0 && (
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-1 text-xs text-gray-400">
                                                                        <ImageIcon className="h-3 w-3" />
                                                                        {unit.rider_photos.length} photo{unit.rider_photos.length !== 1 ? "s" : ""}
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {unit.rider_photos.map((url, i) => (
                                                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                                                                <img
                                                                                    src={url}
                                                                                    alt={`Delivery photo ${i + 1}`}
                                                                                    className="h-14 w-14 rounded-md object-cover border border-gray-200 hover:opacity-80 transition-opacity"
                                                                                />
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Recipient panel */}
                                                    {unit.recipient_confirmed_by && (
                                                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                                                                <UserIcon className="h-3.5 w-3.5" />
                                                                Recipient
                                                            </div>
                                                            <div className="space-y-1 text-xs text-gray-600">
                                                                <div><span className="font-medium text-gray-700">By:</span> {unit.recipient_confirmed_by}</div>
                                                                {unit.recipient_confirmed_at && (
                                                                    <div><span className="font-medium text-gray-700">At:</span> {formatDate(unit.recipient_confirmed_at)}</div>
                                                                )}
                                                                {unit.recipient_notes && (
                                                                    <div><span className="font-medium text-gray-700">Notes:</span> {unit.recipient_notes}</div>
                                                                )}
                                                            </div>
                                                            {unit.recipient_photos && unit.recipient_photos.length > 0 && (
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-1 text-xs text-gray-400">
                                                                        <ImageIcon className="h-3 w-3" />
                                                                        {unit.recipient_photos.length} photo{unit.recipient_photos.length !== 1 ? "s" : ""}
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {unit.recipient_photos.map((url, i) => (
                                                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                                                                <img
                                                                                    src={url}
                                                                                    alt={`Receipt photo ${i + 1}`}
                                                                                    className="h-14 w-14 rounded-md object-cover border border-gray-200 hover:opacity-80 transition-opacity"
                                                                                />
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Flag input */}
                                        {showFlagInput.has(unit.id) && (
                                            <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 flex items-center gap-3">
                                                <input
                                                    placeholder="Exception notes…"
                                                    value={flagNotes[unit.id] ?? ""}
                                                    onChange={(e) => setFlagNotes((p) => ({ ...p, [unit.id]: e.target.value }))}
                                                    className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                />
                                                <button
                                                    onClick={() => flagMut.mutate({ unitId: unit.id, notes: flagNotes[unit.id] ?? "" })}
                                                    disabled={flagMut.isPending || !(flagNotes[unit.id] ?? "").trim()}
                                                    className="rounded-md bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-orange/90 disabled:opacity-40"
                                                >
                                                    {flagMut.isPending ? "Flagging…" : "Submit Flag"}
                                                </button>
                                                <button
                                                    onClick={() => setShowFlagInput((p) => { const n = new Set(p); n.delete(unit.id); return n; })}
                                                    className="text-xs text-gray-400 hover:text-gray-600"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}

                                        {/* Actions — pending/ready/partial */}
                                        {!isDispatched && !isDelivered && (
                                            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                                                {hasVariance && (
                                                    <div className="flex items-center gap-2 text-xs text-brand-orange font-semibold">
                                                        <AlertCircleIcon className="h-4 w-4" />
                                                        Production qty below quoted — confirm with client before dispatch
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <button
                                                        onClick={() => setEditUnit(unit)}
                                                        className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:border-brand-blue hover:text-brand-blue transition-colors flex items-center gap-1.5"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm(`Delete dispatch unit ${unit.dispatch_number}? This cannot be undone.`))
                                                                deleteMut.mutate(unit.id);
                                                        }}
                                                        disabled={deleteMut.isPending}
                                                        className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:border-brand-red hover:text-brand-red transition-colors flex items-center gap-1.5 disabled:opacity-40"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Delete
                                                    </button>
                                                    <button
                                                        onClick={() => setShowFlagInput((p) => {
                                                            const n = new Set(p);
                                                            n.has(unit.id) ? n.delete(unit.id) : n.add(unit.id);
                                                            return n;
                                                        })}
                                                        className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:border-brand-red hover:text-brand-red transition-colors flex items-center gap-1.5"
                                                    >
                                                        <AlertCircleIcon className="h-3.5 w-3.5" />
                                                        Flag Exception
                                                    </button>
                                                    <button
                                                        onClick={() => void downloadDeliveryNote(unit)}
                                                        className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:border-brand-blue hover:text-brand-blue transition-colors flex items-center gap-1.5"
                                                    >
                                                        <PrinterIcon className="h-3.5 w-3.5" />
                                                        Download Delivery Note
                                                    </button>
                                                    <button
                                                        onClick={() => approveMut.mutate(unit.id)}
                                                        disabled={!canApprove || approveMut.isPending}
                                                        className="flex items-center gap-2 rounded-md bg-brand-green px-4 py-2 text-xs font-semibold text-white hover:bg-brand-green/90 disabled:opacity-40 transition-colors"
                                                    >
                                                        {approveMut.isPending
                                                            ? <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                                                            : <TruckIcon className="h-4 w-4" />
                                                        }
                                                        Approve &amp; Dispatch
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions — dispatched (awaiting delivery confirmation) */}
                                        {isDispatched && !isDelivered && (
                                            <div className="flex items-center justify-between border-t border-brand-blue/20 bg-brand-blue/5 px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <TruckIcon className="h-4 w-4 text-brand-blue" />
                                                    <p className="text-sm font-semibold text-brand-blue">
                                                        Dispatched — awaiting delivery confirmation
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => void downloadDeliveryNote(unit)}
                                                        className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:border-brand-blue hover:text-brand-blue transition-colors"
                                                    >
                                                        <PrinterIcon className="h-3.5 w-3.5" />
                                                        Download Delivery Note
                                                    </button>
                                                    <button
                                                        onClick={() => setSignatureUnit(unit)}
                                                        className="flex items-center gap-1.5 rounded-md bg-brand-blue px-4 py-2 text-xs font-semibold text-white hover:bg-brand-blue/90 transition-colors"
                                                    >
                                                        <PenLineIcon className="h-3.5 w-3.5" />
                                                        Capture Signature
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </main>
        </>
    );
}
