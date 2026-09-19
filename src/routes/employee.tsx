import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/crm/AppShell";
import { StageChip } from "@/components/crm/StageChip";
import { useCrm, useLookups } from "@/lib/crm/store";
import { formatINR } from "@/lib/crm/format";

export const Route = createFileRoute("/employee")({
  head: () => ({
    meta: [
      { title: "Sales Rep Workspace — Manju Groups" },
      {
        name: "description",
        content: "Track personal pipeline, KPI scorecard, assignment queue and customer follow-ups.",
      },
    ],
  }),
  component: EmployeePage,
});

function EmployeePage() {
  const { user, data } = useCrm();
  const { users, unitLabel } = useLookups();

  const myLeads = (data?.leads ?? []).filter((lead) => lead.assigneeId === user?.id);
  const activeLeads = myLeads.filter((lead) => lead.stage !== "Lost");
  const bookedValue = (data?.bookings ?? [])
    .filter((booking) => {
      const lead = data?.leads.find((candidate) => candidate.id === booking.leadId);
      return lead?.assigneeId === user?.id;
    })
    .reduce((sum, booking) => sum + booking.amount, 0);

  const assignedUnits = (data?.units ?? []).filter((unit) => {
    const lead = myLeads.find((candidate) => candidate.interestedUnitId === unit.id);
    return Boolean(lead) && unit.status !== "Sold";
  });

  const kpis = [
    { label: "Active leads", value: activeLeads.length },
    { label: "Booked value", value: formatINR(bookedValue) },
    { label: "Conversion", value: `${myLeads.length ? Math.round((myLeads.filter((lead) => lead.stage === "Booked").length / myLeads.length) * 100) : 0}%` },
    { label: "Follow-ups due", value: myLeads.filter((lead) => lead.followUpDate).length },
  ];

  const focusQueue = myLeads
    .slice()
    .sort((a, b) => (a.followUpDate ?? "9999-12-31").localeCompare(b.followUpDate ?? "9999-12-31"))
    .slice(0, 4);

  return (
    <AppShell
      eyebrow="Sales rep workspace"
      title={`My day, ${user?.name.split(" ")[0] ?? "there"}`}
      actions={
        <Link
          to="/leads"
          className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Open pipeline
        </Link>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass animate-rise rounded-2xl p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{kpi.label}</div>
            <div className="mt-3 text-3xl font-bold tracking-tight">{kpi.value}</div>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="glass animate-rise rounded-2xl p-4">
          <div className="flex items-center justify-between pb-3">
            <div className="text-[14px] font-semibold tracking-tight">Priority queue</div>
            <div className="font-mono text-[11px] text-muted">{focusQueue.length} leads</div>
          </div>

          <div className="space-y-3">
            {focusQueue.map((lead) => (
              <div key={lead.id} className="rounded-xl border border-border bg-foreground/[0.02] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{lead.name}</div>
                    <div className="font-mono text-[10px] text-muted">{lead.source} · {lead.phone}</div>
                  </div>
                  <StageChip stage={lead.stage} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
                  <span>{lead.email || "No email on file"}</span>
                  <span className="font-mono text-[11px] text-faint">
                    {lead.followUpDate ? `Due ${lead.followUpDate}` : "Follow-up pending"}
                  </span>
                </div>
              </div>
            ))}

            {focusQueue.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
                No active follow-ups yet. Perfect time to prospect and refresh your funnel.
              </div>
            )}
          </div>
        </div>

        <div className="glass animate-rise rounded-2xl p-4 [animation-delay:60ms]">
          <div className="text-[14px] font-semibold tracking-tight">Assigned inventory</div>
          <div className="mt-3 space-y-3">
            {assignedUnits.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
                No units assigned to you right now.
              </div>
            ) : (
              assignedUnits.slice(0, 4).map((unit) => {
                const label = unitLabel(unit.id);
                return (
                  <div key={unit.id} className="rounded-xl border border-border bg-foreground/[0.02] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{label?.project?.name ?? "Project"} · {unit.code}</div>
                      <span className="rounded-full bg-success/10 px-2 py-0.5 font-mono text-[10px] text-success">
                        {unit.status}
                      </span>
                    </div>
                    <div className="mt-2 font-mono text-[10px] text-muted">
                      {unit.type} · {unit.areaSqft} sqft · {formatINR(unit.price)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="glass animate-rise rounded-2xl p-4">
          <div className="text-[14px] font-semibold tracking-tight">Customer momentum</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-foreground/[0.02] p-3 ring-1 ring-border">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">New</div>
              <div className="mt-2 text-2xl font-bold">{myLeads.filter((lead) => lead.stage === "New").length}</div>
            </div>
            <div className="rounded-xl bg-foreground/[0.02] p-3 ring-1 ring-border">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Site visits</div>
              <div className="mt-2 text-2xl font-bold">{myLeads.filter((lead) => lead.stage === "Site Visit").length}</div>
            </div>
            <div className="rounded-xl bg-foreground/[0.02] p-3 ring-1 ring-border">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Booked</div>
              <div className="mt-2 text-2xl font-bold">{myLeads.filter((lead) => lead.stage === "Booked").length}</div>
            </div>
          </div>
        </div>

        <div className="glass animate-rise rounded-2xl p-4 [animation-delay:90ms]">
          <div className="text-[14px] font-semibold tracking-tight">Rep note</div>
          <div className="mt-4 rounded-xl bg-primary/5 p-3 text-sm text-foreground ring-1 ring-primary/10">
            Best next action: follow up with the leads still in negotiation, keep the unit shortlist warm, and push the most engaged buyers into site visits before the end of the week.
          </div>
          <div className="mt-3 flex gap-2">
            <Link to="/chat" className="rounded-lg border border-border px-3 py-2 text-[12px] text-foreground hover:bg-foreground/[0.03]">
              Review chats
            </Link>
            <Link to="/properties" className="rounded-lg bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground hover:bg-primary/90">
              View portfolio
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
