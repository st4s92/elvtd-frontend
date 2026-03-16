import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "src/components/utilities/table/DataTable";
import { useEffect, useState } from "react";
import axiosClient from "src/lib/axios";
import { Input } from "src/components/ui/input";
import { Badge } from "src/components/ui/badge";


const LogsTable = () => {
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
            console.error("Error fetching logs:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, pageSize, search, accountNumber, category, action, level]);

    const columns: ColumnDef<Record<string, any>>[] = [
        {
            accessorKey: "createdAt",
            header: "Timestamp",
            cell: ({ row }) => {
                const date = new Date(row.original.createdAt);
                return <span>{date.toLocaleDateString('de-DE')} {date.toLocaleTimeString('de-DE')}</span>;
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
                return <span className="font-semibold text-gray-700 dark:text-gray-300">{row.original.category}</span>;
            }
        },
        {
            accessorKey: "action",
            header: "Action",
            cell: ({ row }) => {
                return <Badge variant="outline">{row.original.action}</Badge>;
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
                return <span className="text-sm">{row.original.message}</span>;
            }
        },
    ];

    return (
        <>
            <div className="flex gap-6 flex-col">
                {/* Filters Section */}
                <div className="flex flex-wrap gap-4 p-4 bg-white dark:bg-dark border rounded-xl shadow-sm">
                    <div className="w-full md:w-auto flex-1 min-w-[200px]">
                        <label className="text-xs font-semibold mb-1 block text-gray-500">Search Message</label>
                        <Input
                            placeholder="Search in message..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="w-full md:w-auto min-w-[150px]">
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
                        <Input
                            placeholder="e.g. Account"
                            value={category}
                            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="w-full md:w-auto min-w-[150px]">
                        <label className="text-xs font-semibold mb-1 block text-gray-500">Action</label>
                        <Input
                            placeholder="e.g. Create"
                            value={action}
                            onChange={(e) => { setAction(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="w-full md:w-auto min-w-[150px]">
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
                </div>

                {/* Table Section */}
                <div className="w-full overflow-x-auto">
                    <DataTable
                        title="System Logs"
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

export default LogsTable;
