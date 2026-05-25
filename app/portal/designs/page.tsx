"use client";

import { useState, useRef, useCallback, type ReactElement, type ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    FolderOpen, Upload, Trash2, Download, FileImage, FileText,
    File as FileIcon, AlertCircle, X, Plus, ChevronRight,
    Image as ImageIcon, Pencil,
} from "lucide-react";
import { fetchDesigns, uploadDesign, deleteDesign } from "@/services/client-portal-extras";
import type { DesignFile, DesignCategory } from "@/types/client-portal-extras";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(v: string): string {
    return new Date(v).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

const CATEGORY_OPTIONS: { value: DesignCategory; label: string }[] = [
    { value: "logo",     label: "Logo" },
    { value: "artwork",  label: "Artwork / Illustration" },
    { value: "photo",    label: "Photo" },
    { value: "document", label: "Document" },
    { value: "other",    label: "Other" },
];

const CATEGORY_TABS = [
    { value: "all",      label: "All" },
    { value: "logo",     label: "Logo" },
    { value: "artwork",  label: "Artwork / Illustration" },
    { value: "photo",    label: "Photo" },
    { value: "document", label: "Document" },
    { value: "other",    label: "Other" },
];

const CATEGORY_COLORS: Record<DesignCategory, string> = {
    logo:     "bg-blue-50 text-blue-700",
    artwork:  "bg-purple-50 text-purple-700",
    photo:    "bg-green-50 text-green-700",
    document: "bg-orange-50 text-orange-700",
    other:    "bg-gray-100 text-gray-600",
};

function fileTypeIcon(fileName: string): ReactElement {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return <FileImage className="w-5 h-5 text-blue-500" />;
    if (["pdf", "doc", "docx", "txt"].includes(ext)) return <FileText className="w-5 h-5 text-orange-500" />;
    return <FileIcon className="w-5 h-5 text-gray-400" />;
}

// ── Project types (stored in localStorage) ────────────────────────────────────

interface Project {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    fileIds: number[];
}

const STORAGE_KEY = "portal_projects_v1";

function loadProjects(): Project[] {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function saveProjects(projects: Project[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

// ── Upload modal ──────────────────────────────────────────────────────────────

function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (file: DesignFile) => void }): ReactElement {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState<DesignCategory>("other");
    const [notes, setNotes] = useState("");
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const mutation = useMutation({
        mutationFn: () => uploadDesign({ file: file!, title, category, notes }),
        onSuccess: (data) => { toast.success("Uploaded!"); onSuccess(data); onClose(); },
        onError: (err: Error) => toast.error(err.message || "Upload failed"),
    });

    const pickFile = (f: File) => { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, "")); };
    const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }, []);
    const handleInput = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) pickFile(f); };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">Upload File</h2>
                    <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="p-5 space-y-4">
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragging ? "border-brand-blue bg-brand-blue/5" : "border-gray-300 hover:border-brand-blue hover:bg-gray-50"}`}
                    >
                        <input ref={inputRef} type="file" className="hidden" onChange={handleInput} accept="image/*,.pdf,.ai,.eps,.svg,.psd,.cdr,.doc,.docx" />
                        {file ? (
                            <div className="flex items-center justify-center gap-2">
                                {fileTypeIcon(file.name)}
                                <div className="text-left"><p className="text-sm font-medium text-gray-800">{file.name}</p><p className="text-xs text-gray-400">{fmtSize(file.size)}</p></div>
                            </div>
                        ) : (
                            <>
                                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm font-medium text-gray-600">Drop your file here or click to browse</p>
                                <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF, AI, EPS, SVG, PSD, CDR, DOC</p>
                            </>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Company Logo v2" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value as DesignCategory)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
                            {CATEGORY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notes <span className="text-gray-400">(optional)</span></label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Use this for the T-shirt order" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none" />
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 px-5 pb-5">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button type="button" onClick={() => mutation.mutate()} disabled={!file || !title.trim() || mutation.isPending} className="inline-flex items-center gap-2 px-5 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue/90 disabled:opacity-50">
                        {mutation.isPending ? <span className="animate-spin rounded-full w-4 h-4 border-2 border-white border-t-transparent" /> : <Upload className="w-4 h-4" />}
                        {mutation.isPending ? "Uploading…" : "Upload"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── New Project modal ─────────────────────────────────────────────────────────

function NewProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Project) => void }): ReactElement {
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");

    const submit = () => {
        if (!name.trim()) return;
        onCreate({ id: `proj_${Date.now()}`, name: name.trim(), description: desc.trim(), createdAt: new Date().toISOString(), fileIds: [] });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">New Project</h2>
                    <button type="button" onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Project name <span className="text-red-400">*</span></label>
                    <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="e.g. Annual Conference 2026" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description <span className="text-gray-400">(optional)</span></label>
                    <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Brief description of this project…" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none" />
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button type="button" disabled={!name.trim()} onClick={submit} className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brand-blue/90">Create</button>
                </div>
            </div>
        </div>
    );
}

// ── File card ─────────────────────────────────────────────────────────────────

function FileCard({ design, onDelete }: { design: DesignFile; onDelete: (id: number) => void }): ReactElement {
    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(design.file_name.split(".").pop()?.toLowerCase() ?? "");

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
            <div className="h-32 bg-gray-50 flex items-center justify-center overflow-hidden relative">
                {isImage && design.file_url ? (
                    <img src={design.file_url} alt={design.title} className="w-full h-full object-contain p-2" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-300">
                        {fileTypeIcon(design.file_name)}
                        <span className="text-xs uppercase tracking-wider font-medium">{design.file_name.split(".").pop()}</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    {design.file_url && (
                        <a href={design.file_url} download={design.file_name} target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white rounded-lg flex items-center justify-center hover:bg-gray-100" title="Download">
                            <Download className="w-4 h-4 text-gray-700" />
                        </a>
                    )}
                    <button type="button" onClick={() => onDelete(design.id)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center hover:bg-red-50" title="Delete">
                        <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                </div>
            </div>
            <div className="p-3">
                <p className="text-sm font-semibold text-gray-800 truncate" title={design.title}>{design.title}</p>
                <div className="flex items-center justify-between mt-1.5 flex-wrap gap-1">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CATEGORY_COLORS[design.category]}`}>
                        {design.category === "artwork" ? "Artwork" : design.category.charAt(0).toUpperCase() + design.category.slice(1)}
                    </span>
                    <span className="text-xs text-gray-400">{fmtSize(design.file_size)}</span>
                </div>
                {design.notes && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{design.notes}</p>}
                <p className="text-xs text-gray-300 mt-1">{fmtDate(design.uploaded_at)}</p>
            </div>
        </div>
    );
}

