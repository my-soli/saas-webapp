import type { Job, JobProduct } from "@/types/jobs";
import type { JobComponent } from "@/services/orchestration";
import type { CompStatus, ProductionComponent } from "../types";

export function apiUserLabel(u: Job["person_in_charge"]): string {
    if (!u) return "—";
    const n = `${u.first_name} ${u.last_name}`.trim();
    return n || u.username;
}

export function apiJobStatusLabel(status: string): string {
    const map: Record<string, string> = {
        pending: "Pending",
        in_progress: "In production",
        on_hold: "On hold",
        completed: "Complete",
    };
    return map[status] ?? status;
}

export function apiJobStatusBadgeClass(status: string): string {
    if (status === "completed") return "bg-brand-green/10 text-brand-green";
    if (status === "in_progress") return "bg-brand-blue/10 text-brand-blue";
    if (status === "on_hold") return "bg-brand-orange/10 text-brand-orange";
    return "bg-gray-100 text-gray-600";
}

export function apiProgressPct(job: Job): number {
    if (job.status === "completed") return 100;
    if (job.status === "in_progress") {
        const n = job.job_products?.length ?? 0;
        return Math.min(85, 35 + n * 8);
    }
    if (job.status === "on_hold") return 15;
    return 25;
}

export function apiRiskLevel(job: Job): "HIGH" | "MEDIUM" | "LOW" {
    if (job.status === "completed") return "LOW";
    if (!job.expected_completion) return "LOW";
    const d = new Date(job.expected_completion);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const diffDays = (d.getTime() - today.getTime()) / 86400000;
    if (diffDays < 0) return "HIGH";
    if (diffDays <= 3) return "MEDIUM";
    return "LOW";
}

function apiCompStatus(s: string): CompStatus {
    const map: Record<string, CompStatus> = {
        in_progress: "IN_PRODUCTION",
        blocked: "DEP_BLOCKED",
        qc_hold: "QC_HOLD",
        ready: "DISPATCH_READY",
        dispatched: "DISPATCH_READY",
        completed: "COMPLETE",
    };
    return map[s] ?? "NOT_STARTED";
}

function initialsFrom(name: string): string {
    return name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "?";
}

const PIC_COLOR = "#093756";

export function jobProductToProductionComponent(job: Job, jp: JobProduct): ProductionComponent {
    const assignee = job.person_in_charge;
    const initials = jp.assigned_to_name
        ? initialsFrom(jp.assigned_to_name)
        : assignee
            ? (
                `${(assignee.first_name || "").charAt(0)}${(assignee.last_name || "").charAt(0)}`.trim()
                || (assignee.username || "?").slice(0, 2).toUpperCase()
            )
            : "?";
    return {
        id: String(jp.id),
        jobId: String(job.id),
        name: jp.product_name,
        productionType: (jp as { production_type?: string }).production_type || "Production stream",
        execMode: (jp as { execution_type?: string }).execution_type === "external" ? "External"
            : (jp as { execution_type?: string }).execution_type === "field" ? "Field" : "Internal",
        vendor: (jp as { vendor_name?: string | null }).vendor_name ?? "—",
        picInitials: initials,
        picName: jp.assigned_to_name ?? (assignee ? apiUserLabel(assignee) : "Unassigned"),
        picColor: PIC_COLOR,
        qty: jp.quantity,
        unit: jp.unit || "pcs",
        deadline: (jp as { sla_deadline?: string | null }).sla_deadline ?? job.expected_completion ?? new Date().toISOString().slice(0, 10),
        status: apiCompStatus((jp as { status?: string }).status ?? "pending"),
        depsOpen: (jp as { deps_open?: number }).deps_open ?? 0,
        depsTotal: (jp as { deps_total?: number }).deps_total ?? 0,
        riskLevel: apiRiskLevel(job),
    };
}

export function jobComponentToProductionComponent(jobId: number, jc: JobComponent, deadlineFallback?: string): ProductionComponent {
    const initials = jc.assigned_to_name ? initialsFrom(jc.assigned_to_name) : "?";
    return {
        id: String(jc.id),
        jobId: String(jobId),
        name: jc.product_name,
        productionType: jc.production_type || "Production stream",
        execMode: jc.execution_type === "external" ? "External" : jc.execution_type === "field" ? "Field" : "Internal",
        vendor: jc.vendor_name ?? "—",
        picInitials: initials,
        picName: jc.assigned_to_name ?? "Unassigned",
        picColor: PIC_COLOR,
        qty: jc.quantity,
        unit: jc.unit || "pcs",
        deadline: jc.sla_deadline ?? deadlineFallback ?? new Date().toISOString().slice(0, 10),
        status: apiCompStatus(jc.status),
        depsOpen: jc.deps_open,
        depsTotal: jc.deps_total,
        riskLevel: "LOW",
    };
}
