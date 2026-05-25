"use client";

import { type ReactElement, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ClipboardCheckIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    PlusIcon,
    TrashIcon,
    CheckIcon,
    XIcon,
    LoaderCircleIcon,
    LockIcon,
} from "lucide-react";
import {
    fetchQCCustomTemplates,
    createQCCustomTemplate,
    updateQCCustomTemplate,
    deleteQCCustomTemplate,
    fetchPrintCategories,
    type QCCustomTemplate,
} from "@/services/orchestration";
import type { QCTemplate } from "../types";

// ── Built-in (read-only) templates ────────────────────────────────────────────

const BUILT_IN_TEMPLATES: QCTemplate[] = [
    {
        key: "embroidery", name: "Embroidery", icon: "🧵", productionType: "Embroidery",
        checkpoints: [
            { description: "Thread colors match approved design spec", category: "Color" },
            { description: "Embroidery placement matches mockup measurements", category: "Placement" },
            { description: "Stitch density is consistent throughout", category: "Quality" },
            { description: "No loose threads, pulls, or fraying", category: "Finish" },
            { description: "Backing fabric is secure and does not show through", category: "Finish" },
            { description: "Garment not puckered or distorted", category: "Substrate" },
            { description: "Logo is legible and proportionally correct", category: "Artwork" },
            { description: "Quantity counted and matches job sheet", category: "Quantity" },
            { description: "Garments folded and packed — size labels correct", category: "Packaging" },
        ],
    },
    {
        key: "uv_print", name: "UV Print", icon: "☀️", productionType: "UV Print",
        checkpoints: [
            { description: "Artwork matches approved mockup exactly", category: "Artwork" },
            { description: "Color output matches Pantone/brand spec", category: "Color" },
            { description: "Print coverage is even — no banding or streaks", category: "Quality" },
            { description: "UV ink fully cured — no tackiness", category: "Finish" },
            { description: "Print position correct per mockup measurements", category: "Placement" },
            { description: "No scratches or surface damage on substrate", category: "Substrate" },
            { description: "Edges clean and sharp — no bleeding", category: "Quality" },
            { description: "Quantity counted and matches job sheet", category: "Quantity" },
            { description: "White underbase even and opaque (if applicable)", category: "Underbase" },
            { description: "Logo legibility confirmed at reading distance", category: "Artwork" },
            { description: "Production officer sign-off complete", category: "Sign-off" },
        ],
    },
    {
        key: "dtf", name: "DTF / Transfer Print", icon: "🖨️", productionType: "DTF",
        checkpoints: [
            { description: "Transfer adhesion tested — no peeling at edges", category: "Adhesion" },
            { description: "Colors match approved digital proof", category: "Color" },
            { description: "Placement is centered and aligned to spec", category: "Placement" },
            { description: "No cracking after heat application", category: "Finish" },
            { description: "Fabric not scorched or discolored", category: "Substrate" },
            { description: "Edge detail is clean and precise", category: "Quality" },
            { description: "Wash test sample passed (if required)", category: "Durability" },
            { description: "Quantity counted and matches job sheet", category: "Quantity" },
        ],
    },
    {
        key: "screen_print", name: "Screen Print", icon: "🎨", productionType: "Screen Print",
        checkpoints: [
            { description: "Screen registration accurate across all colors", category: "Registration" },
            { description: "Color vibrancy matches approved strike-off", category: "Color" },
            { description: "Ink coverage even with no pinholes", category: "Quality" },
            { description: "Ink fully cured — wash test passed", category: "Finish" },
            { description: "Placement matches mockup measurements", category: "Placement" },
            { description: "No ink bleed beyond design boundary", category: "Quality" },
            { description: "Quantity counted and matches job sheet", category: "Quantity" },
        ],
    },
    {
        key: "engraving", name: "Engraving / Laser", icon: "🔩", productionType: "Engraving",
        checkpoints: [
            { description: "Engraving depth is consistent across all pieces", category: "Depth" },
            { description: "Text/logo alignment matches approved artwork", category: "Placement" },
            { description: "No surface scratches outside engraving area", category: "Surface" },
            { description: "Engraving edges are clean — no rough burrs", category: "Finish" },
            { description: "Material integrity maintained — no cracks or warping", category: "Substrate" },
            { description: "Logo/text is legible at intended viewing distance", category: "Artwork" },
            { description: "Quantity counted and matches job sheet", category: "Quantity" },
        ],
    },
    {
        key: "large_format", name: "Large Format Print", icon: "🖼️", productionType: "Large Format",
        checkpoints: [
            { description: "Print dimensions match signed-off specification", category: "Dimensions" },
            { description: "Color calibration matches proof", category: "Color" },
            { description: "No banding, streaking, or head-strike artifacts", category: "Quality" },
            { description: "Substrate flat and wrinkle-free", category: "Substrate" },
            { description: "Finishing edges clean — grommets, hems, or channels secure", category: "Finish" },
            { description: "Artwork resolution acceptable at final size", category: "Artwork" },
            { description: "Quantity and roll/panel count verified", category: "Quantity" },
            { description: "Delivery/logistics route confirmed", category: "Logistics" },
        ],
    },
];

