import { useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";

const AccountDetailCard = ({ account, serverAccount }: any) => {
  console.log(account);
  const [copied, setCopied] = useState(false);

  const profit = ((account.equity ?? 0) - (account.balance ?? 0)).toFixed(2);
  const isProfit = Number(profit) >= 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(account.account_number.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-10 text-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Icon icon="solar:wallet-bold" height={20} />
          <h4 className="font-semibold text-lg">Account Detail</h4>
        </div>

        <div className="flex gap-2 items-center">
          {serverAccount && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${serverAccount.status === 100
                ? "bg-amber-500/20 text-amber-400"
                : serverAccount.status === 200
                  ? "bg-emerald-600/20 text-emerald-400"
                  : serverAccount.status === 300
                    ? "bg-red-600/20 text-red-400"
                    : "bg-gray-600/20 text-gray-400"
                }`}
            >
              {serverAccount.message || "Unknown Status"}
            </span>
          )}


          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${account.status === 200
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
              }`}
          >
            {account.status === 200 ? "Running" : "Stopped"}
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="space-y-5 text-sm">
        {/* PLATFORM */}
        <div className="flex items-center gap-3">
          <Icon icon="solar:monitor-bold" className="text-gray-400" />
          <div>
            <div className="text-gray-400 text-xs">Platform</div>
            <div className="font-medium">{account.platform_name}</div>
          </div>
        </div>

        {/* ACCOUNT NUMBER */}
        <div className="flex items-center justify-between bg-[#25253a] p-3 rounded-lg">
          <div className="flex items-center gap-3">
            <Icon icon="solar:card-bold" className="text-gray-400" />
            <div>
              <div className="text-gray-400 text-xs">Account Number</div>
              <div className="font-semibold tracking-wide">
                {account.account_number}
              </div>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className={`text-xs px-3 py-1 rounded-md transition ${copied
              ? "bg-blue-600 text-white"
              : "bg-white/10 hover:bg-white/20"
              }`}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>

        {/* BROKER */}
        <div className="flex items-center gap-3">
          <Icon icon="solar:buildings-bold" className="text-gray-400" />
          <div>
            <div className="text-gray-400 text-xs">Broker</div>
            <div className="font-medium">{account.broker_name}</div>
          </div>
        </div>

        {/* SERVER */}
        <div className="flex items-center gap-3">
          <Icon icon="solar:cloud-bold" className="text-gray-400" />
          <div>
            <div className="text-gray-400 text-xs">Server</div>
            <div className="font-medium">{account.server_name}</div>
          </div>
        </div>

        {/* BALANCE */}
        <div className="flex items-center gap-3">
          <Icon icon="solar:dollar-bold" className="text-blue-400" />
          <div>
            <div className="text-gray-400 text-xs">Balance</div>
            <div className="font-bold text-blue-400 text-lg">
              ${account.balance}
            </div>
          </div>
        </div>

        {/* EQUITY */}
        <div className="flex items-center gap-3">
          <Icon icon="solar:chart-bold" className="text-teal-400" />
          <div>
            <div className="text-gray-400 text-xs">Equity</div>
            <div className="font-bold text-teal-400 text-lg">
              ${account.equity}
            </div>
          </div>
        </div>

        {/* FLOATING P/L */}
        <div className="flex items-center gap-3">
          <Icon
            icon={isProfit ? "solar:arrow-up-bold" : "solar:arrow-down-bold"}
            className={isProfit ? "text-emerald-400" : "text-red-400"}
          />
          <div>
            <div className="text-gray-400 text-xs">Floating P/L</div>
            <div
              className={`font-bold text-lg ${isProfit ? "text-emerald-400" : "text-red-400"
                }`}
            >
              {isProfit ? "+" : ""}
              {profit}
            </div>
          </div>
        </div>

        {/* ROLE */}
        <div className="flex items-center gap-3">
          <Icon icon="solar:user-id-bold" className="text-gray-400" />
          <div>
            <div className="text-gray-400 text-xs">Role</div>
            <span
              className={`inline-block mt-1 px-3 py-1 text-xs rounded-md font-semibold ${account.role === "MASTER"
                ? "bg-blue-600 text-white"
                : "bg-amber-400 text-black"
                }`}
            >
              {account.role}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDetailCard;
