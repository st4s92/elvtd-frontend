"use client";

import React, { ReactNode, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "src/components/ui/table";
import type { ColumnDef, SortingState, OnChangeFn } from "@tanstack/react-table";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { Icon } from "@iconify/react/dist/iconify.js";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { Label } from "src/components/ui/label";
import CardBox from "../../shared/CardBox";

interface DynamicTableProps {
  data: Array<Record<string, any>>;
  columnsConfig: ColumnDef<Record<string, any>>[];
  title: string;
  searchConfig?: {
    enable: boolean;
    text: string;
    setSearchChange: (val: string) => void;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalRows: number; // from API
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  downloadConfig?: {
    enable: boolean;
  };
  rightMenu?: ReactNode;
  sortingConfig?: {
    sorting: SortingState;
    setSorting: OnChangeFn<SortingState>;
  };
  onRowClick?: (row: Record<string, any>) => void;
}

export const DataTable: React.FC<DynamicTableProps> = ({
  data,
  columnsConfig,
  title,
  searchConfig,
  downloadConfig,
  pagination,
  rightMenu,
  sortingConfig,
  onRowClick,
}) => {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);

  const sorting = sortingConfig?.sorting ?? internalSorting;
  const setSorting = sortingConfig?.setSorting ?? setInternalSorting;

  const paginationOptions = [5, 10, 20, 50];

  // React Table Setup
  const table = useReactTable({
    data,
    columns: columnsConfig,
    state: {
      globalFilter: searchConfig?.text,
      sorting,
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.pageSize,
      },
    },
    onPaginationChange: () => { }, // DISABLED, handled by parent
    pageCount: Math.ceil(pagination.totalRows / pagination.pageSize),

    onGlobalFilterChange: searchConfig?.setSearchChange,
    onSortingChange: setSorting,

    manualPagination: true, // IMPORTANT
    manualSorting: true,
    manualFiltering: true,

    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // CSV Download
  const handleDownload = () => {
    if (!data.length) return;

    const headers = columnsConfig.map((col) => String(col.header));
    const rows = data.map((item) =>
      columnsConfig.map((col) => {
        const accessorKey = (col as any).accessorKey;
        const value = accessorKey ? item[accessorKey] : "";
        if (Array.isArray(value)) return `"[array]"`;
        return `"${String(value ?? "").replace(/"/g, '""')}"`;
      }),
    );

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "table-data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <CardBox>
      <div>
        {data.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No data available.</p>
        ) : (
          <>
            {/* Search + Download */}
            <div className="p-4 pt-0 flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-xl font-semibold mb-2">{title}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {rightMenu && rightMenu}
                {searchConfig?.enable && (
                  <Input
                    type="text"
                    className="max-w-96 lg:min-w-96 min-w-full placeholder:text-gray-400 dark:placeholder:text-white/20"
                    value={searchConfig?.text ?? ""}
                    onChange={(e) =>
                      searchConfig?.setSearchChange(e.target.value)
                    }
                    placeholder="Search your relevant items..."
                  />
                )}
                {downloadConfig?.enable && (
                  <Button
                    onClick={handleDownload}
                    className="p-2 px-4 rounded-md "
                  >
                    <Icon
                      icon="material-symbols:download-rounded"
                      width={24}
                      height={24}
                    />
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="w-full max-w-full overflow-x-auto">
              <div className="border rounded-md border-ld">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="">
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className="cursor-pointer select-none min-w-42 px-0"
                          >
                            {header.isPlaceholder ? null : (
                              <Button
                                className="flex items-center gap-1 px-4 bg-transparent hover:bg-transparent text-dark dark:text-white font-semibold"
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                                {{
                                  asc: <ArrowUp className="w-4 h-4 inline" />,
                                  desc: (
                                    <ArrowDown className="w-4 h-4 inline" />
                                  ),
                                }[header.column.getIsSorted() as string] ??
                                  (header.column.id !== "action" ? (
                                    <ChevronsUpDown className="w-2 h-2 inline" />
                                  ) : null)}
                              </Button>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>

                  <TableBody>
                    {table.getRowModel().rows.length > 0 ? (
                      table
                        .getRowModel()
                        .rows.map(
                          (row: {
                            id: React.Key | null | undefined;
                            getVisibleCells: () => any[];
                          }) => (
                            <TableRow
                              key={row.id}
                              className={`transition-colors ${onRowClick ? "cursor-pointer hover:bg-primary/20" : "hover:bg-primary/10"}`}
                              onClick={() => onRowClick && onRowClick((row as any).original)}
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell
                                  key={cell.id}
                                  className="text-gray-700 dark:text-white/70"
                                >
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ),
                        )
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columnsConfig.length}
                          className="text-center p-6 text-gray-500 dark:text-white/70 font-medium"
                        >
                          No results found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border dark:border-white/10">
              <div className="flex gap-2">
                <Button
                  onClick={() => pagination.onPageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>

                <Button
                  onClick={() => pagination.onPageChange(pagination.page + 1)}
                  disabled={
                    pagination.page >=
                    Math.ceil(pagination.totalRows / pagination.pageSize)
                  }
                >
                  Next
                </Button>
              </div>

              <div className="text-forest-black dark:text-white/90 font-medium text-base">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>

              <div className="flex items-center gap-2">
                <Label
                  htmlFor="pageSize"
                  className="mr-0 text-forest-black dark:text-white/90 text-base font-medium whitespace-nowrap min-w-32"
                >
                  Rows per page:
                </Label>
                <Select
                  value={String(pagination.pageSize)}
                  onValueChange={(value) =>
                    pagination.onPageSizeChange(Number(value))
                  }
                >
                  <SelectTrigger className="w-18! cursor-pointer">
                    <SelectValue placeholder="Page size" />
                  </SelectTrigger>
                  <SelectContent>
                    {paginationOptions.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </div>
    </CardBox>
  );
};
