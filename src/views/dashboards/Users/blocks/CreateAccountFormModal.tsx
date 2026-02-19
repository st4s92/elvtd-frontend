import { useState } from "react";
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
  userId: number;
  userName: string;
  userEmail: number;
  onSuccess?: () => void;
};

const CreateAccountFormModal = ({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
  onSuccess,
}: Props) => {
  const [platformName, setPlatformName] = useState("Metatrader 5");
  const [accountNumber, setAccountNumber] = useState(0);
  const [accountPassword, setAccountPassword] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [serverName, setServerName] = useState("");
  const [role, setRole] = useState("SLAVE");
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setPlatformName("Metatrader 5");
    setAccountNumber(0);
    setAccountPassword("");
    setBrokerName("");
    setServerName("");
    setRole("");
  };

  const handleSubmit = async () => {
    if (
      platformName == "" ||
      accountNumber <= 0 ||
      accountPassword == "" ||
      brokerName == "" ||
      serverName == "" ||
      role == ""
    ) {
      console.log({
        platformName: platformName,
        accountNumber: accountNumber,
        accountPassword: accountPassword,
        brokerName: brokerName,
        serverName: serverName,
        role: role,
      });
      alert("recheck your data");
      return;
    }
    const payload = {
      platform_name: platformName,
      account_number: accountNumber,
      account_password: accountPassword,
      broker_name: brokerName,
      server_name: serverName,
      user_id: userId,
      role: role,
    };

    try {
      await axiosClient.post("/trader/account", payload);
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert("Failed to create account");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg py-3 overflow-y-auto">
        <DialogHeader className="mt-3">
          <DialogTitle className="text-center">
            Connect Trading Account
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mt-4 flex flex-col gap-6">
            {/* User */}
            <div>
              <Label>User</Label>
              <Input
                type="text"
                value={`${userName} - ${userEmail}`}
                disabled
                className="mt-2"
              />
            </div>

            {/* Broker Name */}
            <div className="mt-2">
              <Label>Broker Name</Label>
              <Input
                value={brokerName}
                onChange={(e) => setBrokerName(e.target.value)}
                placeholder="e.g. Finex Bisnis Solution"
                className="mt-2"
              />
            </div>

            {/* Server Name */}
            <div className="mt-2">
              <Label>Server Name</Label>
              <Input
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="e.g. FinexBisnisSolusi-Demo"
                className="mt-2"
              />
            </div>

            {/* Platform Name */}
            <div className="mt-2">
              <Label>Platform Name</Label>
              <Select
                value={platformName}
                defaultValue="Metatrader 5"
                onValueChange={(val: string) => setPlatformName(val)}
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Metatrader 4">Metatrader 4</SelectItem>
                  <SelectItem value="Metatrader 5">Metatrader 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account Role */}
            <div className="mt-2">
              <Label>Account Role</Label>
              <Select
                value={role}
                defaultValue="SLAVE"
                onValueChange={(val: string) => setRole(val)}
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SLAVE">SLAVE</SelectItem>
                  <SelectItem value="MASTER">MASTER</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account Number */}
            <div className="mt-2">
              <Label>Account Number</Label>
              <Input
                type="number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(parseInt(e.target.value))}
                placeholder="e.g. 12345678"
                className="mt-2"
              />
            </div>

            {/* Password */}
            <div className="mt-2">
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit Account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAccountFormModal;
