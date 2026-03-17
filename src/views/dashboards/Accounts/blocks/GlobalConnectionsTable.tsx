import { useEffect, useState } from "react";
import axiosClient from "src/lib/axios";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Trash2, ChevronDown, ChevronRight, Activity, Server } from "lucide-react";
import React from "react";

const GlobalConnectionsTable = () => {
    const [connections, setConnections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});

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

    const toggleExpand = (masterId: number) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [masterId]: !prev[masterId]
        }));
    };

    useEffect(() => {
        fetchConnections();
    }, []);

    // Group connections by masterAccount
    const groupedConnections = React.useMemo(() => {
        const groups: Record<number, { master: any, connections: any[] }> = {};
        
        connections.forEach(conn => {
            const masterId = conn.masterId;
            if (!groups[masterId]) {
                groups[masterId] = {
                    master: conn.masterAccount || { id: masterId, account_number: "Unknown", server_name: "Unknown" },
                    connections: []
                };
            }
            groups[masterId].connections.push(conn);
        });
        
        return Object.values(groups);
    }, [connections]);

    return (
        <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 shadow-sm mt-8 border border-white/5">
            <h4 className="font-semibold text-lg text-white mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Active Copy Trading Connections
            </h4>
            
            <div className="w-full overflow-hidden rounded-xl border border-white/10">
                {/* Custom Header */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-white/5 text-sm font-semibold text-white/70 border-b border-white/10">
                    <div className="col-span-5 md:col-span-4 flex items-center pl-2">Master Account</div>
                    <div className="col-span-3 md:col-span-2 hidden md:flex items-center">Balance</div>
                    <div className="col-span-4 md:col-span-3 flex items-center">Slave Summary</div>
                    <div className="col-span-3 text-right">Actions</div>
                </div>

                {/* Body */}
                <div className="flex flex-col">
                    {groupedConnections.map((group) => {
                        const master = group.master;
                        const slavesCount = group.connections.length;
                        const inactiveSlaves = group.connections.filter(c => c.slaveAccount?.status !== 200).length;
                        const isExpanded = !!expandedGroups[master.id];

                        return (
                            <React.Fragment key={master.id}>
                                {/* Master Row (Parent) */}
                                <div 
                                    className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors cursor-pointer border-b border-white/5 hover:bg-white/5 ${isExpanded ? 'bg-white/5' : ''}`}
                                    onClick={() => toggleExpand(master.id)}
                                >
                                    <div className="col-span-5 md:col-span-4 flex items-center gap-3 pl-2">
                                        <div className="text-primary/70">
                                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-primary/20 flex flex-shrink-0 items-center justify-center text-primary font-bold shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
                                            M
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-white text-base">
                                                {master.account_number || master.id}
                                            </span>
                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                <Server size={12} /> {master.server_name}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="col-span-3 md:col-span-2 hidden md:flex flex-col justify-center">
                                        <span className="font-medium text-white/90">
                                            ${master.balance?.toLocaleString() || "0.00"}
                                        </span>
                                        <span className="text-[10px] text-gray-500 uppercase">Equity: ${master.equity?.toLocaleString() || "0"}</span>
                                    </div>

                                    <div className="col-span-4 md:col-span-3 flex flex-col justify-center gap-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs py-0.5 border-primary/30 text-primary bg-primary/5">
                                                {slavesCount} Slaves
                                            </Badge>
                                        </div>
                                        {inactiveSlaves > 0 && (
                                            <div className="text-[10px] text-red-400 flex items-center gap-1">
                                                <Activity size={10} /> {inactiveSlaves} inactive
                                            </div>
                                        )}
                                        {inactiveSlaves === 0 && slavesCount > 0 && (
                                            <div className="text-[10px] text-green-400 flex items-center gap-1">
                                                <Activity size={10} /> All active
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-span-3 flex justify-end items-center pr-2">
                                        <Button 
                                            variant="secondary" 
                                            size="sm"
                                            className="h-8 text-xs bg-white/10 hover:bg-white/20"
                                            onClick={(e) => { e.stopPropagation(); toggleExpand(master.id); }}
                                        >
                                            {isExpanded ? 'Hide' : 'View'}
                                        </Button>
                                    </div>
                                </div>

                                {/* Slaves Sub-Table (Expanded) */}
                                {isExpanded && (
                                    <div className="col-span-12 bg-black/20 p-4 border-b border-white/5 animate-in slide-in-from-top-2 duration-200">
                                        <div className="ml-10 rounded-xl overflow-hidden border border-white/10 shadow-inner bg-card/30">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-white/5 text-white/60 text-xs">
                                                    <tr>
                                                        <th className="px-4 py-3 font-medium">Slave Account</th>
                                                        <th className="px-4 py-3 font-medium">Multiplier</th>
                                                        <th className="px-4 py-3 font-medium">Pairs</th>
                                                        <th className="px-4 py-3 font-medium text-right">Delete</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {group.connections.map(conn => {
                                                        const slave = conn.slaveAccount || { id: conn.slaveId, account_number: "Unknown", server_name: "Unknown" };
                                                        const configs = conn.configs || [];
                                                        const pairs = conn.pairs || [];
                                                        
                                                        return (
                                                            <tr key={conn.id} className="hover:bg-white/5 transition-colors">
                                                                <td className="px-4 py-3">
                                                                    <div className="flex flex-col">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-semibold text-white/90">{slave.account_number || slave.id}</span>
                                                                            {slave.status !== 200 && (
                                                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Connection Error/Inactive" />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-[11px] text-gray-500">{slave.server_name}</span>
                                                                            {slave.copier_version && (
                                                                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-primary/20 text-primary/70">
                                                                                    v{slave.copier_version}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {configs.length > 0 ? (
                                                                        <Badge variant="secondary" className="bg-white/10 text-white/80">{configs[0].multiplier}x</Badge>
                                                                    ) : "-"}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {pairs.length === 0 ? (
                                                                        <Badge variant="outline" className="border-white/20 text-white/60">All Symbols</Badge>
                                                                    ) : (
                                                                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                                            {pairs.map((p: any, idx: number) => (
                                                                                <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary/80">
                                                                                    {p.masterPair}➔{p.slavePair}
                                                                                </Badge>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 h-7 w-7"
                                                                        onClick={() => handleDelete(conn.id)}
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                    
                    {groupedConnections.length === 0 && !loading && (
                        <div className="text-gray-500 italic p-8 text-center border-b border-white/5">
                            No active connections established yet.
                        </div>
                    )}
                    
                    {loading && (
                        <div className="text-gray-400 p-8 text-center flex flex-col items-center justify-center gap-3">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            Loading connections...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalConnectionsTable;
