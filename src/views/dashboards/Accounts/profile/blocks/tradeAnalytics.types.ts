export interface ClosedOrder {
  id: number;
  order_ticket: number;
  order_symbol: string;
  order_type: string;
  order_lot: number;
  order_price: number;
  close_price: number;
  order_profit: number;
  order_open_at: string;
  order_close_at: string;
  status: number;
  master_order_id: number | null;
}

export interface DailyAggregate {
  date: string; // "YYYY-MM-DD"
  netPnl: number;
  tradeCount: number;
  wins: number;
  losses: number;
  grossProfit: number;
  grossLoss: number;
  orders: ClosedOrder[];
}

export type DailyAggregateMap = Record<string, DailyAggregate>;

export interface SymbolAggregate {
  symbol: string;
  netPnl: number;
  tradeCount: number;
  wins: number;
  losses: number;
}

export interface DayOfWeekAggregate {
  dayIndex: number;
  dayLabel: string;
  netPnl: number;
  tradeCount: number;
}

export interface CumulativePnlPoint {
  date: string;
  cumulativePnl: number;
}

export interface TradeStats {
  totalNetPnl: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  bestDay: { date: string; pnl: number } | null;
  worstDay: { date: string; pnl: number } | null;
  avgTradesPerDay: number;
}

export interface TradeAnalyticsData {
  loading: boolean;
  error: string | null;
  orders: ClosedOrder[];
  stats: TradeStats;
  dailyMap: DailyAggregateMap;
  symbolAggregates: SymbolAggregate[];
  dayOfWeekAggregates: DayOfWeekAggregate[];
  cumulativePnl: CumulativePnlPoint[];
}
