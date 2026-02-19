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

    if (!confirm(`Delete ${selected.length} selected orders?`)) return;

    try {
      await axiosClient.delete("/trader/orders/master-order", {
        data: {
          account_id: accountId,
          is_flush_order: false,
          order_ids: selected,
        },
      });

      setSelected([]);
      onRefresh?.();
    } catch (err) {
      console.error(err);
      alert("Failed to delete selected orders");
    }
  };

  const handleFlushAll = async () => {
    if (!confirm("Flush all master orders?")) return;

    try {
      await axiosClient.delete("/trader/orders/master-order", {
        data: {
          account_id: accountId,
          is_flush_order: true,
        },
      });

      setSelected([]);
      onRefresh?.();
    } catch (err) {
      console.error(err);
      alert("Failed to flush orders");
    }
  };

  return (
    <div className="bg-[#1e1e2f] border border-[#2c2c3e] rounded-xl p-6 shadow-lg w-full">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Icon icon="solar:list-bold" height={20} />
          <h4 className="text-lg font-semibold text-gray-200">Active Orders</h4>
        </div>

        { role === "MASTER" && 
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
            className={`px-4 py-2 rounded-lg text-sm transition ${
              selected.length === 0
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
          >
            Delete Selected ({selected.length})
          </button>
        </div>
        }
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs uppercase text-gray-400 border-b border-[#2c2c3e]">
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
              {role === "SLAVE" && <th className="px-4 py-3">Profit</th>}
            </tr>
          </thead>

          <tbody>
            {orders.map((o: any) => (
              <tr
                key={o.id}
                className="border-b border-[#2c2c3e] hover:bg-[#25253a] transition"
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
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      o.orderType === "DEAL_TYPE_BUY"
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    {o.orderType?.replace("DEAL_TYPE_", "")}
                  </span>
                </td>

                <td className="px-4 py-3">{o.orderLot}</td>
                <td className="px-4 py-3">{o.orderPrice}</td>

                {role === "SLAVE" && (
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${
                        o.orderProfit >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {o.orderProfit?.toFixed(2)}
                    </span>
                  </td>
                )}
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
