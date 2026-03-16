import { useEffect, useState } from "react";
import axiosClient from "src/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "src/components/ui/dialog";
import { Label } from "src/components/ui/label";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "src/components/ui/select";
import { Icon } from "@iconify/react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: any;
  userName: string;
  userEmail: number;
  onSuccess?: () => void;
};

const EditAccountFormModal = ({
  open,
  onOpenChange,
  account,
  userName,
  userEmail,
  onSuccess,
}: Props) => {
  const [platformName, setPlatformName] = useState("");
  const [accountNumber, setAccountNumber] = useState(0);
  const [accountPassword, setAccountPassword] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [serverName, setServerName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // cTrader fields
  const [ctidTraderAccountId, setCtidTraderAccountId] = useState<number>(0);
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [expiryToken, setExpiryToken] = useState("");

  const isCtrader = platformName === "cTrader";

  // 🔥 PREFILL DATA (API liefert snake_case)
  useEffect(() => {
    if (!account) return;

    setPlatformName(account.platform_name || account.platformName || "");
    setAccountNumber(account.account_number || account.accountNumber || 0);
    setBrokerName(account.broker_name || account.brokerName || "");
    setServerName(account.server_name || account.serverName || "");
    setAccountPassword(account.account_password || account.accountPassword || "");

    // Prefill cTrader fields from account data
    setCtidTraderAccountId(account.ctid_trader_account_id || 0);
    setAccessToken(account.access_token || "");
    setRefreshToken(account.refresh_token || "");
    // token_expired_at comes as ISO string, convert to datetime-local format
    const expAt = account.token_expired_at;
    if (expAt) {
      const d = new Date(expAt);
      // Format: YYYY-MM-DDTHH:mm (for datetime-local input)
      const formatted = d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0") + "T" +
        String(d.getHours()).padStart(2, "0") + ":" +
        String(d.getMinutes()).padStart(2, "0");
      setExpiryToken(formatted);
    } else {
      setExpiryToken("");
    }
  }, [account, open]);

  const handleSubmit = async () => {
    if (!account) return;

    const payload: any = {
      platform_name: platformName,
      account_number: accountNumber,
      broker_name: brokerName,
      server_name: serverName,
    };

    // Passwort nur senden wenn ausgefüllt (MT4/MT5)
    if (accountPassword.trim() !== "") {
      payload.account_password = accountPassword;
    }

    // cTrader-spezifische Felder mitsenden
    if (isCtrader) {
      if (ctidTraderAccountId > 0) payload.ctid_trader_account_id = ctidTraderAccountId;
      if (accessToken.trim() !== "") payload.access_token = accessToken;
      if (refreshToken.trim() !== "") payload.refresh_token = refreshToken;
      if (expiryToken.trim() !== "") payload.expiry_token = expiryToken;
    }

    console.log("[EditAccount] Sending payload:", JSON.stringify(payload, null, 2));

    try {
      // 1. Account-Daten updaten
      const res: any = await axiosClient.patch(`/trader/account/${account.id}`, payload);
      console.log("[EditAccount] Account update response:", JSON.stringify(res, null, 2));

      if (res?.status === false) {
        alert(`Update failed: ${res?.data || res?.message || "Unknown error"}`);
        return;
      }

      // 2. cTrader Token separat speichern über dedizierten Endpoint
      if (isCtrader && accessToken.trim() !== "") {
        const tokenPayload = {
          account_number: accountNumber,
          access_token: accessToken,
          refresh_token: refreshToken,
          expiry_token: expiryToken,
        };
        console.log("[EditAccount] Saving cTrader token:", JSON.stringify(tokenPayload, null, 2));

        const tokenRes: any = await axiosClient.put("/ctrader/token/save", tokenPayload);
        console.log("[EditAccount] Token save response:", JSON.stringify(tokenRes, null, 2));

        if (tokenRes?.status === false) {
          alert(`Token save failed: ${tokenRes?.data || tokenRes?.message || "Unknown error"}`);
          return;
        }
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("[EditAccount] Error:", err);
      alert("Failed to update account");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg py-3 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            Edit Trading Account
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 flex flex-col gap-5">
          <div>
            <Label>User</Label>
            <Input className="mt-2" value={`${userName} - ${userEmail}`} disabled />
          </div>

          <div>
            <Label>Broker Name</Label>
            <Input
              value={brokerName}
              onChange={(e) => setBrokerName(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Server Name</Label>
            <Input
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Platform</Label>
            <Select value={platformName} onValueChange={setPlatformName}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Metatrader 4">Metatrader 4</SelectItem>
                <SelectItem value="Metatrader 5">Metatrader 5</SelectItem>
                <SelectItem value="cTrader">cTrader</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Account Number</Label>
            <Input
              type="number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(Number(e.target.value))}
              className="mt-2"
            />
          </div>

          {!isCtrader && (
            <div>
              <Label>Account Password</Label>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="Trade Account Password"
                  className="pr-10 mt-2"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? (
                    <Icon icon="solar:eye-closed-bold" width={20} />
                  ) : (
                    <Icon icon="solar:eye-bold" width={20} />
                  )}
                </button>
              </div>
            </div>
          )}

          {isCtrader && (
            <>
              <div>
                <Label>cTrader Trading Account ID</Label>
                <Input
                  type="number"
                  value={ctidTraderAccountId || ""}
                  onChange={(e) => setCtidTraderAccountId(Number(e.target.value))}
                  placeholder="ctidTraderAccountId (from cTrader)"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Access Token</Label>
                <Input
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="cTrader Access Token"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Refresh Token</Label>
                <Input
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="cTrader Refresh Token"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Token Expiry</Label>
                <Input
                  type="datetime-local"
                  value={expiryToken}
                  onChange={(e) => setExpiryToken(e.target.value)}
                  placeholder="Token Expiry Date"
                  className="mt-2"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditAccountFormModal;
