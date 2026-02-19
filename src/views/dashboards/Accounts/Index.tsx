import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp"
import AccountTable from "./blocks/AccountTable";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Accounts",
  },
];

const Accounts = () => {
    return (
        <>
            <BreadcrumbComp title="Accounts" items={BCrumb} />
            <AccountTable />
        </>
    )
}

export default Accounts;