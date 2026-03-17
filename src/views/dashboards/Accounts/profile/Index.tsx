import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import AccountDetailCard from "./blocks/AccountDetailCard";
import AccountUserCard from "./blocks/AccountUserCard";
import ServerStatusCard from "./blocks/ServerStatusCard";
import BalanceChart from "./blocks/BalanceChart";
import axiosClient from "src/lib/axios";
import ActiveOrdersTable from "./blocks/ActiveOrdersTable";
import PositionHistoryTable from "./blocks/PositionHistoryTable";
import SlaveOrdersSection from "./blocks/SlaveOrdersSection";
import AccountConnectionsTable from "./blocks/AccountConnectionsTable";

const AccountProfile = () => {
  const { accountId } = useParams();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="p-6 text-gray-400">Loading account detail...</div>;
  }

  if (!data) {
    return <div className="p-6 text-red-400">Account not found</div>;
  }

  return (
    <div className="space-y-6">
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
