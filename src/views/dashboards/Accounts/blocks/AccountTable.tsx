import { ColumnDef, SortingState } from "@tanstack/react-table";
import { DataTable } from "src/components/utilities/table/DataTable";
import React, { useCallback, useEffect, useState } from "react";
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
import { Checkbox } from "src/components/ui/checkbox";
import { Button } from "src/components/ui/button";

const AccountTable = () => {
  const navigate = useNavigate();
  const [allAccounts, setAllAccounts] = useState<Record<string, any>[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([]);

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
  const [roleFilter, setRoleFilter] = useState<"" | "MASTER" | "SLAVE" | "NONE">("");
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isRestartingBulk, setIsRestartingBulk] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res: any = await axiosClient.get("/trader/account");
      if (res.status) {
        setAllAccounts(res.data?.data || res.data || []);
      } else {
        console.error("Failed to fetch accounts:", res.message);
        setAllAccounts([]);
      }
    } catch (error) {
      console.error("Failed to fetch accounts", error);
      setAllAccounts([]);
    }
  }, []);

  const filteredAccounts = React.useMemo(() => {
    return allAccounts.filter((row) => {
      // Search
      if (search) {
        const query = search.toLowerCase();
        const matchesSearch =
          String(row.account_number || "").toLowerCase().includes(query) ||
          String(row.server_name || "").toLowerCase().includes(query) ||
          String(row.dedicated_server_name || "").toLowerCase().includes(query) ||
          String(row.copier_version || "").toLowerCase().includes(query) ||
          String(row.platform_name || "").toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }

      // Role
      if (roleFilter && roleFilter.length > 0) {
        if (row.role !== roleFilter) return false;
      }

      // Platform
      if (platformFilter && platformFilter !== "") {
        if (row.platform_name !== platformFilter) return false;
      }

      // Status
      if (statusFilter && statusFilter !== "") {
        const updatedAt = row.updated_at;
        
        if (statusFilter === "100") { // None
          if (row.status !== 100) return false;
        } else {
          // Success (200) or Error (300) based on 5-minute timeout
          if (!updatedAt) return statusFilter === "300"; // No updated_at = Error automatically
          
          try {
            const dateStr = updatedAt.endsWith('Z') ? updatedAt : updatedAt + 'Z';
            const date = parseISO(dateStr);
            const diff = differenceInMinutes(new Date(), date);
            const isError = diff > 5;
            
            if (statusFilter === "200" && isError) return false;
            if (statusFilter === "300" && !isError) return false;
          } catch (e) {
            return statusFilter === "300"; // Parsing failed = Error
          }
        }
      }

      return true;
    });
  }, [allAccounts, search, roleFilter, platformFilter, statusFilter]);

  const totalRows = filteredAccounts.length;

  const paginatedRows = React.useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredAccounts.slice(startIndex, startIndex + pageSize);
  }, [filteredAccounts, page, pageSize]);

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

  const handleRestart = async (accountId: number) => {
    try {
      await axiosClient.post(`/trader/account/${accountId}/restart`);
      return { id: accountId, success: true };
    } catch (error) {
      console.error("Failed to restart account", error);
      return { id: accountId, success: false };
    }
  };

  const handleBulkRestart = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Restart ${selectedIds.length} selected accounts?`)) return;

    setIsRestartingBulk(true);
    try {
      const results = await Promise.allSettled(selectedIds.map(id => handleRestart(id)));
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

      if (failed.length > 0) {
        alert(`${selectedIds.length - failed.length} restarts sent, ${failed.length} failed.`);
      } else {
        alert("All restart commands sent successfully");
      }
      setSelectedIds([]);
      fetchData();
    } finally {
      setIsRestartingBulk(false);
    }
  };

  const handleInstall = async (accountId: number) => {
    try {
      await axiosClient.post(`/trader/account/${accountId}/install`);
      alert("Reinstall command sent successfully");
      fetchData();
    } catch (error) {
      console.error("Failed to reinstall account", error);
      alert("Failed to reinstall account");
    }
  };

  const handleDelete = async (accountId: number) => {
    await axiosClient.delete(`/trader/account/${accountId}`);
    fetchData();
  };

  const columns: ColumnDef<Record<string, any>>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={selectedIds.length === filteredAccounts.length && filteredAccounts.length > 0}
          onCheckedChange={(value) => {
            if (value) {
              setSelectedIds(filteredAccounts.map((r) => r.id));
            } else {
              setSelectedIds([]);
            }
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.includes(row.original.id)}
          onCheckedChange={(value) => {
            if (value) {
              setSelectedIds((prev) => [...prev, row.original.id]);
            } else {
              setSelectedIds((prev) => prev.filter((id) => id !== row.original.id));
            }
          }}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
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
      accessorKey: "copier_version",
      header: "Version",
      cell: ({ row }) => {
        const version = row.original.copier_version;
        if (!version) return <span className="text-gray-500">—</span>;
        return (
          <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary-foreground bg-primary/5">
            {version}
          </Badge>
        );
      },
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
      id: "actions",
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
                  {row.original.platform_name !== "cTrader" && (
                    <>
                      <DropdownMenuItem
                        className="flex gap-3 items-center cursor-pointer mt-4 hover:bg-gray-500"
                        onSelect={() => {
                          if (confirm(`Restart account ${row.original.account_number}?`)) {
                            handleRestart(row.original.id);
                          }
                        }}
                      >
                        <Icon icon="solar:restart-bold" height={18} />
                        <span>Restart</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="flex gap-3 items-center cursor-pointer mt-4 hover:bg-gray-500"
                        onSelect={() => {
                          if (confirm(`Reinstall account ${row.original.account_number}?`)) {
                            handleInstall(row.original.id);
                          }
                        }}
                      >
                        <Icon icon="solar:download-bold" height={18} />
                        <span>Reinstall</span>
                      </DropdownMenuItem>
                    </>
                  )}
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
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Type:</span>
        <Select
          value={roleFilter || "all"}
          onValueChange={(val) => {
            const v = val === "all" ? "" : (val as "MASTER" | "SLAVE" | "NONE");
            setRoleFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-28 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="MASTER">Master</SelectItem>
            <SelectItem value="SLAVE">Slave</SelectItem>
            <SelectItem value="NONE">None</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Select
          value={statusFilter || "all"}
          onValueChange={(val) => {
            const v = val === "all" ? "" : val;
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-28 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="100">None</SelectItem>
            <SelectItem value="200">Success</SelectItem>
            <SelectItem value="300">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Platform:</span>
        <Select
          value={platformFilter || "all"}
          onValueChange={(val) => {
            const v = val === "all" ? "" : val;
            setPlatformFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-28 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="MT4">MT4</SelectItem>
            <SelectItem value="MT5">MT5</SelectItem>
            <SelectItem value="cTrader">cTrader</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const bulkActionsMenu = (
    <div className="flex items-center gap-2">
      {selectedIds.length > 0 && (
        <Button
          variant="warning"
          size="sm"
          className="h-9 gap-2 shadow-lg animate-in fade-in slide-in-from-right-4"
          onClick={handleBulkRestart}
          disabled={isRestartingBulk}
        >
          <Icon icon="solar:restart-bold" height={18} className={isRestartingBulk ? "animate-spin" : ""} />
          <span>Restart Selected ({selectedIds.length})</span>
        </Button>
      )}
      {roleFilterMenu}
    </div>
  );

  return (
    <>
      <div className="flex gap-6 flex-col ">
        <div className="w-full overflow-x-auto">
          <DataTable
            title="Accounts"
            data={paginatedRows}
            columnsConfig={columns}
            downloadConfig={{
              enable: false,
            }}
            rightMenu={bulkActionsMenu}
            searchConfig={{
              enable: true,
              text: search,
              setSearchChange: (val) => {
                setSearch(val);
                setPage(1);
              },
            }}
            pagination={{
              page,
              pageSize,
              totalRows,
              onPageChange: setPage,
              onPageSizeChange: (size) => {
                setPageSize(size);
                setPage(1);
              }
            }}
            sortingConfig={{
              sorting,
              setSorting,
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
