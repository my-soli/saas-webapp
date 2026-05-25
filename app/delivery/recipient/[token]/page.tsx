"use client";

import { useState, useEffect, type ReactElement } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Package, User, ChevronDown } from "lucide-react";

interface DispatchItem { product_name: string; quantity: number; unit: string; }
interface DispatchInfo {
    dispatch_number: string;
    job_name: string;
    job_number: string;
    client_name: string;
    delivery_location: string;
    courier: string;
    items: DispatchItem[];
}
interface ConfirmationData {
    link_type: "rider" | "recipient";
    confirmed: boolean;
    confirmed_at: string | null;
    confirmed_by: string;
    issue_type: string;
    issue_notes: string;
    partner_confirmed: boolean;
    partner_confirmed_by: string;
    partner_recipient_name: string;
    dispatch: DispatchInfo;
}

const ISSUE_OPTIONS = [
    { value: "wrong_item",   label: "Wrong item or damaged goods" },
    { value: "partial",      label: "Partial delivery — some items missing" },
    { value: "not_received", label: "I did not receive anything" },
    { value: "refused",      label: "I refused the delivery" },
];

const ISSUE_ESCALATION: Record<string, string> = {
    wrong_item:   "The rider will be notified first and has 30 minutes to resolve. If unresolved, ops will escalate.",
    partial:      "The rider will be notified first and has 30 minutes to resolve. If unresolved, ops will escalate.",
    not_received: "This dispute will be sent directly to the production team for immediate investigation.",
    refused:      "The production team will be notified immediately to review your order.",
};

