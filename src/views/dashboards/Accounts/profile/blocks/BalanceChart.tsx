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
    <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 mb-6 shadow-sm transition-all duration-300 w-full hover:shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="solar:chart-bold" height={20} />
        <h4 className="font-semibold text-lg text-gray-200">
          Account Balance (Daily)
        </h4>
      </div>

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                borderColor: "rgba(255,255,255,0.1)",
                color: "#e2e8f0",
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
