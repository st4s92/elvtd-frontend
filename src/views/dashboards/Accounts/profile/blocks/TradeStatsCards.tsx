import { Icon } from "@iconify/react";
import type { TradeStats } from "./tradeAnalytics.types";

interface Props {
  stats: TradeStats;
}

const TradeStatsCards = ({ stats }: Props) => {
  const cards = [
    {
      label: "Total Net P/L",
      value: `$${stats.totalNetPnl.toFixed(2)}`,
      icon: "solar:dollar-bold",
      color: stats.totalNetPnl >= 0 ? "text-emerald-500" : "text-red-500",
      bg: stats.totalNetPnl >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
      iconColor: stats.totalNetPnl >= 0 ? "text-emerald-500" : "text-red-500",
    },
    {
      label: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      icon: "solar:target-bold",
      color: stats.winRate >= 50 ? "text-emerald-500" : "text-red-500",
      bg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      label: "Total Trades",
      value: `${stats.totalTrades}`,
      icon: "solar:graph-bold",
      color: "text-gray-200",
      bg: "bg-violet-500/10",
      iconColor: "text-violet-500",
    },
    {
      label: "Profit Factor",
      value: stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2),
      icon: "solar:scale-bold",
      color: stats.profitFactor >= 1 ? "text-emerald-500" : "text-red-500",
      bg: stats.profitFactor >= 1 ? "bg-emerald-500/10" : "bg-red-500/10",
      iconColor: stats.profitFactor >= 1 ? "text-emerald-500" : "text-red-500",
    },
    {
      label: "Avg Win",
      value: `$${stats.avgWin.toFixed(2)}`,
      icon: "solar:arrow-up-bold",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      label: "Avg Loss",
      value: `$${stats.avgLoss.toFixed(2)}`,
      icon: "solar:arrow-down-bold",
      color: "text-red-500",
      bg: "bg-red-500/10",
      iconColor: "text-red-500",
    },
    {
      label: "Best Day",
      value: stats.bestDay ? `$${stats.bestDay.pnl.toFixed(2)}` : "-",
      icon: "solar:star-bold",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      label: "Worst Day",
      value: stats.worstDay ? `$${stats.worstDay.pnl.toFixed(2)}` : "-",
      icon: "solar:danger-triangle-bold",
      color: "text-red-500",
      bg: "bg-red-500/10",
      iconColor: "text-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-2xl p-4 shadow-sm transition-all duration-300 hover:shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className={`rounded-xl ${card.bg} p-2.5`}>
              <Icon icon={card.icon} className={card.iconColor} height={20} />
            </div>
            <div>
              <div className="text-xs text-gray-400">{card.label}</div>
              <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TradeStatsCards;
