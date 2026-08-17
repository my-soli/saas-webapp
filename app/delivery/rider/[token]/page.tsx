"use client";

import { useState, useEffect, useRef, type ReactElement } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Truck, MapPin, Camera, XCircle } from "lucide-react";

interface DispatchItem { product_name: string; quantity: number; unit: string; }
interface DispatchInfo {
    dispatch_number: string;
    job_name: string;
    job_number: string;
    client_name: string;
    delivery_location: string;
    courier: string;
    rider_name: string;
    dispatch_date: string | null;
    items: DispatchItem[];
}
interface ConfirmationData {
    link_type: "rider" | "recipient";
    confirmed: boolean;
    confirmed_at: string | null;
    confirmed_by: string;
    recipient_name: string;
    notes: string;
    issue_type: string;
    issue_notes: string;
    partner_confirmed: boolean;
    partner_confirmed_by: string;
    dispatch: DispatchInfo;
}

const CANNOT_DELIVER_REASONS = [
    { value: "no_one_available", label: "No one available to receive" },
    { value: "address_not_found", label: "Address not found / wrong directions" },
    { value: "refused", label: "Delivery refused by recipient" },
    { value: "safety_issue", label: "Safety or access issue" },
];

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string): string {
    return new Date(iso).toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function RiderConfirmationPage(): ReactElement {
    const params = useParams<{ token: string }>();
    const token = params?.token ?? "";
    const apiBase = `/api/proxy/api/v1/delivery-confirmation/${token}/`;

    const [data, setData] = useState<ConfirmationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Confirm form
    const [riderName, setRiderName] = useState("");
    const [riderNameEdited, setRiderNameEdited] = useState(false);
    const [recipientName, setRecipientName] = useState("");
    const [notes, setNotes] = useState("");
    const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [confirmError, setConfirmError] = useState<string | null>(null);

    // Cannot-deliver form
    const [showCannotDeliver, setShowCannotDeliver] = useState(false);
    const [cannotReason, setCannotReason] = useState("");
    const [cannotNotes, setCannotNotes] = useState("");
    const [cannotLoading, setCannotLoading] = useState(false);

    // Photo selection (uploaded after confirmation)
    const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [uploadedCount, setUploadedCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        setSelectedPhotos((prev) => [...prev, ...files]);
        setPhotoPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removePhoto = (i: number) => {
        setSelectedPhotos((prev) => prev.filter((_, idx) => idx !== i));
        setPhotoPreviews((prev) => prev.filter((_, idx) => idx !== i));
    };

    useEffect(() => {
        fetch(apiBase, { cache: "no-store" })
            .then((r) => {
                if (!r.ok) throw new Error(r.status === 404 ? "This link is invalid or has been removed." : r.status === 410 ? "This link has expired." : "Could not load delivery details.");
                return r.json() as Promise<ConfirmationData>;
            })
            .then((d) => {
                setData(d);
                // Pre-fill rider name from dispatch record
                if (d.dispatch.rider_name && !riderNameEdited) {
                    setRiderName(d.dispatch.rider_name);
                }
            })
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false));
    }, [apiBase]);

    const captureGps = () => {
        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
            () => { setGpsLoading(false); },
            { timeout: 10000 }
        );
    };

    const confirmDelivery = async () => {
        if (!recipientName.trim()) { setConfirmError("Please enter the recipient's name."); return; }
        if (!gps) { setConfirmError("GPS location is required. Please capture your location before confirming."); return; }
        setConfirmLoading(true);
        setConfirmError(null);
        try {
            const r = await fetch(apiBase, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "confirm",
                    confirmed_by: riderName.trim() || undefined,
                    recipient_name: recipientName.trim(),
                    notes: notes.trim() || undefined,
                    gps_lat: gps?.lat,
                    gps_lng: gps?.lng,
                }),
            });
            if (!r.ok) { const b = await r.json() as { detail?: string }; throw new Error(b.detail ?? "Failed"); }
            setData(await r.json() as ConfirmationData);
            // Upload any selected photos after confirmation
            let uploaded = 0;
            for (const file of selectedPhotos) {
                try {
                    const fd = new FormData();
                    fd.append("photo", file);
                    await fetch(`/api/proxy/api/v1/delivery-confirmation/${token}/photo/`, { method: "POST", body: fd });
                    uploaded++;
                    setUploadedCount(uploaded);
                } catch { /* non-fatal */ }
            }
        } catch (e: unknown) {
            setConfirmError(e instanceof Error ? e.message : "Failed to confirm delivery");
        } finally {
            setConfirmLoading(false);
        }
    };

    const reportCannotDeliver = async () => {
        if (!cannotReason) return;
        setCannotLoading(true);
        try {
            const r = await fetch(apiBase, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "report_issue",
                    issue_type: "cannot_deliver",
                    issue_notes: `Reason: ${CANNOT_DELIVER_REASONS.find(r => r.value === cannotReason)?.label ?? cannotReason}${cannotNotes ? `. ${cannotNotes}` : ""}`,
                    reported_by: riderName.trim() || undefined,
                }),
            });
            if (!r.ok) throw new Error("Failed");
            setData(await r.json() as ConfirmationData);
            setShowCannotDeliver(false);
        } catch {
            // ignore
        } finally {
            setCannotLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
            {/* Header */}
            <div style={{ background: "#1e3a5f", padding: "20px 24px" }}>
                <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>PrintDuka</div>
                        <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 2 }}>Professional Print Solutions · printduka.co.ke</div>
                    </div>
                    <div style={{ background: "#2563eb", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", padding: "5px 14px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6 }}>
                        <Truck style={{ width: 12, height: 12 }} />
                        Rider Sign-off
                    </div>
                </div>
            </div>
            <div style={{ height: 4, background: "linear-gradient(90deg,#1e3a5f 0%,#2563eb 60%,#3b82f6 100%)" }} />

            <div style={{ maxWidth: 640, margin: "32px auto", padding: "0 16px 48px" }}>

                {loading && (
                    <div style={{ textAlign: "center", padding: 80, color: "#6b7280" }}>
                        <Loader2 style={{ width: 32, height: 32, animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                        <p style={{ fontSize: 14 }}>Loading delivery details…</p>
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
                    const hasIssue = !!data.issue_type;

                    return (
                        <>
                            {/* Status banner */}
                            {isConfirmed && (
                                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                                    <CheckCircle2 style={{ width: 20, height: 20, color: "#16a34a", flexShrink: 0 }} />
                                    <div>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>Delivery confirmed</span>
                                        {data.confirmed_at && <span style={{ fontSize: 13, color: "#4b5563", marginLeft: 8 }}>on {fmtDateTime(data.confirmed_at)}</span>}
                                        {data.recipient_name && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Handed to: <strong>{data.recipient_name}</strong></div>}
                                    </div>
                                </div>
                            )}

                            {hasIssue && !isConfirmed && (
                                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                                    <XCircle style={{ width: 20, height: 20, color: "#dc2626", flexShrink: 0 }} />
                                    <div>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>Cannot deliver — reported to production team</span>
                                        {data.issue_notes && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{data.issue_notes}</div>}
                                    </div>
                                </div>
                            )}
                            {data.partner_confirmed ? (
                                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#1e3a5f" }}>
                                    <strong>✓ Client has confirmed receipt</strong>{data.partner_confirmed_by ? ` — ${data.partner_confirmed_by}` : ""} — you can now sign off the delivery.
                                </div>
                            ) : !isConfirmed && !hasIssue && (
                                <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#92400e" }}>
                                    <strong>⏳ Waiting for client to confirm receipt</strong> — the client must tap their confirmation link before you can sign off. Ask them to check their email or WhatsApp.
                                </div>
                            )}

                            {/* Dispatch details */}
                            <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
                                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                                    <Truck style={{ width: 16, height: 16, color: "#2563eb" }} />
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1.5, textTransform: "uppercase" }}>Delivery Details</span>
                                </div>
                                {[
                                    ["Dispatch #", d.dispatch_number],
                                    ["Job", d.job_name],
                                    ["Client", d.client_name || "—"],
                                    ["Deliver To", d.delivery_location || "—"],
                                    ["Courier", d.courier || "—"],
                                    ...(d.dispatch_date ? [["Dispatch Date", fmtDate(d.dispatch_date)]] : []),
                                ].map(([label, value], i) => (
                                    <div key={label} style={{ display: "flex", borderBottom: i < 4 ? "1px solid #f3f4f6" : undefined, background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                                        <div style={{ width: "36%", padding: "10px 20px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
                                        <div style={{ flex: 1, padding: "10px 20px", fontSize: 13, color: "#374151", fontWeight: label === "Dispatch #" ? 700 : 400 }}>{value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Items */}
                            <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
                                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1.5, textTransform: "uppercase" }}>Items to Deliver</span>
                                </div>
                                {d.items.map((item, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", padding: "11px 20px", borderBottom: i < d.items.length - 1 ? "1px solid #f3f4f6" : undefined, background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{item.product_name}</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1e3a5f" }}>{item.quantity.toLocaleString()} {item.unit}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Confirm delivery form */}
                            {!isConfirmed && !hasIssue && (
                                <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
                                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>Confirm Delivery</span>
                                        <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>Enter the name of the person you handed the items to.</p>
                                    </div>
                                    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                                        {confirmError && (
                                            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#dc2626" }}>{confirmError}</div>
                                        )}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                            <div>
                                                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                                                    Your Name <span style={{ color: "#dc2626" }}>*</span>
                                                </label>
                                                <input
                                                    value={riderName}
                                                    onChange={(e) => { setRiderName(e.target.value); setRiderNameEdited(true); }}
                                                    placeholder="Rider name"
                                                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, boxSizing: "border-box", outline: "none" }}
                                                />
                                                {riderNameEdited && d.courier && riderName.trim() && riderName.trim().toLowerCase() !== d.courier.toLowerCase() && (
                                                    <div style={{ marginTop: 6, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "#92400e" }}>
                                                        ⚠ Dispatch note says <strong>{d.courier}</strong>. If you are a different rider, please raise this with the team before confirming.
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Received by <span style={{ color: "#dc2626" }}>*</span></label>
                                                <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Full name of recipient"
                                                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, boxSizing: "border-box", outline: "none" }} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                    <span>GPS Location <span style={{ color: "#dc2626" }}>*</span></span>
                                                    <button onClick={captureGps} disabled={gpsLoading}
                                                        style={{ fontSize: 11, color: gps ? "#16a34a" : "#2563eb", fontWeight: 600, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                                                        <MapPin style={{ width: 12, height: 12 }} />
                                                        {gpsLoading ? "Getting location…" : gps ? "Location captured ✓" : "Capture my location"}
                                                    </button>
                                                </div>
                                            </label>
                                            {!gps && <div style={{ fontSize: 11, color: "#92400e", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 6, padding: "6px 10px" }}>You must capture your GPS location before confirming delivery.</div>}
                                            {gps && <div style={{ fontSize: 12, color: "#6b7280", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "6px 10px" }}>
                                                {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
                                            </div>}
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                                                Notes <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
                                            </label>
                                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about the delivery…" rows={2}
                                                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                                        </div>

                                        {/* Photo picker */}
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                                                Delivery Photos <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
                                            </label>
                                            {photoPreviews.length > 0 && (
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                                                    {photoPreviews.map((url, i) => (
                                                        <div key={i} style={{ position: "relative" }}>
                                                            <img src={url} alt={`Photo ${i + 1}`} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                                                            <button
                                                                onClick={() => removePhoto(i)}
                                                                style={{ position: "absolute", top: -6, right: -6, background: "#dc2626", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, lineHeight: 1 }}
                                                            >×</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                multiple
                                                onChange={handlePhotoSelect}
                                                style={{ display: "none" }}
                                                id="photo-input"
                                            />
                                            <label htmlFor="photo-input" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#f3f4f6", border: "1px dashed #d1d5db", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                                                <Camera style={{ width: 14, height: 14 }} />
                                                {photoPreviews.length > 0 ? "Add More Photos" : "Take / Select Photos"}
                                            </label>
                                        </div>

                                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                            <button onClick={() => setShowCannotDeliver(true)}
                                                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "none", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>
                                                <XCircle style={{ width: 15, height: 15 }} /> Cannot Deliver
                                            </button>
                                            <button onClick={confirmDelivery} disabled={confirmLoading || !recipientName.trim() || !gps || !data.partner_confirmed}
                                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 22px", background: confirmLoading || !recipientName.trim() || !gps || !data.partner_confirmed ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: confirmLoading || !recipientName.trim() || !gps || !data.partner_confirmed ? "not-allowed" : "pointer" }}>
                                                {confirmLoading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <CheckCircle2 style={{ width: 16, height: 16 }} />}
                                                {confirmLoading ? (selectedPhotos.length > 0 ? `Confirming & uploading ${uploadedCount}/${selectedPhotos.length}…` : "Confirming…") : "Confirm Delivery"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Cannot-deliver form */}
                            {showCannotDeliver && !isConfirmed && !hasIssue && (
                                <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden", border: "1px solid #fecaca" }}>
                                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #fee2e2", background: "#fef2f2" }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>Cannot Complete Delivery</span>
                                        <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>Select a reason and the production team will be notified immediately.</p>
                                    </div>
                                    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Reason <span style={{ color: "#dc2626" }}>*</span></label>
                                            <select value={cannotReason} onChange={(e) => setCannotReason(e.target.value)}
                                                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, outline: "none" }}>
                                                <option value="">— Select reason —</option>
                                                {CANNOT_DELIVER_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Additional notes</label>
                                            <textarea value={cannotNotes} onChange={(e) => setCannotNotes(e.target.value)} rows={2} placeholder="Any additional details…"
                                                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                                        </div>
                                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                            <button onClick={() => setShowCannotDeliver(false)}
                                                style={{ padding: "9px 16px", background: "none", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>
                                                Back
                                            </button>
                                            <button onClick={reportCannotDeliver} disabled={cannotLoading || !cannotReason}
                                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", background: cannotLoading || !cannotReason ? "#9ca3af" : "#dc2626", color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                                {cannotLoading ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <XCircle style={{ width: 14, height: 14 }} />}
                                                Report &amp; Notify Team
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
