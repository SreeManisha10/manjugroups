/**
 * Mock API layer (frontend-only phase).
 *
 * Every function here returns a Promise and is the only module that knows CRM
 * endpoint paths. HTTP transport lives in `src/api/axios.ts`; components and
 * hooks stay untouched.
 */
import { seed } from "./seed";
import type { Booking, CrmData, Lead, LeadStage, Unit, UnitStatus, User } from "./types";
import { api, HttpApiError, isApiConfigured, ENDPOINTS, propertiesAPI } from "@/api/axios";

const STORAGE_KEY = "harborview-crm-v1";
const LATENCY = 350;
// Endpoint constants are centralized in src/api/axios.ts as `ENDPOINTS`.

export interface LeadsResponse {
  data: Array<
    Omit<Lead, "assigneeId" | "interestedUnitId"> & {
      assigneeId?: string;
      interestedUnitId?: string | null;
      assignee?: { id?: string; name?: string } | null;
      property?: {
        id?: string;
        name?: string;
        building?: string | null;
        price?: number | null;
        type?: string | null;
        area?: number | null;
      } | null;
      interestedUnit?: {
        id?: string;
        code: string;
        type: string;
        building?: string | null;
        price?: number | null;
        area?: number | null;
        status?: string;
      } | null;
      balance?: number | string | null;
      balanceAmount?: number | string | null;
    }
  >;
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters?: {
    stages: string[];
    assignees: Array<{ id: string; name: string }>;
  };
  kpis?: {
    totalLeads: number;
    newLeads: number;
    contactedLeads: number;
    qualifiedLeads: number;
    convertedLeads: number;
    lostLeads: number;
    totalBudget: number;
  };
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    search: string;
    source: string;
    stage: string;
    assignedTo: string;
    followUpDate: string;
    fromDate: string;
    toDate: string;
  };
}

export interface PropertiesResponse {
  data: Array<{
    id: string;
    code: string;
    project: { id: string; name: string; location: string };
    building: { id: string; name: string };
    type: string;
    areaSqft: number;
    price: number;
    status: "Available" | "Reserved" | "Sold";
  }>;
  kpis: {
    totalUnits: number;
    availableUnits: number;
    reservedUnits: number;
    soldUnits: number;
    inventoryValue: number;
  };
  filters: {
    projects: Array<{ id: string; name: string }>;
    statuses: Array<"Available" | "Reserved" | "Sold">;
  };
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY));
}

function read(): CrmData {
  if (typeof window === "undefined") return structuredClone(seed);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CrmData;
  } catch {
    /* corrupted storage — fall back to seed */
  }
  const fresh = structuredClone(seed);
  write(fresh);
  return fresh;
}

