import BreadcrumbComp from 'src/layouts/full/shared/breadcrumb/BreadcrumbComp';
import OrderTable from './blocks/OrderTable';

const BCrumb = [
    {
        to: '/',
        title: 'Home',
    },
    {
        title: 'Orders',
    },
];

const OrdersIndex = () => {
    return (
        <div className="flex flex-col gap-6">
            <BreadcrumbComp title="Global Orders" items={BCrumb} />
            <OrderTable />
        </div>
    );
};

export default OrdersIndex;
