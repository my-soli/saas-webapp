"use client";

import { useMemo, type ReactElement } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    DndContext,
    useDraggable,
    useDroppable,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import AdminLayout from "@/components/admin/admin-layout";
import StatusPill from "@/components/admin/status-pill";
import { fetchMachines, type Machine } from "@/services/machines";
import { fetchAssignments, updateAssignment, type MachineAssignment } from "@/services/machine-assignments";

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
    if (status === "completed") return "success";
    if (status === "in_progress") return "warning";
    return "neutral";
}

function AssignmentCard({ assignment }: { assignment: MachineAssignment }): ReactElement {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: String(assignment.id) });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-opacity active:cursor-grabbing ${
                isDragging ? "opacity-40" : "hover:border-brand-blue/40"
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{assignment.job_product_name}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                        {assignment.job_number || `Job Product #${assignment.job_product}`}
                    </p>
                </div>
                <StatusPill label={assignment.status_display} tone={statusTone(assignment.status)} />
            </div>
            {assignment.scheduled_date && (
                <p className="mt-2 text-[11px] text-gray-400">Scheduled {assignment.scheduled_date}</p>
            )}
            {assignment.person_in_charge_name && (
                <p className="mt-0.5 text-[11px] text-gray-400">PIC: {assignment.person_in_charge_name}</p>
            )}
        </div>
    );
}

function MachineColumn({ machine, assignments }: { machine: Machine; assignments: MachineAssignment[] }): ReactElement {
    const { isOver, setNodeRef } = useDroppable({ id: String(machine.id) });

    return (
        <div
            ref={setNodeRef}
            className={`flex w-72 shrink-0 flex-col rounded-xl border bg-gray-50 transition-colors ${
                isOver ? "border-brand-blue bg-brand-blue/5" : "border-gray-200"
            }`}
        >
            <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{machine.name}</p>
                    <p className="text-[11px] text-gray-400">{machine.machine_type_display}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">
                    {assignments.length}
                </span>
            </div>
            <div className="flex-1 space-y-2 p-2.5">
                {assignments.length === 0 && (
                    <p className="py-8 text-center text-xs text-gray-300">Drop a job here</p>
                )}
                {assignments.map((a) => (
                    <AssignmentCard key={a.id} assignment={a} />
                ))}
            </div>
        </div>
    );
}

export default function ProductionPlanningBoardPage(): ReactElement {
    const queryClient = useQueryClient();

    const machinesQuery = useQuery({ queryKey: ["machines"], queryFn: fetchMachines });
    const assignmentsQuery = useQuery({ queryKey: ["machine-assignments"], queryFn: () => fetchAssignments() });

    const machines = useMemo(() => (machinesQuery.data ?? []).filter((m) => m.is_active), [machinesQuery.data]);
    const activeAssignments = useMemo(
        () => (assignmentsQuery.data ?? []).filter((a) => a.status !== "cancelled" && a.status !== "completed"),
        [assignmentsQuery.data]
    );

    const byMachine = useMemo(() => {
        const map = new Map<number, MachineAssignment[]>();
        for (const a of activeAssignments) {
            const list = map.get(a.machine) ?? [];
            list.push(a);
            map.set(a.machine, list);
        }
        return map;
    }, [activeAssignments]);

    const reassignMutation = useMutation({
        mutationFn: ({ id, machine }: { id: number; machine: number }) => updateAssignment(id, { machine }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["machine-assignments"] });
            toast.success("Reassigned to machine.");
        },
        onError: (e: Error) => toast.error(e.message || "Failed to reassign."),
    });

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over) return;
        const assignmentId = Number(active.id);
        const newMachineId = Number(over.id);
        const assignment = activeAssignments.find((a) => a.id === assignmentId);
        if (!assignment || assignment.machine === newMachineId) return;
        reassignMutation.mutate({ id: assignmentId, machine: newMachineId });
    }

    const isLoading = machinesQuery.isLoading || assignmentsQuery.isLoading;

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 lg:py-6">
                    <Link href="/admin/production-planning" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-1">
                        <ArrowLeft className="w-3.5 h-3.5" /> Production Planning
                    </Link>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-gray-900">Machine Allocation Board</h1>
                        {isLoading && <LoaderCircle className="h-4 w-4 animate-spin text-gray-300" />}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">Drag a job card to a different machine to reassign it.</p>
                </div>
            </header>

            <div className="p-4 lg:p-8">
                {!isLoading && machines.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
                        <p className="text-sm text-gray-400">No active machines yet.</p>
                        <Link href="/admin/production-planning/machines" className="mt-1 inline-block text-xs text-brand-blue hover:underline">
                            Add a machine
                        </Link>
                    </div>
                )}

                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {machines.map((m) => (
                            <MachineColumn key={m.id} machine={m} assignments={byMachine.get(m.id) ?? []} />
                        ))}
                    </div>
                </DndContext>
            </div>
        </AdminLayout>
    );
}
