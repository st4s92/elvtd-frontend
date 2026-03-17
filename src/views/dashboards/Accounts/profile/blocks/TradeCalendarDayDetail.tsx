import { format, parseISO } from "date-fns";
import { Badge } from "src/components/ui/badge";
import { Icon } from "@iconify/react";
import type { DailyAggregate } from "./tradeAnalytics.types";

interface Props {
  date: string;
  dayData: DailyAggregate;
  onClose: () => void;
}

const TradeCalendarDayDetail = ({ date, dayData, onClose }: Props) => {
  const sortedOrders = [...dayData.orders].sort(
    (a, b) =>
      new Date(a.order_close_at).getTime() - new Date(b.order_close_at).getTime()
  );

  return (
    <div className="mt-4 bg-white/5 rounded-2xl p-4 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-semibold text-gray-200">
            {format(parseISO(date), "EEEE, MMMM d, yyyy")}
          </h4>
          <span
            className={`text-sm font-bold ${
              dayData.netPnl >= 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {dayData.netPnl >= 0 ? "+" : ""}${dayData.netPnl.toFixed(2)}
          </span>
          <span className="text-xs text-gray-500">
            {dayData.wins}W / {dayData.losses}L
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 transition text-gray-400"
        >
          <Icon icon="solar:close-circle-linear" height={20} />
        </button>
      </div>

      {/* Trade table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-white/10">
              <th className="text-left py-2 px-2">Ticket</th>
              <th className="text-left py-2 px-2">Symbol</th>
              <th className="text-left py-2 px-2">Type</th>
              <th className="text-right py-2 px-2">Lot</th>
              <th className="text-right py-2 px-2">Open</th>
              <th className="text-right py-2 px-2">Close</th>
              <th className="text-right py-2 px-2">Profit</th>
              <th className="text-right py-2 px-2">Close Time</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order) => {
              const profit = Number(order.order_profit) || 0;
              return (
                <tr
                  key={order.id || order.order_ticket}
                  className="border-b border-white/5 hover:bg-white/5 transition"
                >
                  <td className="py-2 px-2 text-gray-300">
                    {order.order_ticket || "-"}
                  </td>
                  <td className="py-2 px-2 text-gray-300">
                    {order.order_symbol || "-"}
                  </td>
                  <td className="py-2 px-2">
                    <Badge
                      variant={
                        order.order_type === "DEAL_TYPE_BUY" ? "success" : "error"
                      }
                    >
                      {order.order_type?.replace("DEAL_TYPE_", "")}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-right text-gray-300">
                    {order.order_lot || "-"}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-300">
                    {order.order_price
                      ? Number(order.order_price).toFixed(5)
                      : "-"}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-300">
                    {order.close_price
                      ? Number(order.close_price).toFixed(5)
                      : "-"}
                  </td>
                  <td
                    className={`py-2 px-2 text-right font-semibold ${
                      profit >= 0 ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    ${profit.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-400 text-xs">
                    {order.order_close_at
                      ? format(parseISO(order.order_close_at), "HH:mm:ss")
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TradeCalendarDayDetail;
