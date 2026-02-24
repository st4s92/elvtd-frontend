import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "src/components/utilities/table/DataTable";
import { useEffect, useState } from "react";
import axiosClient from "src/lib/axios";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@radix-ui/react-dropdown-menu";
import { TbDotsVertical } from "react-icons/tb";
import { TableCell } from "src/components/ui/table";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Button } from "src/components/ui/button";
import CreateSymbolMapFormModal from "./CreateSymbolMapFormModal";

const SymbolMapTable = () => {
    const [rows, setRows] = useState<Record<string, any>[]>([]);
    const [totalRows, setTotalRows] = useState(0);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState<string>("");

    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [editData, setEditData] = useState<Record<string, any> | null>(null);

    const fetchData = async () => {
        try {
            const res: any = await axiosClient.get("/trader/symbol-map");

            const fetchedData = res.data || [];

            const startIndex = (page - 1) * pageSize;
            const paginatedItems = fetchedData.slice(startIndex, startIndex + pageSize);

            setRows(paginatedItems);
            setTotalRows(fetchedData.length);
        } catch (err) {
            console.error("Failed to fetch symbol maps", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, pageSize]);

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this mapping?")) {
            try {
                await axiosClient.delete(`/trader/symbol-map/${id}`);
                fetchData();
            } catch (err) {
                console.error("Failed to delete", err);
                alert("Failed to delete mapping");
            }
        }
    };

    const columns: ColumnDef<Record<string, any>>[] = [
        {
            accessorKey: "brokerName",
            header: "Broker Name",
        },
        {
            accessorKey: "brokerSymbol",
            header: "Broker Symbol (MT4/5)",
        },
        {
            accessorKey: "canonicalSymbol",
            header: "Canonical Symbol",
        },
        {
            header: "Action",
            cell: ({ row }) => {
                const rowData = row.original;
                return (
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <span className="h-9 w-9 flex justify-center items-center rounded-full hover:bg-lightprimary hover:text-primary cursor-pointer">
                                    <TbDotsVertical size={22} />
                                </span>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-40 bg-blue-950 p-2 border z-50 rounded-md shadow-lg">
                                <DropdownMenuItem
                                    className="flex gap-3 items-center cursor-pointer hover:bg-gray-500 p-2 rounded"
                                    onSelect={() => {
                                        setEditData(rowData);
                                        setOpenCreateModal(true);
                                    }}
                                >
                                    <Icon icon="solar:pen-bold" height={18} />
                                    <span>Edit</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="h-[1px] bg-slate-700 my-1" />

                                <DropdownMenuItem
                                    className="flex gap-3 items-center cursor-pointer hover:bg-red-500 p-2 rounded text-red-100"
                                    onSelect={() => handleDelete(rowData.id)}
                                >
                                    <Icon icon="solar:trash-bin-trash-bold" height={18} />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                );
            },
        },
    ];

    return (
        <>
            <div className="flex gap-6 flex-col">
                <div className="flex justify-end">
                    <Button
                        onClick={() => {
                            setEditData(null);
                            setOpenCreateModal(true);
                        }}
                        className="flex gap-2 items-center"
                    >
                        <Icon icon="solar:add-circle-linear" height={20} />
                        <span>Add Mapping</span>
                    </Button>
                </div>

                <div className="w-full overflow-x-auto">
                    <DataTable
                        title="Global Symbol Map"
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

            <CreateSymbolMapFormModal
                open={openCreateModal}
                onOpenChange={(isOpen) => {
                    setOpenCreateModal(isOpen);
                    if (!isOpen) setEditData(null);
                }}
                editData={editData}
                onSuccess={fetchData}
            />
        </>
    );
};

export default SymbolMapTable;
