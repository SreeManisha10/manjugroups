/**
 * Mock API layer (frontend-only phase).
 *
 * Every function here returns a Promise and is the only module that knows CRM
 * endpoint paths. HTTP transport lives in `src/api/axios.ts`; components and
 * hooks stay untouched.
 */
import { seed } from "./seed";
import type { Booking, CrmData, Lead, LeadStage, Note, User } from "./types";
import { api, HttpApiError, isApiConfigured, ENDPOINTS } from "@/api/axios";

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

const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export class ApiError extends Error {}

export async function fetchAll(): Promise<CrmData> {
  if (isApiConfigured) {
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
        bookings,
      } as CrmData;
    } catch (error) {
      // Keep the demo workspace usable when the backend is offline.
      if (!(error instanceof HttpApiError) || error.status !== undefined) throw error;
      return delay(read());
    }
  }
  return delay(read());
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
  return api.get<PropertiesResponse>(`${ENDPOINTS.properties}?${query.toString()}`);
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
  if (isApiConfigured) {
    await api.post<unknown, CreateLeadPayload>(ENDPOINTS.createLead, payload);
    return fetchAll();
  }
  const data = read();
  const duplicate = data.leads.find(
    (l) => l.phone.replace(/\s/g, "") === payload.phone.replace(/\s/g, ""),
  );
  if (duplicate) throw new ApiError(`A lead with this phone already exists (${duplicate.name}).`);

  const assignee = data.users.find(
    (candidate) => candidate.name.trim().toLowerCase() === payload.assignee.name.trim().toLowerCase(),
  );
  const unit = payload.interestedUnit
    ? data.units.find(
        (candidate) =>
          candidate.code === payload.interestedUnit?.code &&
          candidate.type === payload.interestedUnit?.type,
      )
    : undefined;

  const { assignee: _assignee, property: _property, interestedUnit: _interestedUnit, ...leadFields } = payload;
  data.leads.unshift({
    ...leadFields,
    assigneeId: assignee?.id ?? "u1",
    interestedUnitId: unit?.id ?? null,
    id: uid("l"),
    createdAt: new Date().toISOString(),
  });
  write(data);
  return delay(data);
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<CrmData> {
  if (isApiConfigured) {
    await api.post<unknown, Partial<Lead> & { id: string }>(ENDPOINTS.editLead, {
      id,
      ...patch,
    });
    return fetchAll();
  }
  const data = read();
  const lead = data.leads.find((l) => l.id === id);
  if (!lead) throw new ApiError("Lead not found.");
  if (patch.stage === "Booked" && !data.bookings.some((b) => b.leadId === id)) {
    throw new ApiError("Create a booking to move this lead to Booked.");
  }
  Object.assign(lead, patch);
  write(data);
  return delay(data);
}

export async function deleteLead(id: string): Promise<CrmData> {
  if (isApiConfigured) {
    return api.post<CrmData, { id: string }>(ENDPOINTS.deleteLead, { id });
  }
  const data = read();
  const leadIndex = data.leads.findIndex((lead) => lead.id === id);
  if (leadIndex === -1) throw new ApiError("Lead not found.");
  data.leads.splice(leadIndex, 1);
  write(data);
  return delay(data);
}

