import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "src/lib/axios";
import { Icon } from "@iconify/react";
import ActivePositionsSentiment from "./ActivePositionsSentiment";

const ActivePositionsTable = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<number[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    // Filter States
    const [symbolFilter, setSymbolFilter] = useState("");
    const [ticketFilter, setTicketFilter] = useState("");
    const [masterTicketFilter, setMasterTicketFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [lotFilter, setLotFilter] = useState("");
    const [openTimeFilter, setOpenTimeFilter] = useState("");

    const fetchActiveOrders = useCallback(async () => {
        try {
            // Use IsClosed: false — the backend actually respects this parameter
            // Status: 600 alone is ignored for global queries without AccountId
            let allOrders: any[] = [];
            let currentPage = 1;
            const perPage = 500;

            while (true) {
                const res = await axiosClient.get("/trader/orders/paginated", {
                    params: {
                        PerPage: perPage,
                        Page: currentPage,
                        IsClosed: false,
                        Status: 600,
                        OrderSymbol: symbolFilter.trim() || undefined,
                        OrderTicket: !isNaN(Number(ticketFilter)) && ticketFilter.trim() !== "" ? ticketFilter.trim() : undefined,
                        MasterOrderTicket: !isNaN(Number(masterTicketFilter)) && masterTicketFilter.trim() !== "" ? masterTicketFilter.trim() : undefined,
                        OrderType: typeFilter || undefined,
                        OrderLot: !isNaN(Number(lotFilter)) && lotFilter.trim() !== "" ? lotFilter.trim() : undefined,
                        OrderOpenAt: openTimeFilter || undefined,
                    }
                });
                const pageData = res.data?.data || [];
                const total = res.data?.total || 0;
                allOrders = [...allOrders, ...pageData];
                console.log(`Page ${currentPage}: fetched ${pageData.length} orders (total from API: ${total}, accumulated: ${allOrders.length})`);
                if (allOrders.length >= total || pageData.length === 0) break;
                currentPage++;
            }

            // Safety filter: double-check locally that orders are truly active
            const active = allOrders.filter((o: any) => {
                const st = Number(o.status || o.Status || 0);
                const closeAt = o.order_close_at || o.orderCloseAt || o.OrderCloseAt;
                const hasAccount = o.account_id || o.accountId || o.AccountId;
                const ticket = Number(o.order_ticket || o.orderTicket || 0);
                // Must be status 600, no close time, has account, AND has a real ticket (not 0)
                return st === 600 && !closeAt && hasAccount && ticket > 0;
            });
            console.log(`Active after local filter: ${active.length} (filtered out ${allOrders.length - active.length})`);
            setOrders(active);
        } catch (err) {
            console.error("Failed to fetch global active orders:", err);
        } finally {
            setLoading(false);
        }
    }, [symbolFilter, ticketFilter, masterTicketFilter, typeFilter, lotFilter, openTimeFilter]);

    useEffect(() => {
        fetchActiveOrders();
        const interval = setInterval(fetchActiveOrders, 10000);
        return () => clearInterval(interval);
    }, [fetchActiveOrders]);

    const toggleSelect = (id: any) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selected.length === orders.length && orders.length > 0) {
            setSelected([]);
        } else {
            setSelected(orders.map((o) => o.id));
        }
    };

    const clearFilters = () => {
        setSymbolFilter("");
        setTicketFilter("");
        setMasterTicketFilter("");
        setTypeFilter("");
        setLotFilter("");
        setOpenTimeFilter("");
        setShowFilters(false);
    };

    const handleCloseSelected = async () => {
        if (selected.length === 0) {
            alert("No positions selected");
            return;
        }

        const confirmed = confirm(`Are you sure you want to close ${selected.length} selected positions?`);
        if (!confirmed) return;

        setLoading(true);
        try {
            // Group selected orders by account
            const selectedOrders = orders.filter((o) => selected.includes(o.id));
            const groupedByAccount: Record<number, { role: string; ids: any[] }> = {};

            selectedOrders.forEach((o) => {
                const accId = o.account?.id || o.account_id;
                if (!accId) return;
                const role = o.account?.role || "SLAVE";
                if (!groupedByAccount[accId]) {
                    groupedByAccount[accId] = { role, ids: [] };
                }
                groupedByAccount[accId].ids.push(o.id);
            });

            for (const accId in groupedByAccount) {
                const group = groupedByAccount[accId];
                console.log(`Processing account ${accId} (${group.role}) with ${group.ids.length} orders. IDs:`, group.ids);
                
                if (group.role === "MASTER") {
                    console.log(`Closing ${group.ids.length} MASTER orders for account ${accId} via /trader/orders/master-order`);
                    await axiosClient.delete("/trader/orders/master-order", {
                        data: {
                            account_id: Number(accId),
                            is_flush_order: false,
                            order_ids: group.ids,
                        },
                    });
                } else {
                    // SLAVE
                    for (const id of group.ids) {
                        const fullOrder = orders.find(x => x.id === id);
                        console.log(`Closing SLAVE position id=${id}, ticket=${fullOrder?.order_ticket || fullOrder?.orderTicket} for account ${accId}...`);
                        await axiosClient.delete(`/trader/orders/active-order/${id}`);
                    }
                }
            }

            alert(`Successfully requested closure for ${selected.length} positions.`);
            setSelected([]);
            await fetchActiveOrders();
        } catch (err: any) {
            console.error("Failed to close positions:", err);
            const errMsg = err.response?.data?.message || err.message || "Unknown error";
            alert(`Failed to close positions: ${errMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const getAccountId = (o: any) => o.account?.id || o.account_id || o.accountId;

    if (loading && orders.length === 0) {
        return (
            <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-8 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/5">
            <div className="flex items-center gap-2 mb-6">
                <Icon icon="solar:globus-bold" height={24} className="text-primary" />
                <h3 className="text-xl font-bold text-white">Global Active Positions</h3>
                <span className="ml-2 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{orders.length}</span>
            </div>

            {/* Sentiment Charts */}
            <ActivePositionsSentiment orders={orders} />

            {/* Action Buttons — directly above the table */}
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-4">
                <div className="flex flex-wrap gap-4 items-center">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-2 rounded-xl transition flex items-center gap-2 text-sm font-bold border ${
                            showFilters 
                                ? "bg-primary/20 text-primary border-primary/50" 
                                : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20"
                        }`}
                    >
                        <Icon icon="solar:filter-bold" height={18} />
                        {showFilters ? "Hide Filters" : "Advanced Filters"}
                    </button>

                    {(symbolFilter || ticketFilter || masterTicketFilter || typeFilter || lotFilter || openTimeFilter) && (
                        <button
                            onClick={clearFilters}
                            className="text-xs text-red-400 hover:text-red-300 transition underline decoration-dotted"
                        >
                            Clear Filters
                        </button>
                    )}

                    <button
                        onClick={fetchActiveOrders}
                        className="p-2 text-gray-400 hover:text-white transition"
                        title="Refresh"
                    >
                        <Icon icon="solar:refresh-bold" height={20} />
                    </button>
                </div>
                
                <button
                    onClick={handleCloseSelected}
                    disabled={selected.length === 0}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                        selected.length === 0
                            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                    }`}
                >
                    <Icon icon="solar:close-circle-bold" height={18} />
                    Close Selected ({selected.length})
                </button>
            </div>

            {showFilters && (
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-4 p-5 bg-white/5 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-top-2">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-black text-gray-500 tracking-wider ml-1">Symbol</label>
                        <input
                            type="text"
                            placeholder="EURUSD..."
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition"
                            value={symbolFilter}
                            onChange={(e) => setSymbolFilter(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-black text-gray-500 tracking-wider ml-1">Ticket</label>
                        <input
                            type="text"
                            placeholder="123456..."
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition"
                            value={ticketFilter}
                            onChange={(e) => setTicketFilter(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-black text-gray-500 tracking-wider ml-1">Master Ticket</label>
                        <input
                            type="text"
                            placeholder="555666..."
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition"
                            value={masterTicketFilter}
                            onChange={(e) => setMasterTicketFilter(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-black text-gray-500 tracking-wider ml-1">Type</label>
                        <select
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition appearance-none"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="" className="bg-slate-900">All Types</option>
                            <option value="DEAL_TYPE_BUY" className="bg-slate-900">BUY</option>
                            <option value="DEAL_TYPE_SELL" className="bg-slate-900">SELL</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-black text-gray-500 tracking-wider ml-1">Lot</label>
                        <input
                            type="text"
                            placeholder="0.01"
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition"
                            value={lotFilter}
                            onChange={(e) => setLotFilter(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-black text-gray-500 tracking-wider ml-1">Open Time</label>
                        <input
                            type="date"
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition [color-scheme:dark]"
                            value={openTimeFilter}
                            onChange={(e) => setOpenTimeFilter(e.target.value)}
                        />
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs uppercase text-gray-500 border-b border-white/5 font-black tracking-widest">
                        <tr>
                            <th className="px-4 py-4 w-10">
                                <input
                                    type="checkbox"
                                    className="rounded border-white/10 bg-white/5 checked:bg-primary h-4 w-4"
                                    checked={selected.length === orders.length && orders.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className="px-4 py-4">Account ID</th>
                            <th className="px-4 py-4">Account</th>
                            <th className="px-4 py-4">Ticket</th>
                            <th className="px-4 py-4">Master Ticket</th>
                            <th className="px-4 py-4">Symbol</th>
                            <th className="px-4 py-4">Type</th>
                            <th className="px-4 py-4">Lot</th>
                            <th className="px-4 py-4 text-right">Profit</th>
                            <th className="px-4 py-4 text-right">Open Time</th>
                            <th className="px-4 py-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="px-4 py-16 text-center text-gray-500 italic">
                                    <div className="flex flex-col items-center gap-3">
                                        <Icon icon="solar:document-text-broken" height={48} className="text-gray-700" />
                                        <span>No active positions match your current filters.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            orders.map((o) => {
                                const type = o.order_type || o.orderType;
                                const isBuy = type?.includes("BUY") || type === "0";
                                const profit = o.order_profit || o.orderProfit || 0;
                                const openTime = o.order_open_at || o.orderOpenAt || o.created_at;
                                const masterTicket = o.master_order?.order_ticket || o.masterOrderTicket || "-";
                                const accountId = getAccountId(o);

                                return (
                                    <tr key={o.id} className="hover:bg-white/[0.03] transition-colors group border-b border-white/5 last:border-0">
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-white/10 bg-white/5 checked:bg-primary h-4 w-4"
                                                checked={selected.includes(o.id)}
                                                onChange={() => toggleSelect(o.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="font-mono text-xs font-bold text-primary">{accountId || "-"}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">{o.account?.account_number || "..."}</span>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-tight">{o.account?.server_name || "..."}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 font-mono text-xs font-bold">{o.order_ticket || o.orderTicket}</td>
                                        <td className="px-4 py-4 font-mono text-xs text-gray-400">{masterTicket}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1 h-3 rounded-full bg-primary/40"></div>
                                                <span className="font-black text-white">{o.order_symbol || o.orderSymbol}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-widest ${
                                                isBuy ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20" : "bg-red-600/10 text-red-400 border border-red-500/20"
                                            }`}>
                                                {type?.replace("DEAL_TYPE_", "") || "TRADE"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 font-mono font-bold">{Number(o.order_lot || o.orderLot || 0).toFixed(2)}</td>
                                        <td className="px-4 py-4 text-right">
                                            <div className={`text-sm font-black ${Number(profit) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                {Number(profit) >= 0 ? "+" : ""}${Number(profit).toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="text-[11px] text-gray-400 font-medium">
                                                {openTime ? new Date(openTime).toLocaleDateString() : "-"}
                                            </div>
                                            <div className="text-[10px] text-gray-600 font-mono">
                                                {openTime ? new Date(openTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {accountId && (
                                                <button
                                                    onClick={() => navigate(`/dashboard/accounts/${accountId}`)}
                                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-gray-400 hover:text-primary transition-all group-hover:opacity-100 opacity-60"
                                                    title={`Open Account ${accountId}`}
                                                >
                                                    <Icon icon="solar:arrow-right-up-bold" height={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ActivePositionsTable;
