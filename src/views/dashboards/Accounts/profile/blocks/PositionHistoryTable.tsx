import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "src/components/utilities/table/DataTable";
import { useEffect, useState } from "react";
import axiosClient from "src/lib/axios";
import { Badge } from "src/components/ui/badge";

type Props = {
  accountId: number;
};

const PositionHistoryTable = ({ accountId }: Props) => {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchData = async () => {
    try {
      const res = await axiosClient.get(
        "/trader/orders/paginated",
        {
          params: {
            PerPage: pageSize,
            Page: page,
            Status: 700,
            AccountId: accountId,
          },
        }
      );

      if (res.status) {
        setRows(res.data.data);
        setTotalRows(res.data.total);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, accountId]);

  // ===== BASE COLUMNS =====
  const baseColumns: ColumnDef<Record<string, any>>[] = [
    {
      accessorKey: "order_ticket",
      header: "Ticket",
    },
    {
      accessorKey: "order_symbol",
      header: "Symbol",
    },
    {
      accessorKey: "order_type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.order_type;
        return (
          <Badge
            variant={
              type === "DEAL_TYPE_BUY" ? "success" : "error"
            }
          >
            {type?.replace("DEAL_TYPE_", "")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "order_lot",
      header: "Lot",
    },
    {
      accessorKey: "order_price",
      header: "Open Price",
      cell: ({ row }) => {
        const price = row.original.order_price;
        return price ? Number(price).toFixed(5) : "-";
      },
    },
  ];

  // ===== CONDITIONAL PROFIT COLUMN =====
  const profitColumn: ColumnDef<Record<string, any>> = {
    accessorKey: "order_profit",
    header: "Profit",
    cell: ({ row }) => {
      const profit = row.original.order_profit;

      if (profit == null) return "-";

      return (
        <span
          className={
            profit >= 0
              ? "text-emerald-500 font-semibold"
              : "text-red-500 font-semibold"
          }
        >
          ${Number(profit).toFixed(2)}
        </span>
      );
    },
  };

  // ===== REST COLUMNS =====
  const endColumns: ColumnDef<Record<string, any>>[] = [
    {
      accessorKey: "order_close_at",
      header: "Close Time",
      cell: ({ row }) => {
        const date = row.original.order_close_at;
        return date
          ? new Date(date).toLocaleString()
          : "-";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: () => (
        <Badge variant="secondary">
          Closed
        </Badge>
      ),
    },
  ];

  // ===== FINAL COLUMNS =====
  const columns: ColumnDef<Record<string, any>>[] = [
    ...baseColumns,
    profitColumn,
    ...endColumns,
  ];

  return (
    <div className="mt-8 w-full overflow-hidden">
      <DataTable
        title="Copy Position History (Closed)"
        data={rows}
        columnsConfig={columns}
        downloadConfig={{ enable: false }}
        pagination={{
          page,
          pageSize,
          totalRows,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
        }}
      />
    </div>
  );
};

export default PositionHistoryTable;
