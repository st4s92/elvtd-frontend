import ProfileWelcome from 'src/components/dashboards/modern/ProfileWelcome';
import { MonitoringCards } from 'src/components/dashboards/modern/MonitoringCards';
import { ServerLoadChart } from 'src/components/dashboards/modern/ServerLoadChart';
import LiveMasterTradesCarousel from 'src/components/dashboards/modern/LiveMasterTradesCarousel';
import {
    TradeActivityChart,
    AccountRatioChart,
    SystemHealthSparkline,
} from 'src/components/dashboards/modern/TradingCharts';
import ActivePositionsTable from 'src/components/dashboards/modern/ActivePositionsTable';

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



            {/* Active Positions Table (Full Width) */}
            <div className="grid grid-cols-1 gap-6">
                <ActivePositionsTable />
            </div>
        </div>
    );
};

export default Moderndash;