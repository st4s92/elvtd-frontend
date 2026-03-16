import { Icon } from '@iconify/react';
import { useDashboardMetrics } from 'src/hooks/useDashboardMetrics';

const StatCard = ({
    icon,
    label,
    value,
    sub,
    accent,
    glow,
}: {
    icon: string;
    label: string;
    value: string | number;
    sub?: string;
    accent: string;
    glow?: string;
}) => (
    <div
        className={`relative bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-white/5`}
        style={glow ? { boxShadow: glow } : undefined}
    >
        <div className={`flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${accent}`}>
                <Icon icon={icon} height={20} />
            </div>
            <span className="text-sm text-gray-400">{label}</span>
        </div>
        <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
        {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
);

const MonitoringCards = () => {
    const m = useDashboardMetrics();

    if (m.loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-[rgba(233,223,255,0.04)] rounded-3xl h-36" />
                ))}
            </div>
        );
    }

    const hasAlert = m.unresponsiveAccounts > 0;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                icon="solar:server-bold"
                label="Servers Online"
                value={`${m.serversOnline} / ${m.serversTotal}`}
                sub={`${m.totalActiveTerminals} Terminals · Avg CPU ${Math.round(m.avgCpu)}%`}
                accent="bg-blue-500/20 text-blue-400"
                glow="0px 0px 24px 0px rgba(59,130,246,0.12)"
            />
            <StatCard
                icon="solar:users-group-rounded-bold"
                label="Connected Accounts"
                value={m.connectedAccounts}
                sub="Total registered accounts"
                accent="bg-emerald-500/20 text-emerald-400"
                glow="0px 0px 24px 0px rgba(16,185,129,0.12)"
            />
            <StatCard
                icon={hasAlert ? 'solar:danger-bold' : 'solar:check-circle-bold'}
                label="Unresponsive (> 5 min)"
                value={m.unresponsiveAccounts}
                sub={hasAlert ? 'Action required!' : 'All accounts responding'}
                accent={hasAlert ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}
                glow={
                    hasAlert
                        ? '0px 0px 32px 0px rgba(239,68,68,0.25)'
                        : '0px 0px 24px 0px rgba(16,185,129,0.12)'
                }
            />
            <StatCard
                icon="solar:chart-line-duotone"
                label="Open Trades"
                value={m.openTrades}
                sub="System-wide active orders"
                accent="bg-violet-500/20 text-violet-400"
                glow="0px 0px 24px 0px rgba(139,92,246,0.15)"
            />
        </div>
    );
};

export { MonitoringCards };
