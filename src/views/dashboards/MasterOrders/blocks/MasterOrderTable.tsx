import { useCallback, useEffect, useState } from "react";
import { DataTable } from "src/components/utilities/table/DataTable";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import axiosClient from "src/lib/axios";
import { Badge } from "src/components/ui/badge";
import SlaveOrdersModal from "./SlaveOrdersModal";

const MasterOrderTable = () => {
    const [rows, setRows] = useState<any[]>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");
    const [sorting, setSorting] = useState<SortingState>([{ id: "order_open_at", desc: true }]);

    // Modal state
    const [selectedMaster, setSelectedMaster] = useState<any>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        const params: any = {
            IsMasterOnly: true,
            Page: page,
            PerPage: pageSize,
            Search: search,
        };

        if (sorting && sorting.length > 0) {
            params.SortBy = sorting[0].id;
            params.SortOrder = sorting[0].desc ? "desc" : "asc";
        }

        try {
            const res: any = await axiosClient.get("/trader/orders/paginated", { params });
            if (res.status) {
                setRows(res.data?.data || []);
                setTotalRows(res.data?.total || 0);
            } else {
                console.error("Failed to fetch master orders:", res.message);
                setRows([]);
                setTotalRows(0);
            }
        } catch (error) {
            console.error("Failed to fetch master orders", error);
            setRows([]);
            setTotalRows(0);
        }
    }, [page, pageSize, search, sorting]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // refresh every 10s
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleRowClick = (row: any) => {
        setSelectedMaster(row);
        setModalOpen(true);
    };

    const columns: ColumnDef<Record<string, any>>[] = [
        {
            accessorKey: "order_open_at",
            header: "DATE/TIME",
            cell: ({ row }) => {
                const date = row.original.order_open_at || row.original.created_at;
                return date ? new Date(date).toLocaleString() : "-";
            }
        },
        {
            accessorKey: "account",
            header: "MASTER",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium text-white">{row.original.account?.account_number}</span>
                    <span className="text-xs text-gray-400">{row.original.account?.broker_name}</span>
                </div>
            )
        },
        {
            accessorKey: "order_ticket",
            header: "MASTER TKT",
        },
        {
            accessorKey: "order_type",
            header: "SIDE/ACTION",
            cell: ({ row }) => {
                const type = row.original.order_type;
                const isBuy = type === "DEAL_TYPE_BUY" || type === "0";
                const isClosed = !!row.original.order_close_at;

                if (isClosed) return <span className="text-red-500 font-medium whitespace-nowrap">Closed</span>;
                return (
                    <span className={isBuy ? "text-blue-400 font-medium whitespace-nowrap" : "text-red-400 font-medium whitespace-nowrap"}>
                        {isBuy ? "Master Buy" : "Master Sell"}
                    </span>
                );
            }
        },
        {
            accessorKey: "order_symbol",
            header: "SYMBOL",
        },
        {
            accessorKey: "order_lot",
            header: "AMOUNT",
        },
        {
            header: "NOTIONAL USD",
            cell: ({ row }) => {
                const vol = row.original.order_lot || 0;
                const price = row.original.order_price || 0;
                return <span>{(vol * price).toFixed(0)}</span>;
            }
        },
        {
            accessorKey: "order_price",
            header: "PRICE",
        },
        {
            accessorKey: "order_profit",
            header: "PROFIT",
            cell: ({ row }) => {
                const profit = row.original.order_profit;
                return (
                    <span className={`font-mono font-bold ${profit > 0 ? "text-success" : profit < 0 ? "text-error" : "text-gray-400"}`}>
                        {profit !== undefined && profit !== null ? `$${parseFloat(profit).toFixed(2)}` : "-"}
                    </span>
                );
            }
        },
        {
            header: "COPIED ON",
            cell: ({ row }) => (
                <Badge className="bg-blue-600/30 text-blue-300 border-none rounded-md px-2 py-0.5">
                    {row.original.slave_count || 0} Slaves
                </Badge>
            )
        },
        {
            header: "AVG LAG",
            cell: ({ row }) => <span className="text-gray-300 font-mono text-xs">{row.original.average_execution_lag ?? 0}ms</span>
        },
        {
            header: "MAX LAG",
            cell: ({ row }) => <span className="text-gray-300 font-mono text-xs">{row.original.max_execution_lag ?? 0}ms</span>
        },
        {
            header: "STATUS",
            cell: ({ row }) => {
                const status = row.original.status;
                const successCnt = row.original.slave_success_count || 0;
                const failCnt = row.original.slave_failure_count || 0;

                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Master Status:</span>
                            <Badge className={`${status === 200 || status === 600 || status === 700 ? "bg-success/20 text-success" : "bg-error/20 text-error"} border-none rounded-md px-1.5 py-0.5 text-[10px]`}>
                                {status}
                            </Badge>
                        </div>
                        <div className="flex gap-1.5 mt-0.5">
                            {successCnt > 0 && (
                                <Badge className="bg-success/20 text-success border-none rounded-md px-1.5 py-0.5 text-[10px] whitespace-nowrap">
                                    {successCnt} OK
                                </Badge>
                            )}
                            {failCnt > 0 && (
                                <Badge className="bg-error/20 text-error border-none rounded-md px-1.5 py-0.5 text-[10px] whitespace-nowrap">
                                    {failCnt} ERR
                                </Badge>
                            )}
                        </div>
                    </div>
                );
            }
        }
    ];

    return (
        <div className="w-full">
            <DataTable
                title="Master Orders"
                data={rows}
                columnsConfig={columns}
                searchConfig={{
                    enable: true,
                    text: search,
                    setSearchChange: (val) => {
                        setSearch(val);
                        setPage(1);
                    }
                }}
                pagination={{
                    page,
                    pageSize,
                    totalRows,
                    onPageChange: setPage,
                    onPageSizeChange: (size) => {
                        setPageSize(size);
                        setPage(1);
                    }
                }}
                sortingConfig={{
                    sorting,
                    setSorting
                }}
                downloadConfig={{ enable: false }}
                onRowClick={handleRowClick}
            />

            <SlaveOrdersModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                masterOrder={selectedMaster}
            />
        </div>
    );
};

export default MasterOrderTable;
