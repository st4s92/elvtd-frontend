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
    <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 mb-6 shadow-sm transition-all duration-300 w-full hover:shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="solar:chart-2-bold" height={20} />
        <h4 className="font-semibold text-lg text-gray-200">
          Copy Performance
        </h4>
      </div>

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <XAxis dataKey="time" stroke="#888" />
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