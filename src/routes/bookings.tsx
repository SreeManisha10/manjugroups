import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/crm/AppShell";
import { EmptyState, ErrorBanner, LoadingRows } from "@/components/crm/States";
import { Button, Modal } from "@/components/kit";
import { formatDate, formatINR } from "@/lib/crm/format";
import { useCrm, useLookups } from "@/lib/crm/store";
import { notifyError, notifySuccess } from "@/lib/crm/notifications";
import {
  fetchBookings,
  fetchLeads,
  type BookingApiRecord,
  type BookingsResponse,
  type LeadsResponse,
} from "@/lib/crm/api";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings — Harborview Real Estate CRM" },
      {
        name: "description",
        content:
          "Every confirmed unit booking with customer, agent and value, protected against double booking.",
      },
      { property: "og:title", content: "Bookings — Harborview Real Estate CRM" },
      {
        property: "og:description",
        content:
          "Confirmed property bookings linking customers to units, with cancellation control.",
      },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const navigate = useNavigate();
  const {
    data,
    loading,
    error,
    reload,
    demoMode,
    user,
    cancelBooking,
    createBooking,
  } = useCrm();
  const { users, unitLabel } = useLookups();
  const [leadId, setLeadId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [search, setSearch] = useState("");
  const [leadFilter, setLeadFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<BookingApiRecord | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [remoteBookings, setRemoteBookings] = useState<BookingsResponse | null>(null);
  const [remoteLeadData, setRemoteLeadData] = useState<LeadsResponse["data"] | null>(null);
  const [bookingsApiError, setBookingsApiError] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode) {
      setRemoteBookings(null);
      setBookingsApiError(null);
      return;
    }
    let active = true;
    fetchBookings({
      search,
      lead: leadFilter,
      unit: unitFilter,
      agent: agentFilter,
      offset: (page - 1) * 10,
      limit: 10,
    })
      .then((response) => {
        if (active) {
          setRemoteBookings(response);
          setBookingsApiError(null);
        }
      })
      .catch((caught) => {
        if (active) {
          setRemoteBookings(null);
          setBookingsApiError(caught instanceof Error ? caught.message : "The bookings API could not be reached.");
        }
      });
    return () => {
      active = false;
    };
  }, [search, leadFilter, unitFilter, agentFilter, page, demoMode]);

  useEffect(() => {
    if (demoMode) {
      setRemoteLeadData(null);
      return;
    }
    let active = true;
    fetchLeads({ search: "", stage: "all", assignee: "all", offset: 0, limit: 10 })
      .then((response) => {
        if (active) setRemoteLeadData(response.data);
      })
      .catch((caught) => {
        if (active) {
          setRemoteLeadData(null);
          setBookingsApiError(caught instanceof Error ? caught.message : "The leads API could not be reached.");
        }
      });
    return () => {
      active = false;
    };
  }, [demoMode]);

  const bookings: BookingApiRecord[] = remoteBookings?.data ?? data?.bookings ?? [];
  const totalBookings = remoteBookings?.pagination?.total ?? bookings.length;
  const totalPages = Math.max(1, Math.ceil(totalBookings / 10));
  const currentPage = Math.min(page, totalPages);
  const bookingFilters = remoteBookings?.data ?? [];
  const bookableLeads = (remoteLeadData ?? data?.leads ?? []).filter(
    (l) => l.stage !== "Booked" && l.stage !== "Lost",
  );
  const availableUnits = remoteLeadData
    ? remoteLeadData
        .filter((lead) => lead.stage !== "Booked" && lead.stage !== "Lost")
        .flatMap((lead) => {
          const unit = lead.interestedUnit;
          if (!unit || (unit.status && unit.status !== "Available")) return [];
          return [{ ...unit, id: unit.id ?? unit.code }];
        })
        .filter((unit, index, units) => units.findIndex((item) => item.code === unit.code) === index)
    : (data?.units ?? []).filter((u) => u.status === "Available");
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    if (!isAdmin) {
      navigate({ to: "/leads" });
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) {
    return (
      <AppShell eyebrow="Bookings" title="Restricted access">
        <section className="glass animate-rise rounded-2xl p-5">
          <div className="text-lg font-semibold">Booking access is limited to admins.</div>
          <p className="mt-2 text-sm text-muted">
            Only authorized managers can view and manage bookings in this workspace.
          </p>
        </section>
      </AppShell>
    );
  }

  async function book() {
    setBusy(true);
    try {
      const selectedLead = bookableLeads.find((lead) => lead.id === leadId);
      const selectedUnit = availableUnits.find((unit) => unit.id === unitId);
      if (!selectedLead || !selectedUnit) throw new Error("Select a lead and unit.");
      const selectedBuilding =
        "buildingId" in selectedUnit
          ? data?.buildings.find((building) => building.id === selectedUnit.buildingId)
          : undefined;
      const selectedProject = data?.projects.find(
        (project) => project.id === selectedBuilding?.projectId,
      );
      const remotePropertyName =
        "property" in selectedLead ? selectedLead.property?.name : undefined;
      await createBooking(
        selectedLead.name,
        remotePropertyName ?? selectedProject?.name ?? "",
        selectedUnit.code,
      );
      await reload();
      setRemoteBookings(await fetchBookings());
      setLeadId("");
      setUnitId("");
      await notifySuccess("Booking confirmed", "The unit is now marked as sold.");
    } catch (e) {
      await notifyError(
        "Booking failed",
        e instanceof Error ? e.message : "The booking could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancelBooking() {
    if (!cancelTarget) return;
    setCancelBusy(true);
    try {
      await cancelBooking(cancelTarget.id);
      await reload();
      setRemoteBookings(await fetchBookings());
      setCancelTarget(null);
      await notifySuccess("Booking cancelled", "The unit is available again.");
    } catch (e) {
      await notifyError(
        "Cancellation failed",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <AppShell
      eyebrow="Bookings"
      title="Confirmed bookings"
    >
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {bookingsApiError && !demoMode && (
        <ErrorBanner message={bookingsApiError} onRetry={reload} />
      )}

      <section className="glass animate-rise rounded-2xl p-4">
        <div className="text-[14px] font-semibold tracking-tight">New booking</div>
        <p className="mt-1 text-[12px] text-muted">
          A unit can only be booked once — the second attempt on the same unit is rejected.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            className="field max-w-xs"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            aria-label="Select lead"
          >
            <option value="">Select a lead</option>
            {bookableLeads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} · {l.stage}
              </option>
            ))}
          </select>
          <select
            className="field max-w-xs"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            aria-label="Select unit"
          >
            <option value="">Select an available unit</option>
            {availableUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code} · {u.type} · {formatINR(u.price ?? 0)}
              </option>
            ))}
          </select>
          <button
            disabled={!leadId || !unitId || busy}
            onClick={book}
            className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {busy ? "Booking…" : "Confirm booking"}
          </button>
        </div>
      </section>

      <section className="glass animate-rise mt-4 rounded-2xl p-4 [animation-delay:120ms]">
        <div className="flex items-center justify-between pb-3">
          <div className="text-[14px] font-semibold tracking-tight">All bookings</div>
          <div className="font-mono text-[11px] text-muted">
            {formatINR(bookings.reduce((s, b) => s + b.amount, 0))} total
          </div>
        </div>
        <div className="mb-4 grid gap-2 border-b border-border pb-4 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className="field"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search bookings…"
            aria-label="Search bookings"
          />
          <select
            className="field"
            value={leadFilter}
            onChange={(event) => {
              setLeadFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by lead"
          >
            <option value="all">All leads</option>
            {Array.from(new Set([
              ...(data?.leads ?? []).map((lead) => lead.name),
              ...bookingFilters.flatMap((booking) => (booking.lead ? [booking.lead] : [])),
            ])).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select
            className="field"
            value={unitFilter}
            onChange={(event) => {
              setUnitFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by unit"
          >
            <option value="all">All units</option>
            {Array.from(new Set([
              ...(data?.units ?? []).map((unit) => unit.code),
              ...bookingFilters.flatMap((booking) => (booking.unit ? [booking.unit] : [])),
            ])).map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
          <select
            className="field"
            value={agentFilter}
            onChange={(event) => {
              setAgentFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by agent"
          >
            <option value="all">All agents</option>
            {Array.from(new Set([
              ...(data?.users ?? []).map((user) => user.name),
              ...bookingFilters.flatMap((booking) => (booking.agent ? [booking.agent] : [])),
            ])).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <LoadingRows rows={4} />
        ) : bookings.length === 0 ? (
          <EmptyState title="No bookings yet" hint="Confirm a booking above to see it here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-wide text-faint">
                  <th className="border-b border-border py-2 pr-3 font-medium">Customer</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Unit</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Agent</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Booked on</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Value</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Balance</th>
                  <th className="border-b border-border py-2 pl-2 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const lead = b.leadId
                    ? (data?.leads ?? []).find((l) => l.id === b.leadId)
                    : undefined;
                  const localUnit = b.unitId
                    ? (data?.units ?? []).find((unit) => unit.id === b.unitId)
                    : undefined;
                  const localBuilding = localUnit
                    ? (data?.buildings ?? []).find(
                        (building) => building.id === localUnit.buildingId,
                      )
                    : undefined;
                  const localProject = localBuilding
                    ? (data?.projects ?? []).find(
                        (project) => project.id === localBuilding.projectId,
                      )
                    : undefined;
                  const remoteLead = remoteLeadData?.find(
                    (item) =>
                      item.id === b.leadId ||
                      (b.lead && item.name.toLowerCase() === b.lead.toLowerCase()),
                  );
                  const balance =
                    remoteLead?.balanceAmount ??
                    remoteLead?.balance ??
                    b.balanceAmount ??
                    b.balance;
                  return (
                    <tr key={b.id} className="transition-colors hover:bg-primary/5">
                      <td className="border-b border-border/60 py-3 pr-3">
                        <div className="font-medium">{b.lead ?? lead?.name ?? "Unknown"}</div>
                        <div className="font-mono text-[11px] text-faint">{lead?.phone}</div>
                      </td>
                      <td className="border-b border-border/60 px-2 py-3 text-muted">
                        {b.unitName ?? localProject?.name ?? "—"}
                        {b.unit ?? localUnit?.code
                          ? ` · ${b.unit ?? localUnit?.code}`
                          : ""}
                      </td>
                      <td className="border-b border-border/60 px-2 py-3 text-muted">
                        {b.agent ?? (b.agentId ? users.get(b.agentId)?.name : undefined) ?? "—"}
                      </td>
                      <td className="border-b border-border/60 px-2 py-3 font-mono text-[12px]">
                        {formatDate((b.bookedOn ?? b.createdAt).slice(0, 10))}
                      </td>
                      <td className="border-b border-border/60 px-2 py-3 font-mono text-[12px]">
                        {formatINR(b.price ?? b.amount)}
                      </td>
                      <td className="border-b border-border/60 px-2 py-3 font-mono text-[12px]">
                        {balance !== undefined && balance !== null && balance !== ""
                          ? formatINR(Number(balance))
                          : "—"}
                      </td>
                      <td className="border-b border-border/60 py-3 pl-2 text-right">
                        <button
                          disabled={!isAdmin}
                          onClick={() => setCancelTarget(b)}
                          title={isAdmin ? "Cancel booking" : "Only an admin can cancel"}
                          className="rounded-lg border border-border px-2.5 py-1 font-mono text-[11px] text-muted transition-colors hover:bg-foreground/5 disabled:opacity-40"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalBookings > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-[11px] text-muted">
            <span>
              Showing {(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, totalBookings)} of {totalBookings}
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
                  className={currentPage === pageNumber
                    ? "rounded bg-foreground/5 px-2 py-1 text-foreground"
                    : "rounded border border-border px-2 py-1"}
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

      {cancelTarget && (
        <Modal
          eyebrow="Cancel booking"
          title="Cancel booking"
          onClose={() => setCancelTarget(null)}
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setCancelTarget(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={confirmCancelBooking}
                disabled={cancelBusy}
                className="bg-[#e64942] text-white hover:bg-[#d13b35]"
              >
                {cancelBusy ? "Cancelling…" : "Delete"}
              </Button>
            </>
          }
        >
          <p className="mt-2 text-[13px] text-muted">
            Are you sure you want to cancel this booking? The unit will become available again and
            the lead will return to Negotiation.
          </p>
        </Modal>
      )}
    </AppShell>
  );
}
