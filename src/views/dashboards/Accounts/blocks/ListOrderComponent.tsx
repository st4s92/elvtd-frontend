import { useEffect, useState, useRef } from "react";
import axiosClient from "src/lib/axios";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Checkbox } from "src/components/ui/checkbox";

type Order = {
  id: number;
  orderTicket: number;
  orderSymbol: string;
  orderType: string;
  orderLot: number;
  orderPrice: number | null;
  orderOpenAt: string;
  status: number;
};

type Props = {
  accountId: number;
  onSelectionChange?: (orders: Order[]) => void;
};

export default function ListOrderComponent({
  accountId,
  onSelectionChange,
}: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pickedIds, setPickedIds] = useState<number[]>([]);
  const [checkedOrders, setCheckedOrders] = useState<Order[]>([]);

  const PER_PAGE = 5;

  // 🔥 ambil SEMUA halaman sekali fetch (loop sampai habis)
  const fetchAllOrders = async () => {
    try {
      let currentPage = 1;
      let allOrders: Order[] = [];

      while (true) {
        const res = await axiosClient.get("/trader/orders/paginated", {
          params: {
            PerPage: PER_PAGE,
            Page: currentPage,
            AccountId: accountId,
            IsClosed: false,
            Status: 600,
          },
        });

        const pageData = res.data.data; // Order[]
        const total = res.data.total; // number

        allOrders = [...allOrders, ...pageData];

        if (allOrders.length >= total || pageData.length === 0) break;
        currentPage++;
      }

      const filtered = allOrders.filter((o) => (o.orderTicket ?? 0) > 0);
      setOrders(filtered);
      setPickedIds(filtered.map((o) => o.id));
    } catch (err) {
      console.error("Failed fetching orders", err);
    }
  };

  useEffect(() => {
    const selected = orders.filter((o) => pickedIds.includes(o.id));
    setCheckedOrders(selected);
  }, [pickedIds, orders]);

  useEffect(() => {
    onSelectionChange?.(checkedOrders);
  }, [checkedOrders, onSelectionChange]);

  const fetchedRef = useRef(false);
  useEffect(() => {
    fetchedRef.current = false;
  }, [accountId]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetchAllOrders();
  }, [accountId]);

  const togglePick = (id: number) => {
    setPickedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const paginatedOrders = orders.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(orders.length / PER_PAGE);

  const allIdsOnPage = paginatedOrders.map((o) => o.id);
  const isAllCheckedOnPage = allIdsOnPage.every((id) => pickedIds.includes(id));

  const handleCheckAllOnPage = () => {
    if (isAllCheckedOnPage) {
      // Uncheck semua di halaman ini
      setPickedIds((prev) => prev.filter((id) => !allIdsOnPage.includes(id)));
    } else {
      // Check semua di halaman ini (tanpa duplikat)
      setPickedIds((prev) => [...new Set([...prev, ...allIdsOnPage])]);
    }
  };

  return (
    <div className="border rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Active Positions</h3>

        <button
          onClick={handleCheckAllOnPage}
          className="text-xs px-2 py-1 rounded border hover:bg-gray-100"
        >
          {isAllCheckedOnPage ? "Uncheck All" : "Check All"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {paginatedOrders.map((o) => (
          <div key={o.id} className="border rounded-md">
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setOpenId(openId === o.id ? null : o.id)}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={pickedIds.includes(o.id)}
                  onCheckedChange={() => togglePick(o.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="text-sm">
                  <div className="font-medium">
                    #{o.orderTicket} — {o.orderSymbol}
                  </div>
                  <div className="text-xs text-gray-500">
                    {o.orderType == "DEAL_TYPE_BUY" ? "BUY" : "SELL"} • Lot{" "}
                    {o.orderLot} • Price {o.orderPrice ?? "-"}
                  </div>
                </div>
              </div>

              <ChevronDown
                className={`transition-transform ${
                  openId === o.id ? "rotate-180" : ""
                }`}
                size={18}
              />
            </div>

            {openId === o.id && (
              <div className="px-4 pb-3 pt-1 text-xs text-gray-600 space-y-1">
                <div>Status: {o.status}</div>
                <div>Open Time: {new Date(o.orderOpenAt).toLocaleString()}</div>
                <div>Order ID: {o.id}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination kecil */}
      <div className="flex items-center justify-between pt-3">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="p-1 disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>

        <span className="text-xs">
          Page {page} / {totalPages || 1}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="p-1 disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