const CATEGORY_COLORS: Record<string, string> = {
    Color: "bg-brand-red/10 text-brand-red", Placement: "bg-brand-blue/10 text-brand-blue",
    Quality: "bg-brand-purple/10 text-brand-purple", Finish: "bg-brand-orange/10 text-brand-orange",
    Substrate: "bg-brand-yellow/10 text-brand-yellow", Artwork: "bg-brand-green/10 text-brand-green",
    Quantity: "bg-gray-100 text-gray-600", Packaging: "bg-brand-blue/10 text-brand-blue",
    "Sign-off": "bg-brand-green/10 text-brand-green", Adhesion: "bg-brand-orange/10 text-brand-orange",
    Durability: "bg-brand-purple/10 text-brand-purple", Registration: "bg-brand-red/10 text-brand-red",
    Underbase: "bg-gray-100 text-gray-600", Depth: "bg-brand-orange/10 text-brand-orange",
    Surface: "bg-gray-100 text-gray-600", Dimensions: "bg-brand-blue/10 text-brand-blue",
    Logistics: "bg-brand-orange/10 text-brand-orange", General: "bg-gray-100 text-gray-500",
    Custom: "bg-brand-purple/10 text-brand-purple",
};

const catColor = (cat: string) => CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-500";

// ── New-template form defaults ─────────────────────────────────────────────────

type NewCheckpoint = { description: string; category: string };
const emptyForm = () => ({ name: "", icon: "📋", production_type: "", checkpoints: [] as NewCheckpoint[] });

// ── Component ─────────────────────────────────────────────────────────────────

