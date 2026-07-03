import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axiosClient from 'src/lib/axios';
import WebGLBackground from 'src/components/ui/RetroFeatureCards/WebGLBackground';
import { Icon } from '@iconify/react';

interface MasterTrade {
    id: number;
    orderSymbol: string;
    orderType: number | string;
    orderTicket: number;
    orderLot: number;
    orderPrice: number;
    copiedOrders: number;       // regular successes
    progressOrders: number;     // pending/progress
    configuredSlaves: number;  // total configured slave connections
    masterAccountNumber?: string | number;
}

const typeLabel = (t: any) => {
    if (t === 0 || t === 'DEAL_TYPE_BUY') return { label: 'BUY', color: '#00d2b8' };
    if (t === 1 || t === 'DEAL_TYPE_SELL') return { label: 'SELL', color: '#ff3c6e' };
    return { label: String(t).replace('DEAL_TYPE_', ''), color: '#aaa' };
};

const TradeCard = ({ trade, onClose }: { trade: MasterTrade; onClose: (trade: MasterTrade) => void }) => {
    const type = typeLabel(trade.orderType);
    const [closing, setClosing] = useState(false);

    const handleClose = async () => {
        if (!confirm(`Close master order #${trade.orderTicket} (${trade.orderSymbol})?`)) return;
        try {
            setClosing(true);
            await axiosClient.delete('/trader/orders/master-order', {
                data: {
                    orderTicket: trade.orderTicket,
                    accountId: trade.id,
                },
            });
            onClose(trade);
        } catch (err) {
            console.error('Failed to close order', err);
            alert('Failed to close the order. Check console for details.');
        } finally {
            setClosing(false);
        }
    };

    return (
        <div
            className="flex-shrink-0 w-72 rounded-3xl p-5 flex flex-col gap-4 border border-white/10 relative"
            style={{
                background: 'rgba(20,14,40,0.85)',
                boxShadow: `0 0 30px 0 ${type.color}22, inset 0 0 30px rgba(0,0,0,0.5)`,
                backdropFilter: 'blur(12px)',
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div
                        className="text-[11px] font-bold uppercase tracking-widest mb-1"
                        style={{ color: type.color }}
                    >
                        {type.label} ● {trade.orderSymbol}
                    </div>
                    <div className="text-gray-500 text-[10px] font-mono">
                        Ticket: #{trade.orderTicket}
                    </div>
                </div>
                <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg"
                    style={{ background: `${type.color}22`, color: type.color }}
                >
                    {type.label === 'BUY' ? '↑' : '↓'}
                </div>
            </div>

            {/* Trade Details */}
            <div className="grid grid-cols-2 gap-2">
                {[
                    { label: 'Volume', value: trade.orderLot },
                    { label: 'Open Price', value: trade.orderPrice },
                    {
                        label: 'Copied / Slaves',
                        value: (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span style={{ color: trade.copiedOrders > 0 ? '#00d2b8' : '#ff7070' }}>
                                    {trade.copiedOrders}
                                </span>
                                <span style={{ color: '#666' }}> / {trade.configuredSlaves}</span>
                                {trade.progressOrders > 0 && (
                                    <span className="text-[8.5px] text-amber-500 font-bold bg-amber-500/10 px-1 rounded border border-amber-500/20 whitespace-nowrap">
                                        +{trade.progressOrders} PND
                                    </span>
                                )}
                            </div>
                        )
                    },
                    { label: 'Master Acc', value: `#${trade.masterAccountNumber ?? '-'}` },
                ].map((item) => (
                    <div key={item.label} className="bg-white/5 rounded-xl p-2 min-h-[46px] flex flex-col justify-center">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider leading-tight">{item.label}</div>
                        <div className="text-white font-semibold text-sm leading-tight">{item.value}</div>
                    </div>
                ))}
            </div>

            {/* Close Button */}
            <button
                onClick={handleClose}
                disabled={closing}
                className="mt-1 w-full py-2 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                    background: closing ? 'rgba(255,60,110,0.1)' : 'rgba(255,60,110,0.15)',
                    color: '#ff3c6e',
                    border: '1px solid rgba(255,60,110,0.25)',
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,60,110,0.3)';
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,60,110,0.15)';
                }}
            >
                <Icon icon="solar:close-circle-bold" height={14} />
                {closing ? 'Closing...' : 'Close Trade'}
            </button>

            {/* Bottom sys-ok indicator */}
            <div className="absolute bottom-3 left-5 text-[9px] tracking-widest font-mono opacity-30" style={{ color: type.color }}>
                SYS_OK
            </div>
        </div>
    );
};

