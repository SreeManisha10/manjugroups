import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import Swal from "sweetalert2";
import avatar from "@/assets/avatar-sales-manager.jpg";
import { Button, FormField, Input } from "@/components/kit";
import { useCrm } from "@/lib/crm/store";
import { isOverdue } from "@/lib/crm/format";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/leads", label: "Leads" },
  { to: "/properties", label: "Properties" },
  { to: "/bookings", label: "Bookings" },
] as const;

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-b from-[#2b6fb6] to-[#1e4fa0] shadow-sm">
        <div className="font-mono text-sm font-bold text-white">MG</div>
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight">Manju Groups</div>
        <div className="font-mono text-[11px] text-muted">Sales CRM · Internal</div>
      </div>
    </div>
  );
}

function LoginScreen() {
  const { signIn, signInAsDeveloper, createAccount, data } = useCrm();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("arjun@manjugroups.in");
  const [password, setPassword] = useState("Demo1234");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"Admin" | "Sales Employee">("Sales Employee");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const validatePassword = (value: string) =>
    value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (mode === "signup") {
      if (name.trim().length < 2) {
        setErr("Please enter your full name.");
        return;
      }
      if (!validateEmail(email)) {
        setErr("Please enter a valid email address.");
        return;
      }
      if (!validatePassword(password)) {
        setErr("Password must be 8+ chars with upper, lower, and a number.");
        return;
      }
      if (password !== confirmPassword) {
        setErr("Passwords do not match.");
        return;
      }

      setBusy(true);
      try {
      await createAccount({ name, email, password, confirmPassword, role });
      await Swal.fire({ icon: "success", title: "Account created", text: "Your account was created successfully." });
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : "Account creation failed.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!validateEmail(email)) {
      setErr("Please enter a valid email address.");
      return;
    }
    if (!password.trim()) {
      setErr("Please enter your password.");
      return;
    }

    setBusy(true);
    try {
      await signIn(email, password);
      await Swal.fire({ icon: "success", title: "Signed in", text: "You are now signed in." });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_40%),linear-gradient(180deg,#eef4ff_0%,#f6f7fb_100%)] p-6">
      <form onSubmit={submit} className="glass w-full max-w-md animate-rise rounded-[28px] border border-border/70 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
        <Brand />

        <div className="mt-5 inline-flex w-full rounded-xl border border-border bg-foreground/5 p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={
              mode === "signin"
                ? "flex-1 rounded-lg bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground shadow-sm"
                : "flex-1 rounded-lg px-3 py-2 text-[12px] font-medium text-muted"
            }
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={
              mode === "signup"
                ? "flex-1 rounded-lg bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground shadow-sm"
                : "flex-1 rounded-lg px-3 py-2 text-[12px] font-medium text-muted"
            }
          >
            Create account
          </button>
        </div>

        <h1 className="mt-5 text-[30px] font-bold tracking-tight">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-1 text-[12px] text-muted">
          {mode === "signin"
            ? "Use your work email and password to access the workspace."
            : "Create a secure account to continue with the CRM."}
        </p>

        {mode === "signup" && (
          <FormField label="Full name" error={err ?? undefined} className="mt-5">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aarav Kumar"
              autoComplete="name"
            />
          </FormField>
        )}

        <FormField label="Work email" error={err ?? undefined} className={mode === "signup" ? "mt-4" : "mt-5"}>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@manjugroups.in"
            autoComplete="email"
          />
        </FormField>

        <FormField label="Password" error={err ?? undefined} className="mt-4">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signin" ? "Enter your password" : "At least 8 chars"}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </FormField>

        {mode === "signup" && (
          <FormField label="Confirm password" error={err ?? undefined} className="mt-4">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              autoComplete="new-password"
            />
          </FormField>
        )}

        {mode === "signup" && (
          <FormField label="Role" error={err ?? undefined} className="mt-4">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "Admin" | "Sales Employee")}
              className="w-full rounded-md border border-border px-3 py-2"
            >
              <option value="Sales Employee">Employee</option>
              <option value="Admin">Admin</option>
            </select>
          </FormField>
        )}

        <Button type="submit" disabled={busy} className="mt-5 w-full">
          {busy ? (mode === "signin" ? "Signing in…" : "Creating account…") : mode === "signin" ? "Continue" : "Create account"}
        </Button>

        {import.meta.env.DEV && mode === "signin" && (
          <Button
            type="button"
            variant="secondary"
            className="mt-2 w-full"
            onClick={signInAsDeveloper}
          >
            Continue as developer
          </Button>
        )}

        {mode === "signin" && (
          <div className="mt-5 space-y-1.5">
            {(data?.users ?? []).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setEmail(u.email);
                  setPassword(u.password ?? "Demo1234");
                }}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-foreground/5 px-3 py-2 text-left text-[12px] transition-colors hover:bg-foreground/10"
              >
                <span>{u.name}</span>
                <span className="font-mono text-[10px] text-muted">{u.role}</span>
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}

export function AppShell({
  eyebrow,
  title,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, authReady, data, signOut } = useCrm();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = user?.role === "Admin";
  const visibleNav = NAV.filter((item) => isAdmin || item.to !== "/bookings");

  if (!authReady) return <div className="min-h-screen" />;
  if (!user) return <LoginScreen />;

  const overdue = (data?.leads ?? []).filter((l) => isOverdue(l.followUpDate)).length;

  return (
    <div className="relative min-h-screen animate-fade text-foreground">
      <div className="mx-auto flex max-w-[1440px] gap-6 p-4 md:p-6 lg:gap-8">
        <aside className="glass sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col rounded-2xl p-4 lg:flex">
          <div className="px-2 pb-5 pt-1">
            <Brand />
          </div>
          <nav className="flex flex-col gap-0.5 text-[13px] font-medium">
            {visibleNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={
                  pathname === item.to
                    ? "rounded-lg bg-primary/10 px-3 py-2 text-foreground"
                    : "rounded-lg px-3 py-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {overdue > 0 && (
            <div className="mt-6 rounded-xl bg-warn/10 p-3 ring-1 ring-warn/20">
              <div className="font-mono text-[10px] uppercase tracking-wide text-warn">
                {overdue} overdue
              </div>
              <div className="mt-1 text-[12px] text-foreground">follow-ups need action today</div>
            </div>
          )}

          <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-foreground/5 p-2.5">
            <img
              src={avatar}
              alt=""
              width={816}
              height={816}
              loading="lazy"
              className="size-8 rounded-md object-cover"
            />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[12px] font-medium">{user.name}</div>
              <div className="font-mono text-[10px] text-muted">{user.role}</div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="ml-auto font-mono text-[10px]"
              onClick={signOut}
            >
              exit
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                {eyebrow}
              </div>
              <h1 className="text-balance text-3xl font-bold tracking-tight">{title}</h1>
            </div>
            <div className="flex items-center gap-2">{actions}</div>
          </header>

          <nav className="mb-4 flex gap-1.5 overflow-x-auto lg:hidden">
            {visibleNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={
                  pathname === item.to
                    ? "shrink-0 rounded-lg bg-primary/10 px-3 py-1.5 text-[12px] font-medium"
                    : "shrink-0 rounded-lg border border-border px-3 py-1.5 text-[12px] text-muted"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {children}
        </main>
      </div>
    </div>
  );
}
