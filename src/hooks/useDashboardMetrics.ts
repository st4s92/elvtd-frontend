import { useEffect, useState } from 'react';
import axiosClient from 'src/lib/axios';
import { differenceInMinutes, parseISO } from 'date-fns';

export interface DashboardMetrics {
    serversOnline: number;
    serversTotal: number;
    avgCpu: number;
    avgRam: number;
    totalActiveTerminals: number;
    connectedAccounts: number;
    unresponsiveAccounts: number; // updated_at > 5 minutes ago
    openTrades: number;
    servers: any[];
    loading: boolean;
}

export function useDashboardMetrics(refreshInterval = 10000): DashboardMetrics {
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        serversOnline: 0,
        serversTotal: 0,
        avgCpu: 0,
        avgRam: 0,
        totalActiveTerminals: 0,
        connectedAccounts: 0,
        unresponsiveAccounts: 0,
        openTrades: 0,
        servers: [],
        loading: true,
    });

    const fetchAll = async () => {
        try {
            const [serversRes, accountsRes, ordersRes] = await Promise.all([
                axiosClient.get('/trader/servers/paginated', { params: { PerPage: 100, Page: 1 } }),
                axiosClient.get('/trader/account/paginated', { params: { PerPage: 1000, Page: 1 } }),
                axiosClient.get('/trader/orders/paginated', { params: { PerPage: 1, Page: 1, IsClosed: false } }),
            ]);
            const servers: any[] = serversRes.data?.data || [];
            const accounts: any[] = accountsRes.data?.data || [];
            const openTrades: number = ordersRes.data?.total || 0;

            const serversOnline = servers.filter((s) => s.status === 200).length;
            const avgCpu = servers.length
                ? servers.reduce((sum, s) => sum + (s.cpuUsage || 0), 0) / servers.length
                : 0;
            const avgRam = servers.length
                ? servers.reduce((sum, s) => sum + (s.ramUsage || 0), 0) / servers.length
                : 0;
            const totalActiveTerminals = servers.reduce((sum, s) => sum + (s.activeTerminals || 0), 0);

            const now = new Date();
            const unresponsiveAccounts = accounts.filter((acc) => {
                const raw = acc.updated_at || acc.updatedAt;
                if (!raw) return true;
                const dateStr = raw.endsWith('Z') ? raw : raw + 'Z';
                const date = parseISO(dateStr);
                return differenceInMinutes(now, date) > 5;
            }).length;

            setMetrics({
                serversOnline,
                serversTotal: servers.length,
                avgCpu,
                avgRam,
                totalActiveTerminals,
                connectedAccounts: accounts.length,
                unresponsiveAccounts,
                openTrades,
                servers,
                loading: false,
            });
        } catch (err) {
            console.error('Failed to fetch dashboard metrics', err);
            setMetrics((prev) => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, refreshInterval);
        return () => clearInterval(interval);
    }, []);

    return metrics;
}