const LiveMasterTradesCarousel = () => {
    const [trades, setTrades] = useState<MasterTrade[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTrades = async () => {
        try {
            // Using the same paginated orders endpoint for efficiency and consistency
            const res = await axiosClient.get('/trader/orders/paginated', {
                params: { 
                    Role: 'MASTER', 
                    PerPage: 100, 
                    Page: 1, 
                    SortBy: 'order_open_at', 
                    SortOrder: 'desc' 
                },
            });
            
            const masterOrders = res.data?.data || [];
            
            // Filter for open trades (those without an order_close_at date)
            const openMasters = masterOrders.filter((o: any) => !o.order_close_at);

            const all: MasterTrade[] = openMasters.map((o: any) => {
                const slaveCount = o.slave_count || 0;
                const successCnt = o.slave_success_count || 0;
                const failCnt = o.slave_failure_count || 0;
                const progressCnt = Math.max(0, slaveCount - (successCnt + failCnt));

                return {
                    id: o.id,
                    orderSymbol: o.order_symbol || o.orderSymbol,
                    orderType: o.order_type || o.orderType,
                    orderTicket: o.order_ticket || o.orderTicket,
                    orderLot: o.order_lot || o.orderLot || o.orderVolume,
                    orderPrice: o.order_price || o.orderPrice || o.orderOpenPrice,
                    copiedOrders: successCnt,
                    progressOrders: progressCnt,
                    configuredSlaves: slaveCount,
                    masterAccountNumber: o.account?.account_number,
                };
            });

            setTrades(all);
        } catch (err) {
            console.error('LiveMasterTradesCarousel error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrades();
        const interval = setInterval(fetchTrades, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleClose = (closed: MasterTrade) => {
        setTrades((prev) => prev.filter((t) => t.orderTicket !== closed.orderTicket));
    };

    if (loading) {
        return (
            <div className="relative w-full h-48 rounded-3xl bg-[#050510] overflow-hidden flex items-center justify-center text-gray-500 text-sm font-mono animate-pulse border border-white/5">
                Loading live trades...
            </div>
        );
    }

    if (!trades.length) {
        return (
            <div className="relative w-full h-36 rounded-3xl bg-[#050510] overflow-hidden flex items-center justify-center text-gray-600 text-sm font-mono border border-white/5">
                <Icon icon="solar:sleep-bold" className="mr-2" height={18} /> No open master trades
            </div>
        );
    }

    // Only duplicate for seamless infinite loop if we have enough cards to fill the screen
    const needsMarquee = trades.length >= 5;
    const marquee = needsMarquee ? [...trades, ...trades] : trades;
    const totalWidth = (300 + 16) * trades.length; // card width (288) + gap (16)

    return (
        <div className="relative w-full rounded-3xl bg-[#050510] overflow-hidden border border-[#1a1c29]" style={{ minHeight: 260 }}>
            <div className="absolute inset-0 z-0 pointer-events-none">
                <WebGLBackground />
            </div>
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_rgba(118,62,255,0.06)_0%,_rgba(5,5,16,1)_70%)] pointer-events-none" />

            {/* Title */}
            <div className="relative z-10 px-6 pt-5 pb-2 flex items-center gap-2">
                <Icon icon="solar:chart-line-duotone" className="text-violet-400" height={18} />
                <span className="text-xs font-mono font-bold tracking-widest text-violet-400 uppercase">
                    Live Master Trades — {trades.length} open
                </span>
                <span className="ml-auto text-[10px] font-mono text-gray-600">AUTO-REFRESH 15s</span>
            </div>

            <div className="relative z-10 py-4 overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing">
                {needsMarquee ? (
                    <motion.div
                        className="flex gap-4 px-6 w-max"
                        animate={{ x: ['0px', `-${totalWidth}px`] }}
                        transition={{
                            ease: 'linear',
                            duration: Math.max(20, trades.length * 8),
                            repeat: Infinity,
                        }}
                    >
                        {marquee.map((trade, i) => (
                            <TradeCard key={`${trade.orderTicket}-${i}`} trade={trade} onClose={handleClose} />
                        ))}
                    </motion.div>
                ) : (
                    <div className="flex gap-4 px-6">
                        {trades.map((trade, i) => (
                            <TradeCard key={`${trade.orderTicket}-${i}`} trade={trade} onClose={handleClose} />
                        ))}
                    </div>
                )}
            </div>

            {/* CRT scanlines */}
            <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] opacity-30 mix-blend-overlay" />
        </div>
    );
};

export default LiveMasterTradesCarousel;
