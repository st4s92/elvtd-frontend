import React from 'react';

interface MasterOrderCardProps {
    order: any;
}

const MasterOrderCard: React.FC<MasterOrderCardProps> = ({ order }) => {
    const slaveOrders = Array.isArray(order?.slaveOrders) ? order.slaveOrders : [];

    return (
        <div className="bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-6 shadow-sm transition-all duration-300 w-full hover:shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                        {order.orderSymbol || 'Unknown Symbol'}
                    </h3>
                    <div className="flex gap-4 text-sm text-gray-400">
                        <span>Type: <span className="text-white">
                            {order.orderType === 0 || order.orderType === 'DEAL_TYPE_BUY' ? 'Buy' :
                                order.orderType === 1 || order.orderType === 'DEAL_TYPE_SELL' ? 'Sell' :
                                    String(order.orderType || '').replace('DEAL_TYPE_', '')}
                        </span></span>
                        <span>Ticket: <span className="text-white">{order.orderTicket}</span></span>
                        <span>Volume: <span className="text-white">{order.orderVolume}</span></span>
                        <span>Open Price: <span className="text-white">{order.orderOpenPrice}</span></span>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Associated Slave Orders</h4>
                {slaveOrders.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs uppercase text-gray-400 border-b border-white/10">
                                <tr>
                                    <th className="px-4 py-3">Account</th>
                                    <th className="px-4 py-3">Ticket</th>
                                    <th className="px-4 py-3">Volume</th>
                                    <th className="px-4 py-3">Open Price</th>
                                    <th className="px-4 py-3 text-right">Profit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slaveOrders.map((slave: any, idx: number) => (
                                    <tr key={slave.id || idx} className="border-b border-white/10 hover:bg-white/5 transition">
                                        <td className="px-4 py-3 font-medium text-white">{slave.account?.name || 'Unknown Account'}</td>
                                        <td className="px-4 py-3">{slave.orderTicket}</td>
                                        <td className="px-4 py-3">{slave.orderVolume}</td>
                                        <td className="px-4 py-3">{slave.orderOpenPrice}</td>
                                        <td className={`px-4 py-3 text-right font-semibold ${slave.orderProfit >= 0 ? 'text-success' : 'text-error'}`}>
                                            ${Number(slave.orderProfit || 0).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-sm text-gray-500 italic">No associated slave orders found.</div>
                )}
            </div>
        </div>
    );
};

export default MasterOrderCard;
