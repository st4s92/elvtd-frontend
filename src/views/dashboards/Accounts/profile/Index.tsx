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
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDetail = async () => {
    try {
      const res = await axiosClient.get(`/trader/account/${accountId}/detail`);
      if (res.status) {
        setData(res.data);
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

      {data.orders && data.orders.length > 0 && (
        <ActiveOrdersTable
          accountId={data.account.id}
          accountNumber={data.account.account_number}
          serverName={data.account.server_name}
          orders={data.orders}
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
    </div>
  );
};

export default AccountProfile;
