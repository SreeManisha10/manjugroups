import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/crm/AppShell";
import { LeadDrawer } from "@/components/crm/LeadDrawer";
import { LeadFormDialog } from "@/components/crm/LeadFormDialog";
import { StageChip } from "@/components/crm/StageChip";
import { EmptyState, ErrorBanner, LoadingRows } from "@/components/crm/States";
import { Button, Modal } from "@/components/kit";
import { formatDate, formatINR, isOverdue } from "@/lib/crm/format";
import { useCrm, useLookups } from "@/lib/crm/store";
import { fetchLeads, type LeadsResponse } from "@/lib/crm/api";
import { isApiConfigured } from "@/api/axios";
import { LEAD_STAGES, type Lead } from "@/lib/crm/types";
import { notifySuccess } from "@/lib/crm/notifications";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Harborview Real Estate CRM" },
      {
        name: "description",
        content:
          "Create, search, filter and assign property leads across every sales stage with notes and follow-ups.",
      },
      { property: "og:title", content: "Leads — Harborview Real Estate CRM" },
      {
        property: "og:description",
        content: "Search, filter and manage real estate leads by stage, owner and follow-up date.",
      },
    ],
  }),
  component: LeadsPage,
});

const PAGE_SIZE = 10;
type DisplayLead = Lead & {
  assigneeName?: string | undefined;
  propertyName?: string | undefined;
  buildingName?: string | undefined;
  unitText?: string | undefined;
  unitType?: string | undefined;
  unitArea?: number | undefined;
  unitPrice?: number | undefined;
};

