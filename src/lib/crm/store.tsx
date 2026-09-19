import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "./api";
import { seed } from "./seed";
import type { CrmData, Lead, UnitStatus, User } from "./types";

const SESSION_KEY = "harborview-crm-session";

interface CrmContextValue {
  data: CrmData | null;
  loading: boolean;
  error: string | null;
  demoMode: boolean;
  user: User | null;
  authReady: boolean;
  reload: () => void;
  loadDemoData: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signInAsDeveloper: () => void;
  signInAsSalesRep: () => void;
  signOut: () => void;
  run: <T>(fn: () => Promise<CrmData>) => Promise<void>;
  createLead: (input: api.LeadInput) => Promise<void>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  createUnit: (input: api.CreateUnitInput, fallback?: api.CreateUnitFallback) => Promise<void>;
  updateUnitAssignment: (unitId: string, assignedToId: string | null) => Promise<void>;
  updateUnitStatus: (unitId: string, status: UnitStatus) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  createAccount: (input: { name: string; email: string; password: string; confirmPassword?: string | undefined; role?: User['role'] | undefined }) => Promise<void>;
  addNote: (leadId: string, body: string) => Promise<void>;
  createBooking: (leadName: string, unitName: string, unitCode: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  resetDemoData: () => Promise<void>;
}

const CrmContext = createContext<CrmContextValue | null>(null);

function normalizeSessionUser(raw: unknown): User | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<User>;
  if (!candidate.email || !candidate.role) return null;
  return {
    id: candidate.id ?? candidate.user_id ?? candidate.email,
    user_id: candidate.user_id ?? candidate.id ?? candidate.email,
    name: candidate.name ?? candidate.email,
    email: candidate.email,
    role: candidate.role === "Admin" ? "Admin" : "Sales Employee",
    password: candidate.password ?? "",
  };
}

export function CrmProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const reload = useCallback(() => {
    setDemoMode(false);
    setLoading(true);
    setError(null);
    api
      .fetchAll()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const loadDemoData = useCallback(() => {
    setData(structuredClone(seed));
    setDemoMode(true);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) {
        const savedUser = normalizeSessionUser(JSON.parse(raw));
        if (savedUser) {
          setUser(savedUser);
          window.localStorage.setItem(SESSION_KEY, JSON.stringify(savedUser));
        } else {
          window.localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      window.localStorage.removeItem(SESSION_KEY);
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
      demoMode,
      user,
      authReady,
      reload,
      loadDemoData,
      run,
      signIn: async (email, password) => {
        const u = await api.login(email, password, "");
        const normalized = normalizeSessionUser(u) ?? u;
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
        setUser(normalized);
      },
      signInAsDeveloper: () => {
        const developer = normalizeSessionUser(
          data?.users.find((candidate) => candidate.role === "Admin") ?? {
            id: "dev-user",
            user_id: "dev-user",
            name: "Developer",
            email: "developer@localhost",
            role: "Admin" as const,
          },
        ) ?? {
          id: "dev-user",
          user_id: "dev-user",
          name: "Developer",
          email: "developer@localhost",
          role: "Admin" as const,
          password: "",
        };
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(developer));
        setUser(developer);
      },
      signInAsSalesRep: () => {
        const rep = normalizeSessionUser(
          data?.users.find((candidate) => candidate.role === "Sales Employee") ?? {
            id: "sales-rep",
            user_id: "sales-rep",
            name: "Meera Krishnan",
            email: "meera@manjugroups.in",
            role: "Sales Employee" as const,
          },
        ) ?? {
          id: "sales-rep",
          user_id: "sales-rep",
          name: "Meera Krishnan",
          email: "meera@manjugroups.in",
          role: "Sales Employee" as const,
          password: "",
        };
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(rep));
        setUser(rep);
      },
      createAccount: async ({ name, email, password, confirmPassword, role }) => {
        await api.createAccount({
          name,
          email,
          password,
          ...(confirmPassword === undefined ? {} : { confirmPassword }),
          ...(role === undefined ? {} : { role }),
        });
        // Intentionally do not sign the user in after account creation.
        // The UI will show a success message and the user should sign in separately.
      },
      signOut: () => {
        window.localStorage.removeItem(SESSION_KEY);
        setUser(null);
      },
      createLead: (input) => run(() => api.createLead(input)),
      updateLead: (id, patch) => run(() => api.updateLead(id, patch)),
      createUnit: (input, fallback) => run(() => api.createUnit(input, data, fallback)),
      updateUnitAssignment: (unitId, assignedToId) => run(() => api.updateUnitAssignment(unitId, assignedToId)),
      updateUnitStatus: (unitId, status) => run(() => api.updateUnitStatus(unitId, status, user?.id ?? "")),
      deleteLead: (id) => run(() => api.deleteLead(id)),
      addNote: (leadId, body) => run(() => api.addNote(leadId, user?.id ?? "u1", body)),
      createBooking: (leadName, unitName, unitCode) =>
        run(() => api.createBooking(leadName, unitName, unitCode, user?.name ?? "")),
      cancelBooking: (bookingId) => run(() => api.cancelBooking(bookingId)),
      resetDemoData: () => run(() => api.resetData()),
    }),
    [data, loading, error, demoMode, user, authReady, reload, loadDemoData, run],
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
