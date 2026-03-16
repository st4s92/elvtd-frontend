import { useState, useEffect, useCallback, useMemo } from "react";
import axiosClient from "src/lib/axios";
import { DataTable } from "src/components/utilities/table/DataTable";
import { Badge } from "src/components/ui/badge";
import { Input } from "src/components/ui/input";
import { format } from "date-fns";
import { ColumnDef, SortingState } from "@tanstack/react-table";

const OrderTable = () => {
    const [rows, setRows] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    // Column-specific search states
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
        master_order_id: "",
        account_id: "",
        order_ticket: "",
        order_symbol: "",
        order_type: "",
        order_lot: "",
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Build params based on all active filters
            const params: any = {
                PerPage: pageSize,
                Page: page,
                Search: search,
                MasterOrderId: columnFilters.master_order_id || undefined,
                AccountId: columnFilters.account_id || undefined,
                OrderTicket: columnFilters.order_ticket || undefined,
                OrderSymbol: columnFilters.order_symbol || undefined,
                OrderType: columnFilters.order_type || undefined,
                OrderLot: columnFilters.order_lot || undefined,
            };

            const res = await axiosClient.get("/trader/orders/paginated", { params });

            // The API return structure from the curl example:
            // { data: { data: [...], total: ... } }
            // Our axios interceptor returns response.data directly.
            const rowData = res.data?.data || [];
            const total = res.data?.total || 0;

            setRows(rowData);
            setTotalRows(total);
        } catch (error) {
            console.error("Failed to fetch orders", error);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, columnFilters, sorting, search]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFilterChange = (columnId: string, value: string) => {
        setColumnFilters((prev) => ({ ...prev, [columnId]: value }));
        setPage(1); // Reset to first page on filter change
    };

    const columns = useMemo<ColumnDef<Record<string, any>>[]>(
        () => [
            {
                accessorKey: "master_order_id",
                header: () => (
                    <div className="flex flex-col gap-2 py-2">
                        <span>Master ID</span>
                        <Input
                            placeholder="Search..."
                            className="h-7 text-xs w-20"
                            value={columnFilters.master_order_id}
                            onChange={(e) => handleFilterChange("master_order_id", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ),
            },
            {
                accessorKey: "account_id",
                header: () => (
                    <div className="flex flex-col gap-2 py-2">
                        <span>Account ID</span>
                        <Input
                            placeholder="Search..."
                            className="h-7 text-xs w-20"
                            value={columnFilters.account_id}
                            onChange={(e) => handleFilterChange("account_id", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ),
            },
            {
                accessorKey: "order_ticket",
                header: () => (
                    <div className="flex flex-col gap-2 py-2">
                        <span>Ticket</span>
                        <Input
                            placeholder="Search..."
                            className="h-7 text-xs w-28"
                            value={columnFilters.order_ticket}
                            onChange={(e) => handleFilterChange("order_ticket", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ),
            },
            {
                accessorKey: "order_symbol",
                header: () => (
                    <div className="flex flex-col gap-2 py-2">
                        <span>Symbol</span>
                        <Input
                            placeholder="Search..."
                            className="h-7 text-xs w-24"
                            value={columnFilters.order_symbol}
                            onChange={(e) => handleFilterChange("order_symbol", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ),
            },
            {
                accessorKey: "order_type",
                header: () => (
                    <div className="flex flex-col gap-2 py-2">
                        <span>Type</span>
                        <Input
                            placeholder="Search..."
                            className="h-7 text-xs w-32"
                            value={columnFilters.order_type}
                            onChange={(e) => handleFilterChange("order_type", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ),
                cell: (info) => {
                    const row = info.row.original;
                    const type = row.order_type as string;
                    const isBuy = type?.includes("BUY") || type === "0";
                    const isClosed = !!row.order_close_at;

                    if (isClosed) return <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5">CLOSED</Badge>;

                    return (
                        <Badge variant={isBuy ? "success" : "destructive"} className="text-[10px] px-1 py-0 h-5">
                            {type?.replace("DEAL_TYPE_", "") || "UNKNOWN"}
                        </Badge>
                    );
                },
            },
            {
                accessorKey: "status",
                header: "Status",
                cell: (info) => {
                    const status = info.getValue() as number;
                    return (
                        <Badge variant={status === 600 || status === 700 || status === 200 ? "success" : "destructive"} className="text-[10px] px-1 py-0 h-5">
                            {status}
                        </Badge>
                    );
                }
            },
            {
                accessorKey: "order_lot",
                header: () => (
                    <div className="flex flex-col gap-2 py-2">
                        <span>Lots</span>
                        <Input
                            placeholder="Search..."
                            className="h-7 text-xs w-20"
                            value={columnFilters.order_lot}
                            onChange={(e) => handleFilterChange("order_lot", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ),
                cell: (info) => (info.getValue() as number)?.toFixed(2),
            },
            {
                accessorKey: "order_price",
                header: "Price",
                cell: (info) => info.getValue() || "-",
            },
            {
                accessorKey: "order_profit",
                header: () => (
                    <div className="flex flex-col gap-2 py-2">
                        <span>Profit</span>
                        <Input
                            placeholder="Search..."
                            className="h-7 text-xs w-20"
                            value={columnFilters.order_profit}
                            onChange={(e) => handleFilterChange("order_profit", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ),
                cell: (info) => {
                    const val = info.getValue() as number;
                    return (
                        <span className={val >= 0 ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                            {val !== undefined && val !== null ? `$${parseFloat(String(val)).toFixed(2)}` : "-"}
                        </span>
                    );
                },
            },
            {
                accessorKey: "created_at",
                header: "Created At",
                cell: (info) => format(new Date(info.getValue() as string), "dd.MM.yyyy HH:mm:ss"),
            },
        ],
        [columnFilters, handleFilterChange]
    );

    return (
        <div className="space-y-4">
            <DataTable
                title="All Orders"
                data={rows}
                columnsConfig={columns}
                pagination={{
                    page,
                    pageSize,
                    totalRows,
                    onPageChange: setPage,
                    onPageSizeChange: setPageSize,
                }}
                searchConfig={{
                    enable: true,
                    text: search,
                    setSearchChange: (val) => {
                        setSearch(val);
                        setPage(1);
                    },
                }}
                sortingConfig={{
                    sorting,
                    setSorting,
                }}
            />
            {loading && (
                <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            )}
        </div>
    );
};

export default OrderTable;
