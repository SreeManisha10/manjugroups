import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/crm/AppShell";
import { PropertyFormDialog } from "@/components/crm/PropertyFormDialog";
import { StatusChip } from "@/components/crm/StageChip";
import { EmptyState, ErrorBanner, LoadingRows } from "@/components/crm/States";
import { Button } from "@/components/kit";
import { formatINR } from "@/lib/crm/format";
import { useCrm, useLookups } from "@/lib/crm/store";
import { fetchProperties, type PropertiesResponse } from "@/lib/crm/api";
import type { UnitStatus } from "@/lib/crm/types";

export const Route = createFileRoute("/properties")({
  head: () => ({
    meta: [
      { title: "Properties & Units — Harborview Real Estate CRM" },
      {
        name: "description",
        content:
          "Browse projects, buildings and units with live price, configuration and availability for the sales team.",
      },
      { property: "og:title", content: "Properties & Units — Harborview Real Estate CRM" },
      {
        property: "og:description",
        content: "Project, building and unit inventory with availability status and pricing.",
      },
    ],
  }),
  component: PropertiesPage,
});

const CELL: Record<string, string> = {
  Available: "bg-success/20 text-success",
  Reserved: "bg-warn/20 text-warn",
  Sold: "bg-danger/20 text-danger",
};
const PAGE_SIZE = 10;

