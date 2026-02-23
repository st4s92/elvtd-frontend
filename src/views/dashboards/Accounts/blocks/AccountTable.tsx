import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "src/components/utilities/table/DataTable";
import { useCallback, useEffect, useState } from "react";
import axiosClient from "src/lib/axios";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@radix-ui/react-dropdown-menu";
import { TbDotsVertical } from "react-icons/tb";
import { TableCell } from "src/components/ui/table";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useNavigate } from "react-router-dom";
import CreateOrderFormModal from "./CreateOrderFormModal";
import CopyTradeConfigModal from "./EditTraderConfigModal";
import { Badge } from "src/components/ui/badge";
import EditAccountFormModal from "./EditAccountFormModal";
import { formatDistanceToNow, differenceInMinutes, parseISO } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";

const AccountTable = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState<string>("");

  const [openCreateOrder, setOpenCreateOrder] = useState(false);
  const [openCopyTradeConfig, setOpenCopyTradeConfig] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{
    serverName: string;
    accountNumber: number;
    accountId: number;
    platformName: string;
    role: string;
  } | null>(null);

  const [openEditAccount, setOpenEditAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<"" | "MASTER" | "SLAVE">("");

  const fetchData = useCallback(async () => {
    const res = await axiosClient.get("/trader/account/paginated", {
      params: {
        PerPage: pageSize,
        Page: page,
        ...(roleFilter ? { Role: roleFilter } : {}),
      },
    });

    setRows(res.data.data);
    setTotalRows(res.data.total);
  }, [page, pageSize, roleFilter]);

  const isAnyUIOpen =
    openCreateOrder ||
    openCopyTradeConfig ||
    openEditAccount ||
    openDropdownId !== null;

  useEffect(() => {
    if (isAnyUIOpen) return;

    fetchData();

    const interval = setInterval(fetchData, 7000);
    return () => clearInterval(interval);
  }, [fetchData, isAnyUIOpen]);

  // const triggerInstall = async (accountId: number) => {
  //   await axiosClient.post(`/trader/account/${accountId}/install`, {});
  // };

  const handleDelete = async (accountId: number) => {
    await axiosClient.delete(`/trader/account/${accountId}`);
    fetchData();
  };

  const columns: ColumnDef<Record<string, any>>[] = [
    {
      accessorKey: "platform_name",
      header: "Platform",
    },
    {
      accessorKey: "account_number",
      header: "Account",
    },
    {
      accessorKey: "server_name",
      header: "Server",
    },
    {
      accessorKey: "server_status",
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
                    : "gray"
            }
          >
            {row.original.server_status_message || "-"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.role;
        return (
          <Badge variant={type === "MASTER" ? "success" : "secondary"}>
            {type ?? "-"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }) => {
        const val = row.original.balance;
        return <span>${parseFloat(val).toLocaleString()}</span>;
      },
    },
    {
      accessorKey: "open_positions_count",
      header: "Open Pos",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.open_positions_count}</Badge>
      ),
    },
    {
      accessorKey: "dedicated_server_name",
      header: "Ded. Server",
    },
    {
      accessorKey: "updated_at",
      header: "Last Update",
      cell: ({ row }) => {
        const updatedAt = row.original.updated_at;
        if (!updatedAt) return "-";

        // Force UTC by appending Z if not present
        const dateStr = updatedAt.endsWith('Z') ? updatedAt : updatedAt + 'Z';
        const date = parseISO(dateStr);
        const diff = differenceInMinutes(new Date(), date);

        return (
          <Badge variant={diff > 5 ? "error" : "lightSuccess"}>
            {formatDistanceToNow(date, { addSuffix: true })}
          </Badge>
        );
      },
    },
    {
      header: "Action",
      cell: ({ row }) => {
        const accountId = row.original.id;
        const accountType = row.original.role;
        return (
          <>
            <TableCell>
              <DropdownMenu
                open={openDropdownId === accountId}
                onOpenChange={(open) =>
                  setOpenDropdownId(open ? accountId : null)
                }
              >
                <DropdownMenuTrigger asChild>
                  <span className="h-9 w-9 flex justify-center items-center rounded-full hover:bg-lightprimary hover:text-primary cursor-pointer">
                    <TbDotsVertical size={22} />
                  </span>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-40 bg-blue-950 p-2 border"
                >
                  <DropdownMenuItem
                    className="flex gap-3 items-center cursor-pointer hover:bg-gray-500"
                    onSelect={() =>
                      navigate(`/dashboard/accounts/${accountId}`)
                    }
                  >
                    <Icon
                      icon="solar:clipboard-list-line-duotone"
                      height={18}
                    />
                    <span>Account Detail</span>
                  </DropdownMenuItem>
                  {accountType == "MASTER" && (
                    <DropdownMenuItem
                      className="flex gap-3 items-center cursor-pointer mt-4 hover:bg-gray-500"
                      onSelect={() => {
                        setSelectedAccount({
                          serverName: row.original.server_name,
                          accountNumber: row.original.account_number,
                          accountId: row.original.id,
                          platformName: row.original.platform_name,
                          role: row.original.role,
                        });
                        setOpenCreateOrder(true);
                      }}
                    >
                      <Icon icon="solar:document-add-broken" height={18} />
                      <span>Create Order</span>
                    </DropdownMenuItem>
                  )}
                  {accountType == "SLAVE" && (
                    <DropdownMenuItem
                      className="flex gap-3 items-center cursor-pointer mt-4 hover:bg-gray-500"
                      onSelect={() => {
                        setSelectedAccount({
                          serverName: row.original.server_name,
                          accountNumber: row.original.account_number,
                          accountId: row.original.id,
                          platformName: row.original.platform_name,
                          role: row.original.role,
                        });
                        setOpenCopyTradeConfig(true);
                      }}
                    >
                      <Icon icon="solar:settings-linear" height={18} />
                      <span>Edit Config</span>
                    </DropdownMenuItem>
                  )}
                  {/* <DropdownMenuItem
                  className="flex gap-3 items-center cursor-pointer mt-4 hover:bg-gray-500"
                  onSelect={() => {
                    if (confirm("re run installation?")) {
                      triggerInstall(row.original.id);
                    }
                  }}
                >
                  <Icon icon="solar:refresh-circle-broken" height={18} />
                  <span>Reinstall</span>
                </DropdownMenuItem> */}
                  <DropdownMenuItem
                    className="flex gap-3 items-center cursor-pointer mt-4 hover:bg-gray-500"
                    onSelect={() => {
                      setEditingAccount(row.original);
                      setOpenEditAccount(true);
                    }}
                  >
                    <Icon icon="solar:pen-new-square-linear" height={18} />
                    <span>Edit Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex gap-3 items-center cursor-pointer mt-4 hover:bg-gray-500"
                    onSelect={() => {
                      if (
                        confirm(
                          `delete account ${row.original.account_number}?`,
                        )
                      ) {
                        handleDelete(row.original.id);
                      }
                    }}
                  >
                    <Icon icon="solar:trash-bin-2-line-duotone" height={18} />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </>
        );
      },
    },
  ];

  const roleFilterMenu = (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Type:</span>
      <Select
        value={roleFilter || "all"}
        onValueChange={(val) => {
          const v = val === "all" ? "" : (val as "MASTER" | "SLAVE");
          setRoleFilter(v);
          setPage(1); // reset ke page 1 saat filter berubah
        }}
      >
        <SelectTrigger className="w-32 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="MASTER">Master</SelectItem>
          <SelectItem value="SLAVE">Slave</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <div className="flex gap-6 flex-col ">
        <div className="w-full overflow-x-auto">
          <DataTable
            title="Accounts"
            data={rows}
            columnsConfig={columns}
            downloadConfig={{
              enable: false,
            }}
            rightMenu={roleFilterMenu}
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
        {/* Modal */}
        {selectedAccount && (
          <CreateOrderFormModal
            open={openCreateOrder}
            onOpenChange={setOpenCreateOrder}
            serverName={selectedAccount?.serverName}
            accountNumber={selectedAccount?.accountNumber}
            onSuccess={() => {
              console.log("Order created!");
            }}
            accountId={selectedAccount?.accountId}
          />
        )}

        {selectedAccount && (
          <CopyTradeConfigModal
            open={openCopyTradeConfig}
            onOpenChange={setOpenCopyTradeConfig}
            accountId={selectedAccount?.accountId}
            serverName={selectedAccount?.serverName}
            accountNumber={selectedAccount?.accountNumber}
            platformName={selectedAccount?.platformName}
            role={selectedAccount?.role}
            onSuccess={() => {
              console.log("Connection created!");
            }}
          />
        )}

        {editingAccount && (
          <EditAccountFormModal
            open={openEditAccount}
            onOpenChange={setOpenEditAccount}
            account={editingAccount}
            userName={editingAccount.user?.name ?? ""}
            userEmail={editingAccount.user?.email ?? ""}
            onSuccess={() => {
              fetchData();
            }}
          />
        )}
      </div>
    </>
  );
};

export default AccountTable;
