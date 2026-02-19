import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "src/components/utilities/table/DataTable";
import { useEffect, useState } from "react";
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
import CreateAccountFormModal from "./CreateAccountFormModal";

const AccountTable = () => {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState<string>("");

  const [openCreateAccount, setOpenCreateAccount] = useState(false);

  const fetchData = async () => {
    const res = await axiosClient.get("/users/paginated", {
      params: {
        PerPage: pageSize,
        Page: page,
      },
    });

    setRows(res.data.data);
    setTotalRows(res.data.total);
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize]);

  const columns: ColumnDef<Record<string, any>>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        return <span>{row.original.roleId === 1 ? 'Administrator' : 'User' }</span>;
      },
    },
    {
      header: "Action",
      cell: ({ row }) => {
        const userName = row.original.name;
        const userId = row.original.id;
        const userEmail = row.original.email;
        return (
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className="h-9 w-9 flex justify-center items-center rounded-full hover:bg-lightprimary hover:text-primary cursor-pointer">
                  <TbDotsVertical size={22} />
                </span>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-40 bg-blue-950 p-2 border">
                <DropdownMenuItem
                  className="flex gap-3 items-center cursor-pointer hover:bg-gray-500"
                  onSelect={() => setOpenCreateAccount(true)} // ← open modal
                >
                  <Icon icon="solar:document-add-broken" height={18} />
                  <span>Create Account</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Modal */}
            <CreateAccountFormModal
              open={openCreateAccount}
              onOpenChange={setOpenCreateAccount}
              userName={userName}
              userId={userId}
              userEmail={userEmail}
              onSuccess={() => {
                console.log("Account created!");
              }}
            />
          </TableCell>
        );
      },
    },
  ];

  return (
    <>
      <div className="flex gap-6 flex-col ">
        <div className="w-full overflow-x-auto">
          <DataTable
            title="Users"
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

export default AccountTable;
