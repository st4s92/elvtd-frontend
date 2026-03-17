import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { Icon } from "@iconify/react";
import TradeCalendarDayDetail from "./TradeCalendarDayDetail";
import type { DailyAggregateMap, ClosedOrder } from "./tradeAnalytics.types";

interface Props {
  dailyMap: DailyAggregateMap;
  orders: ClosedOrder[];
}

const TradeCalendar = ({ dailyMap }: Props) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const monthKey = format(currentMonth, "yyyy-MM");

  // Max absolute P/L in this month for color intensity scaling
  const maxAbsPnl = useMemo(() => {
    let max = 0;
    for (const [dateKey, day] of Object.entries(dailyMap)) {
      if (dateKey.startsWith(monthKey)) {
        const abs = Math.abs(day.netPnl);
        if (abs > max) max = abs;
      }
    }
    return max || 1;
  }, [dailyMap, monthKey]);

  // Monthly totals
  const monthlyStats = useMemo(() => {
    let totalPnl = 0,
      totalTrades = 0,
      wins = 0,
      losses = 0;
    for (const [dateKey, day] of Object.entries(dailyMap)) {
      if (dateKey.startsWith(monthKey)) {
        totalPnl += day.netPnl;
        totalTrades += day.tradeCount;
        wins += day.wins;
        losses += day.losses;
      }
    }
    return { totalPnl, totalTrades, wins, losses };
  }, [dailyMap, monthKey]);

  return (
    <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 shadow-sm transition-all duration-300 hover:shadow-lg">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
          className="p-2 rounded-lg hover:bg-white/10 transition text-gray-400"
        >
          <Icon icon="solar:arrow-left-linear" height={20} />
        </button>
        <div className="flex items-center gap-2">
          <Icon icon="solar:calendar-bold" height={20} className="text-primary" />
          <h4 className="font-semibold text-lg text-gray-200">
            {format(currentMonth, "MMMM yyyy")}
          </h4>
        </div>
        <button
          onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
          className="p-2 rounded-lg hover:bg-white/10 transition text-gray-400"
        >
          <Icon icon="solar:arrow-right-linear" height={20} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayData = dailyMap[dateKey];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const isSelected = selectedDay === dateKey;

          return (
            <button
              key={dateKey}
              onClick={() =>
                dayData
                  ? setSelectedDay(isSelected ? null : dateKey)
                  : undefined
              }
              className={`
                relative p-2 rounded-xl text-center min-h-[72px] transition-all border border-transparent
                ${!inMonth ? "opacity-20" : ""}
                ${today ? "ring-1 ring-primary/50" : ""}
                ${isSelected ? "ring-2 ring-primary bg-white/5" : ""}
                ${dayData && inMonth ? "cursor-pointer hover:bg-white/5 hover:border-white/10" : "cursor-default"}
              `}
            >
              {/* Date number */}
              <div
                className={`text-xs ${
                  today ? "text-primary font-bold" : "text-gray-400"
                }`}
              >
                {format(day, "d")}
              </div>

              {dayData && inMonth && (
                <>
                  {/* Net P/L */}
                  <div
                    className={`text-sm font-bold mt-1 ${
                      dayData.netPnl >= 0 ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {dayData.netPnl >= 0 ? "+" : ""}
                    {dayData.netPnl.toFixed(0)}
                  </div>

                  {/* Trade count */}
                  <div className="text-[10px] text-gray-500">
                    {dayData.tradeCount} trade
                    {dayData.tradeCount !== 1 ? "s" : ""}
                  </div>

                  {/* Color intensity bar */}
                  <div
                    className={`absolute bottom-0 left-1 right-1 h-1 rounded-full ${
                      dayData.netPnl >= 0 ? "bg-emerald-500" : "bg-red-500"
                    }`}
                    style={{
                      opacity:
                        Math.min(1, (Math.abs(dayData.netPnl) / maxAbsPnl) * 0.8 + 0.2),
                    }}
                  />
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Monthly summary footer */}
      <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-4 gap-4 text-center text-sm">
        <div>
          <div className="text-gray-500 text-xs">Monthly P/L</div>
          <div
            className={`font-bold ${
              monthlyStats.totalPnl >= 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            ${monthlyStats.totalPnl.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Trades</div>
          <div className="font-bold text-gray-200">{monthlyStats.totalTrades}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Wins</div>
          <div className="font-bold text-emerald-500">{monthlyStats.wins}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Losses</div>
          <div className="font-bold text-red-500">{monthlyStats.losses}</div>
        </div>
      </div>

      {/* Day detail expansion */}
      {selectedDay && dailyMap[selectedDay] && (
        <TradeCalendarDayDetail
          date={selectedDay}
          dayData={dailyMap[selectedDay]}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
};

export default TradeCalendar;