// ── Project view ──────────────────────────────────────────────────────────────

interface ProjectViewProps {
    project: Project;
    allFiles: DesignFile[];
    onBack: () => void;
    onDelete: (id: number) => void;
    onUploadSuccess: (file: DesignFile, projectId: string) => void;
    onRename: (id: string, name: string, desc: string) => void;
}

function ProjectView({ project, allFiles, onBack, onDelete, onUploadSuccess, onRename }: ProjectViewProps): ReactElement {
    const [activeTab, setActiveTab] = useState("all");
    const [showUpload, setShowUpload] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameVal, setNameVal] = useState(project.name);
    const [descVal, setDescVal] = useState(project.description);

    const projectFiles = allFiles.filter((f) => project.fileIds.includes(f.id));
    const filtered = activeTab === "all" ? projectFiles : projectFiles.filter((f) => f.category === activeTab);

    const saveName = () => {
        setEditingName(false);
        if (nameVal.trim()) onRename(project.id, nameVal.trim(), descVal.trim());
    };

    return (
        <>
            {showUpload && (
                <UploadModal
                    onClose={() => setShowUpload(false)}
                    onSuccess={(file) => { onUploadSuccess(file, project.id); setShowUpload(false); }}
                />
            )}
            <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <button type="button" onClick={onBack} className="hover:text-brand-blue transition-colors">Designs &amp; Documents</button>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-gray-900 font-medium">{project.name}</span>
                </div>

                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-0">
                        {editingName ? (
                            <div className="space-y-1.5">
                                <input autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveName()} className="text-xl font-bold text-gray-900 border-b-2 border-brand-blue outline-none bg-transparent w-full" />
                                <input value={descVal} onChange={(e) => setDescVal(e.target.value)} placeholder="Description (optional)" className="text-sm text-gray-500 border-b border-gray-200 outline-none bg-transparent w-full" />
                                <div className="flex gap-2">
                                    <button type="button" onClick={saveName} className="text-xs text-brand-blue font-medium">Save</button>
                                    <button type="button" onClick={() => setEditingName(false)} className="text-xs text-gray-400">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button type="button" onClick={() => setEditingName(true)} className="group text-left">
                                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    {project.name}
                                    <Pencil className="w-4 h-4 text-gray-300 group-hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-all" />
                                </h1>
                                {project.description && <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>}
                            </button>
                        )}
                    </div>
                    <button type="button" onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue/90">
                        <Upload className="w-4 h-4" /> Upload File
                    </button>
                </div>

                {/* Category tabs */}
                <div className="flex items-center gap-2 flex-wrap">
                    {CATEGORY_TABS.map((t) => (
                        <button key={t.value} type="button" onClick={() => setActiveTab(t.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === t.value ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Files grid */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-14 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
                        <FolderOpen className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm font-medium">No files in this category yet</p>
                        <p className="text-xs mt-1">Upload your logos, artwork, photos, and documents.</p>
                        <button type="button" onClick={() => setShowUpload(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue/90">
                            <Upload className="w-4 h-4" /> Upload file
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filtered.map((d) => <FileCard key={d.id} design={d} onDelete={onDelete} />)}
                    </div>
                )}
            </div>
        </>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DesignsDocumentsPage(): ReactElement {
    const [projects, setProjects] = useState<Project[]>(() => loadProjects());
    const [activeProject, setActiveProject] = useState<string | null>(null);
    const [showNewProject, setShowNewProject] = useState(false);
    const queryClient = useQueryClient();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["portal-designs", "all"],
        queryFn: () => fetchDesigns("all"),
        staleTime: 30_000,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDesign,
        onSuccess: () => { toast.success("File deleted."); queryClient.invalidateQueries({ queryKey: ["portal-designs"] }); },
        onError: () => toast.error("Could not delete. Please try again."),
    });

    const allFiles: DesignFile[] = data?.results ?? [];

    const persistProjects = (updated: Project[]) => { setProjects(updated); saveProjects(updated); };

    const createProject = (p: Project) => persistProjects([...projects, p]);

    const renameProject = (id: string, name: string, desc: string) => {
        persistProjects(projects.map((p) => p.id === id ? { ...p, name, description: desc } : p));
    };

    const deleteProject = (id: string) => {
        persistProjects(projects.filter((p) => p.id !== id));
        if (activeProject === id) setActiveProject(null);
    };

    const handleUploadSuccess = (file: DesignFile, projectId: string) => {
        persistProjects(projects.map((p) => p.id === projectId ? { ...p, fileIds: [...p.fileIds, file.id] } : p));
        queryClient.invalidateQueries({ queryKey: ["portal-designs"] });
    };

    const unassignedIds = new Set(projects.flatMap((p) => p.fileIds));
    const unassigned = allFiles.filter((f) => !unassignedIds.has(f.id));

    if (activeProject) {
        const proj = projects.find((p) => p.id === activeProject);
        if (proj) {
            return (
                <ProjectView
                    project={proj}
                    allFiles={allFiles}
                    onBack={() => setActiveProject(null)}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onUploadSuccess={handleUploadSuccess}
                    onRename={renameProject}
                />
            );
        }
    }

    return (
        <>
            {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} onCreate={createProject} />}

            <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-brand-blue" />
                        <h1 className="text-xl font-bold text-gray-900">Designs &amp; Documents</h1>
                    </div>
                    <button type="button" onClick={() => setShowNewProject(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue/90">
                        <Plus className="w-4 h-4" /> Add Project
                    </button>
                </div>

                <p className="text-sm text-gray-500 -mt-4">
                    Organise your brand assets by project. Each project holds logos, artwork, photos, documents, and more.
                </p>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white rounded-xl border border-gray-200 animate-pulse" />)}
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center py-16 text-gray-400">
                        <AlertCircle className="w-10 h-10 mb-2 opacity-40" />
                        <p className="text-sm">Could not load files. Please refresh.</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="flex flex-col items-center py-16 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
                        <FolderOpen className="w-14 h-14 mb-3 opacity-20" />
                        <p className="text-sm font-medium text-gray-600">No projects yet</p>
                        <p className="text-xs mt-1 text-center max-w-xs px-4">
                            Create a project to organise your brand files — logos, artwork, photos, and documents.
                        </p>
                        <button type="button" onClick={() => setShowNewProject(true)} className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-xl hover:bg-brand-blue/90">
                            <Plus className="w-4 h-4" /> Create first project
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map((proj) => {
                            const projFiles = allFiles.filter((f) => proj.fileIds.includes(f.id));
                            const preview = projFiles.find((f) => f.file_url && ["jpg","jpeg","png","gif","webp","svg"].includes(f.file_name.split(".").pop()?.toLowerCase() ?? ""));
                            return (
                                <div key={proj.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                                    <div className="h-24 bg-gray-50 relative overflow-hidden flex items-center justify-center">
                                        {preview ? (
                                            <img src={preview.file_url!} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <FolderOpen className="w-10 h-10 text-gray-200" />
                                        )}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button type="button" onClick={() => deleteProject(proj.id)} className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center hover:bg-red-50">
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <button type="button" onClick={() => setActiveProject(proj.id)} className="text-left w-full group/link">
                                            <p className="font-semibold text-gray-900 group-hover/link:text-brand-blue transition-colors flex items-center gap-1.5">
                                                {proj.name}
                                                <ChevronRight className="w-4 h-4 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                            </p>
                                            {proj.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{proj.description}</p>}
                                        </button>
                                        <p className="text-xs text-gray-400 mt-2">
                                            {projFiles.length} file{projFiles.length !== 1 ? "s" : ""} · {fmtDate(proj.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Unassigned files */}
                {unassigned.length > 0 && (
                    <div>
                        <h2 className="text-sm font-semibold text-gray-700 mb-3">Unassigned Files</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {unassigned.map((d) => <FileCard key={d.id} design={d} onDelete={(id) => deleteMutation.mutate(id)} />)}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
