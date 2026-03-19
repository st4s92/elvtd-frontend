import { useMemo } from "react";
import Chart from "react-apexcharts";
import { Icon } from "@iconify/react";

type Props = {
    orders: any[];
};

type SymbolStats = {
    symbol: string;
    count: number;
    totalProfit: number;
    totalLots: number;
    buyCount: number;
    sellCount: number;
};

const ActivePositionsSentiment = ({ orders }: Props) => {
    const stats = useMemo(() => {
        const map: Record<string, SymbolStats> = {};
        orders.forEach((o) => {
            const sym = o.order_symbol || o.orderSymbol || "UNKNOWN";
            const profit = Number(o.order_profit || o.orderProfit || 0);
            const lot = Number(o.order_lot || o.orderLot || 0);
            const type = o.order_type || o.orderType || "";
            const isBuy = type.includes("BUY") || type === "0";

            if (!map[sym]) {
                map[sym] = { symbol: sym, count: 0, totalProfit: 0, totalLots: 0, buyCount: 0, sellCount: 0 };
            }
            map[sym].count += 1;
            map[sym].totalProfit += profit;
            map[sym].totalLots += lot;
            if (isBuy) map[sym].buyCount += 1;
            else map[sym].sellCount += 1;
        });
        return Object.values(map).sort((a, b) => b.count - a.count);
    }, [orders]);

    if (orders.length === 0 || stats.length === 0) return null;

    // ───── Summary ─────
    const totalProfit = stats.reduce((a, b) => a + b.totalProfit, 0);
    const totalLots = stats.reduce((a, b) => a + b.totalLots, 0);
    const profitableAssets = stats.filter((s) => s.totalProfit >= 0).length;
    const losingAssets = stats.filter((s) => s.totalProfit < 0).length;

    // ───── Treemap ─────
    const treemapData = stats.map((s) => ({ x: s.symbol, y: s.count }));
    const treemapOptions: any = {
        chart: { type: "treemap", toolbar: { show: false }, fontFamily: "'Inter', sans-serif", foreColor: "#94a3b8" },
        colors: ["#8B5CF6", "#06B6D4", "#F59E0B", "#10B981", "#EC4899", "#3B82F6", "#F97316", "#A855F7"],
        plotOptions: { treemap: { distributed: true, enableShades: false } },
        dataLabels: {
            enabled: true,
            style: { fontSize: "14px", fontWeight: 900, fontFamily: "'Inter', sans-serif" },
            formatter: (text: string, op: any) => [text, `${op.value}`],
            offsetY: -2,
        },
        tooltip: {
            theme: "dark",
            style: { fontFamily: "'Inter', sans-serif" },
            y: { formatter: (val: number) => `${val} positions` },
        },
        legend: { show: false },
        stroke: { width: 2, colors: ["rgba(0,0,0,0.3)"] },
    };

    // ───── P&L Bar ─────
    const sortedByProfit = [...stats].sort((a, b) => b.totalProfit - a.totalProfit);
    const profitSymbols = sortedByProfit.map((s) => s.symbol);
    const profitValues = sortedByProfit.map((s) => Number(s.totalProfit.toFixed(2)));

    const profitBarOptions: any = {
        chart: { type: "bar", toolbar: { show: false }, fontFamily: "'Inter', sans-serif", foreColor: "#94a3b8" },
        plotOptions: {
            bar: {
                horizontal: true,
                borderRadius: 8,
                barHeight: "55%",
                distributed: true,
                colors: {
                    ranges: [
                        { from: -999999, to: -0.01, color: "#EF4444" },
                        { from: 0, to: 999999, color: "#10B981" },
                    ],
                },
            },
        },
        colors: profitValues.map((v) => (v >= 0 ? "#10B981" : "#EF4444")),
        fill: {
            type: "gradient",
            gradient: { shade: "dark", type: "horizontal", gradientToColors: profitValues.map((v) => (v >= 0 ? "#34D399" : "#F87171")), stops: [0, 100] },
        },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => `$${val.toFixed(2)}`,
            style: { fontSize: "11px", fontWeight: 800, colors: ["#fff"], fontFamily: "'Inter', sans-serif" },
            offsetX: 8,
        },
        xaxis: {
            categories: profitSymbols,
            labels: { formatter: (val: number) => `$${val}`, style: { fontFamily: "'Inter', sans-serif" } },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: { labels: { style: { fontWeight: 800, fontSize: "12px", fontFamily: "'Inter', sans-serif" } } },
        grid: { borderColor: "rgba(255,255,255,0.03)", strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
        tooltip: { theme: "dark", style: { fontFamily: "'Inter', sans-serif" }, y: { formatter: (val: number) => `$${val.toFixed(2)}` } },
        legend: { show: false },
    };

    // ───── Buy/Sell Sentiment ─────
    const top8 = stats.slice(0, 8);
    const buySellOptions: any = {
        chart: { type: "bar", stacked: true, stackType: "100%", toolbar: { show: false }, fontFamily: "'Inter', sans-serif", foreColor: "#94a3b8" },
        plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "50%" } },
        colors: ["#10B981", "#EF4444"],
        fill: {
            type: "gradient",
            gradient: { shade: "dark", type: "horizontal", gradientToColors: ["#34D399", "#F87171"], stops: [0, 100] },
        },
        xaxis: {
            categories: top8.map((s) => s.symbol),
            labels: { formatter: (val: number) => `${val}%`, style: { fontFamily: "'Inter', sans-serif" } },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: { labels: { style: { fontWeight: 800, fontSize: "12px", fontFamily: "'Inter', sans-serif" } } },
        grid: { borderColor: "rgba(255,255,255,0.03)", strokeDashArray: 4 },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => val > 8 ? `${val.toFixed(0)}%` : "",
            style: { fontSize: "11px", fontWeight: 800, fontFamily: "'Inter', sans-serif" },
        },
        tooltip: { theme: "dark", style: { fontFamily: "'Inter', sans-serif" }, y: { formatter: (val: number) => `${val} positions` } },
        legend: {
            position: "top",
            horizontalAlign: "right",
            labels: { colors: "#94a3b8" },
            fontWeight: 700,
            fontSize: "12px",
            fontFamily: "'Inter', sans-serif",
            markers: { size: 6, shape: "circle", offsetX: -4 },
        },
    };

    // ───── Donut: Asset Allocation by Lots ─────
    const topForDonut = stats.slice(0, 6);
    const donutLabels = topForDonut.map((s) => s.symbol);
    const donutValues = topForDonut.map((s) => Number(s.totalLots.toFixed(2)));
    const donutOptions: any = {
        chart: { type: "donut", fontFamily: "'Inter', sans-serif", foreColor: "#94a3b8" },
        labels: donutLabels,
        colors: ["#8B5CF6", "#06B6D4", "#F59E0B", "#10B981", "#EC4899", "#3B82F6"],
        plotOptions: { pie: { donut: { size: "72%", labels: { show: true, name: { show: true, fontSize: "14px", fontWeight: 800 }, value: { show: true, fontSize: "20px", fontWeight: 900, formatter: (val: string) => `${val} lots` }, total: { show: true, label: "Total Lots", fontSize: "11px", fontWeight: 600, color: "#64748b", formatter: () => totalLots.toFixed(2) } } } } },
        stroke: { show: true, width: 3, colors: ["rgba(15,23,42,0.8)"] },
        dataLabels: { enabled: false },
        legend: { position: "bottom", horizontalAlign: "center", labels: { colors: "#94a3b8" }, fontWeight: 700, fontSize: "11px", fontFamily: "'Inter', sans-serif", markers: { size: 5, shape: "circle", offsetX: -3 } },
        tooltip: { theme: "dark", style: { fontFamily: "'Inter', sans-serif" }, y: { formatter: (val: number) => `${val} lots` } },
    };

    return (
        <div className="space-y-6 mb-8">
            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    {
                        label: "Total P&L",
                        value: `${totalProfit >= 0 ? "+" : ""}$${totalProfit.toFixed(2)}`,
                        color: totalProfit >= 0 ? "text-emerald-400" : "text-red-400",
                        icon: totalProfit >= 0 ? "solar:graph-up-bold" : "solar:graph-down-bold",
                        iconColor: totalProfit >= 0 ? "text-emerald-400" : "text-red-400",
                        glow: totalProfit >= 0 ? "shadow-[0_0_30px_rgba(16,185,129,0.08)]" : "shadow-[0_0_30px_rgba(239,68,68,0.08)]",
                        border: totalProfit >= 0 ? "border-emerald-500/10" : "border-red-500/10",
                    },
                    {
                        label: "Active Symbols",
                        value: stats.length.toString(),
                        color: "text-violet-400",
                        icon: "solar:chart-2-bold",
                        iconColor: "text-violet-400",
                        glow: "shadow-[0_0_30px_rgba(139,92,246,0.08)]",
                        border: "border-violet-500/10",
                    },
                    {
                        label: "Total Lots",
                        value: totalLots.toFixed(2),
                        color: "text-cyan-400",
                        icon: "solar:layers-bold",
                        iconColor: "text-cyan-400",
                        glow: "shadow-[0_0_30px_rgba(6,182,212,0.08)]",
                        border: "border-cyan-500/10",
                    },
                    {
                        label: "In Profit",
                        value: profitableAssets.toString(),
                        color: "text-emerald-400",
                        icon: "solar:arrow-up-bold",
                        iconColor: "text-emerald-400",
                        glow: "shadow-[0_0_30px_rgba(16,185,129,0.08)]",
                        border: "border-emerald-500/10",
                    },
                    {
                        label: "In Loss",
                        value: losingAssets.toString(),
                        color: "text-red-400",
                        icon: "solar:arrow-down-bold",
                        iconColor: "text-red-400",
                        glow: "shadow-[0_0_30px_rgba(239,68,68,0.08)]",
                        border: "border-red-500/10",
                    },
                ].map((card, i) => (
                    <div
                        key={i}
                        className={`relative overflow-hidden bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl rounded-2xl p-5 border ${card.border} ${card.glow} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}
                    >
                        <div className="absolute top-3 right-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Icon icon={card.icon} height={40} className={card.iconColor} />
                        </div>
                        <div className="text-[10px] uppercase font-black text-gray-500 tracking-[0.15em] mb-2">{card.label}</div>
                        <div className={`text-2xl font-black ${card.color} tracking-tight`}>{card.value}</div>
                    </div>
                ))}
            </div>

            {/* ── Charts Row 1: Treemap + Donut ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/5 shadow-[0_0_40px_rgba(139,92,246,0.04)]">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <Icon icon="solar:chart-square-bold" height={20} className="text-violet-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-white tracking-wide">Position Distribution</h4>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Trades per symbol</p>
                        </div>
                    </div>
                    <Chart options={treemapOptions} series={[{ data: treemapData }]} type="treemap" height={300} width="100%" />
                </div>

                <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/5 shadow-[0_0_40px_rgba(6,182,212,0.04)]">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-9 w-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                            <Icon icon="solar:pie-chart-2-bold" height={20} className="text-cyan-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-white tracking-wide">Lot Allocation</h4>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Volume per asset</p>
                        </div>
                    </div>
                    <Chart options={donutOptions} series={donutValues} type="donut" height={290} width="100%" />
                </div>
            </div>

            {/* ── Charts Row 2: P&L + Buy/Sell ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/5 shadow-[0_0_40px_rgba(16,185,129,0.04)]">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Icon icon="solar:graph-up-bold" height={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-white tracking-wide">Profit & Loss</h4>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Sentiment by asset</p>
                        </div>
                    </div>
                    <Chart options={profitBarOptions} series={[{ name: "P&L", data: profitValues }]} type="bar" height={Math.max(250, sortedByProfit.length * 36)} width="100%" />
                </div>

                <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/5 shadow-[0_0_40px_rgba(245,158,11,0.04)]">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Icon icon="solar:scale-bold" height={20} className="text-amber-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-white tracking-wide">Buy / Sell Ratio</h4>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Top {top8.length} assets</p>
                        </div>
                    </div>
                    <Chart
                        options={buySellOptions}
                        series={[
                            { name: "BUY", data: top8.map((s) => s.buyCount) },
                            { name: "SELL", data: top8.map((s) => s.sellCount) },
                        ]}
                        type="bar"
                        height={Math.max(250, top8.length * 36)}
                        width="100%"
                    />
                </div>
            </div>
        </div>
    );
};

export default ActivePositionsSentiment;
