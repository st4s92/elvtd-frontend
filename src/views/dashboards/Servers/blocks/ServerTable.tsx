import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "src/components/utilities/table/DataTable";
import { useEffect, useState } from "react";
import axiosClient from "src/lib/axios";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import CreateServerFormModal from "./CreateServerFormModal";

const ServerTable = () => {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState<string>("");

  const [openCreateServer, setOpenCreateServer] = useState(false);

  const fetchData = async () => {
    const res = await axiosClient.get("/trader/servers/paginated", {
      params: {
        PerPage: pageSize,
        Page: page,
      },
    });

    setRows(res.data.data);
    setTotalRows(res.data.total);
  };

  useEffect(() => {
    if (openCreateServer) return;
    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 7000);

    return () => clearInterval(interval);
  }, [page, pageSize]);

  const columns: ColumnDef<Record<string, any>>[] = [
    {
      accessorKey: "serverName",
      header: "Server Name",
    },
    {
      accessorKey: "serverIp",
      header: "Server IP",
    },
    {
      accessorKey: "serverOs",
      header: "Server OS",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge
            variant={
              status === 100
                ? "warning"
                : status === 200
                  ? "success"
                  : status === 300
                    ? "error"
                    : "secondary"
            }
          >
            {status === 100
              ? "connecting..."
              : status === 200
                ? "connected"
                : status === 300
                  ? "failed"
                  : "-"}
          </Badge>
        );
      },
    },
  ];

  return (
    <>
      <div className="flex gap-6 flex-col ">
        {rows.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <DataTable
              title="Servers"
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
              rightMenu={
                <>
                  <Button onClick={() => setOpenCreateServer(true)}>
                    Create New Server
                  </Button>
                </>
              }
            />
          </div>
        ) : (
          <div className="flex gap-2">
            <span>No data yet.</span>
            <span onClick={() => setOpenCreateServer(true)} className="text-primary cursor-pointer">
              Create New?
            </span>
          </div>
        )}
        {/* Modal */}
        <CreateServerFormModal
          open={openCreateServer}
          onOpenChange={setOpenCreateServer}
          onSuccess={() => {
            console.log("Server created!");
            fetchData();
          }}
        />
      </div>
    </>
  );
};

export default ServerTable;
