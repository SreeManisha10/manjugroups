const baseURL = import.meta.env["VITE_API_BASE_URL"]?.replace(/\/$/, "");

export const isApiConfigured = Boolean(baseURL);

export type ApiResponse<T> = T | { data: T };

export class HttpApiError extends Error {
  status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "HttpApiError";
    this.status = status;
  }
}

function getErrorMessage(error: unknown): { message: string; status: number | undefined } {
  if (!(error instanceof Response)) {
    return {
      message: error instanceof Error ? error.message : "The server request failed.",
      status: undefined,
    };
  }
  return {
    message: `Request failed (${error.status}).`,
    status: error.status,
  };
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (
    response &&
    typeof response === "object" &&
    ("kpis" in response || "pagination" in response)
  ) {
    return response as T;
  }
  return response && typeof response === "object" && "data" in response
    ? response.data
    : (response as T);
}

function resolveUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (!baseURL) throw new HttpApiError("Remote API is not configured.");
  return new URL(url, `${baseURL}/`).toString();
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) throw new HttpApiError("The API returned an empty response.", response.status);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpApiError("The API returned invalid JSON.", response.status);
  }
}

export async function get<T>(url: string): Promise<T> {
  if (!isApiConfigured && !/^https?:\/\//i.test(url)) {
    throw new HttpApiError("Remote API is not configured.");
  }
  try {
    const response = await fetch(resolveUrl(url), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    });
    if (!response.ok) throw response;
    return unwrap(await readJson<ApiResponse<T>>(response));
  } catch (error) {
    const result = getErrorMessage(error);
    throw new HttpApiError(result.message, result.status);
  }
}

export async function post<T, TPayload = unknown>(url: string, payload: TPayload): Promise<T> {
  if (!isApiConfigured && !/^https?:\/\//i.test(url)) {
    throw new HttpApiError("Remote API is not configured.");
  }
  try {
    const response = await fetch(resolveUrl(url), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw response;
    return unwrap(await readJson<ApiResponse<T>>(response));
  } catch (error) {
    const result = getErrorMessage(error);
    throw new HttpApiError(result.message, result.status);
  }
}

export const api = { get, post };

export const ENDPOINTS = {
  crm: "https://skyline-shortcut-duplicate.ngrok-free.dev/CRM/get_overall_data.php",
  // External CRM endpoints (legacy demo backend)
  leads: "https://skyline-shortcut-duplicate.ngrok-free.dev/CRM/get_crm_data.php",
  createLead: "https://skyline-shortcut-duplicate.ngrok-free.dev/CRM/insert_crm_data.php",
  createBooking: "https://skyline-shortcut-duplicate.ngrok-free.dev/CRM/insert_new_crm_data.php",
  editLead: "https://skyline-shortcut-duplicate.ngrok-free.dev/CRM/edit_crm_data.php",
  properties: "https://skyline-shortcut-duplicate.ngrok-free.dev/CRM/get_all_crm.php",
  getBookings: "https://skyline-shortcut-duplicate.ngrok-free.dev/CRM/get_bookings.php",
  resetDemo: "/crm/demo/reset",
  // Auth endpoints (local SSR or remote API)
  authSignup: "https://skyline-shortcut-duplicate.ngrok-free.dev/CRM/signup.php",
  authSignin: "https://skyline-shortcut-duplicate.ngrok-free.dev/CRM/signin.php",
  bookings: "https://skyline-shortcut-duplicate.ngrok-free.dev/CRM/get_bookings.php",
  lead: (id: string) => `/leads/${id}`,
  deleteLead: "https://skyline-shortcut-duplicate.ngrok-free.dev/CRM/delete_crm.php",
  deleteLeadProject: "https://skyline-shortcut-duplicate.ngrok-free.dev/CRM/delete_lead_project.php",
  leadNotes: (id: string) => `/leads/${id}/notes`,
  cancelBooking: () => "https://skyline-shortcut-duplicate.ngrok-free.dev/CRM/delete_lead_project.php",
} as const;

export const authAPI = {
  signup: <T = unknown, P = unknown>(payload: P) => api.post<T, P>(ENDPOINTS.authSignup, payload),
  signin: <T = unknown, P = unknown>(payload: P) => api.post<T, P>(ENDPOINTS.authSignin, payload),
};

function buildQuery(params: Record<string, unknown> | URLSearchParams | undefined): string {
  if (!params) return "";
  if (params instanceof URLSearchParams) return `?${params.toString()}`;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/**
 * Grouped, easy-to-read API surface built on top of `api.get` / `api.post`.
 * These are lightweight wrappers (no business logic) intended to make
 * endpoint usage discoverable and consistent across the app.
 */
export const crmAPI = {
  fetchAll: <T = unknown>() => api.get<T>(ENDPOINTS.crm),
  resetDemo: <T = unknown>() => api.post<T>(ENDPOINTS.resetDemo, {}),
};

export const leadsAPI = {
  fetch: <T = unknown>(params?: Record<string, unknown> | URLSearchParams) =>
    api.get<T>(`${ENDPOINTS.leads}${buildQuery(params)}`),
  create: <T = unknown, P = unknown>(payload: P) => api.post<T, P>(ENDPOINTS.createLead, payload),
  update<T = unknown, P = unknown>(id: string, patch: P) {
    return api.post<T, P>(ENDPOINTS.lead(id), patch);
  },
  addNote<T = unknown, P = unknown>(leadId: string, payload: P) {
    return api.post<T, P>(ENDPOINTS.leadNotes(leadId), payload);
  },
};

export const propertiesAPI = {
  fetch: <T = unknown>(params?: Record<string, unknown> | URLSearchParams) =>
    api.get<T>(`${ENDPOINTS.properties}${buildQuery(params)}`),
};

export const bookingsAPI = {
  create: <T = unknown, P = unknown>(payload: P) => api.post<T, P>(ENDPOINTS.bookings, payload),
  cancel: <T = unknown, P = unknown>(_bookingId: string, payload: P) =>
    api.post<T, P>(ENDPOINTS.cancelBooking(), payload),
};

export default {
  api,
  ENDPOINTS,
  crmAPI,
  authAPI,
  leadsAPI,
  propertiesAPI,
  bookingsAPI,
};