function fmtDateTime(iso: string): string {
    return new Date(iso).toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function RecipientConfirmationPage(): ReactElement {
    const params = useParams<{ token: string }>();
    const token = params?.token ?? "";
    const apiBase = `/api/proxy/api/v1/delivery-confirmation/${token}/`;

    const [data, setData] = useState<ConfirmationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Confirm form
    const [recipientName, setRecipientName] = useState("");
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [confirmError, setConfirmError] = useState<string | null>(null);

    // Issue form
    const [showIssue, setShowIssue] = useState(false);
    const [issueType, setIssueType] = useState("");
    const [issueNotes, setIssueNotes] = useState("");
    const [reportedBy, setReportedBy] = useState("");
    const [issueLoading, setIssueLoading] = useState(false);

    useEffect(() => {
        fetch(apiBase, { cache: "no-store" })
            .then((r) => {
                if (!r.ok) throw new Error(r.status === 404 ? "This link is invalid or has been removed." : r.status === 410 ? "This link has expired." : "Could not load delivery details.");
                return r.json() as Promise<ConfirmationData>;
            })
            .then((d) => { setData(d); if (d.confirmed_by) setRecipientName(d.confirmed_by); })
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false));
    }, [apiBase]);

    const confirmReceipt = async () => {
        if (!recipientName.trim()) { setConfirmError("Please enter your name."); return; }
        setConfirmLoading(true);
        setConfirmError(null);
        try {
            const r = await fetch(apiBase, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "confirm", confirmed_by: recipientName.trim() }),
            });
            if (!r.ok) { const b = await r.json() as { detail?: string }; throw new Error(b.detail ?? "Failed"); }
            setData(await r.json() as ConfirmationData);
        } catch (e: unknown) {
            setConfirmError(e instanceof Error ? e.message : "Failed to confirm receipt");
        } finally {
            setConfirmLoading(false);
        }
    };

    const reportIssue = async () => {
        if (!issueType) return;
        setIssueLoading(true);
        try {
            const r = await fetch(apiBase, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "report_issue", issue_type: issueType, issue_notes: issueNotes.trim(), reported_by: reportedBy.trim() || undefined }),
            });
            if (!r.ok) throw new Error("Failed");
            setData(await r.json() as ConfirmationData);
            setShowIssue(false);
        } catch {
            // ignore
        } finally {
            setIssueLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
            {/* Header */}
            <div style={{ background: "#1e3a5f", padding: "20px 24px" }}>
                <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>PrintDuka</div>
                        <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 2 }}>Professional Print Solutions · printduka.co.ke</div>
                    </div>
                    <div style={{ background: "#f97316", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", padding: "5px 14px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6 }}>
                        <Package style={{ width: 12, height: 12 }} />
                        Delivery Receipt
                    </div>
                </div>
            </div>
            <div style={{ height: 4, background: "linear-gradient(90deg,#1e3a5f 0%,#f97316 60%,#fb923c 100%)" }} />

            <div style={{ maxWidth: 600, margin: "32px auto", padding: "0 16px 48px" }}>

                {loading && (
                    <div style={{ textAlign: "center", padding: 80, color: "#6b7280" }}>
                        <Loader2 style={{ width: 32, height: 32, animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                        <p style={{ fontSize: 14 }}>Loading…</p>
                    </div>
                )}

                {error && (
                    <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", padding: 40, textAlign: "center" }}>
                        <AlertCircle style={{ width: 40, height: 40, color: "#dc2626", margin: "0 auto 12px" }} />
                        <p style={{ fontSize: 16, fontWeight: 600, color: "#1f2937" }}>{error}</p>
                        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>Please check the link in your message or contact PrintDuka.</p>
                    </div>
                )}

                {!loading && !error && data && (() => {
                    const d = data.dispatch;
                    const isConfirmed = data.confirmed;
                    const hasIssue = !!data.issue_type && data.issue_type !== "";

                    return (
                        <>
                            {/* Confirmed banner */}
                            {isConfirmed && (
                                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "18px 20px", marginBottom: 16, textAlign: "center" }}>
                                    <CheckCircle2 style={{ width: 40, height: 40, color: "#16a34a", margin: "0 auto 10px" }} />
                                    <p style={{ fontSize: 16, fontWeight: 700, color: "#15803d", margin: 0 }}>Receipt confirmed</p>
                                    {data.confirmed_at && <p style={{ fontSize: 13, color: "#4b5563", margin: "4px 0 0" }}>on {fmtDateTime(data.confirmed_at)}</p>}
                                    <p style={{ fontSize: 12, color: "#6b7280", margin: "6px 0 0" }}>The production team has been notified. Thank you!</p>
                                </div>
                            )}

                            {/* Issue reported banner */}
                            {hasIssue && !isConfirmed && (
                                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 20px", marginBottom: 16 }}>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", margin: 0 }}>Issue reported — production team notified</p>
                                    {data.issue_notes && <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>{data.issue_notes}</p>}
                                </div>
                            )}

                            {/* Rider confirmed notice */}
                            {data.partner_confirmed && (
                                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#1e3a5f" }}>
                                    <strong>Rider has confirmed delivery</strong>{data.partner_recipient_name ? ` — handed to: ${data.partner_recipient_name}` : ""}
                                </div>
                            )}

                            {/* What you're receiving */}
                            <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
                                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>What you are receiving</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1e3a5f" }}>{d.job_name}</div>
                                    <div style={{ fontSize: 12, color: "#6b7280" }}>{d.dispatch_number}{d.client_name ? ` · ${d.client_name}` : ""}</div>
                                </div>
                                {d.items.map((item, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", padding: "11px 20px", borderBottom: i < d.items.length - 1 ? "1px solid #f3f4f6" : undefined, background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{item.product_name}</span>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#1e3a5f" }}>{item.quantity.toLocaleString()} {item.unit}</span>
                                    </div>
                                ))}
                                <div style={{ padding: "10px 20px", background: "#f8fafc", fontSize: 12, color: "#6b7280" }}>
                                    Delivered to: <strong>{d.delivery_location || "—"}</strong>
                                </div>
                            </div>

                            {/* Confirm receipt form */}
                            {!isConfirmed && !hasIssue && !showIssue && (
                                <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
                                    <div style={{ padding: "18px 20px", borderBottom: "1px solid #f3f4f6" }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>Confirm You Received This Delivery</span>
                                        <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>Enter your name and tap confirm — it takes under 10 seconds.</p>
                                    </div>
                                    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                                        {confirmError && (
                                            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#dc2626" }}>{confirmError}</div>
                                        )}
                                        <div style={{ display: "flex", gap: 10 }}>
                                            <div style={{ position: "relative", flex: 1 }}>
                                                <User style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#9ca3af" }} />
                                                <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Your full name"
                                                    style={{ width: "100%", padding: "12px 12px 12px 36px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
                                            </div>
                                            <button onClick={confirmReceipt} disabled={confirmLoading || !recipientName.trim()}
                                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", background: confirmLoading || !recipientName.trim() ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: confirmLoading || !recipientName.trim() ? "not-allowed" : "pointer", flexShrink: 0 }}>
                                                {confirmLoading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <CheckCircle2 style={{ width: 16, height: 16 }} />}
                                                Confirm
                                            </button>
                                        </div>
                                        <button onClick={() => setShowIssue(true)}
                                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 16px", background: "none", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, color: "#6b7280", cursor: "pointer", fontWeight: 600 }}>
                                            <AlertCircle style={{ width: 14, height: 14 }} /> Report an issue instead
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Issue reporting form */}
                            {showIssue && !isConfirmed && !hasIssue && (
                                <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden", border: "1px solid #fde68a" }}>
                                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #fde68a", background: "#fffbeb" }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>Report a Delivery Issue</span>
                                        <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>Select the issue type. We will reach out to resolve it immediately.</p>
                                    </div>
                                    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>What is the issue?</label>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                {ISSUE_OPTIONS.map((opt) => (
                                                    <label key={opt.value} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", border: `1.5px solid ${issueType === opt.value ? "#f97316" : "#e5e7eb"}`, borderRadius: 8, cursor: "pointer", background: issueType === opt.value ? "#fff7ed" : "#fff" }}>
                                                        <input type="radio" name="issue" value={opt.value} checked={issueType === opt.value} onChange={() => setIssueType(opt.value)}
                                                            style={{ marginTop: 1, accentColor: "#f97316" }} />
                                                        <div>
                                                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{opt.label}</div>
                                                            {issueType === opt.value && ISSUE_ESCALATION[opt.value] && (
                                                                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{ISSUE_ESCALATION[opt.value]}</div>
                                                            )}
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Your name</label>
                                            <input value={reportedBy} onChange={(e) => setReportedBy(e.target.value)} placeholder="Your full name"
                                                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, boxSizing: "border-box", outline: "none" }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Details <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
                                            <textarea value={issueNotes} onChange={(e) => setIssueNotes(e.target.value)} rows={3} placeholder="Describe the issue…"
                                                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                                        </div>
                                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                            <button onClick={() => { setShowIssue(false); setIssueType(""); setIssueNotes(""); }}
                                                style={{ padding: "9px 16px", background: "none", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>
                                                Back
                                            </button>
                                            <button onClick={reportIssue} disabled={issueLoading || !issueType}
                                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", background: issueLoading || !issueType ? "#9ca3af" : "#f97316", color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                                {issueLoading ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
                                                Submit Issue
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#9ca3af" }}>
                                <p style={{ margin: 0 }}>Questions? <a href="mailto:query@printduka.co.ke" style={{ color: "#2563eb" }}>query@printduka.co.ke</a></p>
                                <p style={{ margin: "4px 0 0" }}>© {new Date().getFullYear()} PrintDuka. All rights reserved.</p>
                            </div>
                        </>
                    );
                })()}
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
