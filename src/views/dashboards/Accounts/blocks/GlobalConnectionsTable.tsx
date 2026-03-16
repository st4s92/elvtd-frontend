import { useEffect, useState } from "react";
import axiosClient from "src/lib/axios";
import { DataTable } from "src/components/utilities/table/DataTable";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Trash2 } from "lucide-react";

const GlobalConnectionsTable = () => {
    const [connections, setConnections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchConnections = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get(`/trader/master-slave`);
            setConnections(res.data || []);
        } catch (error) {
            console.error("Failed to fetch connections", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this connection?")) return;

        try {
            await axiosClient.delete(`/trader/master-slave/${id}`);
            alert("Connection deleted successfully");
            fetchConnections();
        } catch (error) {
            console.error("Failed to delete connection", error);
            alert("Failed to delete connection");
        }
    };

    useEffect(() => {
        fetchConnections();
    }, []);

    const columns = [
        {
            accessorKey: "name",
            header: "Connection Name"
        },
        {
            header: "Master Account",
            cell: ({ row }: any) => {
                const conn = row.original;
                const masterAccount = conn.masterAccount;
                if (!masterAccount) return `ID: ${conn.masterId}`;
                return (
                    <div className="flex flex-col">
                        <span className="font-semibold text-white">{masterAccount.accountNumber || masterAccount.id}</span>
                        <span className="text-xs text-gray-500">{masterAccount.serverName}</span>
                    </div>
                );
            }
        },
        {
            header: "Slave Account",
            cell: ({ row }: any) => {
                const conn = row.original;
                const slaveAccount = conn.slaveAccount;
                if (!slaveAccount) return `ID: ${conn.slaveId}`;
                return (
                    <div className="flex flex-col">
                        <span className="font-semibold text-white">{slaveAccount.accountNumber || slaveAccount.id}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{slaveAccount.serverName}</span>
                            {slaveAccount.copier_version && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-primary/20 text-primary/70">
                                    v{slaveAccount.copier_version}
                                </Badge>
                            )}
                        </div>
                    </div>
                );
            }
        },
        {
            header: "Multiplier",
            cell: ({ row }: any) => {
                const configs = row.original.configs || [];
                if (configs.length > 0) return <Badge variant="secondary">{configs[0].multiplier}x</Badge>;
                return "-";
            }
        },
        {
            header: "Pairs",
            cell: ({ row }: any) => {
                const pairs = row.original.pairs || [];
                if (pairs.length === 0) return <Badge variant="outline">All Symbols</Badge>;
                return (
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {pairs.map((p: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0">
                                {p.masterPair}➔{p.slavePair}
                            </Badge>
                        ))}
                    </div>
                );
            }
        },
        {
            header: "Actions",
            id: "actions",
            cell: ({ row }: any) => {
                const conn = row.original;
                return (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-500 hover:text-red-500 hover:bg-red-500/10 h-8 w-8"
                        onClick={() => handleDelete(conn.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                );
            }
        }
    ];

    return (
        <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 shadow-sm mt-8 border border-white/5">
            <h4 className="font-semibold text-lg text-white mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Active Copy Trading Connections
            </h4>
            <div className="w-full overflow-x-auto">
                <DataTable
                    title=""
                    data={connections}
                    columnsConfig={columns}
                    downloadConfig={{ enable: false }}
                    searchConfig={{ enable: false, text: "", setSearchChange: () => { } }}
                    pagination={{
                        page: 1,
                        pageSize: 100,
                        totalRows: connections.length,
                        onPageChange: () => { },
                        onPageSizeChange: () => { }
                    }}
                />
            </div>
            {connections.length === 0 && !loading && (
                <div className="text-gray-500 italic p-6 text-center">No active connections established yet.</div>
            )}
            {loading && (
                <div className="text-gray-400 p-6 text-center">Loading connections...</div>
            )}
        </div>
    );
};

export default GlobalConnectionsTable;
