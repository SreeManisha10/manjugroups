import { useMemo, useState } from "react";
import { StageChip } from "./StageChip";
import { EmptyState } from "./States";
import { Button, Drawer, Input, Select, SubHeading } from "@/components/kit";
import { formatDate, formatINR, isOverdue } from "@/lib/crm/format";
import { useCrm, useLookups } from "@/lib/crm/store";
import { LEAD_STAGES, type Lead } from "@/lib/crm/types";
import { confirmAction, notifyError, notifySuccess } from "@/lib/crm/notifications";

export function LeadDrawer({
  lead,
  onClose,
  onEdit,
}: {
  lead: Lead;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { data, user, addNote, updateLead, createBooking } = useCrm();
  const { users, unitLabel } = useLookups();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [unitId, setUnitId] = useState(lead.interestedUnitId ?? "");

  const notes = useMemo(
    () => (data?.notes ?? []).filter((n) => n.leadId === lead.id),
    [data, lead.id],
  );
  const unit = unitLabel(lead.interestedUnitId);
  const availableUnits = (data?.units ?? []).filter((u) => u.status === "Available");
  const canEdit = user?.role === "Admin" || user?.id === lead.assigneeId;

  async function guard(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await notifySuccess("Updated", "The lead details are now up to date.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed.");
      await notifyError("Action failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      eyebrow="Lead detail"
      title={lead.name}
      subtitle={`${lead.phone}${unit ? ` · ${unit.text}` : ""}`}
      onClose={onClose}
    >
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StageChip stage={lead.stage} />
        <span className="text-[12px] text-muted">
          {formatINR(lead.budget)} budget · {lead.source} · {users.get(lead.assigneeId)?.name}
        </span>
      </div>

      {err && (
        <p className="mt-3 rounded-lg bg-danger/10 p-3 text-[13px] text-danger ring-1 ring-danger/20">
          {err}
        </p>
      )}

      {!canEdit && (
        <p className="mt-3 rounded-lg bg-foreground/5 p-3 text-[13px] text-muted">
          Read-only — this lead belongs to {users.get(lead.assigneeId)?.name}.
        </p>
      )}

      <div className="mt-5">
        <SubHeading>Stage</SubHeading>
        <div className="mt-2 flex flex-wrap gap-2">
          {LEAD_STAGES.filter((s) => s !== "Booked").map((s) => (
            <Button
              key={s}
              size="sm"
              variant={lead.stage === s ? "primary" : "secondary"}
              disabled={!canEdit || busy || lead.stage === s || lead.stage === "Booked"}
              onClick={() => guard(() => updateLead(lead.id, { stage: s }))}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <SubHeading>Follow-up</SubHeading>
        {lead.followUpDate ? (
          <div
            className={
              isOverdue(lead.followUpDate)
                ? "mt-2 flex items-center justify-between gap-2 rounded-lg bg-danger/10 p-3 ring-1 ring-danger/20 shadow-sm"
                : "mt-2 flex items-center justify-between gap-2 rounded-lg bg-foreground/5 p-3 ring-1 ring-border shadow-sm"
            }
          >
            <div>
              <div className="text-[13px] font-medium">
                {isOverdue(lead.followUpDate) ? "Overdue follow-up" : "Next follow-up"}
              </div>
              <div className="font-mono text-[10px] text-muted">
                due {formatDate(lead.followUpDate)}
              </div>
            </div>
            <Input
              type="date"
              className="max-w-[10.5rem]"
              disabled={!canEdit}
              value={lead.followUpDate}
              onChange={(e) => guard(() => updateLead(lead.id, { followUpDate: e.target.value }))}
            />
          </div>
        ) : (
          <Input
            type="date"
            className="mt-2"
            disabled={!canEdit}
            onChange={(e) => guard(() => updateLead(lead.id, { followUpDate: e.target.value }))}
          />
        )}
      </div>

      {lead.stage !== "Booked" && (
        <div className="mt-5">
          <SubHeading>Booking</SubHeading>
          <div className="mt-2 flex gap-3">
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={!canEdit}>
              <option value="">Select an available unit</option>
              {availableUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} · {u.type} · {formatINR(u.price)}
                </option>
              ))}
            </Select>
            <Button
              className="shrink-0"
              disabled={!canEdit || !unitId || busy}
              onClick={async () => {
                const result = await confirmAction(
                  "Confirm booking?",
                  "This will mark the selected unit as sold.",
                );
                if (result.isConfirmed) {
                  const selectedUnit = (data?.units ?? []).find((item) => item.id === unitId);
                  const selectedBuilding = selectedUnit
                    ? (data?.buildings ?? []).find(
                        (building) => building.id === selectedUnit.buildingId,
                      )
                    : undefined;
                  const selectedProject = selectedBuilding
                    ? (data?.projects ?? []).find(
                        (project) => project.id === selectedBuilding.projectId,
                      )
                    : undefined;
                  if (selectedUnit) {
                    await guard(() =>
                      createBooking(lead.name, selectedProject?.name ?? "", selectedUnit.code),
                    );
                  }
                }
              }}
            >
              Book
            </Button>
          </div>
        </div>
      )}

      <div className="mt-5">
        <SubHeading>Notes</SubHeading>
        <div className="mt-2 space-y-2.5">
          {notes.length === 0 && (
            <EmptyState title="No notes yet" hint="Log every call or site visit here." />
          )}
          {notes.map((n) => (
            <div
              key={n.id}
              className="rounded-lg bg-surface/80 p-3 text-[13px] ring-1 ring-border shadow-sm"
            >
              <div className="flex justify-between font-mono text-[11px] text-faint">
                <span>{users.get(n.authorId)?.name ?? "Unknown"}</span>
                <span>{formatDate(n.createdAt.slice(0, 10))}</span>
              </div>
              <p className="mt-1 text-pretty text-foreground/90">{n.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            value={note}
            disabled={!canEdit}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note…"
          />
          <Button
            className="shrink-0"
            disabled={!canEdit || busy || !note.trim()}
            onClick={() =>
              guard(async () => {
                await addNote(lead.id, note);
                setNote("");
              })
            }
          >
            Save
          </Button>
        </div>
      </div>

      <div className="mt-auto flex gap-2 pt-5">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={!canEdit || busy || lead.stage === "Lost" || lead.stage === "Booked"}
          onClick={async () => {
            const result = await confirmAction(
              "Move lead to Lost?",
              "This removes its active follow-up date.",
            );
            if (result.isConfirmed)
              await guard(() => updateLead(lead.id, { stage: "Lost", followUpDate: null }));
          }}
        >
          Move to Lost
        </Button>
        <Button className="flex-1" disabled={!canEdit} onClick={onEdit}>
          Edit lead
        </Button>
      </div>
    </Drawer>
  );
}
