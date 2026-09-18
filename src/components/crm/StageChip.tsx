import type { LeadStage, UnitStatus } from "@/lib/crm/types";

const STAGE_CLASS: Record<LeadStage, string> = {
  New: "text-primary border-primary/30 bg-primary/8",
  Contacted: "text-primary border-primary/25 bg-primary/5",
  "Site Visit": "text-violet border-violet/28 bg-violet/8",
  Interested: "text-violet border-violet/28 bg-violet/8",
  Negotiation: "text-warn border-warn/32 bg-warn/10",
  Booked: "text-success border-success/30 bg-success/10",
  Lost: "text-muted border-border-strong bg-foreground/5",
};

export function StageChip({ stage }: { stage: LeadStage }) {
  return <span className={`chip ${STAGE_CLASS[stage]}`}>{stage}</span>;
}

const STATUS_CLASS: Record<UnitStatus, string> = {
  Available: "text-success border-success/30 bg-success/10",
  Reserved: "text-warn border-warn/30 bg-warn/10",
  Sold: "text-danger border-danger/30 bg-danger/10",
};

export function StatusChip({ status }: { status: UnitStatus }) {
  return <span className={`chip ${STATUS_CLASS[status]}`}>{status}</span>;
}
