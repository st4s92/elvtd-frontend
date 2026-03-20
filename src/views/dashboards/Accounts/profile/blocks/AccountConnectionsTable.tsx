import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "src/lib/axios";
import { Icon } from "@iconify/react";

const AccountConnectionsTable = ({ accountId, role }: { accountId: number, role: string }) => {
    const navigate = useNavigate();
    const [connections, setConnections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(true);

    const fetchConnections = async () => {
        try {
            setLoading(true);
            const queryParam = role === "MASTER" ? `MasterId=${accountId}` : `SlaveId=${accountId}`;
            const res = await axiosClient.get(`/trader/master-slave?${queryParam}`);
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

    if (loading) {
        return <div className="text-gray-400 p-6 animate-pulse">Loading connections...</div>;
    }

    if (connections.length === 0) {
        return null;
    }

    return (
        <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl shadow-sm border border-white/5 overflow-hidden transition-all duration-300">
            {/* Header / Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-8 py-6 flex items-center justify-between hover:bg-white/5 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                        <Icon icon="solar:users-group-two-rounded-bold" height={24} />
                    </div>
                    <div className="text-left">
                        <h4 className="font-bold text-lg text-white">
                            {role === "MASTER" ? "Connected Slave Accounts" : "Connected Master Accounts"}
                        </h4>
                        <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">
                            {connections.length} active connection{connections.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className={`p-2 rounded-full bg-white/5 text-gray-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <Icon icon="solar:alt-arrow-down-bold" height={20} />
                </div>
            </button>

            {/* Content */}
            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <div className="px-8 pb-8">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-[10px] uppercase text-gray-500 font-black tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="px-4 py-4 min-w-[150px]">Linked Account</th>
                                    <th className="px-4 py-4 text-center">Status</th>
                                    <th className="px-4 py-4 text-right">Balance</th>
                                    <th className="px-4 py-4 text-right">Equity</th>
                                    <th className="px-4 py-4 text-right">Profit/Loss</th>
                                    <th className="px-4 py-4 text-center">Multiplier</th>
                                    <th className="px-4 py-4">Pairs</th>
                                    <th className="px-4 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {connections.map((conn) => {
                                    const linkedAcc = role === "MASTER" ? conn.slaveAccount : conn.masterAccount;
                                    const linkedId = role === "MASTER" ? conn.slaveId : conn.masterId;
                                    
                                    if (!linkedAcc) return (
                                        <tr key={conn.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-6 text-gray-500 italic" colSpan={8}>
                                                Account ID: {linkedId} (Data pending...)
                                            </td>
                                        </tr>
                                    );

                                    const balance = Number(linkedAcc.balance ?? 0);
                                    const equity = Number(linkedAcc.equity ?? 0);
                                    const profit = (equity - balance);
                                    const isProfit = profit >= 0;
                                    const isRunning = linkedAcc.status === 200;

                                    return (
                                        <tr key={conn.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-4 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold text-base leading-tight">
                                                        {linkedAcc.accountNumber || linkedAcc.account_number}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-tighter mt-1">
                                                        {linkedAcc.brokerName || linkedAcc.broker_name || 'Broker'} • {linkedAcc.serverName || linkedAcc.server_name || 'Server'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-6 text-center">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest ${
                                                    isRunning ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20" : "bg-red-600/10 text-red-400 border border-red-500/20"
                                                }`}>
                                                    <div className={`w-1 h-1 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                                                    {isRunning ? "RUNNING" : "STOPPED"}
                                                </div>
                                            </td>
                                            <td className="px-4 py-6 text-right font-mono font-bold text-gray-200">
                                                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-6 text-right font-mono font-bold text-gray-200">
                                                ${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className={`px-4 py-6 text-right font-mono font-black ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {isProfit ? '+' : ''}${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-6 text-center">
                                                <span className="px-2 py-1 rounded bg-white/5 text-xs font-bold text-primary border border-primary/10">
                                                    {conn.configs?.[0]?.multiplier || '1.0'}x
                                                </span>
                                            </td>
                                            <td className="px-4 py-6">
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {conn.pairs?.length === 0 || !conn.pairs ? (
                                                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">All Symbols</span>
                                                    ) : (
                                                        conn.pairs.slice(0, 3).map((p: any, idx: number) => (
                                                            <div key={idx} className="px-2 py-0.5 rounded-lg bg-white/5 text-[9px] font-bold text-gray-400 border border-white/5">
                                                                {p.masterPair}➔{p.slavePair}
                                                            </div>
                                                        ))
                                                    )}
                                                    {conn.pairs?.length > 3 && (
                                                        <span className="text-[9px] text-gray-600 font-bold">+{conn.pairs.length - 3}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-6 text-right">
                                                <button 
                                                    onClick={() => navigate(`/dashboard/accounts/${linkedId}`)}
                                                    className="p-2 rounded-xl bg-white/5 text-gray-500 hover:bg-primary/20 hover:text-primary transition-all group-hover:opacity-100 lg:opacity-0"
                                                    title={`Open Account ${linkedId}`}
                                                >
                                                    <Icon icon="solar:arrow-right-up-bold" height={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountConnectionsTable;
