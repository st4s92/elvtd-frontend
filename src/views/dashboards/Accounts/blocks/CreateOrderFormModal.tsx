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
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "src/components/ui/popover";
import { Calendar } from "src/components/ui/calendar";
import { Icon } from "@iconify/react";
import ListOrderComponent from "src/views/dashboards/Accounts/blocks/ListOrderComponent";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverName: string;
  accountNumber: number;
  onSuccess?: () => void;
  accountId: number;
};

const CreateOrderFormModal = ({
  open,
  onOpenChange,
  serverName,
  accountNumber,
  onSuccess,
  accountId,
}: Props) => {
  const unixSeconds = Math.floor(Date.now() / 1000);

  const [ticket, setTicket] = useState(unixSeconds.toString());
  const [symbol, setSymbol] = useState("");
  const [orderType, setOrderType] = useState("DEAL_TYPE_BUY");
  const [lot, setLot] = useState(0.01);
  const [selectedOrders, setSelectedOrders] = useState<any[]>([]);

  const [dateOpen, setDateOpen] = useState(false);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState("");

  const resetForm = () => {
    setTicket("");
    setSymbol("");
    setOrderType("DEAL_TYPE_BUY");
    setLot(0.01);
    setDate(null);
    setTime("");
  };

  useEffect(() => {
    if (open) {
      const now = new Date();

      const utcDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );

      const utcTime = `${String(now.getUTCHours()).padStart(2, "0")}:${String(
        now.getUTCMinutes(),
      ).padStart(2, "0")}`;

      setDate(utcDate);
      setTime(utcTime);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!date || !time) return alert("Please select order open date & time");

    const [hour, minute] = time.split(":").map(Number);

    // Build UTC datetime
    const utcDatetime = new Date(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hour,
        minute,
        0,
      ),
    ).toISOString();

    const manualOrder = {
      order_ticket: parseFloat(ticket),
      order_symbol: symbol,
      order_type: orderType,
      order_lot: lot,
      order_price: null,
      order_open_at: utcDatetime,
    };

    const checklistOrders = selectedOrders.map((o) => ({
      order_ticket: o.orderTicket,
      order_symbol: o.orderSymbol,
      order_type: o.orderType,
      order_lot: o.orderLot,
      order_price: o.orderPrice ?? null,
      order_open_at: o.orderOpenAt,
    }));

    const payload = {
      server_name: serverName,
      account_id: accountNumber,
      orders: [manualOrder, ...checklistOrders],
    };

    try {
      const resp = await axiosClient.post(
        "/trader/bridge/master-order",
        payload,
      );
      if (resp?.data && resp.data.trim() !== "") {
        alert(resp.data);
      }
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert("Failed to send order");
    }
  };

  // const deleteAllOrders = async () => {
  //   try {
  //     const payload = {
  //       server_name: serverName,
  //       account_id: accountNumber,
  //       orders: [],
  //     };
  //     const resp = await axiosClient.post(
  //       "/trader/bridge/master-order",
  //       payload,
  //     );
  //     if (resp?.data && resp.data.trim() !== "") {
  //       alert(resp.data);
  //     }
  //     resetForm();
  //     onOpenChange(false);
  //     onSuccess?.();
  //   } catch (err) {
  //     console.error(err);
  //     alert("Failed to send order");
  //   }
  // };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl py-3">
        <DialogHeader className="mt-3">
          <DialogTitle className="text-center">
            Create Master Order - ({accountNumber})
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ===== LEFT COLUMN — FORM ===== */}
            <div className="flex flex-col gap-6">
              {/* Order Ticket */}
              <div>
                <Label>Order Ticket</Label>
                <Input
                  disabled={true}
                  type="number"
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value)}
                  placeholder="12345"
                  className="mt-2"
                />
              </div>

              {/* Order Symbol */}
              <div>
                <Label>Order Symbol</Label>
                <Input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="e.g. EURUSD"
                  className="mt-2"
                />
              </div>

              {/* Order Type */}
              <div>
                <Label>Order Type</Label>
                <Select value={orderType} onValueChange={setOrderType}>
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEAL_TYPE_BUY">Buy</SelectItem>
                    <SelectItem value="DEAL_TYPE_SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lot */}
              <div>
                <Label>Lot Size</Label>
                <Input
                  type="number"
                  value={lot}
                  onChange={(e) => setLot(parseFloat(e.target.value))}
                  placeholder="0.01"
                  className="mt-2"
                  step={0.01}
                  max={100}
                  min={0.01}
                />
              </div>

              {/* Date */}
              <div className="flex flex-col gap-3">
                <Label>Date Open</Label>

                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      {date ? date.toLocaleDateString() : "Select date"}
                      <Icon
                        icon="solar:calendar-minimalistic-linear"
                        width={18}
                      />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date ?? undefined}
                      onSelect={(d) => {
                        if (!d) return;
                        setDate(d);
                        setDateOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time */}
              <div>
                <Label>Time Open</Label>
                <div className="relative mt-2">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="pr-10"
                  />
                  <Icon
                    icon="solar:clock-circle-linear"
                    width="18"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* ===== RIGHT COLUMN — ORDER LIST ===== */}
            <ListOrderComponent
              accountId={accountId}
              onSelectionChange={setSelectedOrders}
            />
          </div>
        </div>

        <DialogFooter className="flex-row! justify-between!">
          <div>
            
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Submit Order</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrderFormModal;
