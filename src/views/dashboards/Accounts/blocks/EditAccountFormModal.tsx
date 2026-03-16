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
import { Account } from "src/types/traders/account";
import { Icon } from "@iconify/react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
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

  // 🔥 PREFILL DATA
  useEffect(() => {
    if (!account) return;

    setPlatformName(account.platformName);
    setAccountNumber(account.accountNumber);
    setBrokerName(account.brokerName);
    setServerName(account.serverName);
    setAccountPassword(account.accountPassword || ""); // kosongkan (optional update)
  }, [account, open]);

  const handleSubmit = async () => {
    if (!account) return;

    const payload: any = {
      platform_name: platformName,
      account_number: accountNumber,
      broker_name: brokerName,
      server_name: serverName,
    };

    // hanya kirim password kalau diisi
    if (accountPassword.trim() !== "") {
      payload.account_password = accountPassword;
    }

    try {
      await axiosClient.patch(`/trader/account/${account.id}`, payload);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error(err);
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

          {platformName !== "cTrader" && (
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
