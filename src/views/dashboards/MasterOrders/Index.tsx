import { useEffect, useState } from 'react';
import axiosClient from 'src/lib/axios';
import BreadcrumbComp from 'src/layouts/full/shared/breadcrumb/BreadcrumbComp';
import MasterOrderCard from './components/MasterOrderCard';

const BCrumb = [
    {
        to: '/',
        title: 'Home',
    },
    {
        title: 'Master Orders',
    },
];

const MasterOrdersIndex = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMasterOrders();
    }, []);

    const fetchMasterOrders = async () => {
        try {
            setLoading(true);

            // 1. Fetch all MASTER accounts
            const accountsRes = await axiosClient.get('/trader/account/paginated', {
                params: { Role: 'MASTER', PerPage: 100, Page: 1 }
            });
            const masterAccounts = accountsRes.data?.data || [];

            let allMasterOrders: any[] = [];

            // 2. For each master account, fetch its detail (for active master orders) and its slaves
            for (const master of masterAccounts) {
                try {
                    const [detailRes, slavesRes] = await Promise.all([
                        axiosClient.get(`/trader/account/${master.id}/detail`),
                        axiosClient.get(`/trader/account/${master.id}/slave-orders`)
                    ]);

                    const masterOrdersRaw = detailRes.data?.orders || [];
                    const slavesRaw = slavesRes.data || [];

                    // Flat list of all slave orders with their account info attached
                    let allSlaveOrdersFlat: any[] = [];
                    for (const slave of slavesRaw) {
                        const slaveAccountInfo = {
                            name: `${slave.accountNumber} ${slave.brokerName ? `(${slave.brokerName})` : ''}`,
                            id: slave.accountId
                        };
                        for (const sOrder of (slave.orders || [])) {
                            allSlaveOrdersFlat.push({
                                ...sOrder,
                                account: slaveAccountInfo,
                                // normalize fields for the component
                                orderTicket: sOrder.orderTicket,
                                orderVolume: sOrder.orderLot,
                                orderOpenPrice: sOrder.orderPrice,
                                orderProfit: sOrder.orderProfit,
                                orderType: sOrder.orderType,
                                orderSymbol: sOrder.orderSymbol,
                                masterOrderId: sOrder.masterOrderId || sOrder.master_order_id // Try to grab relational id if it exists
                            });
                        }
                    }

                    // 3. Construct the MasterOrder objects
                    for (const mOrder of masterOrdersRaw) {
                        // Try to find linked slave orders. 
                        // If exact relational ID isn't matching, fallback to matching by Symbol and Type (heuristic)
                        const linkedSlaves = allSlaveOrdersFlat.filter(slaveOrder => {
                            if (slaveOrder.assignedToMaster) return false; // Already mapped to a previous identical master order

                            let isMatch = false;
                            if (slaveOrder.masterOrderId && slaveOrder.masterOrderId === mOrder.id) {
                                isMatch = true;
                            } else if (slaveOrder.orderTicket && slaveOrder.close_ticket === mOrder.orderTicket) { // sometimes bridge uses close_ticket
                                isMatch = true;
                            } else if (slaveOrder.orderSymbol === mOrder.orderSymbol && slaveOrder.orderType === mOrder.orderType) {
                                // Heuristic fallback: same symbol and type
                                isMatch = true;
                            }

                            if (isMatch) {
                                slaveOrder.assignedToMaster = true; // "Consume" this slave order to prevent duplicates in identical trades
                                return true;
                            }
                            return false;
                        });

                        allMasterOrders.push({
                            id: mOrder.id,
                            orderSymbol: mOrder.orderSymbol,
                            orderType: mOrder.orderType,
                            orderTicket: mOrder.orderTicket,
                            orderVolume: mOrder.orderLot,
                            orderOpenPrice: mOrder.orderPrice,
                            slaveOrders: linkedSlaves,
                            masterAccountId: master.id,
                            masterAccountNumber: master.account_number
                        });
                    }

                } catch (err) {
                    console.error(`Failed to fetch details for master account ${master.id}`, err);
                }
            }

            setOrders(allMasterOrders);

        } catch (error) {
            console.error('Failed to fetch master orders', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <BreadcrumbComp title="Master Orders" items={BCrumb} />

            {loading ? (
                <div className="flex justify-center p-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center p-10 text-muted-foreground">
                    No open Master Orders found.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {orders.map((masterOrder, idx) => (
                        <MasterOrderCard key={masterOrder.id || idx} order={masterOrder} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MasterOrdersIndex;
