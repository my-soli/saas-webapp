import { AlertCircleIcon } from "lucide-react";
import { OrdersPipeline } from "../types";

interface Props {
    data: OrdersPipeline;
}

const stages = [
    { key: "pending" as const, label: "Pending", color: "bg-gray-100 text-gray-700" },
    { key: "in_progress" as const, label: "In Progress", color: "bg-blue-100 text-blue-700" },
    { key: "blocked" as const, label: "Blocked", color: "bg-red-100 text-red-700" },
    { key: "qc_hold" as const, label: "QC Hold", color: "bg-orange-100 text-orange-700" },
    { key: "ready" as const, label: "Ready", color: "bg-indigo-100 text-indigo-700" },
    { key: "dispatched" as const, label: "Dispatched", color: "bg-purple-100 text-purple-700" },
    { key: "completed" as const, label: "Completed", color: "bg-green-100 text-green-700" },
];

export default function OrdersPipelineCard({ data }: Props) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900">Jobs Pipeline</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{data.total_active} active jobs</p>
                </div>
                {data.overdue > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-full border border-red-200">
                        <AlertCircleIcon className="h-3.5 w-3.5 text-red-600" />
                        <span className="text-xs font-semibold text-red-600">{data.overdue} overdue</span>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {stages.map(({ key, label, color }) => (
                    <div key={key} className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <div className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${color}`}>
                            {label}
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{data[key] ?? 0}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
