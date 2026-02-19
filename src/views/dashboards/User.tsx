import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "src/components/ui/badge";
import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp";
import { EmployeesData } from "src/components/utilities/table/data";
import { DataTable } from "src/components/utilities/table/DataTable";
import { useEffect, useState } from "react";
const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "User",
  },
];

const User = () => {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [totalRows, _] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState<string>("");

  const fetchData = async() => {
    const res = EmployeesData

    setRows(res);
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, search]);

  const columns: ColumnDef<Record<string, any>>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const value = row.original.name;
        return (
          <div className="flex items-center gap-2">
            <img src={value.image} className="w-8 h-8 rounded-full" alt="" />
            <span>{value.text}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "position",
      header: "Job",
    },
    {
      accessorKey: "salary",
      header: "Balance",
    },
    {
      accessorKey: "department",
      header: "Job Area",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge
            variant={
              status === "Active"
                ? "default"
                : status === "Terminated"
                ? "destructive"
                : "secondary"
            }
          >
            {status}
          </Badge>
        );
      },
    },
  ];

  return (
    <>
      <BreadcrumbComp title="Users" items={BCrumb} />
      <div className="flex gap-6 flex-col ">
        <DataTable
          title="Users"
          data={rows}
          columnsConfig={columns}
          downloadConfig={{
            enable: true,
          }}
          searchConfig={{
            enable: true,
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
    </>
  );
};

export default User;
