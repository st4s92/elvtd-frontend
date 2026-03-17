import { useState, useEffect, useMemo } from "react";
import axiosClient from "src/lib/axios";
import { format, parseISO, getDay } from "date-fns";
import type {
  ClosedOrder,
  DailyAggregateMap,
  SymbolAggregate,
  DayOfWeekAggregate,
  CumulativePnlPoint,
  TradeStats,
  TradeAnalyticsData,
} from "./tradeAnalytics.types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function computeAnalytics(orders: ClosedOrder[]) {
  // --- Daily aggregation ---
  const dailyMap: DailyAggregateMap = {};
  for (const order of orders) {
    const dateStr = order.order_close_at
      ? format(parseISO(order.order_close_at), "yyyy-MM-dd")
      : "unknown";
    if (dateStr === "unknown") continue;

    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = {
        date: dateStr,
        netPnl: 0,
        tradeCount: 0,
        wins: 0,
        losses: 0,
        grossProfit: 0,
        grossLoss: 0,
        orders: [],
      };
    }
    const day = dailyMap[dateStr];
    const profit = Number(order.order_profit) || 0;
    day.netPnl += profit;
    day.tradeCount++;
    if (profit >= 0) {
      day.wins++;
      day.grossProfit += profit;
    } else {
      day.losses++;
      day.grossLoss += profit; // negative
    }
    day.orders.push(order);
  }

  // --- Overall stats ---
  let totalNetPnl = 0;
  let winCount = 0;
  let lossCount = 0;
  let grossProfit = 0;
  let grossLoss = 0;

  for (const order of orders) {
    const profit = Number(order.order_profit) || 0;
    totalNetPnl += profit;
    if (profit >= 0) {
      winCount++;
      grossProfit += profit;
    } else {
      lossCount++;
      grossLoss += Math.abs(profit);
    }
  }

  const totalTrades = orders.length;
  const tradingDays = Object.keys(dailyMap).length;

  let bestDay: { date: string; pnl: number } | null = null;
  let worstDay: { date: string; pnl: number } | null = null;
  for (const [dateKey, day] of Object.entries(dailyMap)) {
    if (!bestDay || day.netPnl > bestDay.pnl) {
      bestDay = { date: dateKey, pnl: day.netPnl };
    }
    if (!worstDay || day.netPnl < worstDay.pnl) {
      worstDay = { date: dateKey, pnl: day.netPnl };
    }
  }

  const stats: TradeStats = {
    totalNetPnl,
    totalTrades,
    winCount,
    lossCount,
    winRate: totalTrades > 0 ? (winCount / totalTrades) * 100 : 0,
    avgWin: winCount > 0 ? grossProfit / winCount : 0,
    avgLoss: lossCount > 0 ? -(grossLoss / lossCount) : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    bestDay,
    worstDay,
    avgTradesPerDay: tradingDays > 0 ? totalTrades / tradingDays : 0,
  };

  // --- Symbol aggregation ---
  const symbolMap: Record<string, SymbolAggregate> = {};
  for (const order of orders) {
    const sym = order.order_symbol || "UNKNOWN";
    if (!symbolMap[sym]) {
      symbolMap[sym] = { symbol: sym, netPnl: 0, tradeCount: 0, wins: 0, losses: 0 };
    }
    const profit = Number(order.order_profit) || 0;
    symbolMap[sym].netPnl += profit;
    symbolMap[sym].tradeCount++;
    if (profit >= 0) symbolMap[sym].wins++;
    else symbolMap[sym].losses++;
  }
  const symbolAggregates = Object.values(symbolMap).sort(
    (a, b) => Math.abs(b.netPnl) - Math.abs(a.netPnl)
  );

  // --- Day of week aggregation ---
  const dowMap: Record<number, DayOfWeekAggregate> = {};
  for (let i = 0; i < 7; i++) {
    dowMap[i] = { dayIndex: i, dayLabel: DAY_LABELS[i], netPnl: 0, tradeCount: 0 };
  }
  for (const order of orders) {
    if (!order.order_close_at) continue;
    const dow = getDay(parseISO(order.order_close_at)); // 0=Sun, 6=Sat
    const profit = Number(order.order_profit) || 0;
    dowMap[dow].netPnl += profit;
    dowMap[dow].tradeCount++;
  }
  // Reorder: Mon(1), Tue(2), ..., Sun(0)
  const dayOfWeekAggregates = [1, 2, 3, 4, 5, 6, 0].map((i) => dowMap[i]);

  // --- Cumulative P/L ---
  const sorted = [...orders]
    .filter((o) => o.order_close_at)
    .sort(
      (a, b) =>
        new Date(a.order_close_at).getTime() - new Date(b.order_close_at).getTime()
    );
  let running = 0;
  const cumulativePnl: CumulativePnlPoint[] = sorted.map((order) => {
    running += Number(order.order_profit) || 0;
    return {
      date: format(parseISO(order.order_close_at), "MMM dd"),
      cumulativePnl: Math.round(running * 100) / 100,
    };
  });

  return { stats, dailyMap, symbolAggregates, dayOfWeekAggregates, cumulativePnl };
}

export function useTradeAnalytics(accountId: number): TradeAnalyticsData {
  const [orders, setOrders] = useState<ClosedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axiosClient.get("/trader/orders/paginated", {
          params: {
            PerPage: 9999,
            Page: 1,
            Status: 700,
            AccountId: accountId,
          },
        });
        setOrders(res.data?.data || []);
      } catch (err) {
        console.error("Failed to fetch closed orders:", err);
        setError("Failed to load trade history");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [accountId]);

  const analytics = useMemo(() => computeAnalytics(orders), [orders]);

  return { loading, error, orders, ...analytics };
}