export default function QCTemplatesWorkspace(): ReactElement {
    const qc = useQueryClient();

    const customQuery = useQuery({
        queryKey: ["qc-custom-templates"],
        queryFn: fetchQCCustomTemplates,
    });
    const printCatsQuery = useQuery({
        queryKey: ["print-categories"],
        queryFn: fetchPrintCategories,
        staleTime: 10 * 60_000,
    });

    const createMut = useMutation({
        mutationFn: createQCCustomTemplate,
        onSuccess: () => qc.invalidateQueries({ queryKey: ["qc-custom-templates"] }),
    });
    const updateMut = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<QCCustomTemplate> }) =>
            updateQCCustomTemplate(id, payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["qc-custom-templates"] }),
    });
    const deleteMut = useMutation({
        mutationFn: deleteQCCustomTemplate,
        onSuccess: () => qc.invalidateQueries({ queryKey: ["qc-custom-templates"] }),
    });

    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [showNew, setShowNew] = useState(false);
    const [newForm, setNewForm] = useState(emptyForm());
    const [cpInput, setCpInput] = useState({ description: "", category: "" });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState(emptyForm());
    const [editCpInput, setEditCpInput] = useState({ description: "", category: "" });
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    const printCats = printCatsQuery.data ?? [];
    const customTemplates = customQuery.data ?? [];

    const toggle = (key: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });

    // ── New template helpers ──────────────────────────────────────────────────

    const addCheckpoint = () => {
        if (!cpInput.description.trim()) return;
        setNewForm((f) => ({
            ...f,
            checkpoints: [...f.checkpoints, { description: cpInput.description.trim(), category: cpInput.category.trim() || "General" }],
        }));
        setCpInput({ description: "", category: "" });
    };

    const removeNewCp = (i: number) =>
        setNewForm((f) => ({ ...f, checkpoints: f.checkpoints.filter((_, idx) => idx !== i) }));

    const submitNew = async () => {
        if (!newForm.name.trim() || newForm.checkpoints.length === 0) return;
        await createMut.mutateAsync({
            name: newForm.name.trim(),
            icon: newForm.icon || "📋",
            production_type: newForm.production_type,
            checkpoints: newForm.checkpoints,
        });
        setNewForm(emptyForm());
        setCpInput({ description: "", category: "" });
        setShowNew(false);
    };

    // ── Edit template helpers ─────────────────────────────────────────────────

    const startEdit = (tpl: QCCustomTemplate) => {
        setEditingId(tpl.id);
        setEditForm({ name: tpl.name, icon: tpl.icon, production_type: tpl.production_type, checkpoints: [...tpl.checkpoints] });
        setEditCpInput({ description: "", category: "" });
    };

    const addEditCp = () => {
        if (!editCpInput.description.trim()) return;
        setEditForm((f) => ({
            ...f,
            checkpoints: [...f.checkpoints, { description: editCpInput.description.trim(), category: editCpInput.category.trim() || "General" }],
        }));
        setEditCpInput({ description: "", category: "" });
    };

    const removeEditCp = (i: number) =>
        setEditForm((f) => ({ ...f, checkpoints: f.checkpoints.filter((_, idx) => idx !== i) }));

    const submitEdit = async () => {
        if (!editingId || !editForm.name.trim()) return;
        await updateMut.mutateAsync({
            id: editingId,
            payload: {
                name: editForm.name.trim(),
                icon: editForm.icon || "📋",
                production_type: editForm.production_type,
                checkpoints: editForm.checkpoints,
            },
        });
        setEditingId(null);
    };

    const totalBuiltIn = BUILT_IN_TEMPLATES.length;
    const totalCustom = customTemplates.length;

    return (
        <>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <ClipboardCheckIcon className="h-6 w-6 text-brand-blue" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">QC Templates</h1>
                            <p className="mt-0.5 text-sm text-gray-500">
                                {totalBuiltIn} built-in · {totalCustom} custom
                                {customQuery.isLoading && <span className="ml-2 text-gray-300">loading…</span>}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setShowNew(true); setEditingId(null); }}
                        className="flex items-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 transition-colors"
                    >
                        <PlusIcon className="h-4 w-4" />
                        New Template
                    </button>
                </div>
            </header>

            <main className="min-h-screen bg-gray-50 p-8 space-y-6">

                {/* ── NEW TEMPLATE FORM ── */}
                {showNew && (
                    <div className="rounded-xl border border-brand-blue/30 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-100 bg-brand-blue/5 px-5 py-3">
                            <span className="text-sm font-bold text-brand-blue">New Custom Template</span>
                            <button onClick={() => { setShowNew(false); setNewForm(emptyForm()); }} className="text-gray-400 hover:text-gray-600">
                                <XIcon className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Row 1: icon + name + production type */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[72px_1fr_1fr]">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-500">Icon</label>
                                    <input
                                        value={newForm.icon}
                                        onChange={(e) => setNewForm((f) => ({ ...f, icon: e.target.value }))}
                                        placeholder="📋"
                                        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-center text-lg focus:border-brand-blue focus:outline-none"
                                        maxLength={4}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-500">Template Name *</label>
                                    <input
                                        value={newForm.name}
                                        onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g. Vinyl Wrapping QC"
                                        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-500">Production Type</label>
                                    <select
                                        value={newForm.production_type}
                                        onChange={(e) => setNewForm((f) => ({ ...f, production_type: e.target.value }))}
                                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-brand-blue focus:outline-none"
                                    >
                                        <option value="">— Select from catalog —</option>
                                        {printCatsQuery.isLoading && <option disabled>Loading categories…</option>}
                                        {printCats.map((c) => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Checkpoint builder */}
                            <div>
                                <p className="mb-2 text-xs font-semibold text-gray-500">Checkpoints *</p>
                                {newForm.checkpoints.length > 0 && (
                                    <div className="mb-3 space-y-1.5">
                                        {newForm.checkpoints.map((cp, i) => (
                                            <div key={i} className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                                                <span className="flex-1 text-sm text-gray-700">{cp.description}</span>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${catColor(cp.category)}`}>{cp.category}</span>
                                                <button onClick={() => removeNewCp(i)} className="text-gray-300 hover:text-brand-red transition-colors">
                                                    <XIcon className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input
                                        value={cpInput.description}
                                        onChange={(e) => setCpInput((p) => ({ ...p, description: e.target.value }))}
                                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCheckpoint(); } }}
                                        placeholder="Checkpoint description *"
                                        className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                    />
                                    <input
                                        value={cpInput.category}
                                        onChange={(e) => setCpInput((p) => ({ ...p, category: e.target.value }))}
                                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCheckpoint(); } }}
                                        placeholder="Category (e.g. Color)"
                                        className="w-36 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                    />
                                    <button
                                        onClick={addCheckpoint}
                                        disabled={!cpInput.description.trim()}
                                        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-brand-blue hover:text-brand-blue disabled:opacity-40 transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                                {newForm.checkpoints.length === 0 && (
                                    <p className="mt-1.5 text-xs text-gray-400">Add at least one checkpoint before saving.</p>
                                )}
                            </div>

                            {createMut.isError && (
                                <p className="text-xs text-brand-red">Failed to create template. Please try again.</p>
                            )}

                            <div className="flex justify-end gap-3 pt-1">
                                <button onClick={() => { setShowNew(false); setNewForm(emptyForm()); }} className="text-sm text-gray-400 hover:text-gray-600">
                                    Cancel
                                </button>
                                <button
                                    onClick={submitNew}
                                    disabled={createMut.isPending || !newForm.name.trim() || newForm.checkpoints.length === 0}
                                    className="flex items-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-40 transition-colors"
                                >
                                    {createMut.isPending ? <LoaderCircleIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                                    {createMut.isPending ? "Saving…" : "Save Template"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── CUSTOM TEMPLATES ── */}
                {customQuery.isLoading && (
                    <div className="flex items-center justify-center py-8 text-gray-400">
                        <LoaderCircleIcon className="h-5 w-5 animate-spin mr-2" />
                        <span className="text-sm">Loading custom templates…</span>
                    </div>
                )}

                {!customQuery.isLoading && customTemplates.length > 0 && (
                    <div>
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Custom Templates</p>
                        <div className="space-y-3">
                            {customTemplates.map((tpl) => {
                                const isOpen = expanded.has(`custom_${tpl.id}`);
                                const isEditing = editingId === tpl.id;
                                const categories = Array.from(new Set(tpl.checkpoints.map((cp) => cp.category)));

                                return (
                                    <div key={tpl.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                                        {/* Header */}
                                        {!isEditing ? (
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => toggle(`custom_${tpl.id}`)}
                                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(`custom_${tpl.id}`); } }}
                                                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 focus-visible:ring-inset"
                                            >
                                                <span className="text-2xl shrink-0">{tpl.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900">{tpl.name}</p>
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {categories.map((cat) => (
                                                            <span key={cat} className={`rounded-full px-2 py-0 text-[10px] font-bold ${catColor(cat)}`}>{cat}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                                                        {tpl.checkpoints.length} checkpoints
                                                    </span>
                                                    {tpl.production_type && (
                                                        <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-semibold text-brand-blue">
                                                            {tpl.production_type}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); startEdit(tpl); }}
                                                        className="rounded px-2 py-1 text-xs font-semibold text-gray-400 hover:bg-gray-100 hover:text-brand-blue transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    {deleteConfirm === tpl.id ? (
                                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => { deleteMut.mutate(tpl.id); setDeleteConfirm(null); }}
                                                                disabled={deleteMut.isPending}
                                                                className="rounded px-2 py-1 text-xs font-semibold text-brand-red hover:bg-brand-red/10 transition-colors disabled:opacity-40"
                                                            >
                                                                Confirm delete
                                                            </button>
                                                            <button onClick={() => setDeleteConfirm(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(tpl.id); }}
                                                            className="rounded p-1.5 text-gray-300 hover:bg-gray-100 hover:text-brand-red transition-colors"
                                                            title="Delete template"
                                                        >
                                                            <TrashIcon className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                    {isOpen ? <ChevronDownIcon className="h-4 w-4 text-gray-400" /> : <ChevronRightIcon className="h-4 w-4 text-gray-400" />}
                                                </div>
                                            </div>
                                        ) : (
                                            /* Edit form */
                                            <div className="px-5 py-4 bg-brand-blue/5 border-b border-brand-blue/10 space-y-3">
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[72px_1fr_1fr]">
                                                    <div>
                                                        <label className="mb-1 block text-xs font-semibold text-gray-500">Icon</label>
                                                        <input value={editForm.icon} onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))} className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-center text-lg focus:border-brand-blue focus:outline-none" maxLength={4} />
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-xs font-semibold text-gray-500">Name *</label>
                                                        <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-xs font-semibold text-gray-500">Production Type</label>
                                                        <select value={editForm.production_type} onChange={(e) => setEditForm((f) => ({ ...f, production_type: e.target.value }))} className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none">
                                                            <option value="">— Select from catalog —</option>
                                                            {printCats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                {/* Checkpoints in edit */}
                                                <div>
                                                    <p className="mb-2 text-xs font-semibold text-gray-500">Checkpoints</p>
                                                    <div className="mb-2 space-y-1.5">
                                                        {editForm.checkpoints.map((cp, i) => (
                                                            <div key={i} className="flex items-center gap-2 rounded border border-gray-100 bg-white px-3 py-2">
                                                                <span className="flex-1 text-sm text-gray-700">{cp.description}</span>
                                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${catColor(cp.category)}`}>{cp.category}</span>
                                                                <button onClick={() => removeEditCp(i)} className="text-gray-300 hover:text-brand-red"><XIcon className="h-3.5 w-3.5" /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input value={editCpInput.description} onChange={(e) => setEditCpInput((p) => ({ ...p, description: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEditCp(); } }} placeholder="Checkpoint description" className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none" />
                                                        <input value={editCpInput.category} onChange={(e) => setEditCpInput((p) => ({ ...p, category: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEditCp(); } }} placeholder="Category" className="w-32 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none" />
                                                        <button onClick={addEditCp} disabled={!editCpInput.description.trim()} className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-brand-blue hover:text-brand-blue disabled:opacity-40 transition-colors">Add</button>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-3">
                                                    <button onClick={() => setEditingId(null)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
                                                    <button onClick={submitEdit} disabled={updateMut.isPending || !editForm.name.trim()} className="flex items-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-40 transition-colors">
                                                        {updateMut.isPending ? <LoaderCircleIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                                                        {updateMut.isPending ? "Saving…" : "Save Changes"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Checkpoint list (collapsed) */}
                                        {!isEditing && isOpen && (
                                            <div className="border-t border-gray-100 divide-y divide-gray-50">
                                                {tpl.checkpoints.map((cp, i) => (
                                                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                                                        <div className="h-5 w-5 rounded border-2 border-gray-200 flex items-center justify-center shrink-0">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                                                        </div>
                                                        <p className="flex-1 text-sm text-gray-700">{cp.description}</p>
                                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${catColor(cp.category)}`}>{cp.category}</span>
                                                    </div>
                                                ))}
                                                {tpl.checkpoints.length === 0 && (
                                                    <p className="px-5 py-4 text-sm text-gray-400 text-center">No checkpoints yet — edit the template to add some.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── BUILT-IN TEMPLATES ── */}
                <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <LockIcon className="h-3 w-3" />
                        Built-in Templates
                    </p>

                    {/* Summary chips */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {BUILT_IN_TEMPLATES.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => toggle(t.key)}
                                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    expanded.has(t.key)
                                        ? "border-brand-blue bg-brand-blue text-white"
                                        : "border-gray-200 bg-white text-gray-600 hover:border-brand-blue hover:text-brand-blue"
                                }`}
                            >
                                <span>{t.icon}</span>
                                {t.name}
                                <span className="ml-0.5 opacity-70">({t.checkpoints.length})</span>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {BUILT_IN_TEMPLATES.map((tpl) => {
                            const isOpen = expanded.has(tpl.key);
                            const categories = Array.from(new Set(tpl.checkpoints.map((cp) => cp.category)));

                            return (
                                <div key={tpl.key} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => toggle(tpl.key)}
                                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(tpl.key); } }}
                                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 focus-visible:ring-inset"
                                    >
                                        <span className="text-2xl shrink-0">{tpl.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900">{tpl.name}</p>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {categories.map((cat) => (
                                                    <span key={cat} className={`rounded-full px-2 py-0 text-[10px] font-bold ${catColor(cat)}`}>{cat}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                                                {tpl.checkpoints.length} checkpoints
                                            </span>
                                            <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-semibold text-brand-blue">
                                                {tpl.productionType}
                                            </span>
                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                                                <LockIcon className="h-2.5 w-2.5" />
                                                Built-in
                                            </span>
                                            {isOpen ? <ChevronDownIcon className="h-4 w-4 text-gray-400" /> : <ChevronRightIcon className="h-4 w-4 text-gray-400" />}
                                        </div>
                                    </div>

                                    {isOpen && (
                                        <div className="border-t border-gray-100 divide-y divide-gray-50">
                                            {tpl.checkpoints.map((cp, i) => (
                                                <div key={i} className="flex items-center gap-3 px-5 py-3">
                                                    <div className="h-5 w-5 rounded border-2 border-gray-200 flex items-center justify-center shrink-0">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                                                    </div>
                                                    <p className="flex-1 text-sm text-gray-700">{cp.description}</p>
                                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${catColor(cp.category)}`}>{cp.category}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Notice */}
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                    <CheckIcon className="h-4 w-4 text-brand-green shrink-0" />
                    <p className="text-sm text-gray-500">
                        <span className="font-semibold text-gray-700">{totalBuiltIn} built-in templates</span> are read-only.
                        Create a <span className="font-semibold text-brand-blue">New Template</span> above to build a fully custom checklist — it will appear in the QC checkpoint loader on any component.
                    </p>
                </div>
            </main>
        </>
    );
}
