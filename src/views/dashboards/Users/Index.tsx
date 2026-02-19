import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp"
import UserTable from "./blocks/UserTable";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Users",
  },
];

const Signals = () => {
    return (
        <>
            <BreadcrumbComp title="Users" items={BCrumb} />
            <UserTable />
        </>
    )
}

export default Signals;