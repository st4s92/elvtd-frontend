import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp"
import ServerTable from "./blocks/ServerTable";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Servers",
  },
];

const Signals = () => {
    return (
        <>
            <BreadcrumbComp title="Servers" items={BCrumb} />
            <ServerTable />
        </>
    )
}

export default Signals;