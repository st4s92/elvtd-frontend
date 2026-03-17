import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import Chart from "react-apexcharts";
import { Icon } from "@iconify/react";
import type {
  SymbolAggregate,
  DayOfWeekAggregate,
  CumulativePnlPoint,
  TradeStats,
} from "./tradeAnalytics.types";

const darkTooltipStyle = {
  backgroundColor: "rgba(0,0,0,0.85)",
  borderColor: "rgba(255,255,255,0.1)",
  color: "#e2e8f0",
  borderRadius: "8px",
};

interface Props {
  symbolAggregates: SymbolAggregate[];
  dayOfWeekAggregates: DayOfWeekAggregate[];
  cumulativePnl: CumulativePnlPoint[];
  stats: TradeStats;
}

const TradeAnalyticsCharts = ({
  symbolAggregates,
  dayOfWeekAggregates,
  cumulativePnl,
  stats,
}: Props) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* P/L by Symbol */}
      <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 shadow-sm transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Icon icon="solar:pie-chart-bold" height={20} className="text-primary" />
          <h4 className="font-semibold text-lg text-gray-200">P/L by Symbol</h4>
        </div>
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={symbolAggregates} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="3 3"
                horizontal={false}
              />
              <XAxis type="number" stroke="#888" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="symbol"
                stroke="#888"
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={darkTooltipStyle}
                formatter={(value: string | number | undefined) => [`$${Number(value ?? 0).toFixed(2)}`, "Net P/L"]}
              />
              <Bar dataKey="netPnl" radius={[0, 4, 4, 0]}>
                {symbolAggregates.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.netPnl >= 0 ? "#10b981" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* P/L by Day of Week */}
      <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 shadow-sm transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Icon
            icon="solar:calendar-minimalistic-bold"
            height={20}
            className="text-primary"
          />
          <h4 className="font-semibold text-lg text-gray-200">P/L by Day of Week</h4>
        </div>
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayOfWeekAggregates}>
              <CartesianGrid
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="3 3"
              />
              <XAxis dataKey="dayLabel" stroke="#888" tick={{ fontSize: 12 }} />
              <YAxis stroke="#888" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={darkTooltipStyle}
                formatter={(value: string | number | undefined) => [`$${Number(value ?? 0).toFixed(2)}`, "Net P/L"]}
              />
              <Bar dataKey="netPnl" radius={[4, 4, 0, 0]}>
                {dayOfWeekAggregates.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.netPnl >= 0 ? "#10b981" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cumulative P/L */}
      <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 shadow-sm transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Icon icon="solar:chart-bold" height={20} className="text-primary" />
          <h4 className="font-semibold text-lg text-gray-200">Cumulative P/L</h4>
        </div>
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulativePnl}>
              <CartesianGrid
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="date"
                stroke="#888"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis stroke="#888" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={darkTooltipStyle}
                formatter={(value: string | number | undefined) => [
                  `$${Number(value ?? 0).toFixed(2)}`,
                  "Cumulative P/L",
                ]}
              />
              <Line
                type="monotone"
                dataKey="cumulativePnl"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Win/Loss Distribution Donut */}
      <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 shadow-sm transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Icon icon="solar:chart-2-bold" height={20} className="text-primary" />
          <h4 className="font-semibold text-lg text-gray-200">
            Win/Loss Distribution
          </h4>
        </div>
        <div className="w-full flex justify-center">
          <Chart
            options={{
              labels: ["Wins", "Losses"],
              colors: ["#10b981", "#ef4444"],
              chart: {
                type: "donut" as const,
                background: "transparent",
              },
              plotOptions: {
                pie: {
                  donut: {
                    size: "75%",
                    labels: {
                      show: true,
                      name: { show: true, color: "#9ca3af" },
                      value: { show: true, color: "#e5e7eb", fontSize: "18px" },
                      total: {
                        show: true,
                        label: "Win Rate",
                        color: "#9ca3af",
                        formatter: () => `${stats.winRate.toFixed(1)}%`,
                      },
                    },
                  },
                },
              },
              stroke: { show: false },
              dataLabels: { enabled: false },
              legend: {
                show: true,
                position: "bottom" as const,
                labels: { colors: "#9ca3af" },
              },
              tooltip: { theme: "dark" },
            }}
            series={[stats.winCount, stats.lossCount]}
            type="donut"
            height={280}
          />
        </div>
      </div>
    </div>
  );
};

export default TradeAnalyticsCharts;
