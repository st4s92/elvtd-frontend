import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp"
import JobsTable from "./blocks/JobsTable";

const BCrumb = [
    {
        to: "/",
        title: "Home",
    },
    {
        title: "Jobs",
    },
];

const Jobs = () => {
    return (
        <>
            <BreadcrumbComp title="Jobs" items={BCrumb} />
            <JobsTable />
        </>
    )
}

export default Jobs;
