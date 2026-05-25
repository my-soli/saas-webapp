// Production Orchestration Module — shared types
// Wire these to the real API as backend endpoints are built

export type CompStatus =
    | "NOT_STARTED"
    | "IN_PRODUCTION"
    | "DEP_BLOCKED"
    | "SEQ_BLOCKED"
    | "QC_HOLD"
    | "QC_FAILED"
    | "DISPATCH_READY"
    | "COMPLETE";

export type DepStatus = "open" | "resolved";
export type TaskStatus = "Pending" | "In Progress" | "Done" | "Overdue" | "Blocked";
export type DispatchStatus = "NOT_STARTED" | "PENDING" | "PARTIAL" | "READY" | "DISPATCHED" | "DELIVERED";
export type ReconStatus = "PENDING" | "MATCHED" | "VARIANCE";
export type BriefStatus = "Not Sent" | "Sent" | "Acknowledged" | "Proof Received" | "Approved" | "Rejected";
export type Priority = "Standard" | "Rush" | "Critical";
export type ExecMode = "External" | "Internal" | "Field";

export interface ProductionComponent {
    id: string;           // e.g. COMP-0054-A
    jobId: string;
    name: string;
    productionType: string;
    execMode: ExecMode;
    vendor: string;
    picInitials: string;
    picName: string;
    picColor: string;
    qty: number;
    unit: string;
    deadline: string;     // ISO date
    status: CompStatus;
    depsOpen: number;
    depsTotal: number;
    riskLevel: "HIGH" | "MEDIUM" | "LOW";
}

export interface Dependency {
    id: string;
    description: string;
    type: "Approval" | "Material" | "Financial" | "Sequential" | "External";
    status: DepStatus;
    owner: string;
    dueDate: string;
}

export interface Task {
    id: string;
    name: string;
    assignedTo: string;
    role: string;
    status: TaskStatus;
}

export interface QCCheckpoint {
    id: string;
    description: string;
    category: string;
    passed: boolean | null;
    custom?: boolean;
}

export interface AMAttachment {
    id: string;
    name: string;
    fileType: string;
    size: string;
    uploadDate: string;
    status: "Approved" | "Pending Review" | "Locked";
}

export interface AuditEntry {
    id: string;
    description: string;
    actor: string;
    timestamp: string;
    severity: "info" | "warning" | "danger" | "success";
}

export interface DispatchLineItem {
    compId: string;
    name: string;
    quotedQty: number;
    readyQty: number;
    invoicedQty: number;
}

export interface MasterJob {
    id: string;           // e.g. JOB-2025-0054
    quoteRef: string;     // e.g. QT-2025-0081
    name: string;
    client: string;
    accountManager: string;
    orderManager: string;
    dispatchDeadline: string;
    priority: Priority;
    componentCount: number;
    progress: number;
    status: string;
    riskLevel: "HIGH" | "MEDIUM" | "LOW";
}

export interface QCTemplate {
    key: string;
    name: string;
    icon: string;
    productionType: string;
    checkpoints: { description: string; category: string }[];
}

/** Dispatch queue row — wire to API */
export interface DispatchOrchestrationUnit {
    jobId: string;
    jobName: string;
    client: string;
    deadline: string;
    status: "READY" | "PENDING" | "PARTIAL" | "DISPATCHED";
    items: {
        compId: string;
        name: string;
        quotedQty: number;
        readyQty: number;
        invoicedQty: number;
        unit: string;
    }[];
}

/** Job-level reconciliation row — wire to API */
export interface ReconciliationJobRow {
    jobId: string;
    jobName: string;
    client: string;
    quotedRevenue: number;
    actualCost: number;
    variance: number;
    margin: number;
    status: "MATCHED" | "VARIANCE" | "PENDING";
    flagged: boolean;
}

export interface JobRisk {
    label: string;
    level: "HIGH" | "MEDIUM" | "LOW";
    owner: string;
}