function write(data: CrmData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function mapPropertiesSnapshot(data: CrmData, filters: { search?: string; project?: string; status?: string; offset?: number; limit?: number } = {}): PropertiesResponse {
  const projectFilter = filters.project ?? "all";
  const statusFilter = filters.status ?? "all";
  const searchText = (filters.search ?? "").trim().toLowerCase();
  const offset = Math.max(0, Number(filters.offset ?? 0));
  const limit = Math.max(1, Number(filters.limit ?? 10));

  const rows = data.units
    .map((unit) => {
      const building = data.buildings.find((candidate) => candidate.id === unit.buildingId);
      const project = building ? data.projects.find((candidate) => candidate.id === building.projectId) : undefined;
      const assignedTo = unit.assignedToId ? data.users.find((user) => user.id === unit.assignedToId)?.name ?? "Unassigned" : "Unassigned";
      return {
        ...unit,
        project: {
          id: project?.id ?? building?.projectId ?? "",
          name: project?.name ?? "Unassigned project",
          location: project?.location ?? "",
        },
        building: {
          id: building?.id ?? "",
          name: building?.name ?? "Unassigned building",
        },
        assignedTo,
      };
    })
    .filter((unit) => {
      const matchesProject = projectFilter === "all" || unit.project.name === projectFilter;
      const matchesStatus = statusFilter === "all" || unit.status === statusFilter;
      const matchesSearch = !searchText || unit.code.toLowerCase().includes(searchText);
      return matchesProject && matchesStatus && matchesSearch;
    });

  const total = rows.length;
  const pageRows = rows.slice(offset, offset + limit);
  const inventoryValue = data.units.reduce((totalValue, unit) => totalValue + unit.price, 0);

  return {
    data: pageRows.map((unit) => ({
      id: unit.id,
      code: unit.code,
      project: unit.project,
      building: unit.building,
      type: unit.type,
      areaSqft: unit.areaSqft,
      price: unit.price,
      status: unit.status,
      assignedToId: unit.assignedToId,
      assignedTo: unit.assignedTo,
    })),
    kpis: {
      totalUnits: data.units.length,
      availableUnits: data.units.filter((unit) => unit.status === "Available").length,
      reservedUnits: data.units.filter((unit) => unit.status === "Reserved").length,
      soldUnits: data.units.filter((unit) => unit.status === "Sold").length,
      inventoryValue,
    },
    filters: {
      projects: data.projects.map((project) => ({ id: project.id, name: project.name })),
      statuses: ["Available", "Reserved", "Sold"],
    },
    pagination: {
      offset,
      limit,
      total,
      hasNext: offset + limit < total,
      hasPrevious: offset > 0,
    },
  };
}

const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export class ApiError extends Error {}

export async function fetchAll(): Promise<CrmData> {
  try {
    const raw = await api.get<CrmData | { data: CrmData }>(ENDPOINTS.crm);
    const payload = (raw && typeof raw === "object" && "data" in raw ? raw.data : raw) as Partial<CrmData> | null;

      const users = (payload?.users ?? []).map((user, index) => ({
        id: user?.id ?? `u${index + 1}`,
        name: user?.name || `Employee ${index + 1}`,
        email: user?.email ?? "",
        role: user?.role ?? "Sales Employee",
      }));

      const projects = (payload?.projects ?? []).map((project, index) => ({
        id: project?.id ?? `p${index + 1}`,
        name: project?.name || `Project ${index + 1}`,
        location: project?.location ?? "",
      }));

      const buildings = (payload?.buildings ?? []).map((building, index) => ({
        id: building?.id ?? `b${index + 1}`,
        projectId: building?.projectId ?? projects[index]?.id ?? "p1",
        name: building?.name || `Building ${index + 1}`,
      }));

      const units = (payload?.units ?? []).map((unit, index) => ({
        id: unit?.id ?? `un${index + 1}`,
        buildingId: unit?.buildingId ?? buildings[index]?.id ?? "b1",
        code: unit?.code || `U-${index + 1}`,
        type: unit?.type || "N/A",
        areaSqft: Number(unit?.areaSqft ?? 0),
        price: Number(unit?.price ?? 0),
        status: unit?.status || "Available",
        assignedToId: unit?.assignedToId ?? null,
      }));

      const leads = (payload?.leads ?? []).map((lead, index) => ({
        id: lead?.id ?? `l${index + 1}`,
        name: lead?.name || `Lead ${index + 1}`,
        phone: lead?.phone || "",
        email: lead?.email || "",
        source: lead?.source || "Walk-in",
        budget: Number(lead?.budget ?? 0),
        stage: lead?.stage || "New",
        assigneeId: lead?.assigneeId || users[0]?.id || "u1",
        interestedUnitId: lead?.interestedUnitId ?? null,
        followUpDate: lead?.followUpDate || null,
        createdAt: lead?.createdAt || new Date().toISOString(),
        lostReason: lead?.lostReason,
      }));

      const bookings = (payload?.bookings ?? [])
        .filter((booking) => booking && (booking.leadId || booking.unitId || booking.agentId || booking.amount))
        .map((booking, index) => ({
          id: booking?.id ?? `bk${index + 1}`,
          leadId: booking?.leadId ?? leads[index]?.id ?? "",
          unitId: booking?.unitId ?? units[index]?.id ?? "",
          agentId: booking?.agentId ?? users[index % users.length]?.id ?? "u1",
          amount: Number(booking?.amount ?? 0),
          createdAt: booking?.createdAt || new Date().toISOString(),
        }));

    return {
      users,
      projects,
      buildings,
      units,
      leads,
      notes: payload?.notes ?? [],
      bookings,
    } as CrmData;
  } catch (error) {
    const fallback = read();
    if (fallback && fallback.units.length) {
      return fallback;
    }
    if (error instanceof HttpApiError) throw new ApiError(error.message);
    throw error;
  }
}

export async function fetchProperties(params: {
  search?: string;
  project?: string;
  status?: string;
  offset?: number;
  limit?: number;
}): Promise<PropertiesResponse> {
  const query = new URLSearchParams({
    search: params.search ?? "",
    project: params.project ?? "all",
    status: params.status ?? "all",
    offset: String(params.offset ?? 0),
    limit: String(params.limit ?? 10),
  });

  try {
    return await api.get<PropertiesResponse>(`${ENDPOINTS.properties}?${query.toString()}`);
  } catch {
    return mapPropertiesSnapshot(read(), {
      search: params.search,
      project: params.project,
      status: params.status,
      offset: params.offset,
      limit: params.limit,
    });
  }
}

export async function fetchLeads(params: {
  search: string;
  stage: string;
  assignee: string;
  offset: number;
  limit: number;
}): Promise<LeadsResponse> {
  const query = new URLSearchParams({
    search: params.search,
    stage: params.stage,
    assignee: params.assignee,
    offset: String(params.offset),
    limit: String(params.limit),
  });
    const response = await api.get<LeadsResponse | LeadsResponse["data"]>(
    `${ENDPOINTS.leads}?${query.toString()}`,
  );
  if (Array.isArray(response)) {
    return {
      data: response,
      pagination: {
        offset: params.offset,
        limit: params.limit,
        total: response.length,
        hasNext: response.length === params.limit,
        hasPrevious: params.offset > 0,
      },
    };
  }
  if (response.pagination) return response;
  const meta = response.meta;
  return {
    ...response,
    pagination: {
      offset: meta ? (meta.page - 1) * meta.limit : params.offset,
      limit: meta?.limit ?? params.limit,
      total: meta?.total ?? response.data.length,
      hasNext: meta ? meta.page < meta.totalPages : response.data.length === params.limit,
      hasPrevious: meta ? meta.page > 1 : params.offset > 0,
    },
  };
}

export async function resetData(): Promise<CrmData> {
  if (isApiConfigured) return api.post<CrmData>(ENDPOINTS.resetDemo, {});
  const fresh = structuredClone(seed);
  write(fresh);
  return delay(fresh);
}

export type CreateLeadPayload = Omit<
  Lead,
  "id" | "createdAt" | "assigneeId" | "interestedUnitId"
> & {
  assignee: { name: string };
  property: {
    name: string;
    building?: string | null;
    price?: number | null;
    type?: string | null;
    area?: number | null;
  } | null;
  interestedUnit: {
    code: string;
    type: string;
    building?: string | null;
    price?: number | null;
    area?: number | null;
  } | null;
};
export type LeadInput = CreateLeadPayload;

export async function createLead(payload: CreateLeadPayload): Promise<CrmData> {
  await api.post<unknown, CreateLeadPayload>(ENDPOINTS.createLead, payload);
  return fetchAll();
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<CrmData> {
  await api.post<unknown, Partial<Lead> & { id: string }>(ENDPOINTS.editLead, {
    id,
    ...patch,
  });
  return fetchAll();
}

export type CreateUnitInput = Omit<Unit, "id">;
export type CreateUnitFallback = {
  projectId?: string;
  projectName?: string;
  buildingName?: string;
  forceLocal?: boolean;
};

export async function createUnit(
  input: CreateUnitInput,
  fallbackData?: CrmData | null,
  fallback?: CreateUnitFallback,
): Promise<CrmData> {
  if (fallback?.forceLocal) return saveUnitLocally(input, fallbackData, fallback);
  try {
    await propertiesAPI.create<unknown, CreateUnitInput>(input);
  } catch {
    return saveUnitLocally(input, fallbackData, fallback);
  }
  return fetchAll();
}

function saveUnitLocally(
  input: CreateUnitInput,
  fallbackData: CrmData | null | undefined,
  fallback: CreateUnitFallback = {},
): Promise<CrmData> {
  const localData = structuredClone(fallbackData ?? read());
  let projectId = fallback.projectId ?? input.buildingId;
  if (fallback.projectName) {
    const existingProject = localData.projects.find(
      (project) => project.name.toLowerCase() === fallback.projectName?.trim().toLowerCase(),
    );
    projectId = existingProject?.id ?? uid("local_project");
    if (!existingProject) {
      localData.projects.push({ id: projectId, name: fallback.projectName.trim(), location: "" });
    }
  }
  if (fallback.buildingName) {
    const existingBuilding = localData.buildings.find(
      (building) => building.projectId === projectId && building.name.toLowerCase() === fallback.buildingName?.trim().toLowerCase(),
    );
    const buildingId = existingBuilding?.id ?? uid("local_building");
    if (!existingBuilding) {
      localData.buildings.push({ id: buildingId, projectId, name: fallback.buildingName.trim() });
    }
    input = { ...input, buildingId };
  }
  localData.units.push({ ...input, id: uid("local_unit") });
  write(localData);
  return delay(localData);
}

export async function updateUnitAssignment(unitId: string, assignedToId: string | null): Promise<CrmData> {
  try {
    await propertiesAPI.assign<unknown, { id: string; assignedToId: string | null }>({
      id: unitId,
      assignedToId,
    });
    return fetchAll();
  } catch {
    const localData = read();
    const unit = localData.units.find((candidate) => candidate.id === unitId);
    if (!unit) return localData;
    unit.assignedToId = assignedToId;
    write(localData);
    return localData;
  }
}

export async function updateUnitStatus(
  unitId: string,
  status: UnitStatus,
  actorId: string,
): Promise<CrmData> {
  try {
    await propertiesAPI.updateStatus<unknown, { id: string; status: UnitStatus; actorId: string }>({
      id: unitId,
      status,
      actorId,
    });
    return fetchAll();
  } catch {
    const localData = read();
    const unit = localData.units.find((candidate) => candidate.id === unitId);
    if (!unit) return localData;
    unit.status = status;
    write(localData);
    return localData;
  }
}

export async function deleteLead(id: string): Promise<CrmData> {
  await api.post<unknown, { id: string }>(ENDPOINTS.deleteLead, { id });
  return fetchAll();
}

export async function addNote(leadId: string, authorId: string, body: string): Promise<CrmData> {
  const trimmed = body.trim();
  if (!trimmed) throw new ApiError("Note cannot be empty.");
  await api.post<unknown, { leadId: string; authorId: string; body: string }>(ENDPOINTS.createNote, {
    leadId,
    authorId,
    body: trimmed,
  });
  return fetchAll();
}

/**
 * Booking flow. The unit availability check happens against freshly read
 * storage, which is the frontend stand-in for the DB unique constraint +
 * transaction that will prevent two users booking the same unit.
 */
export async function createBooking(
  leadName: string,
  unitName: string,
  unitCode: string,
  agentName: string,
): Promise<CrmData> {
  const current = await fetchAll();
  await api.post<unknown, {
    lead: string;
    unitName: string;
    unit: string;
    agent: string;
    bookedOn: string;
    price: number;
  }>(ENDPOINTS.createBooking, {
    lead: leadName,
    unitName,
    unit: unitCode,
    agent: agentName,
    bookedOn: new Date().toISOString().slice(0, 10),
    price: current.units.find((unit) => unit.code === unitCode)?.price ?? 0,
  });
  return fetchAll();
}

export type BookingApiRecord = Omit<Booking, "leadId" | "unitId" | "agentId"> & {
  lead?: string;
  unitName?: string;
  unit?: string;
  agent?: string;
  bookedOn?: string;
  price?: number;
  balance?: number | string | null;
  balanceAmount?: number | string | null;
  leadId?: string;
  unitId?: string;
  agentId?: string;
};

export interface BookingsResponse {
  data: BookingApiRecord[];
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export async function fetchBookings(params: {
  search?: string;
  lead?: string;
  unit?: string;
  agent?: string;
  offset?: number;
  limit?: number;
} = {}): Promise<BookingsResponse> {
  const query = new URLSearchParams({
    search: params.search ?? "",
    lead: params.lead && params.lead !== "all" ? params.lead : "all",
    unit: params.unit && params.unit !== "all" ? params.unit : "all",
    agent: params.agent && params.agent !== "all" ? params.agent : "all",
    offset: String(params.offset ?? 0),
    limit: String(params.limit ?? 10),
  });
  const response = await api.get<BookingApiRecord[] | BookingsResponse>(
    `${ENDPOINTS.getBookings}?${query.toString()}`,
  );
  return Array.isArray(response) ? { data: response } : response;
}

export async function cancelBooking(bookingId: string): Promise<CrmData> {
  await api.post<unknown, { id: string }>(ENDPOINTS.cancelBooking(), { id: bookingId });
  return fetchAll();
}

export async function login(email: string, password: string, user_id?: string): Promise<User> {
  try {
    const payload = {
      email,
      password,
      user_id: user_id ?? "",
    };
    const resp = await api.post<{
      id?: string;
      user_id?: string;
      email: string;
      name?: string;
      token?: string;
      role?: string;
    }>(ENDPOINTS.authSignin, payload);
    const resolvedId = resp.user_id ?? resp.id ?? "";
    return {
      id: resolvedId || resp.email,
      user_id: resolvedId || undefined,
      email: resp.email,
      name: resp.name ?? resp.email,
      role: (resp.role as User["role"]) ?? "Sales Employee",
      password: "",
    } as User;
  } catch (e) {
    if (e instanceof HttpApiError) throw new ApiError(e.message);
    throw e;
  }
}

export async function createAccount(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string | undefined;
  role?: User["role"] | undefined;
  user_id?: string | undefined;
}): Promise<User> {
  try {
    const payload = {
      name: input.name,
      email: input.email,
      password: input.password,
      confirmPassword: input.confirmPassword,
      role: input.role,
      user_id: input.user_id ?? input.email,
    };
    const resp = await api.post<{ id?: string; user_id?: string; email: string; name?: string; token?: string; role?: string }>(
      ENDPOINTS.authSignup,
      payload,
    );
    const resolvedId = resp.user_id ?? resp.id ?? input.user_id ?? input.email;
    return {
      id: resolvedId,
      user_id: resolvedId,
      name: resp.name ?? input.name,
      email: resp.email,
      role: (resp.role as User['role']) ?? input.role ?? "Sales Employee",
      password: input.password,
    } as User;
  } catch (e) {
    if (e instanceof HttpApiError) throw new ApiError(e.message);
    throw e;
  }
}
