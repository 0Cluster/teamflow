export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <div className="h-4 w-1/3 rounded bg-slate-800" />

      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className="h-3 rounded bg-slate-800"
            style={{ width: `${90 - index * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div
      aria-hidden="true"
      className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4"
    >
      <div className="h-10 w-10 shrink-0 rounded-full bg-slate-800" />

      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/4 rounded bg-slate-800" />
        <div className="h-3 w-2/3 rounded bg-slate-800" />
      </div>
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <div className="h-3 w-1/2 rounded bg-slate-800" />
      <div className="mt-3 h-8 w-1/4 rounded bg-slate-800" />
    </div>
  );
}

interface StateViewProps {
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ErrorState({
  title,
  hint,
  actionLabel,
  onAction,
}: StateViewProps) {
  return (
    <div className="rounded-xl border border-red-900 bg-red-950/30 p-6 text-center">
      <p className="text-sm font-medium text-red-300">{title}</p>

      {hint && <p className="mt-1 text-sm text-red-400/80">{hint}</p>}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-lg border border-red-900 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  actionLabel,
  onAction,
}: StateViewProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center">
      <p className="text-sm font-medium text-white">{title}</p>

      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
