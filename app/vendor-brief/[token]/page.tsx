"use client";

import { useState, useEffect, useRef, type ReactElement } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, FileDown, Clock, Send, ChevronDown, Upload, Timer } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface BriefFile {
    id: number;
    slot_display: string;
    file_name: string;
    file_url: string;
}

interface BriefAttachmentItem {
    id: number;
    attachment_name: string;
    description: string;
    file_url: string;
    uploaded_at: string;
}

interface BriefProof {
    id: number;
    file_name: string;
    file_url: string;
    uploaded_at: string;
    uploaded_by_name: string;
    pt_feedback: string;
    feedback_at: string | null;
}

interface BriefComponent {
    id: number;
    product_name: string;
    production_type: string;
    quantity: number;
    unit: string;
    specifications: string;
    brief_artwork_ref: string;
    brief_quoted_price: string;
    brief_lpo_ref: string;
    notes: string;
    sla_deadline: string | null;
    status: string;
    job_name: string;
    job_number: string;
    job_instructions: string;
    vendor_name: string;
    job_priority: string;
    files: BriefFile[];
}

interface BriefData {
    acknowledged: boolean;
    acknowledged_at: string | null;
    acknowledged_by: string;
    vendor_accepted: boolean;
    vendor_accepted_at: string | null;
    time_adjustment_requested: boolean;
    time_adjustment_reason: string;
    proposed_deadline: string | null;
    proposed_cost: string;
    adjustment_status: "pending" | "approved" | "rejected" | null;
    adjustment_response: string;
    adjustment_responded_at: string | null;
    adjustment_responded_by: string | null;
    component: BriefComponent;
    updates: { note: string; created_at: string }[];
    proofs: BriefProof[];
    brief_attachments: BriefAttachmentItem[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: "in_progress", label: "In Progress" },
    { value: "blocked",     label: "Blocked / Need Help" },
    { value: "ready",       label: "Proof Ready" },
    { value: "completed",   label: "Job Completed" },
];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
    pending:     { bg: "#f3f4f6", color: "#4b5563" },
    in_progress: { bg: "#dbeafe", color: "#1d4ed8" },
    blocked:     { bg: "#fee2e2", color: "#b91c1c" },
    qc_hold:     { bg: "#ffedd5", color: "#c2410c" },
    ready:       { bg: "#f3e8ff", color: "#7e22ce" },
    dispatched:  { bg: "#e0e7ff", color: "#4338ca" },
    completed:   { bg: "#dcfce7", color: "#15803d" },
};

const STATUS_LABELS: Record<string, string> = {
    pending:     "Pending",
    in_progress: "In Progress",
    blocked:     "Blocked",
    qc_hold:     "QC Hold",
    ready:       "Proof Ready",
    dispatched:  "Dispatched",
    completed:   "Completed",
};

