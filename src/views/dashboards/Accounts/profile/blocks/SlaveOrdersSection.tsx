import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import axiosClient from "src/lib/axios";

const SlaveOrdersSection = ({ masterAccountId }: { masterAccountId: number }) => {
    const [slaves, setSlaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSlaveOrders = useCallback(async () => {
        try {
            const res = await axiosClient.get(`/trader/account/${masterAccountId}/slave-orders`);
            setSlaves(res.data);
        } catch (err) {
            console.error("Failed to fetch slave orders:", err);
        } finally {
            setLoading(false);
        }
    }, [masterAccountId]);

    useEffect(() => {
        fetchSlaveOrders();
        const interval = setInterval(fetchSlaveOrders, 10000);
        return () => clearInterval(interval);
    }, [fetchSlaveOrders]);

    const handleClosePosition = async (activeOrderId: number) => {
        if (!confirm("Are you sure you want to close this slave position?")) return;
        try {
            await axiosClient.delete(`/trader/orders/active-order/${activeOrderId}`);
            fetchSlaveOrders();
        } catch (err) {
            console.error("Failed to close slave position:", err);
            alert("Failed to close position");
        }
    };

    if (loading && slaves.length === 0) {
        return <div className="text-gray-400">Loading slave positions...</div>;
    }

    if (slaves.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6 mt-6">
            <div className="flex items-center gap-2">
                <Icon icon="solar:users-group-two-rounded-bold" height={24} className="text-primary" />
                <h3 className="text-xl font-bold text-gray-200">Replicated Slave Positions</h3>
            </div>

            {slaves.map((slave) => (
                <div key={slave.accountId} className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 shadow-sm transition-all duration-300 hover:shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-400">Slave Account</span>
                                <span className="font-bold text-gray-200">
                                    {slave.accountNumber} ({slave.brokerName})
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-400">Server</span>
                                <span className="text-gray-300">{slave.serverName}</span>
                            </div>
                        </div>
                        <div className={`px-3 py-1 rounded text-xs font-bold ${slave.status === 200 ? "bg-emerald-600/20 text-emerald-400" : "bg-red-600/20 text-red-400"
                            }`}>
                            {slave.status === 200 ? "Connected" : "Disconnected"}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs uppercase text-gray-400 border-b border-white/10">
                                <tr>
                                    <th className="px-4 py-3">Ticket</th>
                                    <th className="px-4 py-3">Symbol</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Lot</th>
                                    <th className="px-4 py-3">Price</th>
                                    <th className="px-4 py-3">Profit</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slave.orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500 italic">
                                            No active orders on this slave
                                        </td>
                                    </tr>
                                ) : (
                                    slave.orders.map((order: any) => {
                                        // ActiveOrder model uses [JsonPropertyName] with snake_case
                                        const ticket = order.order_ticket ?? order.orderTicket ?? 0;
                                        const symbol = order.order_symbol ?? order.orderSymbol ?? "";
                                        const type = order.order_type ?? order.orderType ?? "";
                                        const lot = order.order_lot ?? order.orderLot ?? 0;
                                        const price = order.order_price ?? order.orderPrice ?? 0;
                                        const profit = order.order_profit ?? order.orderProfit ?? 0;
                                        return (
                                        <tr key={order.id} className="border-b border-white/10 hover:bg-white/5 transition">
                                            <td className="px-4 py-3">{ticket}</td>
                                            <td className="px-4 py-3">{symbol}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${type === "DEAL_TYPE_BUY" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                                                    }`}>
                                                    {type?.replace("DEAL_TYPE_", "")}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono">{Number(lot).toFixed(2)}</td>
                                            <td className="px-4 py-3 font-mono">{Number(price).toFixed(5)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`font-bold ${Number(profit) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                    {Number(profit).toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleClosePosition(order.id)}
                                                    className="text-red-500 hover:text-red-400 p-1 transition"
                                                    title="Close Position"
                                                >
                                                    <Icon icon="solar:close-circle-bold" height={20} />
                                                </button>
                                            </td>
                                        </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SlaveOrdersSection;
