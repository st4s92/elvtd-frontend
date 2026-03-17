import { useEffect, useState, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "src/components/ui/dialog";
import { DataTable } from "src/components/utilities/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import axiosClient from "src/lib/axios";
import { Badge } from "src/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "src/components/ui/tabs";

interface SlaveOrdersModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    masterOrder: any;
}

const SlaveOrdersModal = ({ open, onOpenChange, masterOrder }: SlaveOrdersModalProps) => {
    const [rows, setRows] = useState<any[]>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("0");

    const fetchData = useCallback(async () => {
        if (!masterOrder?.id) return;
        try {
            const res: any = await axiosClient.get("/trader/orders/paginated", {
                params: {
                    MasterOrderId: masterOrder.id,
                    Page: page,
                    PerPage: pageSize,
                    Search: search,
                    Status: statusFilter !== "0" ? statusFilter : undefined
                }
            });
            if (res.status) {
                setRows(res.data?.data || []);
                setTotalRows(res.data?.total || 0);
            } else {
                console.error("Failed to fetch slave orders:", res.message);
                setRows([]);
                setTotalRows(0);
            }
        } catch (error) {
            console.error("Failed to fetch slave orders", error);
            setRows([]);
            setTotalRows(0);
        }
    }, [masterOrder?.id, page, pageSize, search, statusFilter]);

    useEffect(() => {
        if (open) {
            fetchData();
        }
    }, [open, fetchData]);

    const columns: ColumnDef<Record<string, any>>[] = [
        {
            accessorKey: "order_open_at",
            header: "OPEN TIME",
            cell: ({ row }) => {
                const date = row.original.order_open_at || row.original.created_at;
                return date ? new Date(date).toLocaleString() : "-";
            }
        },
        {
            accessorKey: "order_close_at",
            header: "CLOSE TIME",
            cell: ({ row }) => {
                const date = row.original.order_close_at;
                return date ? new Date(date).toLocaleString() : "-";
            }
        },
        {
            accessorKey: "account",
            header: "SLAVE",
            cell: ({ row }) => {
                const account = row.original.account;
                const workerServer = account?.server_account?.server;
                return (
                    <div className="flex flex-col text-left">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{account?.account_number}</span>
                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 font-mono">ID: {account?.id}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{account?.broker_name}</span>
                            <span>•</span>
                            <span className="text-blue-400/80">{account?.server_name}</span>
                        </div>
                        {workerServer && (
                            <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1 font-mono">
                                <span className="opacity-70 capitalize">Worker:</span>
                                <span>{workerServer.server_name || workerServer.server_ip}</span>
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: "side",
            header: "SIDE/ACTION",
            cell: ({ row }) => {
                const type = row.original.order_type;
                const isBuy = type === "DEAL_TYPE_BUY" || type === "0";
                return (
                    <span className={isBuy ? "text-blue-400" : "text-red-400"}>
                        {isBuy ? "Buy to Open" : "Sell to Open"}
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
            header: "LOT",
            cell: ({ row }) => <span className="font-medium">{row.original.order_lot}</span>
        },
        {
            accessorKey: "order_price",
            header: "PRICE",
            cell: ({ row }) => <span className="font-mono">{row.original.order_price}</span>
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
            accessorKey: "status",
            header: "STATUS",
            cell: ({ row }) => {
                const status = row.original.status;

                let label = "Unknown";
                let variant: "success" | "error" | "warning" | "secondary" | "outline" | "default" = "secondary";

                switch (status) {
                    case 100:
                        label = "None";
                        variant = "secondary";
                        break;
                    case 200:
                        label = "Progress";
                        variant = "warning"; // Orange
                        break;
                    case 300:
                        label = "Failed";
                        variant = "error";
                        break;
                    case 400:
                        label = "Closed";
                        variant = "success";
                        break;
                    case 500:
                        label = "Canceled";
                        variant = "error";
                        break;
                    case 600:
                        label = "Success";
                        variant = "success";
                        break;
                    case 700:
                        label = "Complete";
                        variant = "success";
                        break;
                }

                return (
                    <div className="flex items-center gap-2">
                        <Badge variant={variant}>
                            {label}
                        </Badge>
                        {status === 200 && row.original.copy_message && (
                            <span className="text-xs font-medium text-gray-400">
                                {row.original.copy_message}
                            </span>
                        )}
                    </div>
                );
            }
        }
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[100vw] w-screen h-screen m-0 rounded-none bg-[#0b1120] border-none text-white overflow-y-auto p-0 flex flex-col">
                <div className="p-8 flex-1 flex flex-col min-h-0">
                    <DialogHeader className="mb-6 flex flex-row items-center justify-between">
                        <DialogTitle className="text-xl font-bold uppercase tracking-tight">Master Order</DialogTitle>
                    </DialogHeader>

                    {/* Master Info Strip */}
                    <div className="grid grid-cols-11 gap-4 mb-8 text-xs uppercase text-gray-400 font-medium">
                        <div className="col-span-1 flex flex-col gap-1">
                            <span>Open Time</span>
                            <span className="text-white text-sm">
                                {masterOrder?.order_open_at ? new Date(masterOrder.order_open_at).toLocaleString() : "-"}
                            </span>
                        </div>
                        <div className="col-span-1 flex flex-col gap-1">
                            <span>Close Time</span>
                            <span className="text-white text-sm">
                                {masterOrder?.order_close_at ? new Date(masterOrder.order_close_at).toLocaleString() : "-"}
                            </span>
                        </div>
                        <div className="col-span-2 flex flex-col gap-1">
                            <span>Master</span>
                            <div className="flex flex-col">
                                <span className="text-white text-sm font-semibold">
                                    {masterOrder?.account?.account_number}
                                </span>
                                <span className="text-gray-500 text-[10px]">
                                    {masterOrder?.account?.broker_name}
                                </span>
                            </div>
                        </div>
                        <div className="col-span-1 flex flex-col gap-1">
                            <span>Slaves</span>
                            <span className="text-white text-sm font-semibold">
                                {masterOrder?.slave_success_count || 0}/{masterOrder?.slave_count || 0}
                            </span>
                        </div>
                        <div className="col-span-1 flex flex-col gap-1">
                            <span>Master Tkt</span>
                            <span className="text-white text-sm font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 w-fit">
                                {masterOrder?.order_ticket}
                            </span>
                        </div>
                        <div className="col-span-1 flex flex-col gap-1">
                            <span>Side/Action</span>
                            <span className={String(masterOrder?.order_type)?.includes("BUY") ? "text-blue-400 text-sm" : "text-red-400 text-sm"}>
                                {String(masterOrder?.order_type)?.includes("BUY") ? "Buy to Open" : "Sell to Open"}
                            </span>
                        </div>
                        <div className="col-span-1 flex flex-col gap-1">
                            <span>Symbol</span>
                            <span className="text-white text-sm">{masterOrder?.order_symbol}</span>
                        </div>
                        <div className="col-span-1 flex flex-col gap-1">
                            <span>Lot</span>
                            <span className="text-white text-sm">{masterOrder?.order_lot}</span>
                        </div>
                        <div className="col-span-1 flex flex-col gap-1">
                            <span>Price</span>
                            <span className="text-white text-sm">{masterOrder?.order_price}</span>
                        </div>
                        <div className="col-span-1 flex flex-col gap-1">
                            <span>Profit</span>
                            <span className={`text-sm font-bold ${masterOrder?.order_profit > 0 ? "text-success" : masterOrder?.order_profit < 0 ? "text-error" : "text-white"}`}>
                                {masterOrder?.order_profit !== undefined && masterOrder?.order_profit !== null ? `$${Number(masterOrder.order_profit).toFixed(2)}` : "-"}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <h4 className="text-lg font-bold uppercase tracking-tight">Slaves Orders</h4>

                            <Tabs value={statusFilter} onValueChange={val => { setStatusFilter(val); setPage(1); }} className="w-full md:w-auto">
                                <TabsList className="bg-white/5 border border-white/10 h-9 p-0.5">
                                    <TabsTrigger value="0" className="px-3 h-8 text-[11px] uppercase tracking-wider">All</TabsTrigger>
                                    <TabsTrigger value="200" className="px-3 h-8 text-[11px] uppercase tracking-wider data-[state=active]:bg-warning/20 data-[state=active]:text-warning">Progress</TabsTrigger>
                                    <TabsTrigger value="600" className="px-3 h-8 text-[11px] uppercase tracking-wider data-[state=active]:bg-success/20 data-[state=active]:text-success">Success</TabsTrigger>
                                    <TabsTrigger value="700" className="px-3 h-8 text-[11px] uppercase tracking-wider data-[state=active]:bg-success/20 data-[state=active]:text-success">Complete</TabsTrigger>
                                    <TabsTrigger value="400" className="px-3 h-8 text-[11px] uppercase tracking-wider data-[state=active]:bg-success/20 data-[state=active]:text-success">Closed</TabsTrigger>
                                    <TabsTrigger value="300" className="px-3 h-8 text-[11px] uppercase tracking-wider data-[state=active]:bg-error/20 data-[state=active]:text-error">Failed</TabsTrigger>
                                    <TabsTrigger value="500" className="px-3 h-8 text-[11px] uppercase tracking-wider data-[state=active]:bg-error/20 data-[state=active]:text-error">Canceled</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <div className="w-full">
                            <DataTable
                                title="Slave Orders"
                                data={rows}
                                columnsConfig={columns}
                                searchConfig={{
                                    enable: true,
                                    text: search,
                                    setSearchChange: setSearch
                                }}
                                pagination={{
                                    page,
                                    pageSize,
                                    totalRows,
                                    onPageChange: setPage,
                                    onPageSizeChange: setPageSize
                                }}
                                downloadConfig={{ enable: false }}
                            />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SlaveOrdersModal;
