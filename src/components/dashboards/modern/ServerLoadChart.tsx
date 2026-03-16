import { Icon } from '@iconify/react';
import { useDashboardMetrics } from 'src/hooks/useDashboardMetrics';

const ProgressBar = ({ value, color }: { value: number; color: string }) => (
    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
        <div
            className={`h-1.5 rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${Math.min(value, 100)}%` }}
        />
    </div>
);

const cpuColor = (v: number) =>
    v > 80 ? 'bg-red-500' : v > 50 ? 'bg-amber-400' : 'bg-emerald-400';

const ServerLoadChart = () => {
    const { servers, loading } = useDashboardMetrics();

    if (loading) {
        return (
            <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 animate-pulse h-48" />
        );
    }

    if (!servers.length) {
        return (
            <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 text-gray-500 text-sm italic">
                No servers found.
            </div>
        );
    }

    return (
        <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-white/5">
            <div className="flex items-center gap-2 mb-6">
                <Icon icon="solar:server-bold" height={20} className="text-violet-400" />
                <h4 className="font-semibold text-white text-lg">Server Load</h4>
                <span className="text-xs text-gray-500 ml-auto">Auto-refresh every 10s</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {servers.map((server: any) => {
                    const cpu = Math.round(server.cpuUsage || 0);
                    const ram = parseFloat((server.ramUsage || 0).toFixed(1));
                    const isOnline = server.status === 200;

                    return (
                        <div
                            key={server.id}
                            className="bg-white/[0.03] rounded-2xl p-4 flex flex-col gap-3 border border-white/5 hover:border-violet-500/20 transition-all duration-200"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-white">{server.serverName}</div>
                                    <div className="text-xs text-gray-500">{server.serverIp}</div>
                                </div>
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isOnline
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'bg-red-500/20 text-red-400'
                                        }`}
                                >
                                    {isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>CPU</span>
                                    <span className={cpu > 80 ? 'text-red-400' : cpu > 50 ? 'text-amber-400' : 'text-emerald-400'}>
                                        {cpu}%
                                    </span>
                                </div>
                                <ProgressBar value={cpu} color={cpuColor(cpu)} />

                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>RAM</span>
                                    <span className={ram > 80 ? 'text-red-400' : ram > 50 ? 'text-amber-400' : 'text-emerald-400'}>
                                        {ram}%
                                    </span>
                                </div>
                                <ProgressBar value={ram} color={cpuColor(ram)} />
                            </div>

                            <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                <span>
                                    <Icon icon="solar:monitor-bold" className="inline mr-1" height={12} />
                                    {server.activeTerminals ?? 0} terminals
                                </span>
                                <span>
                                    <Icon icon="solar:clock-circle-bold" className="inline mr-1" height={12} />
                                    {server.uptimeString || '-'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export { ServerLoadChart };
