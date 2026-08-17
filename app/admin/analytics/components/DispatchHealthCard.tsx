import { AlertTriangleIcon, CheckCircleIcon, TruckIcon } from "lucide-react";
import { DispatchHealthData } from "../types";

interface Props {
    data: DispatchHealthData;
}

export default function DispatchHealthCard({ data }: Props) {
    const statusItems = [
        { label: "Pending", value: data.pending, color: "text-gray-600" },
        { label: "Ready", value: data.ready, color: "text-blue-600" },
        { label: "Dispatched", value: data.dispatched, color: "text-yellow-600" },
        { label: "Delivered", value: data.delivered, color: "text-green-600" },
    ];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">On-Time Delivery Rate</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{data.on_time_rate_percent}%</div>
                    <div className="text-xs text-gray-500 mt-1">Last 30 days ({data.total_dispatches_30d} dispatches)</div>
                </div>

                <div className={`bg-white rounded-lg border p-5 shadow-sm ${data.dispatched_without_invoice > 0 ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <AlertTriangleIcon className={`h-5 w-5 ${data.dispatched_without_invoice > 0 ? "text-red-600" : "text-gray-400"}`} />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dispatched Without Invoice</span>
                    </div>
                    <div className={`text-3xl font-bold ${data.dispatched_without_invoice > 0 ? "text-red-600" : "text-gray-900"}`}>
                        {data.dispatched_without_invoice}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Revenue leakage risk</div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <TruckIcon className="h-5 w-5 text-brand-blue" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Dispatches (30d)</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{data.total_dispatches_30d}</div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Dispatch Status Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {statusItems.map(({ label, value, color }) => (
                        <div key={label} className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
                            <div className={`text-2xl font-bold ${color}`}>{value}</div>
                            <div className="text-xs text-gray-500 mt-1">{label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
