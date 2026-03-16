import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp"
import LogsTable from "./blocks/LogsTable";

const BCrumb = [
    {
        to: "/",
        title: "Home",
    },
    {
        title: "System Logs",
    },
];

const Logs = () => {
    return (
        <>
            <BreadcrumbComp title="System Logs" items={BCrumb} />
            <LogsTable />
        </>
    )
}

export default Logs;