export async function addNote(leadId: string, authorId: string, body: string): Promise<CrmData> {
  const trimmed = body.trim();
  if (!trimmed) throw new ApiError("Note cannot be empty.");
  if (isApiConfigured) {
    return api.post<CrmData, { authorId: string; body: string }>(ENDPOINTS.leadNotes(leadId), {
      authorId,
      body: trimmed,
    });
  }
  const data = read();
  const note: Note = {
    id: uid("n"),
    leadId,
    authorId,
    body: trimmed,
    createdAt: new Date().toISOString(),
  };
  data.notes.unshift(note);
  write(data);
  return delay(data);
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
  const data = read();
  if (isApiConfigured) {
    return api.post<CrmData, {
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
      price: data.units.find((unit) => unit.code === unitCode)?.price ?? 0,
    });
  }
  const unit = data.units.find((u) => u.code === unitCode);
  const lead = data.leads.find((l) => l.name === leadName);
  const agent = data.users.find((candidate) => candidate.name === agentName);
  if (!unit || !lead) throw new ApiError("Lead or unit not found.");
  if (!agent) throw new ApiError("Agent not found.");
  if (unit.status === "Sold" || data.bookings.some((b) => b.unitId === unit.id)) {
    throw new ApiError(`Unit ${unit.code} is already booked by another agent.`);
  }
  if (lead.stage === "Lost") throw new ApiError("A lost lead cannot be booked. Reopen it first.");

  const booking: Booking = {
    id: uid("bk"),
    leadId: lead.id,
    unitId: unit.id,
    agentId: agent.id,
    amount: unit.price,
    createdAt: new Date().toISOString(),
  };
  data.bookings.unshift(booking);
  unit.status = "Sold";
  lead.stage = "Booked";
  lead.interestedUnitId = unit.id;
  lead.followUpDate = null;
  write(data);
  return delay(data);
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
  if (isApiConfigured) {
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
  return delay({ data: read().bookings });
}

export async function cancelBooking(bookingId: string): Promise<CrmData> {
  if (isApiConfigured) {
    return api.post<CrmData, { id: string }>(ENDPOINTS.cancelBooking(), { id: bookingId });
  }
  const data = read();
  const idx = data.bookings.findIndex((b) => b.id === bookingId);
  if (idx === -1) throw new ApiError("Booking not found.");
  const booking = data.bookings[idx];
  if (!booking) throw new ApiError("Booking not found.");
  data.bookings.splice(idx, 1);
  const unit = data.units.find((u) => u.id === booking.unitId);
  if (unit) unit.status = "Available";
  const lead = data.leads.find((l) => l.id === booking.leadId);
  if (lead) lead.stage = "Negotiation";
  write(data);
  return delay(data);
}

export async function login(email: string, password: string): Promise<User> {
  if (isApiConfigured) {
    try {
      const resp = await api.post<{
        id: string;
        email: string;
        name?: string;
        token?: string;
        role?: string;
      }>(ENDPOINTS.authSignin, { email, password });
      return {
        id: resp.id,
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

  const data = read();
  const user = data.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) throw new ApiError("No account found for that email.");
  if (user.password && user.password !== password) {
    throw new ApiError("Incorrect password.");
  }
  if (!user.password && password.trim()) {
    // Keep legacy demo users usable even if no password was stored yet.
    return delay(user);
  }
  if (!user.password && !password.trim()) {
    return delay(user);
  }
  return delay(user);
}

export async function createAccount(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role?: User["role"];
}): Promise<User> {
  if (isApiConfigured) {
    try {
      const resp = await api.post<{ id: string; email: string; name?: string; token?: string; role?: string }>(
        ENDPOINTS.authSignup,
        { name: input.name, email: input.email, password: input.password, confirmPassword: input.confirmPassword, role: input.role },
      );
      return {
        id: resp.id,
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

  const data = read();
  const trimmedName = input.name.trim();
  const trimmedEmail = input.email.trim().toLowerCase();
  const trimmedPassword = input.password.trim();

  if (!trimmedName || trimmedName.length < 2) {
    throw new ApiError("Please enter a valid name.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    throw new ApiError("Please enter a valid work email.");
  }
  if (trimmedPassword.length < 8 || !/[A-Z]/.test(trimmedPassword) || !/[a-z]/.test(trimmedPassword) || !/\d/.test(trimmedPassword)) {
    throw new ApiError("Password must be at least 8 characters and include uppercase, lowercase, and a number.");
  }

  const exists = data.users.some((user) => user.email.toLowerCase() === trimmedEmail);
  if (exists) throw new ApiError("An account already exists for this email.");

  const nextUser: User = {
    id: uid("u"),
    name: trimmedName,
    email: trimmedEmail,
    role: input.role ?? "Sales Employee",
    password: trimmedPassword,
  };

  data.users.unshift(nextUser);
  write(data);
  return delay(nextUser);
}
