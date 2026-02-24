import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp"
import SymbolMapTable from "./blocks/SymbolMapTable";

const BCrumb = [
    {
        to: "/",
        title: "Home",
    },
    {
        title: "Symbol Maps",
    },
];

const SymbolMap = () => {
    return (
        <>
            <BreadcrumbComp title="Global Symbol Mapping" items={BCrumb} />
            <SymbolMapTable />
        </>
    )
}

export default SymbolMap;
