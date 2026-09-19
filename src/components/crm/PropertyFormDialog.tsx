import { useEffect, useState } from "react";
import { Button, FormField, Input, Modal, Select } from "@/components/kit";
import { notifyError, notifySuccess } from "@/lib/crm/notifications";
import { useCrm } from "@/lib/crm/store";
import type { UnitStatus } from "@/lib/crm/types";

const UNIT_STATUSES: UnitStatus[] = ["Available", "Reserved", "Sold"];

type FormState = {
  projectName: string;
  projectId: string;
  buildingId: string;
  buildingName: string;
  code: string;
  type: string;
  areaSqft: string;
  price: string;
  status: UnitStatus;
  assignedToId: string;
};

export function PropertyFormDialog({ onClose }: { onClose: () => void }) {
  const { data, createUnit } = useCrm();
  const projects = data?.projects ?? [];
  const employees = (data?.users ?? []).filter((user) => user.role === "Sales Employee");
  const [form, setForm] = useState<FormState>({
    projectName: projects[0]?.name ?? "",
    projectId: projects[0]?.id ?? "",
    buildingId: "",
    buildingName: "",
    code: "",
    type: "2BHK",
    areaSqft: "",
    price: "",
    status: "Available",
    assignedToId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const buildings = (data?.buildings ?? []).filter(
    (building) => building.projectId === form.projectId,
  );

  useEffect(() => {
    setForm((current) => ({
      ...current,
      buildingId:
        buildings.some((building) => building.id === current.buildingId)
          ? current.buildingId
          : buildings[0]?.id ?? "",
    }));
  }, [data, form.projectId]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const areaSqft = Number(form.areaSqft);
    const price = Number(form.price);
    const isNewProject = form.projectId === "__new_project__";
    const isNewBuilding = form.buildingId === "__new_building__";
    if (isNewProject && !form.projectName.trim()) return setError("Enter a project name.");
    if (!isNewProject && !form.projectId) return setError("Choose a project.");
    if (isNewBuilding && !form.buildingName.trim()) return setError("Enter a building name.");
    if (!isNewBuilding && !form.buildingId) return setError("Choose a building.");
    if (form.code.trim().length < 2) return setError("Enter a unit code.");
    if (!form.type.trim()) return setError("Enter the property type.");
    if (!Number.isFinite(areaSqft) || areaSqft <= 0) return setError("Area must be greater than 0.");
    if (!Number.isFinite(price) || price <= 0) return setError("Price must be greater than 0.");

    setBusy(true);
    try {
      await createUnit({
        buildingId: isNewBuilding ? "__new_building__" : form.buildingId,
        code: form.code.trim(),
        type: form.type.trim(),
        areaSqft,
        price,
        status: form.status,
        assignedToId: form.assignedToId || null,
      }, {
        projectId: isNewProject ? undefined : form.projectId,
        projectName: isNewProject ? form.projectName : undefined,
        buildingName: isNewBuilding ? form.buildingName : undefined,
        forceLocal: isNewProject || isNewBuilding,
      });
      await notifySuccess("Property added", `${form.code.trim()} is now in your inventory.`);
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not add the property.";
      setError(message);
      await notifyError("Could not add property", message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      as="form"
      onSubmit={submit}
      eyebrow="New property"
      title="Add a property unit"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add property"}
          </Button>
        </>
      }
    >
      {error && (
        <p className="mt-3 rounded-lg bg-danger/10 p-2.5 text-[12px] text-danger ring-1 ring-danger/20">
          {error}
        </p>
      )}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Project">
          <Select
            value={form.projectId}
            onChange={(event) => setForm((current) => ({
              ...current,
              projectId: event.target.value,
              projectName: event.target.value === "__new_project__" ? "" : projects.find((project) => project.id === event.target.value)?.name ?? "",
              buildingId: "",
              buildingName: "",
            }))}
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
            <option value="__new_project__">+ Create new project</option>
          </Select>
          {form.projectId === "__new_project__" && <Input className="mt-2" value={form.projectName} onChange={(event) => set("projectName", event.target.value)} placeholder="New project name" />}
        </FormField>
        <FormField label="Building">
          <Select
            value={form.buildingId}
            onChange={(event) => setForm((current) => ({ ...current, buildingId: event.target.value, buildingName: "" }))}
            disabled={!form.projectId}
          >
            <option value="">Select a building</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
            <option value="__new_building__">+ Create new building</option>
          </Select>
          {form.buildingId === "__new_building__" && <Input className="mt-2" value={form.buildingName} onChange={(event) => set("buildingName", event.target.value)} placeholder="New building name" />}
        </FormField>
        <FormField label="Unit code">
          <Input value={form.code} onChange={(event) => set("code", event.target.value)} placeholder="T-801" />
        </FormField>
        <FormField label="Type">
          <Input value={form.type} onChange={(event) => set("type", event.target.value)} placeholder="3BHK" />
        </FormField>
        <FormField label="Area (sqft)">
          <Input
            inputMode="numeric"
            value={form.areaSqft}
            onChange={(event) => set("areaSqft", event.target.value.replace(/[^\d]/g, ""))}
            placeholder="1420"
          />
        </FormField>
        <FormField label="Price (₹)">
          <Input
            inputMode="numeric"
            value={form.price}
            onChange={(event) => set("price", event.target.value.replace(/[^\d]/g, ""))}
            placeholder="18500000"
          />
        </FormField>
        <FormField label="Status">
          <Select value={form.status} onChange={(event) => set("status", event.target.value as UnitStatus)}>
            {UNIT_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Assign to">
          <Select value={form.assignedToId} onChange={(event) => set("assignedToId", event.target.value)}>
            <option value="">Unassigned</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
    </Modal>
  );
}
