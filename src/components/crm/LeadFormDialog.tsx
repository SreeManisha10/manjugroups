import { useEffect, useState } from "react";
import { Button, FormField, Input, Modal, Select } from "@/components/kit";
import { LEAD_STAGES, type Lead } from "@/lib/crm/types";
import type { CreateLeadPayload } from "@/lib/crm/api";
import { useCrm } from "@/lib/crm/store";
import { notifyError, notifySuccess } from "@/lib/crm/notifications";

const SOURCES = ["Website", "Walk-in", "Referral", "Portal", "Campaign"];
type LeadFormErrors = {
  name?: string;
  phone?: string;
  email?: string;
  budget?: string;
};

export function LeadFormDialog({
  lead,
  onClose,
  onSaved,
}: {
  lead?: Lead | null;
  onClose: () => void;
  onSaved?: (nextLead: Lead) => void;
}) {
  const { data, user, createLead, updateLead } = useCrm();
  const isEdit = !!lead;
  const isAdmin = user?.role === "Admin";

  const [form, setForm] = useState({
    name: lead?.name ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    source: lead?.source ?? "Website",
    budget: lead ? String(lead.budget) : "",
    stage: lead?.stage ?? "New",
    assigneeId: lead?.assigneeId ?? user?.id ?? "u1",
    interestedUnitId: lead?.interestedUnitId ?? "",
    projectId: "",
    followUpDate: lead?.followUpDate ?? "",
  });
  const [errors, setErrors] = useState<LeadFormErrors>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!lead) {
      setForm({
        name: "",
        phone: "",
        email: "",
        source: "Website",
        budget: "",
        stage: "New",
        assigneeId: user?.id ?? "u1",
        interestedUnitId: "",
        projectId: "",
        followUpDate: "",
      });
      return;
    }

    const remoteProperty = (lead as Lead & {
      property?: { id?: string; name?: string; building?: string | null } | null;
      interestedUnit?: { id?: string; code?: string; type?: string; building?: string | null } | null;
      assignee?: { id?: string; name?: string } | null;
    }).property;
    const remoteInterestedUnit = (lead as Lead & {
      property?: { id?: string; name?: string; building?: string | null } | null;
      interestedUnit?: { id?: string; code?: string; type?: string; building?: string | null } | null;
      assignee?: { id?: string; name?: string } | null;
    }).interestedUnit;
    const remoteAssigneeId =
      (lead as Lead & { assignee?: { id?: string; name?: string } | null }).assignee?.id ??
      (lead as Lead & { assigneeId?: string | null }).assigneeId ??
      user?.id ??
      "u1";

    const matchingUnit =
      data?.units.find((unit) => {
        if (lead.interestedUnitId && unit.id === lead.interestedUnitId) return true;
        if (remoteInterestedUnit?.code && remoteInterestedUnit?.type) {
          return (
            unit.code === remoteInterestedUnit.code && unit.type === remoteInterestedUnit.type
          );
        }
        return false;
      }) ??
      (remoteInterestedUnit?.code && remoteInterestedUnit?.type
        ? data?.units.find(
            (unit) =>
              unit.code === remoteInterestedUnit.code && unit.type === remoteInterestedUnit.type,
          ) ?? null
        : null);

    const matchingBuilding =
      data?.buildings.find((building) => {
        if (matchingUnit && building.id === matchingUnit.buildingId) return true;
        if (remoteProperty?.building) return building.name === remoteProperty.building;
        if (remoteInterestedUnit?.building) return building.name === remoteInterestedUnit.building;
        return false;
      }) ??
      null;

    const matchingProject =
      data?.projects.find((project) => {
        if (matchingBuilding && project.id === matchingBuilding.projectId) return true;
        if (remoteProperty?.name && project.name === remoteProperty.name) return true;
        if (remoteProperty?.building) {
          const building = data?.buildings.find((item) => item.name === remoteProperty.building);
          return building ? project.id === building.projectId : false;
        }
        return false;
      }) ??
      null;

    setForm({
      name: lead.name ?? "",
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      source: lead.source ?? "Website",
      budget: String(lead.budget ?? ""),
      stage: lead.stage ?? "New",
      assigneeId: remoteAssigneeId,
      interestedUnitId: matchingUnit?.id ?? lead.interestedUnitId ?? "",
      projectId: matchingProject?.id ?? matchingBuilding?.projectId ?? "",
      followUpDate: lead.followUpDate ?? "",
    });
  }, [lead, data, user]);

  function validate() {
    const e: LeadFormErrors = {};
    if (form.name.trim().length < 2) e.name = "Enter the lead's full name.";
    if (!/^[+\d][\d\s-]{7,}$/.test(form.phone.trim())) e.phone = "Enter a valid phone number.";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email.";
    if (!form.budget || Number(form.budget) <= 0) e.budget = "Budget must be greater than 0.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setServerError(null);
    const commonPayload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      source: form.source,
      budget: Number(form.budget),
      stage: form.stage as Lead["stage"],
      followUpDate: form.followUpDate || null,
    };
    try {
      if (isEdit && lead) {
        const selectedUnit = data?.units.find((unit) => unit.id === form.interestedUnitId) ?? null;
        const selectedBuilding = selectedUnit
          ? data?.buildings.find((building) => building.id === selectedUnit.buildingId) ?? null
          : null;
        const nextLead: Lead = {
          ...lead,
          ...commonPayload,
          assigneeId: form.assigneeId,
          interestedUnitId: form.interestedUnitId || null,
          followUpDate: form.followUpDate || null,
        };
        const updatePayload: Partial<Lead> & {
          assigneeId: string;
          interestedUnit?: {
            code: string;
            type: string;
            building?: string | null;
            price?: number | null;
            area?: number | null;
          } | null;
          property?: {
            name: string;
            building?: string | null;
            price?: number | null;
            type?: string | null;
            area?: number | null;
          } | null;
        } = {
          ...commonPayload,
          assigneeId: form.assigneeId,
          interestedUnitId: form.interestedUnitId || null,
          interestedUnit: selectedUnit
            ? {
                code: selectedUnit.code,
                type: selectedUnit.type,
                building: selectedBuilding?.name ?? null,
                price: selectedUnit.price,
                area: selectedUnit.areaSqft,
              }
            : null,
          property: form.projectId
            ? {
                name:
                  data?.projects.find((project) => project.id === form.projectId)?.name ??
                  selectedBuilding?.name ??
                  "",
                building: selectedBuilding?.name ?? null,
                price: selectedUnit?.price ?? null,
                type: selectedUnit?.type ?? null,
                area: selectedUnit?.areaSqft ?? null,
              }
            : null,
        };
        await updateLead(lead.id, updatePayload);
        onSaved?.(nextLead);
      } else {
        const assignee = data?.users.find((candidate) => candidate.id === form.assigneeId);
        const project = data?.projects.find((candidate) => candidate.id === form.projectId);
        const unit = data?.units.find((candidate) => candidate.id === form.interestedUnitId);
        const building = unit ? data?.buildings.find((candidate) => candidate.id === unit.buildingId) : null;
        const payload: CreateLeadPayload = {
          ...commonPayload,
          assignee: {
            name: assignee?.name ?? "",
          },
          property: project
            ? {
                name: project.name,
                building: building?.name ?? null,
                price: unit?.price ?? null,
                type: unit?.type ?? null,
                area: unit?.areaSqft ?? null,
              }
            : null,
          interestedUnit: unit
            ? {
                code: unit.code,
                type: unit.type,
                building: building?.name ?? null,
                price: unit.price,
                area: unit.areaSqft,
              }
            : null,
        };
        await createLead(payload);
      }
      await notifySuccess(
        isEdit ? "Lead updated" : "Lead created",
        `${commonPayload.name} is ready in your pipeline.`,
      );
      onClose();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Could not save the lead.");
      await notifyError(
        "Could not save lead",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const availableUnits = (data?.units ?? []).filter(
    (u) => u.status !== "Sold" || u.id === lead?.interestedUnitId,
  );

  // If a project is selected, filter available units to that project.
  const filteredUnits = form.projectId
    ? availableUnits.filter((u) => {
        const building = data?.buildings?.find((b) => b.id === u.buildingId);
        return building?.projectId === form.projectId;
      })
    : availableUnits;

  const selectedUnit = data?.units.find((u) => u.id === form.interestedUnitId) ?? null;
  const selectedBuilding = selectedUnit
    ? data?.buildings.find((b) => b.id === selectedUnit.buildingId) ?? null
    : null;

  return (
    <Modal
      as="form"
      onSubmit={submit}
      eyebrow={isEdit ? "Edit lead" : "New lead"}
      title={isEdit ? lead!.name : "Capture an enquiry"}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create lead"}
          </Button>
        </>
      }
    >
      {serverError && (
        <p className="mt-3 rounded-lg bg-danger/10 p-2.5 text-[12px] text-danger ring-1 ring-danger/20">
          {serverError}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Full name" {...(errors.name ? { error: errors.name } : {})}>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </FormField>
        <FormField label="Phone" {...(errors.phone ? { error: errors.phone } : {})}>
          <Input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+91 98200 41233"
          />
        </FormField>
        <FormField label="Email" {...(errors.email ? { error: errors.email } : {})}>
          <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
        </FormField>
        <FormField label="Budget (₹)" {...(errors.budget ? { error: errors.budget } : {})}>
          <Input
            inputMode="numeric"
            value={form.budget}
            onChange={(e) => set("budget", e.target.value.replace(/[^\d]/g, ""))}
            placeholder="18500000"
          />
        </FormField>
        <FormField label="Source">
          <Select value={form.source} onChange={(e) => set("source", e.target.value)}>
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Stage">
          <Select value={form.stage} onChange={(e) => set("stage", e.target.value)}>
            {LEAD_STAGES.filter((s) => s !== "Booked").map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Property">
          <Select value={form.projectId} onChange={(e) => set("projectId", e.target.value)}>
            <option value="">All projects</option>
            {(data?.projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          label="Assigned to"
          {...(!isAdmin ? { hint: "Only an admin can reassign" } : {})}
        >
          <Select
            disabled={!isAdmin}
            value={form.assigneeId}
            onChange={(e) => set("assigneeId", e.target.value)}
          >
            {(data?.users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Follow-up date">
          <Input
            type="date"
            value={form.followUpDate}
            onChange={(e) => set("followUpDate", e.target.value)}
          />
        </FormField>
        <FormField label="Interested unit" className="sm:col-span-2">
          <Select
            value={form.interestedUnitId}
            onChange={(e) => set("interestedUnitId", e.target.value)}
          >
            <option value="">No unit selected</option>
            {filteredUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code} · {u.type} · {u.status}
              </option>
            ))}
          </Select>
          {selectedUnit && (
            <div className="mt-2 rounded-lg border border-border bg-foreground/[0.02] p-2 text-[11px] text-faint">
              <div className="font-medium text-foreground">
                {selectedBuilding?.name ?? "Building"} · {selectedUnit.type}
              </div>
              <div className="mt-1 space-x-2">
                <span>{selectedUnit.code}</span>
                <span>·</span>
                <span>{selectedUnit.areaSqft} sqft</span>
                <span>·</span>
                <span>₹{selectedUnit.price.toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}
        </FormField>
      </div>
    </Modal>
  );
}
