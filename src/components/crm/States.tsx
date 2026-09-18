import type { ReactNode } from "react";

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 py-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-foreground/5" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong px-6 py-10 text-center">
      <div className="text-[13px] font-semibold">{title}</div>
      {hint && <p className="mt-1 max-w-sm text-[12px] text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-danger/10 p-3 ring-1 ring-danger/20">
      <p className="text-[12px] text-danger">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-danger/30 px-2.5 py-1 font-mono text-[11px] text-danger transition-colors hover:bg-danger/10"
        >
          Retry
        </button>
      )}
    </div>
  );
}
