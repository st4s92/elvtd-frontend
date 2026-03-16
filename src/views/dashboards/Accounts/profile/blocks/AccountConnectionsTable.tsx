import { useEffect, useState } from "react";
import axiosClient from "src/lib/axios";
import { DataTable } from "src/components/utilities/table/DataTable";
import { Badge } from "src/components/ui/badge";

const AccountConnectionsTable = ({ accountId, role }: { accountId: number, role: string }) => {
    const [connections, setConnections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchConnections = async () => {
        try {
            setLoading(true);
            const queryParam = role === "MASTER" ? `MasterId=${accountId}` : `SlaveId=${accountId}`;
            const res = await axiosClient.get(`/trader/master-slave?${queryParam}`);
            console.log("Connections Data:", res.data);
            setConnections(res.data || []);
        } catch (error) {
            console.error("Failed to fetch connections", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (accountId && role) {
            fetchConnections();
        }
    }, [accountId, role]);

    const columns = [
        {
            accessorKey: "name",
            header: "Connection Name"
        },
        {
            header: "Linked Account",
            cell: ({ row }: any) => {
                const conn = row.original;
                // Try to extract account info - guessing the structure based on typical relations
                const linkedAccount = role === "MASTER" ? conn.slaveAccount : conn.masterAccount;
                if (!linkedAccount) return `ID: ${role === "MASTER" ? conn.slaveId : conn.masterId}`;
                return `${linkedAccount.platformName || ''} - ${linkedAccount.serverName || ''} - ${linkedAccount.accountNumber || ''}`;
            }
        },
        {
            header: "Multiplier",
            cell: ({ row }: any) => {
                const configs = row.original.configs || [];
                if (configs.length > 0) return `${configs[0].multiplier}x`;
                return "-";
            }
        },
        {
            header: "Pairs Configuration",
            cell: ({ row }: any) => {
                const pairs = row.original.pairs || [];
                if (pairs.length === 0) return <Badge variant="secondary">All Symbols</Badge>;
                return (
                    <div className="flex flex-wrap gap-1">
                        {pairs.map((p: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                                {p.masterPair} ➔ {p.slavePair}
                            </Badge>
                        ))}
                    </div>
                );
            }
        }
    ];

    if (loading) {
        return <div className="text-gray-400 p-6">Loading connections...</div>;
    }

    if (connections.length === 0) {
        return <div className="text-gray-500 italic p-6">No connections found.</div>;
    }

    return (
        <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 shadow-sm">
            <h4 className="font-semibold text-lg text-white mb-6">
                {role === "MASTER" ? "Connected Slave Accounts" : "Connected Master Accounts"}
            </h4>
            <div className="overflow-x-auto">
                <DataTable
                    title=""
                    data={connections}
                    columnsConfig={columns}
                    downloadConfig={{ enable: false }}
                    searchConfig={{ enable: false, text: "", setSearchChange: () => {} }}
                    pagination={{
                        page: 1,
                        pageSize: 100,
                        totalRows: connections.length,
                        onPageChange: () => {},
                        onPageSizeChange: () => {}
                    }}
                />
            </div>
        </div>
    );
};

export default AccountConnectionsTable;
