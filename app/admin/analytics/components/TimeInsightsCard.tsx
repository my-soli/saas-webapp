import { TrendingUpIcon, TrendingDownIcon, CalendarIcon } from "lucide-react";
import { TimeInsights } from "../types";

interface TimeInsightsCardProps {
    data: TimeInsights;
}

function ChangeRow({ label, value, change, changeAbs }: { label: string; value: number; change: number; changeAbs: number }) {
    const isUp = change >= 0;
    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
                <div className="text-xl font-semibold text-gray-900 mt-1">
                    KES {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${isUp ? "text-green-600" : "text-red-600"}`}>
                {isUp ? <TrendingUpIcon className="h-4 w-4" /> : <TrendingDownIcon className="h-4 w-4" />}
                {changeAbs}%
            </div>
        </div>
    );
}

export default function TimeInsightsCard({ data }: TimeInsightsCardProps) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Comparisons</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <ChangeRow
                    label="Today vs Yesterday"
                    value={data.today_revenue}
                    change={data.daily_change}
                    changeAbs={data.daily_change_abs}
                />
                <ChangeRow
                    label="This Week vs Last Week"
                    value={data.this_week_revenue}
                    change={data.weekly_change}
                    changeAbs={data.weekly_change_abs}
                />
                <ChangeRow
                    label="This Month vs Last Month"
                    value={data.this_month_revenue}
                    change={data.monthly_change}
                    changeAbs={data.monthly_change_abs}
                />
            </div>

            {data.busiest_days && data.busiest_days.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Busiest Days (Last 30 Days)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {data.busiest_days.map((d, i) => (
                            <div key={i} className="px-3 py-1.5 bg-brand-blue/10 rounded-full text-xs font-medium text-brand-blue">
                                {d.date} — {d.orders} orders
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
