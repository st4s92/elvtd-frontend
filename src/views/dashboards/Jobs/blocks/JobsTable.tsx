import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "src/components/utilities/table/DataTable";
import { useEffect, useState, useRef } from "react";
import axiosClient from "src/lib/axios";
import { Input } from "src/components/ui/input";
import { Badge } from "src/components/ui/badge";

const JobsTable = () => {
    const [rows, setRows] = useState<Record<string, any>[]>([]);
    const [totalRows, setTotalRows] = useState(0);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Filters
    const [search, setSearch] = useState<string>("");
    const [accountNumber, setAccountNumber] = useState<string>("");
    const [category, setCategory] = useState<string>("");
    const [action, setAction] = useState<string>("");
    const [level, setLevel] = useState<string>("");

    // Auto-refresh
    const [autoRefresh, setAutoRefresh] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchData = async () => {
        try {
            const res = await axiosClient.get("/logs/paginated", {
                params: {
                    PerPage: pageSize,
                    Page: page,
                    Search: search || undefined,
                    AccountNumber: accountNumber ? parseInt(accountNumber) : undefined,
                    Category: category || undefined,
                    Action: action || undefined,
                    Level: level || undefined,
                },
            });

            setRows(res.data.data);
            setTotalRows(res.data.total);
        } catch (error) {
            console.error("Error fetching jobs:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, pageSize, search, accountNumber, category, action, level]);

    // Auto-refresh every 5 seconds
    useEffect(() => {
        if (autoRefresh) {
            intervalRef.current = setInterval(fetchData, 5000);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [autoRefresh, page, pageSize, search, accountNumber, category, action, level]);

    // Action options based on selected category
    const actionOptions = category === "CopyTrade"
        ? ["MasterOpen", "MasterClose", "SlaveCopy", "SlaveClose", "SlaveConfirm", "ActiveOrder", "SyncActive", "Error"]
        : [];

    const columns: ColumnDef<Record<string, any>>[] = [
        {
            accessorKey: "createdAt",
            header: "Timestamp",
            cell: ({ row }) => {
                const date = new Date(row.original.createdAt);
                return <span className="whitespace-nowrap">{date.toLocaleDateString('de-DE')} {date.toLocaleTimeString('de-DE')}</span>;
            }
        },
        {
            accessorKey: "level",
            header: "Level",
            cell: ({ row }) => {
                const value = row.original.level;
                let variant: "default" | "destructive" | "warning" | "success" | "secondary" = "default";
                if (value === "Error") variant = "destructive";
                if (value === "Warning") variant = "warning";
                if (value === "Info") variant = "secondary";
                return <Badge variant={variant}>{value}</Badge>;
            }
        },
        {
            accessorKey: "category",
            header: "Category",
            cell: ({ row }) => {
                const cat = row.original.category;
                const isCopyTrade = cat === "CopyTrade";
                return (
                    <span className={`font-semibold ${isCopyTrade ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                        {cat}
                    </span>
                );
            }
        },
        {
            accessorKey: "action",
            header: "Action",
            cell: ({ row }) => {
                const act = row.original.action;
                let variant: "default" | "destructive" | "warning" | "success" | "secondary" | "outline" = "outline";
                if (act === "MasterOpen" || act === "SlaveCopy") variant = "success";
                if (act === "MasterClose" || act === "SlaveClose") variant = "warning";
                if (act === "SlaveConfirm") variant = "default";
                if (act === "Error") variant = "destructive";
                return <Badge variant={variant}>{act}</Badge>;
            }
        },
        {
            accessorKey: "accountNumber",
            header: "Account #",
            cell: ({ row }) => {
                return row.original.accountNumber ? (
                    <span className="text-primary font-mono">{row.original.accountNumber}</span>
                ) : (
                    <span className="text-gray-400">-</span>
                );
            }
        },
        {
            accessorKey: "serverName",
            header: "Server",
            cell: ({ row }) => {
                return <span>{row.original.serverName || '-'}</span>;
            }
        },
        {
            accessorKey: "message",
            header: "Message",
            cell: ({ row }) => {
                const msg = row.original.message || "";
                // Parse key=value pairs for better readability
                const parts = msg.split(/\s+(?=\w+=)/);
                if (parts.length > 1) {
                    return (
                        <div className="text-sm space-y-0.5 max-w-[500px]">
                            {parts.map((part: string, i: number) => {
                                const [key, ...rest] = part.split("=");
                                const val = rest.join("=");
                                if (val) {
                                    return (
                                        <span key={i} className="inline-block mr-2">
                                            <span className="text-gray-400">{key}=</span>
                                            <span className="font-mono text-gray-800 dark:text-gray-200">{val}</span>
                                        </span>
                                    );
                                }
                                return <span key={i} className="text-sm">{part} </span>;
                            })}
                        </div>
                    );
                }
                return <span className="text-sm">{msg}</span>;
            }
        },
    ];

    return (
        <>
            <div className="flex gap-6 flex-col">
                {/* Filters Section */}
                <div className="flex flex-wrap gap-4 p-4 bg-white dark:bg-dark border rounded-xl shadow-sm items-end">
                    <div className="w-full md:w-auto flex-1 min-w-[200px]">
                        <label className="text-xs font-semibold mb-1 block text-gray-500">Search Message</label>
                        <Input
                            placeholder="Search in message..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="w-full md:w-auto min-w-[130px]">
                        <label className="text-xs font-semibold mb-1 block text-gray-500">Account #</label>
                        <Input
                            placeholder="123456"
                            type="number"
                            value={accountNumber}
                            onChange={(e) => { setAccountNumber(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="w-full md:w-auto min-w-[150px]">
                        <label className="text-xs font-semibold mb-1 block text-gray-500">Category</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                            value={category}
                            onChange={(e) => { setCategory(e.target.value); setAction(""); setPage(1); }}
                        >
                            <option value="">All</option>
                            <option value="CopyTrade">CopyTrade</option>
                            <option value="Account">Account</option>
                            <option value="MasterSlave">MasterSlave</option>
                        </select>
                    </div>
                    <div className="w-full md:w-auto min-w-[150px]">
                        <label className="text-xs font-semibold mb-1 block text-gray-500">Action</label>
                        {actionOptions.length > 0 ? (
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                value={action}
                                onChange={(e) => { setAction(e.target.value); setPage(1); }}
                            >
                                <option value="">All</option>
                                {actionOptions.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ) : (
                            <Input
                                placeholder="e.g. Create"
                                value={action}
                                onChange={(e) => { setAction(e.target.value); setPage(1); }}
                            />
                        )}
                    </div>
                    <div className="w-full md:w-auto min-w-[120px]">
                        <label className="text-xs font-semibold mb-1 block text-gray-500">Level</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                            value={level}
                            onChange={(e) => { setLevel(e.target.value); setPage(1); }}
                        >
                            <option value="">All</option>
                            <option value="Info">Info</option>
                            <option value="Warning">Warning</option>
                            <option value="Error">Error</option>
                        </select>
                    </div>
                    <div className="w-full md:w-auto min-w-[120px]">
                        <label className="text-xs font-semibold mb-1 block text-gray-500">Auto-Refresh</label>
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`flex h-10 w-full items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                                autoRefresh
                                    ? "bg-green-500 text-white border-green-600 hover:bg-green-600"
                                    : "bg-background border-input text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                        >
                            {autoRefresh ? "Live" : "Off"}
                        </button>
                    </div>
                </div>

                {/* Table Section */}
                <div className="w-full overflow-x-auto">
                    <DataTable
                        title="Jobs List"
                        data={rows}
                        columnsConfig={columns}
                        downloadConfig={{
                            enable: false,
                        }}
                        searchConfig={{
                            enable: false,
                            text: "",
                            setSearchChange: () => { }
                        }}
                        pagination={{
                            page,
                            pageSize,
                            totalRows,
                            onPageChange: setPage,
                            onPageSizeChange: (size) => {
                                setPageSize(size);
                                setPage(1);
                            },
                        }}
                    />
                </div>
            </div>
        </>
    );
};

export default JobsTable;
