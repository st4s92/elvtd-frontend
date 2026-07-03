import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

import AccountDetailCard from "./blocks/AccountDetailCard";
import AccountUserCard from "./blocks/AccountUserCard";
import ServerStatusCard from "./blocks/ServerStatusCard";
import BalanceChart from "./blocks/BalanceChart";
import axiosClient from "src/lib/axios";
import ActiveOrdersTable from "./blocks/ActiveOrdersTable";
import PositionHistoryTable from "./blocks/PositionHistoryTable";
import SlaveOrdersSection from "./blocks/SlaveOrdersSection";
import AccountConnectionsTable from "./blocks/AccountConnectionsTable";
import TradeAnalyticsSection from "./blocks/TradeAnalyticsSection";

const AccountProfile = () => {
  const { accountId } = useParams();

  const [data, setData] = useState<any>(null);
  const [livePositions, setLivePositions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveFetchBusy = useRef(false);

  const fetchLivePositions = async (account: any) => {
    // live broker positions only for cTrader accounts with an API token
    if (!account?.platform_name?.toLowerCase().includes("ctrader")) return;
    if (liveFetchBusy.current) return;
    liveFetchBusy.current = true;
    try {
      const res = await axiosClient.get(`/trader/account/${accountId}/live-positions`);
      if (res.status) {
        setLivePositions(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch live positions:", err);
    } finally {
      liveFetchBusy.current = false;
    }
  };

  const fetchDetail = async () => {
    try {
      const res = await axiosClient.get(`/trader/account/${accountId}/detail`);
      if (res.status) {
        setData(res.data);
        fetchLivePositions(res.data.account);
      }
    } catch (err) {
      console.error("Failed to fetch account detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [accountId]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchDetail, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, accountId]);

  if (loading) {
    return <div className="p-6 text-gray-400">Loading account detail...</div>;
  }

  if (!data) {
    return <div className="p-6 text-red-400">Account not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* AUTO-REFRESH TOGGLE */}
      <div className="flex justify-end">
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            autoRefresh
              ? "bg-green-500 text-white border-green-600 hover:bg-green-600"
              : "bg-[rgba(233,223,255,0.04)] border-white/10 text-gray-400 hover:bg-white/5"
          }`}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${autoRefresh ? "bg-white animate-pulse" : "bg-gray-500"}`} />
          {autoRefresh ? "Live" : "Auto-Refresh"}
        </button>
      </div>

      {/* TOP SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <AccountDetailCard account={data.account} serverAccount={data.serverAccount} />

        <div className="space-y-6">
          <ServerStatusCard
            server={data.server}
            serverAccount={data.serverAccount}
            accountId={data.account.id}
            account={data.account}
          />
          <AccountUserCard user={data.user} />
        </div>
      </div>

      {/* BALANCE CHART */}
      <BalanceChart data={data.accountLogs} />

      {/* TRADE ANALYTICS (Calendar + Stats + Charts) */}
      <TradeAnalyticsSection accountId={data.account.id} />

      {/* CONNECTIONS (MASTER-SLAVE) */}
      <AccountConnectionsTable accountId={data.account.id} role={data.account.role} />

      {((data.orders && data.orders.length > 0) ||
        (livePositions?.liveAvailable && livePositions?.positions?.length > 0)) && (
        <ActiveOrdersTable
          accountId={data.account.id}
          accountNumber={data.account.account_number}
          serverName={data.account.server_name}
          orders={data.orders}
          live={livePositions}
          onRefresh={fetchDetail}
          role={data.account.role}
        />
      )}

      {/* SLAVE MANAGEMENT SECTION (For Masters) */}
      {data.account.role === "MASTER" && (
        <SlaveOrdersSection masterAccountId={data.account.id} />
      )}

      <PositionHistoryTable
        accountId={data.account.id}
      />

      {/* EXPERT LOG */}
      {data.account.expert_log && (
        <div className="rounded-xl border border-white/10 bg-[rgba(233,223,255,0.04)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white/70">Expert Log</h3>
            <span className="text-xs text-gray-500">Updated every 5 min by EA</span>
          </div>
          <pre className="max-h-[400px] overflow-auto rounded-lg bg-black/40 p-4 text-xs text-green-400/80 font-mono whitespace-pre-wrap leading-5 scrollbar-thin scrollbar-thumb-white/10">
            {data.account.expert_log}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AccountProfile;
