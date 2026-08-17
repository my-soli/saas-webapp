"use client";

import { useMemo, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    DndContext,
    useDraggable,
    useDroppable,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    isSameMonth,
    isToday,
} from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, LoaderCircleIcon, ClockIcon } from "lucide-react";
import { fetchAssignments, updateAssignment, type MachineAssignment } from "@/services/machine-assignments";
import { fetchMachines, type Machine } from "@/services/machines";
import { fetchJobsByDeadline } from "@/services/jobs";
import type { Job } from "@/types/jobs";

const MACHINE_COLORS = [
    { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
    { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", dot: "bg-purple-500" },
    { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-500" },
    { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-500" },
    { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", dot: "bg-pink-500" },
    { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", dot: "bg-teal-500" },
];

function colorForMachine(machineId: number) {
    return MACHINE_COLORS[machineId % MACHINE_COLORS.length];
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EMPTY_ASSIGNMENTS: MachineAssignment[] = [];
const EMPTY_JOBS: Job[] = [];

function JobDeadlineChip({ job, onOpen }: { job: Job; onOpen: (job: Job) => void }): ReactElement {
    return (
        <button
            type="button"
            onClick={() => onOpen(job)}
            className="w-full text-left rounded-md border border-amber-200 bg-amber-50 px-1.5 py-1 text-[11px] leading-tight text-amber-800 truncate transition-opacity hover:opacity-80"
            title={`Due: ${job.job_number || ""} — ${job.job_name}`.trim()}
        >
            <span className="flex items-center gap-1">
                <ClockIcon className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate font-semibold">{job.job_number || `Job #${job.id}`}</span>
            </span>
            <span className="block truncate opacity-80">{job.job_name}</span>
        </button>
    );
}

function AssignmentChip({
    assignment,
    onOpen,
}: {
    assignment: MachineAssignment;
    onOpen: (assignment: MachineAssignment) => void;
}): ReactElement {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: String(assignment.id) });
    const color = colorForMachine(assignment.machine);

    return (
        <button
            ref={setNodeRef}
            type="button"
            {...listeners}
            {...attributes}
            onClick={() => onOpen(assignment)}
            className={`w-full text-left rounded-md border px-1.5 py-1 text-[11px] leading-tight truncate transition-opacity ${color.bg} ${color.border} ${color.text} ${isDragging ? "opacity-40" : "hover:opacity-80"}`}
            title={`${assignment.job_number || ""} — ${assignment.job_product_name}`.trim()}
        >
            <span className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${color.dot}`} />
                <span className="truncate font-semibold">{assignment.job_number || `#${assignment.job_product}`}</span>
            </span>
            <span className="block truncate opacity-80">{assignment.job_product_name}</span>
        </button>
    );
}

function DayCell({
    date,
    inMonth,
    assignments,
    jobs,
    onOpenAssignment,
    onOpenJob,
}: {
    date: Date;
    inMonth: boolean;
    assignments: MachineAssignment[];
    jobs: Job[];
    onOpenAssignment: (assignment: MachineAssignment) => void;
    onOpenJob: (job: Job) => void;
}): ReactElement {
    const dateKey = format(date, "yyyy-MM-dd");
    const { isOver, setNodeRef } = useDroppable({ id: dateKey });
    const today = isToday(date);
    const items = assignments.length + jobs.length;

    return (
        <div
            ref={setNodeRef}
            className={`min-h-[92px] border-r border-b border-gray-100 bg-white p-1.5 transition-colors last:border-r-0 ${
                isOver ? "bg-brand-blue/5" : ""
            } ${inMonth ? "" : "bg-gray-50/60"}`}
        >
            <div className="mb-1 flex items-center justify-between">
                <span
                    className={`text-[11px] font-semibold ${
                        today
                            ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue text-white"
                            : inMonth
                              ? "text-gray-600"
                              : "text-gray-300"
                    }`}
                >
                    {format(date, "d")}
                </span>
            </div>
            <div className="space-y-1">
                {jobs.slice(0, 4).map((j) => (
                    <JobDeadlineChip key={`job-${j.id}`} job={j} onOpen={onOpenJob} />
                ))}
                {assignments.slice(0, Math.max(0, 4 - jobs.length)).map((a) => (
                    <AssignmentChip key={a.id} assignment={a} onOpen={onOpenAssignment} />
                ))}
                {items > 4 && (
                    <p className="px-1 text-[10px] text-gray-400">+{items - 4} more</p>
                )}
            </div>
        </div>
    );
}

function FilterCheckbox({
    label,
    color,
    checked,
    onChange,
}: {
    label: string;
    color?: string;
    checked: boolean;
    onChange: () => void;
}): ReactElement {
    return (
        <label className="flex items-center gap-2 py-1 text-sm text-gray-700 cursor-pointer">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="h-3.5 w-3.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
            />
            {color && <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />}
            <span className="truncate">{label}</span>
        </label>
    );
}

export default function ScheduleCalendar({ basePath = "/production-team" }: { basePath?: string }): ReactElement {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
    const [excludedMachines, setExcludedMachines] = useState<Set<number>>(new Set());
    const [excludedStaff, setExcludedStaff] = useState<Set<string>>(new Set());

    const gridStart = startOfWeek(monthCursor);
    const gridEnd = endOfWeek(endOfMonth(monthCursor));
    const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

    const machinesQuery = useQuery({ queryKey: ["machines"], queryFn: fetchMachines });
    const machines: Machine[] = machinesQuery.data ?? [];

    const rangeKey = { from: format(gridStart, "yyyy-MM-dd"), to: format(gridEnd, "yyyy-MM-dd") };
    const assignmentsQuery = useQuery({
        queryKey: ["machine-assignments", "calendar", rangeKey.from, rangeKey.to],
        queryFn: () => fetchAssignments({ dateFrom: rangeKey.from, dateTo: rangeKey.to }),
    });
    const assignments: MachineAssignment[] = assignmentsQuery.data ?? EMPTY_ASSIGNMENTS;

    const jobsQuery = useQuery({
        queryKey: ["jobs", "calendar-deadlines", rangeKey.from, rangeKey.to],
        queryFn: () => fetchJobsByDeadline(rangeKey.from, rangeKey.to),
    });
    const jobs: Job[] = jobsQuery.data ?? EMPTY_JOBS;

    const staffOptions = useMemo(() => {
        const map = new Map<string, string>();
        for (const a of assignments) {
            if (a.person_in_charge != null) {
                map.set(String(a.person_in_charge), a.person_in_charge_name || `User ${a.person_in_charge}`);
            }
        }
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [assignments]);

    const filteredAssignments = useMemo(
        () =>
            assignments.filter((a) => {
                if (excludedMachines.has(a.machine)) return false;
                const staffKey = a.person_in_charge != null ? String(a.person_in_charge) : "";
                if (staffKey && excludedStaff.has(staffKey)) return false;
                return true;
            }),
        [assignments, excludedMachines, excludedStaff]
    );

    const byDate = useMemo(() => {
        const map = new Map<string, MachineAssignment[]>();
        for (const a of filteredAssignments) {
            if (!a.scheduled_date) continue;
            const list = map.get(a.scheduled_date) ?? [];
            list.push(a);
            map.set(a.scheduled_date, list);
        }
        return map;
    }, [filteredAssignments]);

    const jobsByDate = useMemo(() => {
        const map = new Map<string, Job[]>();
        for (const j of jobs) {
            if (!j.expected_completion) continue;
            const list = map.get(j.expected_completion) ?? [];
            list.push(j);
            map.set(j.expected_completion, list);
        }
        return map;
    }, [jobs]);

    const rescheduleMutation = useMutation({
        mutationFn: ({ id, date }: { id: number; date: string }) => updateAssignment(id, { scheduled_date: date }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["machine-assignments"] }),
    });

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over) return;
        const assignmentId = Number(active.id);
        const newDate = String(over.id);
        const assignment = assignments.find((a) => a.id === assignmentId);
        if (!assignment || assignment.scheduled_date === newDate) return;
        rescheduleMutation.mutate({ id: assignmentId, date: newDate });
    }

    function toggleMachine(id: number) {
        setExcludedMachines((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleStaff(id: string) {
        setExcludedStaff((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function handleOpenAssignment(assignment: MachineAssignment) {
        if (assignment.job_id) {
            router.push(`${basePath}/jobs/${assignment.job_id}/components/${assignment.job_product}`);
        }
    }

    function handleOpenJob(job: Job) {
        router.push(`${basePath}/jobs/${job.id}`);
    }

    const isLoading = machinesQuery.isLoading || assignmentsQuery.isLoading || jobsQuery.isLoading;

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
            {/* Sidebar filters */}
            <aside className="space-y-5">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Filter by Machine</p>
                    {machines.length === 0 && <p className="text-xs text-gray-400">No machines yet.</p>}
                    {machines.map((m) => (
                        <FilterCheckbox
                            key={m.id}
                            label={m.name}
                            color={colorForMachine(m.id).dot}
                            checked={!excludedMachines.has(m.id)}
                            onChange={() => toggleMachine(m.id)}
                        />
                    ))}
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Filter by Staff</p>
                    {staffOptions.length === 0 && <p className="text-xs text-gray-400">No assignments this month.</p>}
                    {staffOptions.map((s) => (
                        <FilterCheckbox
                            key={s.id}
                            label={s.name}
                            checked={!excludedStaff.has(s.id)}
                            onChange={() => toggleStaff(s.id)}
                        />
                    ))}
                </div>
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 space-y-2">
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <ClockIcon className="h-3 w-3 shrink-0 text-amber-600" />
                        <span><span className="font-semibold text-amber-700">Amber</span> cards are job deadlines — click to open, not draggable.</span>
                    </p>
                    <p className="text-[11px] text-gray-500">
                        Colored cards are machine-scheduled components — drag to a different day to reschedule. Changes save immediately.
                    </p>
                </div>
            </aside>

            {/* Calendar grid */}
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">{format(monthCursor, "MMMM yyyy")}</h2>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setMonthCursor((d) => subMonths(d, 1))}
                            className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setMonthCursor(startOfMonth(new Date()))}
                            className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => setMonthCursor((d) => addMonths(d, 1))}
                            className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </button>
                        {isLoading && <LoaderCircleIcon className="ml-2 h-4 w-4 animate-spin text-gray-300" />}
                    </div>
                </div>

                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                            {WEEKDAY_LABELS.map((d) => (
                                <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                    {d}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {days.map((day) => {
                                const dateKey = format(day, "yyyy-MM-dd");
                                return (
                                    <DayCell
                                        key={dateKey}
                                        date={day}
                                        inMonth={isSameMonth(day, monthCursor)}
                                        assignments={byDate.get(dateKey) ?? []}
                                        jobs={jobsByDate.get(dateKey) ?? []}
                                        onOpenAssignment={handleOpenAssignment}
                                        onOpenJob={handleOpenJob}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </DndContext>
            </div>
        </div>
    );
}
