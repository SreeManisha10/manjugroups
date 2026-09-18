import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/crm/AppShell";
import { StageChip } from "@/components/crm/StageChip";
import { EmptyState, ErrorBanner, LoadingRows } from "@/components/crm/States";
import { formatDate, formatINR, isOverdue, isToday } from "@/lib/crm/format";
import { useCrm, useLookups } from "@/lib/crm/store";
import { LEAD_STAGES } from "@/lib/crm/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sales Dashboard — Harborview Real Estate CRM" },
      {
        name: "description",
        content:
          "Track leads by stage, today's follow-ups, unit availability and monthly bookings in one real estate sales workspace.",
      },
      { property: "og:title", content: "Sales Dashboard — Harborview Real Estate CRM" },
      {
        property: "og:description",
        content: "Leads, follow-ups, property units and bookings for a real estate sales team.",
      },
    ],
  }),
  component: Dashboard,
});

const STAGE_BAR: Record<string, string> = {
  New: "bg-primary",
  Contacted: "bg-primary/60",
  "Site Visit": "bg-violet",
  Interested: "bg-violet/60",
  Negotiation: "bg-warn",
  Booked: "bg-success",
  Lost: "bg-foreground/20",
};

function Dashboard() {
  const { data, loading, error, reload, user } = useCrm();
  const { users, unitLabel } = useLookups();
  const location = useLocation();
  const isAdmin = user?.role === "Admin";
  const [todayPage, setTodayPage] = useState(0);
  const [overallPage, setOverallPage] = useState(0);
  const [todayLimit, setTodayLimit] = useState(5);
  const [overallLimit, setOverallLimit] = useState(5);

  useEffect(() => {
    reload();
  }, [reload, location.pathname]);

  const visibleLeads = useMemo(() => {
    if (!data?.leads) return [];
    if (isAdmin) return data.leads;
    return data.leads.filter((lead) => lead.assigneeId === user?.id);
  }, [data, isAdmin, user]);

  const stats = useMemo(() => {
    const leads = visibleLeads;
    const byStage = LEAD_STAGES.map((stage) => ({
      stage,
      count: leads.filter((l) => l.stage === stage).length,
    }));
    const followUps = leads
      .filter((l) => isToday(l.followUpDate) || isOverdue(l.followUpDate))
      .sort((a, b) => (a.followUpDate ?? "").localeCompare(b.followUpDate ?? ""));
    const overallFollowUps = leads
      .filter((l) => l.followUpDate)
      .sort((a, b) => (a.followUpDate ?? "").localeCompare(b.followUpDate ?? ""));
    const bookings = isAdmin
      ? data?.bookings ?? []
      : (data?.bookings ?? []).filter((booking) => {
          const lead = data?.leads.find((candidate) => candidate.id === booking.leadId);
          return lead?.assigneeId === user?.id;
        });
    const bookedValue = bookings.reduce((sum, b) => sum + b.amount, 0);
    const closed = leads.filter((l) => l.stage === "Booked").length;
    const conversion = leads.length ? Math.round((closed / leads.length) * 100) : 0;
    const available = (data?.units ?? []).filter((u) => u.status === "Available").length;
    return { leads, byStage, followUps, overallFollowUps, bookings, bookedValue, conversion, available };
  }, [visibleLeads, data, isAdmin, user]);

  const todayRows = stats.followUps.slice(todayPage * todayLimit, (todayPage + 1) * todayLimit);
  const overallRows = stats.overallFollowUps.slice(
    overallPage * overallLimit,
    (overallPage + 1) * overallLimit,
  );

  return (
    <AppShell
      eyebrow="Dashboard"
      title={user ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
      actions={
        <Link
          to="/leads"
          className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Go to leads
        </Link>
      }
    >
      {error && <ErrorBanner message={error} onRetry={reload} />}

      {loading ? (
        <div className="glass rounded-2xl p-4">
          <LoadingRows rows={6} />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="glass animate-rise rounded-2xl p-4">
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted">Leads by stage</div>
              <div className="mt-2 text-3xl font-bold tracking-tight">{stats.leads.length}</div>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-foreground/5">
                {stats.byStage.map(
                  (s) =>
                    s.count > 0 && (
                      <div
                        key={s.stage}
                        className={STAGE_BAR[s.stage]}
                        style={{ width: `${(s.count / stats.leads.length) * 100}%` }}
                      />
                    ),
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-muted">
                {stats.byStage
                  .filter((s) => s.count > 0)
                  .map((s) => (
                    <span key={s.stage}>
                      {s.count} {s.stage.toLowerCase()}
                    </span>
                  ))}
              </div>
            </div>

            <div className="glass animate-rise rounded-2xl p-4 [animation-delay:60ms]">
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted">Follow-ups due</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-bold tracking-tight">{stats.followUps.length}</span>
                <span className="mb-1 font-mono text-[11px] text-danger">
                  {stats.followUps.filter((l) => isOverdue(l.followUpDate)).length} overdue
                </span>
              </div>
              <div className="mt-3 space-y-1.5 text-[12px]">
                {stats.followUps.slice(0, 3).map((l) => (
                  <div
                    key={l.id}
                    className={isOverdue(l.followUpDate) ? "flex justify-between text-danger" : "flex justify-between"}
                  >
                    <span className="truncate">{l.name}</span>
                    <span className="font-mono text-faint">
                      {isOverdue(l.followUpDate) ? "overdue" : "today"}
                    </span>
                  </div>
                ))}
                {stats.followUps.length === 0 && (
                  <p className="text-[12px] text-muted">Nothing due today. Nice work.</p>
                )}
              </div>
            </div>

            <div className="glass animate-rise rounded-2xl p-4 [animation-delay:120ms]">
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted">Booked value</div>
              <div className="mt-2 text-3xl font-bold tracking-tight">{formatINR(stats.bookedValue)}</div>
              <div className="mt-2 font-mono text-[11px] text-success">{stats.bookings.length} units closed</div>
              <Link to="/bookings" className="mt-3 block font-mono text-[11px] text-primary hover:underline">
                View bookings →
              </Link>
            </div>

            <div className="glass animate-rise rounded-2xl p-4 [animation-delay:180ms]">
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted">Conversion</div>
              <div className="mt-2 text-3xl font-bold tracking-tight">{stats.conversion}%</div>
              <div className="mt-2 text-[12px] text-muted">{stats.available} units still available</div>
              <Link to="/properties" className="mt-3 block font-mono text-[11px] text-primary hover:underline">
                View inventory →
              </Link>
            </div>
          </section>

          <section className="glass animate-rise mt-4 rounded-2xl p-4 [animation-delay:240ms]">
            <div className="flex items-center justify-between pb-3">
              <div className="text-[14px] font-semibold tracking-tight">Stage pipeline</div>
              <div className="font-mono text-[11px] text-muted">
                {formatINR(stats.leads.filter((l) => l.stage !== "Lost").reduce((s, l) => s + l.budget, 0))} in play
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {LEAD_STAGES.filter((s) => s !== "Contacted" && s !== "Interested").map((stage) => {
                const items =
                  stage === "Booked"
                    ? stats.bookings
                        .map((booking) => {
                          const lead = data?.leads.find((candidate) => candidate.id === booking.leadId);
                          const unit = data?.units.find((candidate) => candidate.id === booking.unitId);
                          if (!lead) return null;
                          return {
                            id: booking.id,
                            name: lead.name,
                            budget: booking.amount,
                            interestedUnitId: lead.interestedUnitId ?? unit?.id ?? null,
                            source: lead.source,
                          };
                        })
                        .filter((item): item is { id: string; name: string; budget: number; interestedUnitId: string | null; source: string } => item !== null)
                    : stats.leads.filter((l) => l.stage === stage);

                return (
                  <div key={stage} className="rounded-xl bg-foreground/[0.03] p-3 ring-1 ring-border">
                    <div className="flex items-center justify-between">
                      <StageChip stage={stage} />
                      <span className="font-mono text-[11px] text-faint">{items.length}</span>
                    </div>
                    <div className="mt-2 space-y-2">
                      {items.slice(0, 3).map((item) => {
                        const label =
                          stage === "Booked"
                            ? `${item.name} · ${unitLabel(item.interestedUnitId)?.text ?? formatINR(item.budget)}`
                            : `${item.name} · ${unitLabel(item.interestedUnitId)?.text ?? formatINR(item.budget)}`;

                        return (
                          <div key={item.id} className="rounded-lg bg-surface/80 p-2.5 ring-1 ring-border">
                            <div className="text-[12px] font-medium">{item.name}</div>
                            <div className="font-mono text-[10px] text-faint">{label}</div>
                          </div>
                        );
                      })}
                      {items.length === 0 && <p className="text-[11px] text-faint">No leads</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="glass animate-rise mt-4 rounded-2xl p-4 [animation-delay:300ms]">
            <div className="flex flex-col gap-3 pb-3 md:flex-row md:items-center md:justify-between">
              <div className="text-[14px] font-semibold tracking-tight">Today &amp; overdue follow-ups</div>
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <label htmlFor="today-followup-limit">Show entries</label>
                <select
                  id="today-followup-limit"
                  value={todayLimit}
                  onChange={(event) => {
                    setTodayLimit(Number(event.target.value));
                    setTodayPage(0);
                  }}
                  className="field w-20"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
              </div>
            </div>
            {stats.followUps.length === 0 ? (
              <EmptyState title="Inbox zero" hint="No follow-ups are due today." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="font-mono text-[10px] uppercase tracking-wide text-faint">
                        <th className="border-b border-border py-2 pr-3 font-medium">Lead</th>
                        <th className="border-b border-border px-2 py-2 font-medium">Email</th>
                        <th className="border-b border-border px-2 py-2 font-medium">Source</th>
                        <th className="border-b border-border px-2 py-2 font-medium">Stage</th>
                        <th className="border-b border-border px-2 py-2 font-medium">Owner</th>
                        <th className="border-b border-border py-2 pl-2 text-right font-medium">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayRows.map((l) => (
                        <tr key={l.id} className="transition-colors hover:bg-primary/5">
                          <td className="border-b border-border/60 py-3 pr-3">
                            <div className="font-medium">{l.name}</div>
                            <div className="font-mono text-[11px] text-faint">{l.phone}</div>
                          </td>
                          <td className="border-b border-border/60 px-2 py-3 text-muted">
                            {l.email || "—"}
                          </td>
                          <td className="border-b border-border/60 px-2 py-3 text-muted">
                            {l.source || "—"}
                          </td>
                          <td className="border-b border-border/60 px-2 py-3">
                            <StageChip stage={l.stage} />
                          </td>
                          <td className="border-b border-border/60 px-2 py-3 text-muted">
                            {users.get(l.assigneeId)?.name}
                          </td>
                          <td
                            className={`border-b border-border/60 py-3 pl-2 text-right font-mono text-[11px] ${
                              isOverdue(l.followUpDate) ? "text-danger" : "text-muted"
                            }`}
                          >
                            {isOverdue(l.followUpDate) ? "overdue" : formatDate(l.followUpDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
                  <span>
                    Showing {Math.min(todayPage * todayLimit + 1, stats.followUps.length)}–
                    {Math.min((todayPage + 1) * todayLimit, stats.followUps.length)} of {stats.followUps.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={todayPage === 0}
                      onClick={() => setTodayPage((value) => Math.max(0, value - 1))}
                      className="rounded border border-border px-2 py-1 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={(todayPage + 1) * todayLimit >= stats.followUps.length}
                      onClick={() => setTodayPage((value) => value + 1)}
                      className="rounded border border-border px-2 py-1 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="glass animate-rise mt-4 rounded-2xl p-4 [animation-delay:360ms]">
            <div className="flex flex-col gap-3 pb-3 md:flex-row md:items-center md:justify-between">
              <div className="text-[14px] font-semibold tracking-tight">Overall follow-ups</div>
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <label htmlFor="overall-followup-limit">Show entries</label>
                <select
                  id="overall-followup-limit"
                  value={overallLimit}
                  onChange={(event) => {
                    setOverallLimit(Number(event.target.value));
                    setOverallPage(0);
                  }}
                  className="field w-20"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
              </div>
            </div>
            {stats.overallFollowUps.length === 0 ? (
              <EmptyState title="No follow-ups" hint="No lead has a follow-up date yet." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="font-mono text-[10px] uppercase tracking-wide text-faint">
                        <th className="border-b border-border py-2 pr-3 font-medium">Lead</th>
                        <th className="border-b border-border px-2 py-2 font-medium">Email</th>
                        <th className="border-b border-border px-2 py-2 font-medium">Source</th>
                        <th className="border-b border-border px-2 py-2 font-medium">Stage</th>
                        <th className="border-b border-border px-2 py-2 font-medium">Owner</th>
                        <th className="border-b border-border py-2 pl-2 text-right font-medium">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overallRows.map((l) => (
                        <tr key={l.id} className="transition-colors hover:bg-primary/5">
                          <td className="border-b border-border/60 py-3 pr-3">
                            <div className="font-medium">{l.name}</div>
                            <div className="font-mono text-[11px] text-faint">{l.phone}</div>
                          </td>
                          <td className="border-b border-border/60 px-2 py-3 text-muted">
                            {l.email || "—"}
                          </td>
                          <td className="border-b border-border/60 px-2 py-3 text-muted">
                            {l.source || "—"}
                          </td>
                          <td className="border-b border-border/60 px-2 py-3">
                            <StageChip stage={l.stage} />
                          </td>
                          <td className="border-b border-border/60 px-2 py-3 text-muted">
                            {users.get(l.assigneeId)?.name}
                          </td>
                          <td
                            className={`border-b border-border/60 py-3 pl-2 text-right font-mono text-[11px] ${
                              isOverdue(l.followUpDate) ? "text-danger" : "text-muted"
                            }`}
                          >
                            {isOverdue(l.followUpDate) ? "overdue" : formatDate(l.followUpDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
                  <span>
                    Showing {Math.min(overallPage * overallLimit + 1, stats.overallFollowUps.length)}–
                    {Math.min((overallPage + 1) * overallLimit, stats.overallFollowUps.length)} of {stats.overallFollowUps.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={overallPage === 0}
                      onClick={() => setOverallPage((value) => Math.max(0, value - 1))}
                      className="rounded border border-border px-2 py-1 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={(overallPage + 1) * overallLimit >= stats.overallFollowUps.length}
                      onClick={() => setOverallPage((value) => value + 1)}
                      className="rounded border border-border px-2 py-1 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
