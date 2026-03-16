import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp"
import AccountTable from "./blocks/AccountTable";
import GlobalConnectionsTable from "./blocks/GlobalConnectionsTable";
import { Button } from "src/components/ui/button";
import axiosClient from "src/lib/axios";

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
  const handleForceCloseMaster = async () => {
    if (confirm("Are you sure you want to force close ALL trades on ALL Master accounts and their slaves?")) {
      await axiosClient.post("/trader/orders/force-close-master");
      alert("Force close master trades triggered.");
    }
  };

  const handleKillAll = async () => {
    if (confirm("DANGER: This will close EVERY open trade on EVERY account (Master & Slave). Are you sure?")) {
      await axiosClient.post("/trader/orders/kill-all");
      alert("Global kill switch triggered.");
    }
  };

  return (
    <>
      <BreadcrumbComp title="Accounts" items={BCrumb} />

      <div className="flex gap-4 mb-6 text-xs sm:text-sm">
        <Button variant="error" onClick={handleForceCloseMaster}>
          Force Close All Master Trades
        </Button>
        <Button variant="error" onClick={handleKillAll}>
          Kill all Trades (Global)
        </Button>
      </div>

      <AccountTable />

      <GlobalConnectionsTable />
    </>
  )
}

export default Accounts;