import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Icon } from "@iconify/react";

const BalanceChart = ({ data }: any) => {
  if (!data || data.length === 0) return null;

  // 🔥 GROUP BY DATE
  const dailyMap: Record<string, any> = {};

  data.forEach((item: any) => {
    const date = new Date(item.createdAt)
      .toISOString()
      .split("T")[0]; // YYYY-MM-DD

    // Ambil yang paling terakhir dalam hari tsb
    if (
      !dailyMap[date] ||
      new Date(item.createdAt) >
        new Date(dailyMap[date].createdAt)
    ) {
      dailyMap[date] = item;
    }
  });

  const formattedData = Object.values(dailyMap)
    .sort(
      (a: any, b: any) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime()
    )
    .map((item: any) => ({
      date: new Date(item.createdAt).toLocaleDateString(),
      balance: item.balance,
      equity: item.equity,
    }));

  return (
    <div className="bg-[#1e1e2f] border border-[#2c2c3e] rounded-xl p-6 mb-6 shadow-lg w-full">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="solar:chart-bold" height={20} />
        <h4 className="font-semibold text-lg text-gray-200">
          Account Balance (Daily)
        </h4>
      </div>

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid stroke="#2c2c3e" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#2c2c3e",
                border: "none",
                color: "#fff",
              }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BalanceChart;
