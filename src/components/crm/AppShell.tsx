import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Eye, EyeOff, UserRound } from "lucide-react";
import Swal from "sweetalert2";
import { Button, FormField, Input } from "@/components/kit";
import { useCrm } from "@/lib/crm/store";
import { isOverdue } from "@/lib/crm/format";

const ADMIN_NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/leads", label: "Leads" },
  { to: "/properties", label: "Properties" },
  { to: "/bookings", label: "Bookings" },
] as const;

const EMPLOYEE_NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/leads", label: "My Leads" },
  { to: "/properties", label: "Assigned Units" },
  { to: "/chat", label: "Chat" },
] as const;

function Brand({ isEmployee = false }: { isEmployee?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={
          isEmployee
            ? "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-b from-[#1d9a68] to-[#0f7551] shadow-sm"
            : "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-b from-[#2b6fb6] to-[#1e4fa0] shadow-sm"
        }
      >
        <div className="font-mono text-sm font-bold text-white">MNG</div>
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight">Manju Groups</div>
        <div className="font-mono text-[11px] text-muted">
          {isEmployee ? "Sales rep · Field CRM" : "Sales CRM · Internal"}
        </div>
      </div>
    </div>
  );
}

function LoginScreen() {
  const { signIn, createAccount, error } = useCrm();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("arjun@manjugroups.in");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"Admin" | "Sales Employee">("Sales Employee");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        await Swal.fire({
          icon: "success",
          title: "Account created",
          text: "Your account was created successfully.",
        });
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmPassword(false);
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
      await navigate({ to: "/", replace: true });
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

        {error && (
          <div className="mt-4 rounded-lg bg-danger/10 p-3 text-[12px] text-danger ring-1 ring-danger/20">
            <span>{error}</span>
          </div>
        )}

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
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signin" ? "Enter your password" : "At least 8 chars"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted transition-colors hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </button>
          </div>
        </FormField>

        {mode === "signup" && (
          <FormField label="Confirm password" error={err ?? undefined} className="mt-4">
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                aria-label={
                  showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"
                }
                title={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted transition-colors hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff size={16} aria-hidden="true" />
                ) : (
                  <Eye size={16} aria-hidden="true" />
                )}
              </button>
            </div>
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
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = user?.role === "Admin";
  const isEmployee = user?.role === "Sales Employee";
  const isDashboard = pathname === "/";
  const visibleNav = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;

  if (!authReady) return <div className="min-h-screen" />;
  if (!user) return <LoginScreen />;

  const overdue = (data?.leads ?? []).filter((l) => isOverdue(l.followUpDate)).length;
  const themeVars = isEmployee
    ? ({
        "--primary": "hsl(154 62% 38%)",
        "--primary-foreground": "hsl(150 70% 98%)",
        "--background": "hsl(150 25% 97%)",
        "--surface": "hsl(0 0% 100%)",
        "--muted": "hsl(158 15% 38%)",
        "--border": "hsl(154 18% 28% / 0.08)",
        "--border-strong": "hsl(154 18% 28% / 0.14)",
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      className="relative min-h-screen animate-fade text-foreground"
      style={themeVars}
    >
      <div className="flex gap-6 p-4 md:p-6 lg:gap-8">
        <aside
          className={
            isEmployee
              ? "glass sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col rounded-2xl border border-emerald-500/10 bg-gradient-to-b from-emerald-50/80 to-white p-4 shadow-[0_20px_40px_-35px_rgba(16,185,129,0.65)] lg:flex"
              : "glass sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col rounded-2xl p-4 lg:flex"
          }
        >
          <div className="px-2 pb-5 pt-1">
            <Brand isEmployee={isEmployee} />
          </div>
          <nav className="flex flex-col gap-0.5 text-[13px] font-medium">
            {visibleNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={
                  pathname === item.to
                    ? isEmployee
                      ? "rounded-lg bg-emerald-500/10 px-3 py-2 text-emerald-900 ring-1 ring-emerald-500/20"
                      : "rounded-lg bg-primary/10 px-3 py-2 text-foreground"
                    : "rounded-lg px-3 py-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {overdue > 0 && (
            <div
              className={
                isEmployee
                  ? "mt-6 rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/20"
                  : "mt-6 rounded-xl bg-warn/10 p-3 ring-1 ring-warn/20"
              }
            >
              <div className={isEmployee ? "font-mono text-[10px] uppercase tracking-wide text-emerald-700" : "font-mono text-[10px] uppercase tracking-wide text-warn"}>
                {overdue} overdue
              </div>
              <div className="mt-1 text-[12px] text-foreground">follow-ups need action today</div>
            </div>
          )}

          <div className={isEmployee ? "mt-auto flex items-center gap-2.5 rounded-xl bg-emerald-50 p-2.5 ring-1 ring-emerald-200/70" : "mt-auto flex items-center gap-2.5 rounded-xl bg-foreground/5 p-2.5"}>
            <div
              className={
                isEmployee
                  ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                  : "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20"
              }
            >
              <UserRound size={16} strokeWidth={2} aria-hidden="true" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[12px] font-medium">{user.name}</div>
              <div className={isEmployee ? "font-mono text-[10px] text-emerald-700" : "font-mono text-[10px] text-muted"}>{user.role}</div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="ml-auto font-mono text-[10px]"
              onClick={async () => {
                signOut();
                await navigate({ to: "/", replace: true });
                await Swal.fire({
                  icon: "success",
                  title: "Successfully logged out",
                  text: "Your session has been closed.",
                  timer: 1600,
                  showConfirmButton: false,
                });
              }}
            >
              Log out
            </Button>
          </div>
        </aside>

        <main className={isDashboard ? "min-w-0 flex-1 overflow-hidden" : "min-w-0 flex-1"}>
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
