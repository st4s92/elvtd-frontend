import { Icon } from "@iconify/react/dist/iconify.js";
import axiosClient from "src/lib/axios";

const ServerStatusCard = ({ server, accountId }: any) => {
  const isRunning = server?.status === 200;

  const triggerInstall = async (accountId: number) => {
    if (confirm("re run installation?")) {
      await axiosClient.post(`/trader/account/${accountId}/install`, {});
    }
  };

  return (
    <div
      className="p-6 rounded-3xl bg-[rgba(233,223,255,0.04)] backdrop-blur-md text-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg"
    >
      <div className="d-flex align-items-center gap-2 mb-4">
        <Icon icon="solar:server-bold" height={20} />
        <h5 className="m-0 fw-semibold text-white">Server Status</h5>
      </div>

      {/* SERVER NAME */}
      <div className="mb-3">
        <div className="text-muted small">Server Name</div>
        <div className="fw-semibold d-flex align-items-center gap-2">
          <Icon icon="solar:cloud-bold" height={16} />
          {server?.serverName}
        </div>
      </div>

      {/* IP */}
      <div className="mb-3">
        <div className="text-muted small">IP Address</div>
        <div className="fw-semibold d-flex align-items-center gap-2">
          <Icon icon="solar:global-bold" height={16} />
          {server?.serverIp}
        </div>
      </div>

      {/* PID */}
      <div className="mb-3">
        <div className="text-muted small">Platform PID</div>
        <div className="fw-semibold d-flex align-items-center gap-2">
          <Icon icon="solar:cpu-bold" height={16} />
          {server?.platformPid}
        </div>
      </div>

      {/* STATUS */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="text-muted small">Status</div>

        <div className="flex gap-2">
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
          <a href="#" onClick={() => triggerInstall(accountId)} className="text-blue-400">
            reinstall
          </a>
        </div>
      </div>

      {/* MESSAGE */}
      {server?.message && (
        <div
          className="mt-3 p-2 rounded-xl"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            fontSize: "0.8rem",
            color: "#ccc",
          }}
        >
          <Icon icon="solar:info-circle-bold" height={14} /> {server?.message}
        </div>
      )}
    </div>
  );
};

export default ServerStatusCard;