const PRIORITY_CONFIG: Record<string, { bg: string; color: string; border: string; label: string }> = {
    normal: { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb", label: "Normal Priority" },
    high:   { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa", label: "High Priority" },
    urgent: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "Urgent" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function downloadFile(url: string, fileName: string): Promise<void> {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
}

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string): string {
    return new Date(iso).toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function useCountdown(deadline: string | null, active: boolean): { text: string; isOverdue: boolean } {
    const [state, setState] = useState({ text: "", isOverdue: false });

    useEffect(() => {
        if (!active || !deadline) { setState({ text: "", isOverdue: false }); return; }

        const update = () => {
            const diff = new Date(deadline).getTime() - Date.now();
            if (diff <= 0) { setState({ text: "Deadline has passed", isOverdue: true }); return; }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            const text = d > 0 ? `${d}d ${h}h ${m}m remaining`
                : h > 0 ? `${h}h ${m}m ${s}s remaining`
                : `${m}m ${s}s remaining`;
            setState({ text, isOverdue: false });
        };

        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [deadline, active]);

    return state;
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function VendorBriefPage(): ReactElement {
    const params = useParams<{ token: string }>();
    const token = params?.token ?? "";
    const apiBase = `/api/proxy/api/v1/vendor-brief/${token}/`;

    const [data, setData] = useState<BriefData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [senderName, setSenderName] = useState("");

    // Pre-acceptance
    const [showAdjustReason, setShowAdjustReason] = useState(false);
    const [adjustReason, setAdjustReason] = useState("");
    const [adjustProposedDeadline, setAdjustProposedDeadline] = useState("");
    const [adjustProposedCost, setAdjustProposedCost] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    // Post-acceptance adjustment
    const [showProgressAdjust, setShowProgressAdjust] = useState(false);
    const [progressReason, setProgressReason] = useState("");
    const [progressProposedDeadline, setProgressProposedDeadline] = useState("");
    const [progressProposedCost, setProgressProposedCost] = useState("");
    const [progressLoading, setProgressLoading] = useState(false);
    const [progressError, setProgressError] = useState<string | null>(null);
    const [progressSuccess, setProgressSuccess] = useState(false);

    // Update form
    const [updateStatus, setUpdateStatus] = useState("");
    const [updatePrice, setUpdatePrice] = useState("");
    const [updateNote, setUpdateNote] = useState("");
    const [updateLoading, setUpdateLoading] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    // Proof upload
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofLoading, setProofLoading] = useState(false);
    const [proofError, setProofError] = useState<string | null>(null);
    const [proofSuccess, setProofSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { text: countdownText, isOverdue } = useCountdown(
        data?.component?.sla_deadline ?? null,
        data?.vendor_accepted === true,
    );

    useEffect(() => {
        fetch(apiBase, { cache: "no-store" })
            .then((r) => {
                if (!r.ok) throw new Error(
                    r.status === 404 ? "This link is invalid or has been removed." :
                    r.status === 410 ? "This link has expired." :
                    "Could not load brief."
                );
                return r.json() as Promise<BriefData>;
            })
            .then((d) => { setData(d); if (d.acknowledged_by) setSenderName(d.acknowledged_by); })
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false));
    }, [apiBase]);

    const refreshData = async (): Promise<void> => {
        const r = await fetch(apiBase, { cache: "no-store" });
        setData(await r.json() as BriefData);
    };

    const callAcknowledge = async (name: string): Promise<void> => {
        const r = await fetch(apiBase, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "acknowledge", acknowledged_by: name }),
        });
        if (!r.ok) { const b = await r.json() as { detail?: string }; throw new Error(b.detail ?? "Failed"); }
    };

    const handleAccept = async (): Promise<void> => {
        const name = senderName.trim();
        if (!name) { setActionError("Please enter your name first."); return; }
        setActionLoading(true);
        setActionError(null);
        try {
            if (data && !data.acknowledged) await callAcknowledge(name);
            const r = await fetch(apiBase, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "accept", acknowledged_by: name }),
            });
            if (!r.ok) { const b = await r.json() as { detail?: string }; throw new Error(b.detail ?? "Failed"); }
            await refreshData();
        } catch (e: unknown) {
            setActionError(e instanceof Error ? e.message : "Failed to accept");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestAdjustment = async (): Promise<void> => {
        const name = senderName.trim();
        const reason = adjustReason.trim();
        if (!name) { setActionError("Please enter your name first."); return; }
        if (!reason) { setActionError("Please provide a reason for the adjustment."); return; }
        setActionLoading(true);
        setActionError(null);
        try {
            if (data && !data.acknowledged) await callAcknowledge(name);
            const r = await fetch(apiBase, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "request_time_adjustment",
                    acknowledged_by: name,
                    reason,
                    proposed_deadline: adjustProposedDeadline || undefined,
                    proposed_cost: adjustProposedCost.trim() || undefined,
                }),
            });
            if (!r.ok) { const b = await r.json() as { detail?: string }; throw new Error(b.detail ?? "Failed"); }
            await refreshData();
            setShowAdjustReason(false);
            setAdjustReason("");
            setAdjustProposedDeadline("");
            setAdjustProposedCost("");
        } catch (e: unknown) {
            setActionError(e instanceof Error ? e.message : "Failed to submit");
        } finally {
            setActionLoading(false);
        }
    };

    const handleProgressAdjustment = async (): Promise<void> => {
        const reason = progressReason.trim();
        if (!reason) { setProgressError("Please provide a reason."); return; }
        setProgressLoading(true);
        setProgressError(null);
        setProgressSuccess(false);
        try {
            const r = await fetch(apiBase, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "request_time_adjustment",
                    acknowledged_by: senderName.trim(),
                    reason,
                    proposed_deadline: progressProposedDeadline || undefined,
                    proposed_cost: progressProposedCost.trim() || undefined,
                }),
            });
            if (!r.ok) { const b = await r.json() as { detail?: string }; throw new Error(b.detail ?? "Failed"); }
            await refreshData();
            setProgressReason("");
            setProgressProposedDeadline("");
            setProgressProposedCost("");
            setShowProgressAdjust(false);
            setProgressSuccess(true);
            setTimeout(() => setProgressSuccess(false), 5000);
        } catch (e: unknown) {
            setProgressError(e instanceof Error ? e.message : "Failed to submit");
        } finally {
            setProgressLoading(false);
        }
    };

    const submitUpdate = async (): Promise<void> => {
        if (!updateStatus && !updatePrice && !updateNote.trim()) return;
        setUpdateLoading(true);
        setUpdateError(null);
        setUpdateSuccess(false);
        try {
            const r = await fetch(apiBase, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "update",
                    status: updateStatus || undefined,
                    quoted_price: updatePrice.trim() || undefined,
                    note: updateNote.trim() || undefined,
                    sender_name: senderName.trim() || undefined,
                }),
            });
            if (!r.ok) { const b = await r.json() as { detail?: string }; throw new Error(b.detail ?? "Failed"); }
            const updated = await r.json() as { status: string; quoted_price: string };
            setData((prev) => prev ? {
                ...prev,
                component: { ...prev.component, status: updated.status, brief_quoted_price: updated.quoted_price },
                updates: [...prev.updates, {
                    note: [
                        senderName && ("Update from " + senderName + ":"),
                        updateStatus && ("Status: " + (STATUS_LABELS[updateStatus] || updateStatus)),
                        updatePrice && ("Quoted Price: " + updatePrice),
                        updateNote,
                    ].filter(Boolean).join("\n"),
                    created_at: new Date().toISOString(),
                }],
            } : prev);
            setUpdateStatus(""); setUpdatePrice(""); setUpdateNote("");
            setUpdateSuccess(true);
            setTimeout(() => setUpdateSuccess(false), 4000);
        } catch (e: unknown) {
            setUpdateError(e instanceof Error ? e.message : "Failed to send update");
        } finally {
            setUpdateLoading(false);
        }
    };

    const uploadProof = async (): Promise<void> => {
        if (!proofFile) return;
        setProofLoading(true);
        setProofError(null);
        setProofSuccess(false);
        try {
            const fd = new FormData();
            fd.append("action", "upload_proof");
            fd.append("file", proofFile);
            if (senderName.trim()) fd.append("uploaded_by_name", senderName.trim());
            const r = await fetch(apiBase, { method: "POST", body: fd });
            if (!r.ok) { const b = await r.json() as { detail?: string }; throw new Error(b.detail ?? "Upload failed"); }
            await refreshData();
            setProofFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setProofSuccess(true);
            setTimeout(() => setProofSuccess(false), 4000);
        } catch (e: unknown) {
            setProofError(e instanceof Error ? e.message : "Upload failed");
        } finally {
            setProofLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

            <div style={{ background: "#1e3a5f", padding: "20px 24px" }}>
                <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>PrintDuka</div>
                        <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 2 }}>Professional Print Solutions · printduka.co.ke</div>
                    </div>
                    <div style={{ background: "#2563eb", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", padding: "5px 14px", borderRadius: 20 }}>
                        Vendor Brief
                    </div>
                </div>
            </div>
            <div style={{ height: 4, background: "linear-gradient(90deg,#1e3a5f 0%,#2563eb 60%,#3b82f6 100%)" }} />

            <div style={{ maxWidth: 720, margin: "32px auto", padding: "0 16px 48px" }}>

                {loading && (
                    <div style={{ textAlign: "center", padding: 80, color: "#6b7280" }}>
                        <Loader2 style={{ width: 32, height: 32, animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                        <p style={{ fontSize: 14 }}>Loading brief…</p>
                    </div>
                )}

                {error && (
                    <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", padding: 40, textAlign: "center" }}>
                        <AlertCircle style={{ width: 40, height: 40, color: "#dc2626", margin: "0 auto 12px" }} />
                        <p style={{ fontSize: 16, fontWeight: 600, color: "#1f2937" }}>{error}</p>
                        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>Please check the link in your email or contact PrintDuka.</p>
                    </div>
                )}

                {!loading && !error && data && (() => {
                    const comp = data.component;
                    const priority = PRIORITY_CONFIG[comp.job_priority] ?? PRIORITY_CONFIG.normal;
                    const statusStyle = STATUS_STYLES[comp.status] ?? { bg: "#f3f4f6", color: "#4b5563" };

                    return (
                        <>
                            {/* ── Job Reference ── */}
                            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "14px 20px", marginBottom: 16 }}>
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Job Reference</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: "#1e3a5f" }}>{comp.job_name}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                                            <span style={{ fontSize: 12, color: "#6b7280" }}>{comp.job_number}</span>
                                            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: statusStyle.bg, color: statusStyle.color }}>
                                                {STATUS_LABELS[comp.status] || comp.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ background: priority.bg, color: priority.color, border: `1px solid ${priority.border}`, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}>
                                        {priority.label}
                                    </div>
                                </div>
                            </div>

                            {/* ── Accepted + Countdown Timer ── */}
                            {data.vendor_accepted && (
                                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 20px", marginBottom: 16 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: countdownText ? 12 : 0 }}>
                                        <CheckCircle2 style={{ width: 20, height: 20, color: "#16a34a", flexShrink: 0 }} />
                                        <div>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: "#15803d" }}>Job accepted</span>
                                            {data.vendor_accepted_at && (
                                                <span style={{ fontSize: 12, color: "#4b5563", marginLeft: 8 }}>on {fmtDateTime(data.vendor_accepted_at)}</span>
                                            )}
                                        </div>
                                    </div>
                                    {countdownText && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 12, background: isOverdue ? "#fee2e2" : "#1e3a5f", color: isOverdue ? "#b91c1c" : "#fff", borderRadius: 8, padding: "12px 16px" }}>
                                            <Timer style={{ width: 20, height: 20, flexShrink: 0 }} />
                                            <div>
                                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.75, marginBottom: 2 }}>Time to Deadline</div>
                                                <div style={{ fontSize: 18, fontWeight: 800 }}>{countdownText}</div>
                                                {comp.sla_deadline && <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>Due {fmtDateTime(comp.sla_deadline)}</div>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Time Adjustment Requested banner ── */}
                            {data.time_adjustment_requested && (
                                <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "14px 20px", marginBottom: 16 }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                        <Clock style={{ width: 20, height: 20, color: "#d97706", flexShrink: 0, marginTop: 1 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: "#92400e" }}>Adjustment request submitted</div>
                                                {data.adjustment_status && (
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                                                        padding: "2px 8px", borderRadius: 20,
                                                        background: data.adjustment_status === "approved" ? "#dcfce7" : data.adjustment_status === "rejected" ? "#fee2e2" : "#fef3c7",
                                                        color: data.adjustment_status === "approved" ? "#15803d" : data.adjustment_status === "rejected" ? "#b91c1c" : "#92400e",
                                                    }}>
                                                        {data.adjustment_status}
                                                    </span>
                                                )}
                                            </div>
                                            {data.time_adjustment_reason && (
                                                <div style={{ fontSize: 13, color: "#78350f", marginTop: 4 }}>{data.time_adjustment_reason}</div>
                                            )}
                                            {(data.proposed_deadline || data.proposed_cost) && (
                                                <div style={{ display: "flex", gap: 20, marginTop: 8, flexWrap: "wrap" }}>
                                                    {data.proposed_deadline && (
                                                        <div>
                                                            <div style={{ fontSize: 10, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: 1 }}>Proposed Deadline</div>
                                                            <div style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>{fmtDate(data.proposed_deadline)}</div>
                                                        </div>
                                                    )}
                                                    {data.proposed_cost && (
                                                        <div>
                                                            <div style={{ fontSize: 10, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: 1 }}>Proposed Cost</div>
                                                            <div style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>{data.proposed_cost}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {data.adjustment_status && data.adjustment_status !== "pending" && data.adjustment_response && (
                                                <div style={{ marginTop: 10, background: data.adjustment_status === "approved" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${data.adjustment_status === "approved" ? "#bbf7d0" : "#fecaca"}`, borderRadius: 8, padding: "10px 14px" }}>
                                                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: data.adjustment_status === "approved" ? "#15803d" : "#b91c1c", marginBottom: 4 }}>
                                                        Response from Production Team
                                                        {data.adjustment_responded_at && <span style={{ fontWeight: 400, marginLeft: 8, color: "#6b7280", textTransform: "none", letterSpacing: 0 }}>· {fmtDateTime(data.adjustment_responded_at)}</span>}
                                                    </div>
                                                    <div style={{ fontSize: 13, color: "#1f2937", whiteSpace: "pre-line" }}>{data.adjustment_response}</div>
                                                    {data.adjustment_responded_by && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{data.adjustment_responded_by}</div>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Vendor Action: Accept or Request Adjustment ── */}
                            {!data.vendor_accepted && !data.time_adjustment_requested && (
                                <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
                                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>Your Response</div>
                                        <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>Can you complete this job within the allocated timeline?</p>
                                    </div>
                                    <div style={{ padding: 20 }}>
                                        {actionError && (
                                            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 14 }}>{actionError}</div>
                                        )}
                                        <div style={{ marginBottom: 16 }}>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Your Name</label>
                                            <input
                                                type="text"
                                                value={senderName}
                                                onChange={(e) => setSenderName(e.target.value)}
                                                placeholder="Enter your full name"
                                                style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none" }}
                                            />
                                        </div>

                                        {!showAdjustReason ? (
                                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                                <button
                                                    onClick={handleAccept}
                                                    disabled={actionLoading || !senderName.trim()}
                                                    style={{ flex: 1, minWidth: 180, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", background: actionLoading || !senderName.trim() ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: actionLoading || !senderName.trim() ? "not-allowed" : "pointer" }}
                                                >
                                                    {actionLoading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <CheckCircle2 style={{ width: 16, height: 16 }} />}
                                                    Accept — I can deliver on time
                                                </button>
                                                <button
                                                    onClick={() => { setShowAdjustReason(true); setActionError(null); }}
                                                    disabled={actionLoading}
                                                    style={{ flex: 1, minWidth: 180, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", background: "#fff", color: "#92400e", border: "1px solid #fed7aa", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer" }}
                                                >
                                                    <Clock style={{ width: 16, height: 16 }} />
                                                    Request Time Adjustment
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <div style={{ marginBottom: 12 }}>
                                                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                                                        Reason for adjustment <span style={{ color: "#dc2626" }}>*</span>
                                                    </label>
                                                    <textarea
                                                        value={adjustReason}
                                                        onChange={(e) => setAdjustReason(e.target.value)}
                                                        placeholder="Explain why you need more time and what timeline you can commit to…"
                                                        rows={3}
                                                        style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}
                                                    />
                                                </div>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                                                    <div>
                                                        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Proposed New Deadline <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
                                                        <input
                                                            type="date"
                                                            value={adjustProposedDeadline}
                                                            onChange={(e) => setAdjustProposedDeadline(e.target.value)}
                                                            style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, boxSizing: "border-box", outline: "none" }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Proposed Cost <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
                                                        <input
                                                            type="text"
                                                            value={adjustProposedCost}
                                                            onChange={(e) => setAdjustProposedCost(e.target.value)}
                                                            placeholder="e.g. KES 15,000"
                                                            style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, boxSizing: "border-box", outline: "none" }}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: "flex", gap: 10 }}>
                                                    <button
                                                        onClick={() => { setShowAdjustReason(false); setAdjustReason(""); setAdjustProposedDeadline(""); setAdjustProposedCost(""); setActionError(null); }}
                                                        style={{ padding: "9px 16px", background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleRequestAdjustment}
                                                        disabled={actionLoading || !adjustReason.trim()}
                                                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "9px 20px", background: actionLoading || !adjustReason.trim() ? "#9ca3af" : "#d97706", color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: actionLoading || !adjustReason.trim() ? "not-allowed" : "pointer" }}
                                                    >
                                                        {actionLoading ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 14, height: 14 }} />}
                                                        Submit Adjustment Request
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Post-acceptance: Request Time Adjustment ── */}
                            {data.vendor_accepted && (
                                <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
                                    <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                        <div style={{ fontSize: 13, color: "#6b7280" }}>Need more time to complete this job?</div>
                                        <button
                                            onClick={() => setShowProgressAdjust(!showProgressAdjust)}
                                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
                                        >
                                            <Clock style={{ width: 13, height: 13 }} />
                                            Request Adjustment
                                        </button>
                                    </div>
                                    {showProgressAdjust && (
                                        <div style={{ padding: "0 20px 16px", borderTop: "1px solid #f3f4f6" }}>
                                            {progressError && (
                                                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#dc2626", marginTop: 12, marginBottom: 8 }}>{progressError}</div>
                                            )}
                                            {progressSuccess && (
                                                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#15803d", marginTop: 12, marginBottom: 8 }}>Request submitted to the production team.</div>
                                            )}
                                            <div style={{ marginTop: 12, marginBottom: 10 }}>
                                                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                                                    Reason <span style={{ color: "#dc2626" }}>*</span>
                                                </label>
                                                <textarea
                                                    value={progressReason}
                                                    onChange={(e) => setProgressReason(e.target.value)}
                                                    placeholder="What is the reason for needing additional time?"
                                                    rows={2}
                                                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}
                                                />
                                            </div>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                                                <div>
                                                    <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Proposed Deadline <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
                                                    <input
                                                        type="date"
                                                        value={progressProposedDeadline}
                                                        onChange={(e) => setProgressProposedDeadline(e.target.value)}
                                                        style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, boxSizing: "border-box", outline: "none" }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Proposed Cost <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
                                                    <input
                                                        type="text"
                                                        value={progressProposedCost}
                                                        onChange={(e) => setProgressProposedCost(e.target.value)}
                                                        placeholder="e.g. KES 15,000"
                                                        style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, boxSizing: "border-box", outline: "none" }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                                <button
                                                    onClick={() => { setShowProgressAdjust(false); setProgressReason(""); setProgressProposedDeadline(""); setProgressProposedCost(""); setProgressError(null); }}
                                                    style={{ padding: "7px 14px", background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                                                >Cancel</button>
                                                <button
                                                    onClick={handleProgressAdjustment}
                                                    disabled={progressLoading || !progressReason.trim()}
                                                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", background: progressLoading || !progressReason.trim() ? "#9ca3af" : "#d97706", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                                                >
                                                    {progressLoading ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 12, height: 12 }} />}
                                                    Submit
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Production Details ── */}
                            <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
                                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1.5, textTransform: "uppercase" }}>Production Details</span>
                                </div>
                                {([
                                    ["Product",           comp.product_name],
                                    ["Process",           comp.production_type || "—"],
                                    ["Quantity",          comp.quantity + " " + comp.unit],
                                    ["Placement / Specs", comp.specifications || "—"],
                                    ["Artwork / Colors",  comp.brief_artwork_ref || "—"],
                                    ["SLA Deadline",      comp.sla_deadline ? fmtDate(comp.sla_deadline) : "TBD"],
                                    ["Notes / Proof",     comp.notes || "—"],
                                    ...(comp.brief_quoted_price ? [["Your Quoted Price", comp.brief_quoted_price]] : []),
                                    ...(comp.brief_lpo_ref ? [["LPO Reference", comp.brief_lpo_ref]] : []),
                                ] as [string, string][]).map(([label, value], i, arr) => (
                                    <div key={label} style={{ display: "flex", borderBottom: i < arr.length - 1 ? "1px solid #f3f4f6" : undefined, background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                                        <div style={{ width: "38%", padding: "11px 20px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
                                        <div style={{ flex: 1, padding: "11px 20px", fontSize: 14, color: label === "Quantity" || label === "Your Quoted Price" ? "#1e3a5f" : "#374151", fontWeight: label === "Quantity" || label === "Your Quoted Price" ? 700 : 400 }}>{value}</div>
                                    </div>
                                ))}
                                {comp.job_instructions && (
                                    <div style={{ background: "#eff6ff", borderTop: "1px solid #bfdbfe", padding: "12px 20px" }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>General Job Instructions</div>
                                        <div style={{ fontSize: 13, color: "#1e3a5f", whiteSpace: "pre-line", lineHeight: 1.6 }}>{comp.job_instructions}</div>
                                    </div>
                                )}
                            </div>

                            {/* ── Files & Assets ── */}
                            {(comp.files.length > 0 || data.brief_attachments?.length > 0) && (
                                <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
                                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1.5, textTransform: "uppercase" }}>Files &amp; Assets</span>
                                    </div>
                                    {comp.files.map((f, i) => {
                                        const isLast = i === comp.files.length - 1 && !data.brief_attachments?.length;
                                        return (
                                            <div key={f.id} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: !isLast ? "1px solid #f3f4f6" : undefined, background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                                                <div style={{ width: 36, height: 36, background: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
                                                    <FileDown style={{ width: 16, height: 16, color: "#2563eb" }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{f.slot_display}</div>
                                                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.file_name}</div>
                                                </div>
                                                <button
                                                    onClick={() => downloadFile(`${apiBase}file/${f.id}/`, f.file_name)}
                                                    style={{ background: "#1e3a5f", color: "#fff", fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", flexShrink: 0, marginLeft: 12 }}
                                                >
                                                    Download
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {data.brief_attachments?.map((ba, i) => (
                                        <div key={ba.id} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: i < data.brief_attachments.length - 1 ? "1px solid #f3f4f6" : undefined, background: (comp.files.length + i) % 2 === 0 ? "#fafafa" : "#fff" }}>
                                            <div style={{ width: 36, height: 36, background: "#f0fdf4", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
                                                <FileDown style={{ width: 16, height: 16, color: "#16a34a" }} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{ba.attachment_name}</div>
                                                {ba.description && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{ba.description}</div>}
                                            </div>
                                            <button
                                                onClick={() => downloadFile(ba.file_url, ba.attachment_name)}
                                                style={{ background: "#15803d", color: "#fff", fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", flexShrink: 0, marginLeft: 12 }}
                                            >
                                                Download
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ── Proof Upload ── */}
                            <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
                                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>Upload Proof</span>
                                    <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>Upload design proofs or production samples for the production team to review.</p>
                                </div>
                                <div style={{ padding: 20 }}>
                                    {proofError && (
                                        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 12 }}>{proofError}</div>
                                    )}
                                    {proofSuccess && (
                                        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#15803d", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                                            <CheckCircle2 style={{ width: 14, height: 14 }} /> Proof uploaded successfully.
                                        </div>
                                    )}
                                    <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                                        <div style={{ flex: 1, minWidth: 200 }}>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Select File</label>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                                                accept="image/*,.pdf,.ai,.psd,.eps,.zip"
                                                style={{ width: "100%", fontSize: 13, color: "#374151" }}
                                            />
                                        </div>
                                        <button
                                            onClick={uploadProof}
                                            disabled={proofLoading || !proofFile}
                                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: proofLoading || !proofFile ? "#9ca3af" : "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: proofLoading || !proofFile ? "not-allowed" : "pointer", flexShrink: 0 }}
                                        >
                                            {proofLoading ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> : <Upload style={{ width: 15, height: 15 }} />}
                                            Upload
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ── Uploaded Proofs ── */}
                            {data.proofs && data.proofs.length > 0 && (
                                <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
                                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1.5, textTransform: "uppercase" }}>Uploaded Proofs</span>
                                    </div>
                                    <div style={{ padding: "4px 0" }}>
                                        {data.proofs.map((proof, i) => (
                                            <div key={proof.id} style={{ padding: "14px 20px", borderBottom: i < data.proofs.length - 1 ? "1px solid #f3f4f6" : undefined }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                    <div style={{ width: 36, height: 36, background: "#f3e8ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                        <FileDown style={{ width: 16, height: 16, color: "#7e22ce" }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proof.file_name}</div>
                                                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                                                            Uploaded {fmtDateTime(proof.uploaded_at)}{proof.uploaded_by_name ? ` by ${proof.uploaded_by_name}` : ""}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => downloadFile(proof.file_url, proof.file_name)}
                                                        style={{ background: "#1e3a5f", color: "#fff", fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", flexShrink: 0 }}
                                                    >
                                                        Download
                                                    </button>
                                                </div>
                                                {proof.pt_feedback && (
                                                    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", marginTop: 10, marginLeft: 48 }}>
                                                        <div style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                                                            Feedback from Production Team
                                                            {proof.feedback_at && <span style={{ fontWeight: 400, marginLeft: 8, color: "#6b7280", textTransform: "none", letterSpacing: 0 }}>· {fmtDateTime(proof.feedback_at)}</span>}
                                                        </div>
                                                        <div style={{ fontSize: 13, color: "#1e3a5f", whiteSpace: "pre-line" }}>{proof.pt_feedback}</div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Send Update ── */}
                            <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
                                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>Send an Update</span>
                                    <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>Update your production status, submit your costing, or leave a note for the production team.</p>
                                </div>
                                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                                    {updateSuccess && (
                                        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#15803d", display: "flex", alignItems: "center", gap: 8 }}>
                                            <CheckCircle2 style={{ width: 15, height: 15 }} /> Update sent to the production team.
                                        </div>
                                    )}
                                    {updateError && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#dc2626" }}>{updateError}</div>}

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Your Name</label>
                                            <input
                                                type="text"
                                                value={senderName}
                                                onChange={(e) => setSenderName(e.target.value)}
                                                placeholder="Your full name"
                                                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, boxSizing: "border-box", outline: "none" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Your Quoted Price <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
                                            <input
                                                type="text"
                                                value={updatePrice}
                                                onChange={(e) => setUpdatePrice(e.target.value)}
                                                placeholder="e.g. KES 12,500"
                                                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, boxSizing: "border-box", outline: "none" }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Production Status</label>
                                        <div style={{ position: "relative" }}>
                                            <select
                                                value={updateStatus}
                                                onChange={(e) => setUpdateStatus(e.target.value)}
                                                style={{ width: "100%", padding: "9px 36px 9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, background: "#fff", appearance: "none", outline: "none", cursor: "pointer" }}
                                            >
                                                <option value="">— No status change —</option>
                                                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                            <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#9ca3af", pointerEvents: "none" }} />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Note / Message <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
                                        <textarea
                                            value={updateNote}
                                            onChange={(e) => setUpdateNote(e.target.value)}
                                            placeholder="Any updates, blockers, questions, or notes for the production team…"
                                            rows={3}
                                            style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}
                                        />
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                        <button
                                            onClick={submitUpdate}
                                            disabled={updateLoading || (!updateStatus && !updatePrice.trim() && !updateNote.trim())}
                                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 22px", background: updateLoading || (!updateStatus && !updatePrice.trim() && !updateNote.trim()) ? "#9ca3af" : "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                                        >
                                            {updateLoading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 15, height: 15 }} />}
                                            Send Update
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ── Update History ── */}
                            {data.updates.length > 0 && (
                                <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1.5, textTransform: "uppercase" }}>Update History</span>
                                    </div>
                                    <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                                        {data.updates.map((u, i) => (
                                            <div key={i} style={{ display: "flex", gap: 12 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb", flexShrink: 0, marginTop: 5 }} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
                                                        <Clock style={{ width: 11, height: 11 }} />
                                                        {fmtDateTime(u.created_at)}
                                                    </div>
                                                    <div style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-line" }}>{u.note}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    );
                })()}

                <div style={{ textAlign: "center", marginTop: 32, fontSize: 12, color: "#9ca3af" }}>
                    <p style={{ margin: 0 }}>Questions? Email us at <a href="mailto:query@printduka.co.ke" style={{ color: "#2563eb" }}>query@printduka.co.ke</a></p>
                    <p style={{ margin: "4px 0 0" }}>© {new Date().getFullYear()} PrintDuka. All rights reserved.</p>
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