function LeadsPage() {
  const { data, loading, error, reload, deleteLead, user } = useCrm();
  const { users, unitLabel } = useLookups();
  const isAdmin = user?.role === "Admin";

  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [formLead, setFormLead] = useState<Lead | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [remoteLeads, setRemoteLeads] = useState<DisplayLead[] | null>(null);
  const [remoteTotal, setRemoteTotal] = useState(0);
  const [remoteLoading, setRemoteLoading] = useState(true);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DisplayLead | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin && user?.id) {
      setAssignee(user.id);
    }
  }, [isAdmin, user?.id]);

  useEffect(() => {
    let active = true;
    const effectiveAssignee = isAdmin ? assignee : user?.id ?? "all";
    fetchLeads({
      search: query.trim(),
      stage,
      assignee: effectiveAssignee === "all" ? "all" : (users.get(effectiveAssignee)?.name ?? "all"),
      offset: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
      .then((response: LeadsResponse) => {
        if (!active) return;
        const pagination = response.pagination ?? {
          offset: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
          total: response.data.length,
          hasNext: false,
          hasPrevious: false,
        };
        setRemoteLoading(false);
        setRemoteError(null);
        setRemoteLeads(
          response.data.map((lead) => {
            const normalisedFollowUpDate =
              typeof lead.followUpDate === "string" &&
              lead.followUpDate !== "0000-00-00" &&
              /^\d{4}-\d{2}-\d{2}$/.test(lead.followUpDate)
                ? lead.followUpDate
                : null;

            const propertyName = lead.property?.name ?? undefined;
            const buildingName =
              lead.property?.building ?? lead.interestedUnit?.building ?? undefined;

            const assigneeId =
              lead.assigneeId && lead.assigneeId !== ""
                ? lead.assigneeId
                : (lead.assignee?.id ?? lead.id);
            const interestedUnitId =
              lead.interestedUnitId && lead.interestedUnitId !== ""
                ? lead.interestedUnitId
                : (lead.interestedUnit?.id ?? null);

            return {
              ...lead,
              followUpDate: normalisedFollowUpDate,
              assigneeId,
              interestedUnitId,
              assigneeName: lead.assignee?.name ?? undefined,
              propertyName,
              buildingName,
              unitText: lead.interestedUnit
                ? `${lead.interestedUnit.code} · ${lead.interestedUnit.type}`
                : undefined,
              unitType: lead.interestedUnit?.type ?? undefined,
              unitArea: lead.interestedUnit?.area ?? undefined,
              unitPrice: lead.interestedUnit?.price ?? undefined,
            };
          }),
        );
        setRemoteTotal(pagination.total ?? response.data.length);
      })
      .catch(() => {
        if (active) {
          setRemoteLoading(false);
          setRemoteError("Leads API returned no usable data. Check the endpoint response.");
          setRemoteLeads(isApiConfigured ? [] : null);
          setRemoteTotal(0);
        }
      });
    return () => {
      active = false;
    };
  }, [query, stage, assignee, page, users, isAdmin, user?.id]);

  const effectiveAssignee = isAdmin ? assignee : user?.id ?? "all";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.leads ?? []).filter((l) => {
      const matchesQuery =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q);
      const matchesStage = stage === "all" || l.stage === stage;
      const matchesAssignee = effectiveAssignee === "all" || l.assigneeId === effectiveAssignee;
      return matchesQuery && matchesStage && matchesAssignee;
    });
  }, [data, query, stage, effectiveAssignee]);

  const pages = Math.max(1, Math.ceil((remoteLeads ? remoteTotal : filtered.length) / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows: DisplayLead[] =
    remoteLeads ?? filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const selectedLead =
    rows.find((l) => l.id === selected) ??
    (data?.leads ?? []).find((l) => l.id === selected) ??
    null;

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteLead(deleteTarget.id);
      setRemoteLeads((current) =>
        current ? current.filter((lead) => lead.id !== deleteTarget.id) : current,
      );
      setRemoteTotal((total) => Math.max(0, total - 1));
      setSelected(null);
      setDeleteTarget(null);
      reload();
      await notifySuccess("Lead deleted successfully.");
    } catch {
      setDeleteTarget(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <AppShell
      eyebrow="Leads"
      title="All leads"
      actions={
        <button
          onClick={() => {
            setFormLead(null);
            setFormOpen(true);
          }}
          className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          New lead
        </button>
      }
    >
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {remoteError && <ErrorBanner message={remoteError} />}

      <section className="glass animate-rise rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <input
            className="field max-w-xs"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, phone or email…"
            aria-label="Search leads"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-border bg-surface/70 px-2.5 py-1.5 text-[12px] text-muted"
              value={stage}
              onChange={(e) => {
                setStage(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by stage"
            >
              <option value="all">All stages</option>
              {LEAD_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {isAdmin && (
              <select
                className="rounded-lg border border-border bg-surface/70 px-2.5 py-1.5 text-[12px] text-muted"
                value={assignee}
                onChange={(e) => {
                  setAssignee(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by assignee"
              >
                <option value="all">All assignees</option>
                {(data?.users ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {loading || remoteLoading ? (
          <LoadingRows rows={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No leads match these filters"
            hint="Try clearing the search or picking a different stage."
            action={
              <button
                onClick={() => {
                  setQuery("");
                  setStage("all");
                  setAssignee("all");
                }}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-foreground/5"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-wide text-faint">
                  <th className="border-b border-border py-2 pr-3 font-medium">Lead</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Property</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Budget</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Stage</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Assignee</th>
                  <th className="border-b border-border px-2 py-2 text-center font-medium">
                    Actions
                  </th>
                  <th className="border-b border-border py-2 pl-2 text-right font-medium">
                    Follow-up
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelected(l.id)}
                    className="cursor-pointer transition-colors hover:bg-primary/5"
                  >
                    <td className="border-b border-border/60 py-3 pr-3">
                      <div className="font-medium">{l.name}</div>
                      <div className="font-mono text-[11px] text-faint">{l.phone}</div>
                    </td>
                    <td className="border-b border-border/60 px-2 py-3 text-muted">
                      {l.propertyName || l.unitText || unitLabel(l.interestedUnitId)?.text ? (
                        <div className="leading-snug">
                          <div className="font-medium text-foreground">
                            {l.propertyName ?? unitLabel(l.interestedUnitId)?.project?.name ?? "—"}
                          </div>
                          <div className="text-[11px] text-faint">
                            {l.buildingName ?? unitLabel(l.interestedUnitId)?.building?.name ?? "—"}
                            {l.unitText ? ` · ${l.unitText}` : ""}
                            {l.unitType ? ` · ${l.unitType}` : ""}
                            {typeof l.unitArea === "number" ? ` · ${l.unitArea} sqft` : ""}
                            {typeof l.unitPrice === "number"
                              ? ` · ₹${l.unitPrice.toLocaleString("en-IN")}`
                              : ""}
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="border-b border-border/60 px-2 py-3 font-mono text-[12px]">
                      {formatINR(l.budget)}
                    </td>
                    <td className="border-b border-border/60 px-2 py-3">
                      <StageChip stage={l.stage} />
                    </td>
                    <td className="border-b border-border/60 px-2 py-3 text-muted">
                      {l.assigneeName ?? users.get(l.assigneeId)?.name}
                    </td>
                    <td className="border-b border-border/60 px-2 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setFormLead({
                              ...l,
                              budget: l.budget ?? 0,
                              assigneeId:
                                l.assigneeId && l.assigneeId !== ""
                                  ? l.assigneeId
                                  : l.id,
                              interestedUnitId:
                                l.interestedUnitId && l.interestedUnitId !== ""
                                  ? l.interestedUnitId
                                  : null,
                              followUpDate: l.followUpDate ?? null,
                            });
                            setFormOpen(true);
                          }}
                          className="rounded border border-border px-2 py-1 text-[11px] text-foreground transition-colors hover:bg-foreground/5"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(l);
                          }}
                          className="rounded border border-danger/30 px-2 py-1 text-[11px] text-danger transition-colors hover:bg-danger/10"
                        >
                          Delete
                        </button>
                      </div>
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
        )}

        {!loading && (remoteLeads ? remoteTotal : filtered.length) > 0 && (
          <div className="flex items-center justify-between pt-3 font-mono text-[11px] text-faint">
            <span>
              Showing {rows.length} of {remoteLeads ? remoteTotal : filtered.length}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-border px-2 py-1 transition-colors hover:bg-foreground/5"
              >
                ‹
              </button>
              {Array.from({ length: pages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={
                    current === i + 1
                      ? "rounded bg-foreground/5 px-2 py-1 text-foreground"
                      : "rounded border border-border px-2 py-1 transition-colors hover:bg-foreground/5"
                  }
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="rounded border border-border px-2 py-1 transition-colors hover:bg-foreground/5"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </section>

      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setFormLead(selectedLead);
            setFormOpen(true);
            setSelected(null);
          }}
        />
      )}

      {formOpen && (
        <LeadFormDialog
          lead={formLead}
          onClose={() => setFormOpen(false)}
          onSaved={(nextLead) => {
            setRemoteLeads((current) =>
              current
                ? current.map((lead) => (lead.id === nextLead.id ? { ...lead, ...nextLead } : lead))
                : current,
            );
            setFormOpen(false);
          }}
        />
      )}

      {deleteTarget && (
        <Modal
          eyebrow="Delete lead"
          title="Delete lead"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={confirmDelete} disabled={deleteBusy}>
                {deleteBusy ? "Deleting…" : "Delete"}
              </Button>
            </>
          }
        >
          <p className="mt-2 text-[13px] text-muted">
            Are you sure you want to delete this record?
          </p>
        </Modal>
      )}
    </AppShell>
  );
}
