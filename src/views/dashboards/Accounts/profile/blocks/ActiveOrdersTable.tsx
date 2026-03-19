import { useState } from "react";
import { Icon } from "@iconify/react";
import CreateOrderFormModal from "../../blocks/CreateOrderFormModal";
import axiosClient from "src/lib/axios";

const ActiveOrdersTable = ({
  orders = [],
  accountId,
  accountNumber,
  serverName,
  onRefresh,
  role,
}: any) => {
  const [selected, setSelected] = useState<number[]>([]);
  const [openModal, setOpenModal] = useState(false);

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === orders.length) {
      setSelected([]);
    } else {
      setSelected(orders.map((o: any) => o.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selected.length === 0) return;

    if (!confirm(`Close ${selected.length} selected orders on the trading platform?`)) return;

    try {
      if (role === "SLAVE") {
        // For slaves: close each active order individually (sends close to cTrader/MT5)
        for (const activeOrderId of selected) {
          await axiosClient.delete(`/trader/orders/active-order/${activeOrderId}`);
        }
      } else {
        // For masters: use the master order delete endpoint
        await axiosClient.delete("/trader/orders/master-order", {
          data: {
            account_id: accountId,
            is_flush_order: false,
            order_ids: selected,
          },
        });
      }

      setSelected([]);
      onRefresh?.();
    } catch (err) {
      console.error(err);
      alert("Failed to close selected orders");
    }
  };

  const handleFlushAll = async () => {
    const msg = role === "SLAVE"
      ? "Close ALL open positions on this slave account?"
      : "Close ALL open positions (master + all slaves)?";
    if (!confirm(msg)) return;

    try {
      if (role === "SLAVE") {
        // For slaves: close each active order individually
        for (const o of orders) {
          if (o.id) {
            await axiosClient.delete(`/trader/orders/active-order/${o.id}`);
          }
        }
      } else {
        // For masters: use the flush endpoint
        await axiosClient.delete("/trader/orders/master-order", {
          data: {
            account_id: accountId,
            is_flush_order: true,
          },
        });
      }

      setSelected([]);
      onRefresh?.();
    } catch (err) {
      console.error(err);
      alert("Failed to flush orders");
    }
  };

  return (
    <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 shadow-sm transition-all duration-300 w-full hover:shadow-lg">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Icon icon="solar:list-bold" height={20} />
          <h4 className="text-lg font-semibold text-gray-200">Active Orders</h4>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleFlushAll}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            Flush All
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={selected.length === 0}
            className={`px-4 py-2 rounded-lg text-sm transition ${selected.length === 0
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-600 text-white"
              }`}
          >
            Close Selected ({selected.length})
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs uppercase text-gray-400 border-b border-white/10">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={
                    selected.length === orders.length && orders.length > 0
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Lot</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Profit</th>
              <th className="px-4 py-3">Open Time</th>
            </tr>
          </thead>

          <tbody>
            {orders.filter((o: any) => (o.orderTicket ?? o.order_ticket ?? 0) > 0).map((o: any) => (
              <tr
                key={o.id}
                className="border-b border-white/10 hover:bg-white/5 transition"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(o.id)}
                    onChange={() => toggleSelect(o.id)}
                  />
                </td>

                <td className="px-4 py-3">{o.orderTicket}</td>
                <td className="px-4 py-3">{o.orderSymbol}</td>

                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${o.orderType === "DEAL_TYPE_BUY"
                      ? "bg-emerald-600 text-white"
                      : "bg-red-600 text-white"
                      }`}
                  >
                    {o.orderType?.replace("DEAL_TYPE_", "")}
                  </span>
                </td>

                <td className="px-4 py-3">{o.orderLot}</td>
                <td className="px-4 py-3">{o.orderPrice}</td>

                <td className="px-4 py-3">
                  <span
                    className={`font-semibold ${(o.orderProfit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                  >
                    {o.orderProfit != null ? `$${Number(o.orderProfit).toFixed(2)}` : "-"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {o.orderOpenAt || o.order_open_at || o.createdAt ? new Date(o.orderOpenAt || o.order_open_at || o.createdAt).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateOrderFormModal
        open={openModal}
        onOpenChange={setOpenModal}
        accountId={accountId}
        accountNumber={accountNumber}
        serverName={serverName}
        onSuccess={() => {
          onRefresh?.();
        }}
      />
    </div>
  );
};

export default ActiveOrdersTable;
