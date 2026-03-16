import ProfileWelcome from 'src/components/dashboards/modern/ProfileWelcome';
import { MonitoringCards } from 'src/components/dashboards/modern/MonitoringCards';
import { ServerLoadChart } from 'src/components/dashboards/modern/ServerLoadChart';
import LiveMasterTradesCarousel from 'src/components/dashboards/modern/LiveMasterTradesCarousel';
import {
    TradeActivityChart,
    AccountRatioChart,
    SystemHealthSparkline,
    RecentOrdersTable,
} from 'src/components/dashboards/modern/TradingCharts';

const Moderndash = () => {
    return (
        <div className="flex flex-col gap-6">
            <ProfileWelcome />
            <MonitoringCards />
            <LiveMasterTradesCarousel />
            <ServerLoadChart />

            {/* Charts Row 1: Trade Activity (big) + Account Ratio + System Health (stacked) */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                <TradeActivityChart />
                <div className="flex flex-col gap-0">
                    <AccountRatioChart />
                    <SystemHealthSparkline />
                </div>
            </div>

            {/* Charts Row 2: Recent Orders Table (full width) */}
            <div className="grid grid-cols-1 gap-6">
                <RecentOrdersTable />
            </div>
        </div>
    );
};

export default Moderndash;