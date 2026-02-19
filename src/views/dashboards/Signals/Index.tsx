import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp"
import { useParams } from "react-router-dom";
import OrderTable from "./blocks/OrderTable";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Signals",
  },
];

const Signals = () => {
    const { accountId } = useParams();
    return (
        <>
            <BreadcrumbComp title="Signals" items={BCrumb} />
            <OrderTable accountId={parseInt(accountId ?? "0")}/>
        </>
    )
}

export default Signals;