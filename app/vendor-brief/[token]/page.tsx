"use client";

import { useState, useEffect, type ReactElement } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, FileDown, Clock, Send, ChevronDown } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface BriefFile {
    id: number;
    slot_display: string;
    file_name: string;
    file_url: string;
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
    vendor_name: string;
    files: BriefFile[];
}

interface BriefData {
    acknowledged: boolean;
    acknowledged_at: string | null;
    acknowledged_by: string;
    component: BriefComponent;
    updates: { note: string; created_at: string }[];
}

const STATUS_OPTIONS = [
    { value: "in_progress", label: "In Progress" },
    { value: "blocked",     label: "Blocked / Need Help" },
    { value: "ready",       label: "Proof Ready" },
    { value: "completed",   label: "Job Completed" },
];

const STATUS_STYLES: Record<string, string> = {
    pending:     "bg-gray-100 text-gray-600",
    in_progress: "bg-blue-100 text-blue-700",
    blocked:     "bg-red-100 text-red-700",
    qc_hold:     "bg-orange-100 text-orange-700",
    ready:       "bg-purple-100 text-purple-700",
    dispatched:  "bg-indigo-100 text-indigo-700",
    completed:   "bg-green-100 text-green-700",
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

async function downloadFile(proxyUrl: string, fileName: string): Promise<void> {
    const res = await fetch(proxyUrl);
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

// ── Main Page ────────────────────────────────────────────────────────────────

export default function VendorBriefPage(): ReactElement {
    const params = useParams<{ token: string }>();
    const token = params?.token ?? "";
    const apiBase = `/api/proxy/api/v1/vendor-brief/${token}/`;

    const [data, setData] = useState<BriefData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Acknowledge form
    const [ackName, setAckName] = useState("");
    const [ackLoading, setAckLoading] = useState(false);
    const [ackError, setAckError] = useState<string | null>(null);

    // Update form
    const [updateStatus, setUpdateStatus] = useState("");
    const [updatePrice, setUpdatePrice] = useState("");
    const [updateNote, setUpdateNote] = useState("");
    const [senderName, setSenderName] = useState("");
    const [updateLoading, setUpdateLoading] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    useEffect(() => {
        fetch(apiBase, { cache: "no-store" })
            .then((r) => {
                if (!r.ok) throw new Error(r.status === 404 ? "This link is invalid or has been removed." : r.status === 410 ? "This link has expired." : "Could not load brief.");
                return r.json() as Promise<BriefData>;
            })
            .then((d) => {
                setData(d);
                if (d.acknowledged_by) setSenderName(d.acknowledged_by);
            })
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false));
    }, [apiBase]);

    const acknowledge = async () => {
        setAckLoading(true);
        setAckError(null);
        try {
            const r = await fetch(apiBase, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "acknowledge", acknowledged_by: ackName.trim() }),
            });
            if (!r.ok) { const b = await r.json() as { detail?: string }; throw new Error(b.detail ?? "Failed"); }
            const fresh = await fetch(apiBase, { cache: "no-store" });
            setData(await fresh.json() as BriefData);
            setSenderName(ackName.trim());
        } catch (e: unknown) {
            setAckError(e instanceof Error ? e.message : "Failed to acknowledge");
        } finally {
            setAckLoading(false);
        }
    };

    const submitUpdate = async () => {
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
                updates: [
                    ...prev.updates,
                    { note: [senderName && ('Update from ' + senderName + ':'), updateStatus && ('Status: ' + (STATUS_LABELS[updateStatus] || updateStatus)), updatePrice && ('Quoted Price: ' + updatePrice), updateNote].filter(Boolean).join('\n'), created_at: new Date().toISOString() },
                ],
            } : prev);
            setUpdateStatus("");
            setUpdatePrice("");
            setUpdateNote("");
            setUpdateSuccess(true);
            setTimeout(() => setUpdateSuccess(false), 4000);
        } catch (e: unknown) {
            setUpdateError(e instanceof Error ? e.message : "Failed to send update");
        } finally {
            setUpdateLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

            {/* Header */}
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

            {/* Accent bar */}
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
                    return (
                        <>
                            {/* Acknowledgment status banner */}
                            {data.acknowledged ? (
                                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                                    <CheckCircle2 style={{ width: 20, height: 20, color: "#16a34a", flexShrink: 0 }} />
                                    <div>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: "#15803d" }}>Receipt acknowledged</span>
                                        <span style={{ fontSize: 13, color: "#4b5563", marginLeft: 8 }}>
                                            by {data.acknowledged_by}{data.acknowledged_at ? " on " + fmtDateTime(data.acknowledged_at) : ""}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                                    <AlertCircle style={{ width: 20, height: 20, color: "#d97706", flexShrink: 0 }} />
                                    <span style={{ fontSize: 14, color: "#92400e", fontWeight: 500 }}>Please acknowledge receipt of this brief to let the production team know you have it.</span>
                                </div>
                            )}

                            {/* Job reference */}
                            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "14px 20px", marginBottom: 16 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Job Reference</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e3a5f" }}>{comp.job_name}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                                    <span style={{ fontSize: 12, color: "#6b7280" }}>{comp.job_number}</span>
                                    {comp.status && (
                                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, ...(STATUS_STYLES[comp.status] ? { background: STATUS_STYLES[comp.status].split(" ")[0].replace("bg-", "").replace("-", ""), color: STATUS_STYLES[comp.status].split(" ")[1].replace("text-", "").replace("-", "") } : {}), ...(() => {
                                            const s = STATUS_STYLES[comp.status] || "bg-gray-100 text-gray-600";
                                            const bgMap: Record<string, string> = { "bg-gray-100": "#f3f4f6", "bg-blue-100": "#dbeafe", "bg-red-100": "#fee2e2", "bg-orange-100": "#ffedd5", "bg-purple-100": "#f3e8ff", "bg-indigo-100": "#e0e7ff", "bg-green-100": "#dcfce7" };
                                            const textMap: Record<string, string> = { "text-gray-600": "#4b5563", "text-blue-700": "#1d4ed8", "text-red-700": "#b91c1c", "text-orange-700": "#c2410c", "text-purple-700": "#7e22ce", "text-indigo-700": "#4338ca", "text-green-700": "#15803d" };
                                            const [bg, txt] = s.split(" ");
                                            return { background: bgMap[bg] || "#f3f4f6", color: textMap[txt] || "#374151" };
                                        })() }}>
                                            {STATUS_LABELS[comp.status] || comp.status}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Production details */}
                            <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
                                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1.5, textTransform: "uppercase" }}>Production Details</span>
                                </div>
                                {[
                                    ["Product",          comp.product_name],
                                    ["Process",          comp.production_type || "—"],
                                    ["Quantity",         comp.quantity + " " + comp.unit],
                                    ["Placement / Specs",comp.specifications || "—"],
                                    ["Artwork / Colors", comp.brief_artwork_ref || "—"],
                                    ["SLA Deadline",     comp.sla_deadline ? fmtDate(comp.sla_deadline) : "TBD"],
                                    ["Notes / Proof",    comp.notes || "—"],
                                    ...(comp.brief_quoted_price ? [["Your Quoted Price", comp.brief_quoted_price]] : []),
                                    ...(comp.brief_lpo_ref ? [["LPO Reference", comp.brief_lpo_ref]] : []),
                                ].map(([label, value], i) => (
                                    <div key={label} style={{ display: "flex", borderBottom: i < 6 ? "1px solid #f3f4f6" : undefined, background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                                        <div style={{ width: "38%", padding: "11px 20px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
                                        <div style={{ flex: 1, padding: "11px 20px", fontSize: 14, color: label === "Quantity" || label === "Your Quoted Price" ? "#1e3a5f" : "#374151", fontWeight: label === "Quantity" || label === "Your Quoted Price" ? 700 : 400 }}>{value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Files */}
                            {comp.files.length > 0 && (
                                <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
                                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1.5, textTransform: "uppercase" }}>Files &amp; Assets</span>
                                    </div>
                                    {comp.files.map((f, i) => (
                                        <div key={f.id} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: i < comp.files.length - 1 ? "1px solid #f3f4f6" : undefined, background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                                            <div style={{ width: 36, height: 36, background: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
                                                <FileDown style={{ width: 16, height: 16, color: "#2563eb" }} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{f.slot_display}</div>
                                                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.file_name}</div>
                                            </div>
                                            <button
                                                onClick={() => downloadFile(`${apiBase}file/${f.id}/`, f.file_name)}
                                                style={{ background: "#1e3a5f", color: "#fff", fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", flexShrink: 0, marginLeft: 12 }}>
                                                Download
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Acknowledge form (only if not yet acknowledged) */}
                            {!data.acknowledged && (
                                <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
                                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>Acknowledge Receipt</span>
                                        <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>Enter your name and click the button to confirm you have received this brief.</p>
                                    </div>
                                    <div style={{ padding: 20 }}>
                                        {ackError && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 12 }}>{ackError}</div>}
                                        <div style={{ display: "flex", gap: 10 }}>
                                            <input
                                                type="text"
                                                value={ackName}
                                                onChange={(e) => setAckName(e.target.value)}
                                                placeholder="Your full name"
                                                style={{ flex: 1, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
                                            />
                                            <button
                                                onClick={acknowledge}
                                                disabled={ackLoading || !ackName.trim()}
                                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: ackLoading || !ackName.trim() ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: ackLoading || !ackName.trim() ? "not-allowed" : "pointer" }}
                                            >
                                                {ackLoading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <CheckCircle2 style={{ width: 16, height: 16 }} />}
                                                Acknowledge
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Update form */}
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
                                            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Your Quoted Price (optional)</label>
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

                            {/* Updates timeline */}
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

                {/* Footer */}
                <div style={{ textAlign: "center", marginTop: 32, fontSize: 12, color: "#9ca3af" }}>
                    <p style={{ margin: 0 }}>Questions? Email us at <a href="mailto:query@printduka.co.ke" style={{ color: "#2563eb" }}>query@printduka.co.ke</a></p>
                    <p style={{ margin: "4px 0 0" }}>© {new Date().getFullYear()} PrintDuka. All rights reserved.</p>
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
