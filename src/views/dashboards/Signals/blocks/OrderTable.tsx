import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "src/components/ui/badge";
import { DataTable } from "src/components/utilities/table/DataTable";
import { useEffect, useState } from "react";
import axiosClient from "src/lib/axios";

type OrderTableProps = {
  accountId: number
}

const OrderTable = ({accountId} : OrderTableProps) => {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState<string>("");

  const fetchData = async () => {
    const res = await axiosClient.get("/trader/orders/paginated", {
      params: {
        PerPage: pageSize,
        Page: page,
        AccountId: accountId,
      },
    });
    console.log(res);

    setRows(res.data.data);
    setTotalRows(res.data.total);
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, accountId]);

  const columns: ColumnDef<Record<string, any>>[] = [
    {
      accessorKey: "orderTicket",
      header: "Order ID"
    },
    {
      accessorKey: "orderSymbol",
      header: "Pair",
    },
    {
      accessorKey: "orderType",
      header: "Type",
      cell: ({ row }) => {
        const tipe = row.original.orderType;
        return (
          <Badge
            variant={
              tipe === "DEAL_TYPE_BUY"
                ? "default"
                : "secondary"
            }
          >
            {tipe === "DEAL_TYPE_BUY"? "BUY" : "SELL"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "orderLot",
      header: "Volume",
    },
    {
      accessorKey: "actualPrice",
      header: "Price",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const tipe = row.original.status;
        return (
          <Badge
            variant={
              tipe === 200 ? "warning"
                : tipe == 300 ? "error"
                : tipe == 400 ? "gray"
                : tipe == 500 ? "secondary"
                : tipe == 600 ? "success"
                : tipe == 700 ? "default"
                : "gray"
            }
          >
            {tipe === 200 ? "Pending"
                : tipe == 300 ? "Failed"
                : tipe == 400 ? "Closed"
                : tipe == 500 ? "Canceled"
                : tipe == 600 ? "Success"
                : tipe == 700 ? "Finished"
                : "-"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const ca = new Date(row.original.createdAt);

        const formatted = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        }).format(ca);

        return <span>{formatted.replace(" ", " ")}</span>;
      },
    }
  ];

  return (
    <>
      <div className="flex gap-6 flex-col ">
        <div className="w-full overflow-x-auto">
            <DataTable
                title="Orders"
                data={rows}
                columnsConfig={columns}
                downloadConfig={{
                    enable: false,
                }}
                searchConfig={{
                    enable: false,
                    text: search,
                    setSearchChange: setSearch,
                }}
                pagination={{
                    page,
                    pageSize,
                    totalRows,
                    onPageChange: setPage,
                    onPageSizeChange: (size) => {
                    setPageSize(size);
                    setPage(1); // reset page
                    },
                }}
            />
        </div>
      </div>
    </>
  );
};

export default OrderTable;
