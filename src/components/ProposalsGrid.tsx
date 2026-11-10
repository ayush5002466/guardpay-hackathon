import { useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type CellClassParams,
} from "ag-grid-community";
import { type PurchaseProposal, type ProposalStatus } from "@/lib/supabase";

ModuleRegistry.registerModules([AllCommunityModule]);

type Props = {
  proposals: PurchaseProposal[];
};

const statusBadgeClass = (status: ProposalStatus): string => {
  switch (status) {
    case "Approved":
      return "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
    case "Blocked":
      return "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30";
    case "Pending":
    default:
      return "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30";
  }
};

const StatusCell = (params: { value: ProposalStatus }) => (
  <span className={statusBadgeClass(params.value)}>
    <span className="w-1.5 h-1.5 rounded-full bg-current" />
    {params.value}
  </span>
);

const PriceCell = (params: { value: number }) => (
  <span className="font-mono text-slate-200 tabular-nums">
    ${params.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  </span>
);

export default function ProposalsGrid({ proposals }: Props) {
  const gridRef = useRef<AgGridReact>(null);

  const rowData = useMemo(
    () =>
      proposals.map((p) => ({
        ...p,
        created_display: new Date(p.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      })),
    [proposals]
  );

  const colDefs: ColDef<(typeof rowData)[number]>[] = useMemo(
    () => [
      {
        field: "item",
        headerName: "Item",
        flex: 2,
        minWidth: 200,
        cellClass: "text-slate-100 font-medium",
      },
      {
        field: "merchant",
        headerName: "Merchant",
        flex: 1,
        minWidth: 120,
        cellClass: "text-slate-300",
      },
      {
        field: "price",
        headerName: "Price",
        flex: 1,
        minWidth: 120,
        cellRenderer: PriceCell,
        sortable: true,
        filter: true,
        sort: "desc",
      },
      {
        field: "status",
        headerName: "Status",
        flex: 1,
        minWidth: 130,
        cellRenderer: StatusCell,
        sortable: true,
        filter: true,
      },
      {
        field: "reason",
        headerName: "Reason",
        flex: 2,
        minWidth: 180,
        cellClass: (params: CellClassParams) =>
          params.value ? "text-slate-400 text-sm" : "text-slate-600 italic text-sm",
        cellRenderer: (params: { value: string | null }) =>
          params.value ?? <span className="italic text-slate-600">—</span>,
      },
      {
        field: "created_display",
        headerName: "Date",
        flex: 1,
        minWidth: 110,
        cellClass: "text-slate-400 text-sm",
        sortable: true,
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  return (
    <div className="ag-theme-guardpay h-full w-full">
      <AgGridReact
        ref={gridRef}
        rowData={rowData}
        columnDefs={colDefs}
        defaultColDef={defaultColDef}
        animateRows={true}
        rowSelection="multiple"
        pagination={true}
        paginationPageSize={10}
        paginationPageSizeSelector={[10, 25, 50]}
        getRowId={(params) => params.data.id}
      />
    </div>
  );
}
