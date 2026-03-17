import { useTradeAnalytics } from "./useTradeAnalytics";
import TradeStatsCards from "./TradeStatsCards";
import TradeCalendar from "./TradeCalendar";
import TradeAnalyticsCharts from "./TradeAnalyticsCharts";
import { Icon } from "@iconify/react";

interface Props {
  accountId: number;
}

const TradeAnalyticsSection = ({ accountId }: Props) => {
  const analytics = useTradeAnalytics(accountId);

  if (analytics.loading) {
    return (
      <div className="text-gray-400 p-4 text-center">
        Loading trade analytics...
      </div>
    );
  }

  if (analytics.error) {
    return <div className="text-red-400 p-4">{analytics.error}</div>;
  }

  if (analytics.orders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Icon
          icon="solar:chart-square-bold"
          height={24}
          className="text-primary"
        />
        <h3 className="text-xl font-bold text-gray-200">Trade Analytics</h3>
        <span className="text-sm text-gray-500 ml-2">
          ({analytics.orders.length} closed trades)
        </span>
      </div>

      {/* Stats summary cards */}
      <TradeStatsCards stats={analytics.stats} />

      {/* Trade Calendar */}
      <TradeCalendar
        dailyMap={analytics.dailyMap}
        orders={analytics.orders}
      />

      {/* Analytics Charts */}
      <TradeAnalyticsCharts
        symbolAggregates={analytics.symbolAggregates}
        dayOfWeekAggregates={analytics.dayOfWeekAggregates}
        cumulativePnl={analytics.cumulativePnl}
        stats={analytics.stats}
      />
    </div>
  );
};

export default TradeAnalyticsSection;