function PropertiesPage() {
  const {
    data,
    loading,
    error,
    reload,
    demoMode,
    user,
    updateUnitAssignment,
    updateUnitStatus,
  } = useCrm();
  const { users } = useLookups();
  const isEmployee = user?.role === "Sales Employee";
  const [projectName, setProjectName] = useState("all");
  const [status, setStatus] = useState("all");
  const [assignedRep, setAssignedRep] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [propertiesResponse, setPropertiesResponse] = useState<PropertiesResponse | null>(null);

  useEffect(() => {
    if (isEmployee) {
      setAssignedRep(user?.id ?? "all");
    }
  }, [isEmployee, user?.id]);

  useEffect(() => {
    if (demoMode) {
      setPropertiesResponse(null);
      setPropertiesError(null);
      return;
    }
    let active = true;
    fetchProperties({
      search: query,
      project: projectName,
      status,
      offset: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
      .then((response) => {
        if (active) {
          setPropertiesResponse(response);
          setPropertiesError(null);
        }
      })
      .catch((caught) => {
        if (active) {
          setPropertiesResponse(null);
          setPropertiesError(caught instanceof Error ? caught.message : "The properties API could not be reached.");
        }
      });
    return () => {
      active = false;
    };
  }, [query, projectName, status, page, demoMode]);

  const totalProperties = propertiesResponse?.pagination?.total ?? propertiesResponse?.data.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalProperties / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const groups = useMemo(() => {
    const projects = (data?.projects ?? []).filter(
      (p) => projectName === "all" || p.name === projectName,
    );
    return projects.map((project) => {
      const buildings = (data?.buildings ?? []).filter((b) => b.projectId === project.id);
      const units = (data?.units ?? []).filter((u) => {
        const matchesProject = buildings.some((b) => b.id === u.buildingId);
        const matchesStatus = status === "all" || u.status === status;
        const matchesQuery = !query.trim() || u.code.toLowerCase().includes(query.trim().toLowerCase());
        const matchesAssignedRep = assignedRep === "all" || (u.assignedToId ?? "") === assignedRep;
        const matchesEmployee = !isEmployee || (u.assignedToId ?? user?.id ?? "") === user?.id;
        return matchesProject && matchesStatus && matchesQuery && matchesAssignedRep && matchesEmployee;
      });
      const total = (data?.units ?? []).filter((u) => buildings.some((b) => b.id === u.buildingId));
      return {
        project,
        buildings,
        units,
        available: total.filter((u) => u.status === "Available").length,
        total,
      };
    });
  }, [data, projectName, status, query, assignedRep, isEmployee, user?.id]);

  const visibleUnits = groups.reduce((n, g) => n + g.units.length, 0);
  const allUnits = (data?.units ?? []).filter((unit) => {
    if (isEmployee) return (unit.assignedToId ?? user?.id ?? "") === user?.id;
    return assignedRep === "all" || (unit.assignedToId ?? "") === assignedRep;
  });
  const inventoryValue = allUnits.reduce((sum, unit) => sum + unit.price, 0);
  const kpis = [
    { label: "Total units", value: propertiesResponse?.kpis.totalUnits ?? allUnits.length },
    {
      label: "Available",
      value:
        propertiesResponse?.kpis.availableUnits ??
        allUnits.filter((unit) => unit.status === "Available").length,
    },
    {
      label: "Reserved",
      value:
        propertiesResponse?.kpis.reservedUnits ??
        allUnits.filter((unit) => unit.status === "Reserved").length,
    },
    {
      label: "Sold",
      value:
        propertiesResponse?.kpis.soldUnits ??
        allUnits.filter((unit) => unit.status === "Sold").length,
    },
    {
      label: "Inventory value",
      value: formatINR(propertiesResponse?.kpis.inventoryValue ?? inventoryValue),
    },
  ];
  const tableRows = (propertiesResponse?.data ?? groups.flatMap(({ project, buildings, units }) => units.map((unit) => ({
    ...unit,
    project: {
      id: project.id,
      name: project.name,
      location: project.location,
    },
    building: {
      id: unit.buildingId,
      name: buildings.find((building) => building.id === unit.buildingId)?.name ?? "—",
    },
    assignedTo: users.get(unit.assignedToId ?? "")?.name ?? "Unassigned",
  })))) as Array<
    (typeof data extends { units: infer T } ? T extends Array<infer U> ? U & { assignedTo?: string; project: { id: string; name: string; location: string }; building: { id: string; name: string } } : never : never) | {
      assignedTo?: string;
      project: { id: string; name: string; location: string };
      building: { id: string; name: string };
      id: string;
      code: string;
      type: string;
      areaSqft: number;
      price: number;
      status: string;
      assignedToId?: string | null;
    }
  >;

  return (
    <AppShell
      eyebrow="Properties"
      title="Projects, buildings & units"
      actions={
        !isEmployee ? (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            + Add property
          </Button>
        ) : undefined
      }
    >
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {propertiesError && !demoMode && (
        <ErrorBanner message={propertiesError} onRetry={reload} />
      )}

      {formOpen && <PropertyFormDialog onClose={() => setFormOpen(false)} />}

      <section className="glass animate-rise rounded-2xl p-4">
        {loading ? (
          <LoadingRows rows={2} />
        ) : (
          <div className="mb-4 grid grid-cols-2 gap-3 border-b border-border pb-4 sm:grid-cols-3 xl:grid-cols-5">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl bg-foreground/[0.03] px-3 py-2.5 ring-1 ring-border"
              >
                <div className="font-mono text-[10px] uppercase tracking-wide text-muted">
                  {kpi.label}
                </div>
                <div className="mt-1.5 text-lg font-bold tracking-tight">{kpi.value}</div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <input
            className="field max-w-xs"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search unit code…"
            aria-label="Search units"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-border bg-surface/70 px-2.5 py-1.5 text-[12px] text-muted"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by project"
            >
              <option value="all">All projects</option>
              {(data?.projects ?? []).map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            {!isEmployee && (
              <select
                className="rounded-lg border border-border bg-surface/70 px-2.5 py-1.5 text-[12px] text-muted"
                value={assignedRep}
                onChange={(e) => {
                  setAssignedRep(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by rep"
              >
                <option value="all">All reps</option>
                {(data?.users ?? []).filter((candidate) => candidate.role === "Sales Employee").map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
            )}
            <select
              className="rounded-lg border border-border bg-surface/70 px-2.5 py-1.5 text-[12px] text-muted"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
            >
              <option value="all">Any status</option>
              <option>Available</option>
              <option>Reserved</option>
              <option>Sold</option>
            </select>
            <div className="flex items-center gap-3 font-mono text-[10px] text-muted">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-success" />
                Available
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-warn" />
                Reserved
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-danger" />
                Sold
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingRows rows={5} />
        ) : visibleUnits === 0 ? (
          <EmptyState title="No units match these filters" hint="Try another project or status." />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {groups.map(({ project, units, available, total }) => (
              <div
                key={project.id}
                className="rounded-xl bg-foreground/[0.03] p-3.5 ring-1 ring-border"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-semibold">{project.name}</div>
                  <span className="font-mono text-[10px] text-muted">{project.location}</span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                  {units.map((u) => (
                    <span
                      key={u.id}
                      title={`${u.code} · ${u.type} · ${formatINR(u.price)} · ${u.status}`}
                      className={`grid h-6 place-items-center rounded font-mono text-[8px] ${CELL[u.status]}`}
                    >
                      {u.code}
                    </span>
                  ))}
                </div>
                <div className="mt-3 font-mono text-[10px] text-faint">
                  {available} of {total.length} available
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass animate-rise mt-4 rounded-2xl p-4 [animation-delay:120ms]">
        <div className="pb-3 text-[14px] font-semibold tracking-tight">Unit inventory</div>
        {loading ? (
          <LoadingRows rows={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-wide text-faint">
                  <th className="border-b border-border py-2 pr-3 font-medium">Unit</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Project</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Building</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Type</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Area</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Price</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Assigned to</th>
                  <th className="border-b border-border py-2 pl-2 text-right font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((unit) => (
                  <tr key={unit.id} className="transition-colors hover:bg-primary/5">
                    <td className="border-b border-border/60 py-3 pr-3 font-mono text-[12px]">
                      {unit.code}
                    </td>
                    <td className="border-b border-border/60 px-2 py-3 text-muted">
                      {unit.project.name}
                    </td>
                    <td className="border-b border-border/60 px-2 py-3 text-muted">
                      {unit.building.name}
                    </td>
                    <td className="border-b border-border/60 px-2 py-3">{unit.type}</td>
                    <td className="border-b border-border/60 px-2 py-3 font-mono text-[12px]">
                      {unit.areaSqft} sqft
                    </td>
                    <td className="border-b border-border/60 px-2 py-3 font-mono text-[12px]">
                      {formatINR(unit.price)}
                    </td>
                    <td className="border-b border-border/60 px-2 py-3 text-muted">
                      {!isEmployee ? (
                        <select
                          value={unit.assignedToId ?? ""}
                          onChange={(event) => {
                            void updateUnitAssignment(unit.id, event.target.value || null);
                          }}
                          className="rounded-md border border-border bg-surface px-2 py-1 text-[11px]"
                          aria-label={`Assign ${unit.code} to a rep`}
                        >
                          <option value="">Unassigned</option>
                          {(data?.users ?? []).filter((candidate) => candidate.role === "Sales Employee").map((rep) => (
                            <option key={rep.id} value={rep.id}>
                              {rep.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        unit.assignedTo ?? "Unassigned"
                      )}
                    </td>
                    <td className="border-b border-border/60 py-3 pl-2 text-right">
                      {unit.status === "Sold" ||
                      (isEmployee && unit.assignedToId !== user?.id) ? (
                        <StatusChip status={unit.status} />
                      ) : (
                        <select
                          value={unit.status}
                          onChange={(event) => {
                            void updateUnitStatus(unit.id, event.target.value as UnitStatus);
                          }}
                          className="rounded-md border border-border bg-surface px-2 py-1 text-[11px]"
                          aria-label={`Change status for ${unit.code}`}
                        >
                          <option value="Available">Available</option>
                          <option value="Reserved">Reserved</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalProperties > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-[11px] text-muted">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, totalProperties)} of {totalProperties}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded border border-border px-2 py-1 disabled:opacity-40"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  type="button"
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  className={
                    currentPage === pageNumber
                      ? "rounded bg-foreground/5 px-2 py-1 text-foreground"
                      : "rounded border border-border px-2 py-1"
                  }
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                className="rounded border border-border px-2 py-1 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
