import { Icon } from "@iconify/react/dist/iconify.js";
import axiosClient from "src/lib/axios";

const ServerStatusCard = ({ server, serverAccount, accountId, account }: any) => {
  const isCtrader = account?.platform_name === "cTrader";

  // For cTrader: use account connection status (200 = Success = Running)
  // For MT5: use the dedicated server status
  const isRunning = isCtrader
    ? account?.status === 200
    : server?.status === 200;

  const triggerInstall = async (accountId: number) => {
    if (confirm("re run installation?")) {
      await axiosClient.post(`/trader/account/${accountId}/install`, {});
    }
  };

  const triggerRestart = async (accountId: number) => {
    if (confirm("Restart platform?")) {
      await axiosClient.post(`/trader/account/${accountId}/restart`, {});
    }
  };

  const triggerDelete = async (accountId: number) => {
    if (confirm("Are you sure you want to delete this account? This action cannot be undone.")) {
      try {
        await axiosClient.delete(`/trader/account/${accountId}`);
        alert("Account deleted successfully.");
        window.location.href = '/dashboard/accounts';
      } catch (err) {
        console.error("Failed to delete account", err);
        alert("Failed to delete account.");
      }
    }
  };

  return (
    <div
      className="p-6 rounded-3xl bg-[rgba(233,223,255,0.04)] backdrop-blur-md text-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg"
    >
      <div className="d-flex align-items-center gap-2 mb-4">
        <Icon icon="solar:server-bold" height={20} />
        <h5 className="m-0 fw-semibold text-white">
          {isCtrader ? "Connection Status" : "Server Status"}
        </h5>
      </div>

      {isCtrader ? (
        <>
          {/* cTrader Cloud Info */}
          <div className="mb-3">
            <div className="text-muted small">Platform</div>
            <div className="fw-semibold d-flex align-items-center gap-2">
              <Icon icon="solar:cloud-bold" height={16} />
              cTrader Cloud
            </div>
          </div>

          <div className="mb-3">
            <div className="text-muted small">Connection</div>
            <div className="fw-semibold d-flex align-items-center gap-2">
              <Icon icon="solar:global-bold" height={16} />
              {isRunning ? "Connected via Bridge" : "Disconnected"}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* MT5 Server Info */}
          <div className="mb-3">
            <div className="text-muted small">Server Name</div>
            <div className="fw-semibold d-flex align-items-center gap-2">
              <Icon icon="solar:cloud-bold" height={16} />
              {server?.server_name || server?.serverName || '-'}
            </div>
          </div>

          <div className="mb-3">
            <div className="text-muted small">IP Address</div>
            <div className="fw-semibold d-flex align-items-center gap-2">
              <Icon icon="solar:global-bold" height={16} />
              {server?.server_ip || server?.serverIp || '-'}
            </div>
          </div>

          <div className="mb-3">
            <div className="text-muted small">Platform PID</div>
            <div className="fw-semibold d-flex align-items-center gap-2">
              <Icon icon="solar:cpu-bold" height={16} />
              {serverAccount?.platformPid || serverAccount?.platform_pid || '-'}
            </div>
          </div>
        </>
      )}

      {/* STATUS */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="text-muted small">Status</div>

        <div className="flex gap-3 items-center">
          <span
            style={{
              background: isRunning ? "#1f7a4c" : "#7a1f1f",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#fff",
            }}
          >
            {isRunning ? "Running" : "Stopped"}
          </span>
          {!isCtrader && (
            <>
              <a href="#" onClick={(e) => { e.preventDefault(); triggerRestart(accountId); }} className="text-amber-400 hover:text-amber-300 text-sm font-semibold transition-colors">
                restart
              </a>
              <a href="#" onClick={(e) => { e.preventDefault(); triggerInstall(accountId); }} className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors">
                reinstall
              </a>
            </>
          )}
          <a href="#" onClick={(e) => { e.preventDefault(); triggerDelete(accountId); }} className="text-red-500 hover:text-red-400 text-sm font-semibold transition-colors">
            delete
          </a>
        </div>
      </div>

      {/* MESSAGE */}
      {(server?.message || serverAccount?.message) && (
        <div
          className="mt-3 p-2 rounded-xl"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            fontSize: "0.8rem",
            color: "#ccc",
          }}
        >
          <Icon icon="solar:info-circle-bold" height={14} /> {server?.message || serverAccount?.message}
        </div>
      )}
    </div>
  );
};

export default ServerStatusCard;
