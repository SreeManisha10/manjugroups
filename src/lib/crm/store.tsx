import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "./api";
import type { CrmData, Lead, User } from "./types";

const SESSION_KEY = "harborview-crm-session";

interface CrmContextValue {
  data: CrmData | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  authReady: boolean;
  reload: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  run: <T>(fn: () => Promise<CrmData>) => Promise<void>;
  createLead: (input: api.LeadInput) => Promise<void>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  createAccount: (input: { name: string; email: string; password: string; confirmPassword?: string; role?: User['role'] }) => Promise<void>;
  addNote: (leadId: string, body: string) => Promise<void>;
  createBooking: (leadName: string, unitName: string, unitCode: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  resetDemoData: () => Promise<void>;
}

const CrmContext = createContext<CrmContextValue | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .fetchAll()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw) as User);
    } catch {
      /* ignore */
    }
    setAuthReady(true);
  }, [reload]);

  const run = useCallback(async (fn: () => Promise<CrmData>) => {
    setError(null);
    try {
      setData(await fn());
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      setError(message);
      throw e;
    }
  }, []);

  const value = useMemo<CrmContextValue>(
    () => ({
      data,
      loading,
      error,
      user,
      authReady,
      reload,
      run,
      signIn: async (email, password) => {
        const u = await api.login(email, password);
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(u));
        setUser(u);
      },
      createAccount: async ({ name, email, password, confirmPassword, role }) => {
        await api.createAccount({ name, email, password, confirmPassword, role });
        // Intentionally do not sign the user in after account creation.
        // The UI will show a success message and the user should sign in separately.
      },
      signOut: () => {
        window.localStorage.removeItem(SESSION_KEY);
        setUser(null);
      },
      createLead: (input) => run(() => api.createLead(input)),
      updateLead: (id, patch) => run(() => api.updateLead(id, patch)),
      deleteLead: (id) => run(() => api.deleteLead(id)),
      addNote: (leadId, body) => run(() => api.addNote(leadId, user?.id ?? "u1", body)),
      createBooking: (leadName, unitName, unitCode) =>
        run(() => api.createBooking(leadName, unitName, unitCode, user?.name ?? "")),
      cancelBooking: (bookingId) => run(() => api.cancelBooking(bookingId)),
      resetDemoData: () => run(() => api.resetData()),
    }),
    [data, loading, error, user, authReady, reload, run],
  );

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm(): CrmContextValue {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm must be used inside <CrmProvider>");
  return ctx;
}

/** Convenience lookups built on top of the raw dataset. */
export function useLookups() {
  const { data } = useCrm();
  return useMemo(() => {
    const users = new Map((data?.users ?? []).map((u) => [u.id, u]));
    const units = new Map((data?.units ?? []).map((u) => [u.id, u]));
    const buildings = new Map((data?.buildings ?? []).map((b) => [b.id, b]));
    const projects = new Map((data?.projects ?? []).map((p) => [p.id, p]));
    const unitLabel = (unitId: string | null) => {
      if (!unitId) return null;
      const unit = units.get(unitId);
      if (!unit) return null;
      const building = buildings.get(unit.buildingId);
      const project = building ? projects.get(building.projectId) : undefined;
      return { unit, building, project, text: `${project?.name ?? "—"} · ${unit.code}` };
    };
    return { users, units, buildings, projects, unitLabel };
  }, [data]);
}
