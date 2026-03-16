import BreadcrumbComp from 'src/layouts/full/shared/breadcrumb/BreadcrumbComp';
import MasterOrderTable from './blocks/MasterOrderTable';

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
    return (
        <div className="flex flex-col gap-6">
            <BreadcrumbComp title="Master Orders" items={BCrumb} />
            <MasterOrderTable />
        </div>
    );
};

export default MasterOrdersIndex;
