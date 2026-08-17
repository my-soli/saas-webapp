import { ClientRevenueData } from "../types";

interface Props {
    data: ClientRevenueData;
}

export default function ClientRevenueTable({ data }: Props) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Top Clients by Revenue</h3>
                <div className="flex gap-4 mt-2">
                    <span className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">{data.total_clients}</span> total clients
                    </span>
                    <span className="text-xs text-gray-500">
                        <span className="font-semibold text-green-700">{data.repeat_rate_percent}%</span> repeat rate
                    </span>
                    <span className="text-xs text-gray-500">
                        <span className="font-semibold text-red-600">{data.lapsed_count}</span> lapsed (90d+)
                    </span>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Orders</th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Order</th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.top_clients.map((client, i) => (
                            <tr key={client.client_id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-3 text-gray-400 font-medium">{i + 1}</td>
                                <td className="px-6 py-3">
                                    <div className="font-medium text-gray-900">{client.name}</div>
                                    <div className="text-xs text-gray-400">{client.client_id}</div>
                                </td>
                                <td className="px-6 py-3 text-right font-semibold text-gray-900">
                                    KES {client.total_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </td>
                                <td className="px-6 py-3 text-right text-gray-700">{client.order_count}</td>
                                <td className="px-6 py-3 text-right text-gray-500 text-xs">{client.last_order ?? "—"}</td>
                                <td className="px-6 py-3 text-right">
                                    {client.is_lapsed ? (
                                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">Lapsed</span>
                                    ) : (
                                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">Active</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.top_clients.length === 0 && (
                    <div className="py-8 text-center text-sm text-gray-400">No client revenue data yet</div>
                )}
            </div>
        </div>
    );
}
