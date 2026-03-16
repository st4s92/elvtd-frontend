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

type Account = {
  id: number;
  account_number: number;
  platform_name: string;
  server_name: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  platformName: string;
  serverName: string;
  accountId: number;
  accountNumber: number;
  role: string;
};

const CopyTradeConfigModal = ({
  open,
  onOpenChange,
  onSuccess,
  serverName,
  platformName,
  accountNumber,
  accountId,
  role,
}: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [connectionName, setConnectionName] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [multiplier, setMultiplier] = useState("1");
  const [pairs, setPairs] = useState<
    { masterSymbol: string; slaveSymbol: string }[]
  >([]);

  const resetForm = () => {
    setConnectionName("");
    setSelectedAccountId("");
    setMultiplier("1");
    setPairs([]);
  };

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const res = await axiosClient.get(
        `/trader/account?Role=${role == "MASTER" ? "SLAVE" : "MASTER"}`,
      );
      setAccounts(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch accounts");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccountFullConfig = async () => {
    try {
      setIsLoading(true);

      const res = await axiosClient.get(
        `/trader/master-slave?SlaveId=${accountId}`,
      );

      const relations = res.data || [];

      if (relations.length === 0) return;

      const relation = relations[0]; // karena sekarang cuma boleh 1

      setConnectionName(relation.name);
      setSelectedAccountId(String(relation.masterId));

      // kalau backend sudah include config & pairs
      if (relation.configs?.length > 0) {
        setMultiplier(String(relation.configs[0].multiplier));
      }

      if (relation.pairs?.length > 0) {
        setPairs(
          relation.pairs.map((p: any) => ({
            masterSymbol: p.masterPair,
            slaveSymbol: p.slavePair,
          })),
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedAccountId) return;

    const fetchFullConfig = async () => {
      setIsLoading(true);

      const slaveId = accountId;
      const masterId = Number(selectedAccountId);

      const res = await axiosClient.get(
        `/trader/master-slave/full-config/${slaveId}/slave/${masterId}/master`,
      );

      if (res.data) {
        setMultiplier(String(res.data.multiplier));
        setPairs(res.data.symbol_pairs ?? []);
      }

      setIsLoading(false);
    };

    fetchFullConfig();
  }, [selectedAccountId]);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    fetchAccounts();
    fetchAccountFullConfig();
  }, [open]);

  const handleSubmit = async () => {
    if (!connectionName) {
      alert("Connection name is required");
      return;
    }

    if (!selectedAccountId) {
      alert("Please select destination account");
      return;
    }

    const payload = {
      connection_name: connectionName,
      role, // "MASTER" | "SLAVE"
      accountId: accountId,
      destination_id: Number(selectedAccountId),
      multiplier: Number(multiplier),
      symbol_pairs: pairs
        .filter((p) => p.masterSymbol && p.slaveSymbol)
        .map((p) => ({
          masterSymbol: p.masterSymbol.trim(),
          slaveSymbol: p.slaveSymbol.trim(),
        })),
    };

    try {
      await axiosClient.patch("/trader/master-slave/full-config", payload);

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert("Failed to update copy trade configuration");
    }
  };

  const roleLabel =
    role === "MASTER" ? "Choose Slave Account" : "Choose Master Account";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg py-4">
        <DialogHeader>
          <DialogTitle className="text-center">
            Copy Trade Configuration - <strong>{role}</strong>
          </DialogTitle>
        </DialogHeader>
        {!isLoading ? (
          <div>
            <div className="max-h-[80vh] overflow-y-auto px-1">
              <div className="mt-4 flex flex-col gap-6">
                {platformName} - {serverName} - {accountNumber}
              </div>
              <div className="mt-4 flex flex-col gap-6">
                {/* Connection Name */}
                <div>
                  <Label>Connection Name</Label>
                  <Input
                    className="mt-2"
                    placeholder="e.g. My Copy Trade Setup"
                    value={connectionName}
                    onChange={(e) => setConnectionName(e.target.value)}
                  />
                </div>

                {/* Choose Account */}
                <div>
                  <Label>{roleLabel}</Label>
                  <Select
                    value={selectedAccountId}
                    onValueChange={setSelectedAccountId}
                  >
                    <SelectTrigger className="mt-2 w-full">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={String(acc.id)}>
                          {acc.platform_name} - {acc.server_name} —{" "}
                          {acc.account_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Multiplier */}
                <div>
                  <Label>Multiplier</Label>
                  <Input
                    type="number"
                    min={0.1}
                    max={10}
                    step={0.1}
                    className="mt-2"
                    value={multiplier}
                    onChange={(e) => setMultiplier(e.target.value)}
                    placeholder="e.g. 1"
                  />
                </div>

                {/* Pair Config */}
                <div className="flex flex-col gap-4">
                  <Label>Symbol Pair Matching</Label>

                  {pairs.map((pair, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_1fr_auto] gap-4 items-center"
                    >
                      <Input
                        placeholder="Master Symbol (e.g. EURUSD)"
                        value={pair.masterSymbol}
                        onChange={(e) => {
                          const copy = [...pairs];
                          copy[index].masterSymbol = e.target.value;
                          setPairs(copy);
                        }}
                      />

                      <Input
                        placeholder="Slave Symbol (e.g. EURUSDm)"
                        value={pair.slaveSymbol}
                        onChange={(e) => {
                          const copy = [...pairs];
                          copy[index].slaveSymbol = e.target.value;
                          setPairs(copy);
                        }}
                      />

                      {/* DELETE BUTTON */}
                      <Button
                        type="button"
                        variant="error"
                        size="icon"
                        onClick={() => {
                          const copy = pairs.filter((_, i) => i !== index);
                          setPairs(copy);
                        }}
                      >
                        <Icon icon="solar:trash-bin-trash-bold" width={18} />
                      </Button>
                    </div>
                  ))}

                  {/* Add Pair Button */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-fit"
                    onClick={() =>
                      setPairs([
                        ...pairs,
                        { masterSymbol: "", slaveSymbol: "" },
                      ])
                    }
                  >
                    + Pair Config
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>loading...</div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CopyTradeConfigModal;
