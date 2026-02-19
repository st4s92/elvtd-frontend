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

const PerformanceChart = ({ data }: any) => {
  return (
    <div className="bg-[#1e1e2f] border border-[#2c2c3e] rounded-xl p-6 mb-6 shadow-lg w-full">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="solar:chart-2-bold" height={20} />
        <h4 className="font-semibold text-lg text-gray-200">
          Copy Performance
        </h4>
      </div>

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#2c2c3e" strokeDasharray="3 3" />
            <XAxis dataKey="time" stroke="#888" />
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
              dataKey="profit"
              stroke="#22c55e"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PerformanceChart;