type LoadingSkeletonVariant = "page" | "login" | "dashboard" | "dashboard-shell" | "teacher";

function Block({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

function ContentSkeleton() {
  return (
    <div className="space-y-6">
      <Block className="h-7 w-40" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Block key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Block className="h-72" />
        <Block className="h-72" />
      </div>
      <Block className="h-64" />
    </div>
  );
}

export default function LoadingSkeleton({
  variant = "page",
}: {
  variant?: LoadingSkeletonVariant;
}) {
  return (
    <div role="status" aria-label="Loading page">
      <span className="sr-only">Loading...</span>

      {variant === "login" && (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-8">
            <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-slate-200" />
            <Block className="mx-auto h-6 w-48" />
            <Block className="mx-auto h-4 w-36" />
            <Block className="h-11 w-full" />
            <Block className="h-11 w-full" />
            <Block className="h-11 w-full" />
          </div>
        </div>
      )}

      {variant === "page" && (
        <main className="min-h-screen p-5 lg:p-8">
          <ContentSkeleton />
        </main>
      )}

      {variant === "dashboard" && (
        <main className="p-5 lg:p-6">
          <ContentSkeleton />
        </main>
      )}

      {variant === "dashboard-shell" && (
        <div className="flex min-h-screen">
          <aside aria-hidden="true" className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 lg:block">
            <Block className="mb-10 h-8 w-40" />
            <div className="space-y-4">
              {Array.from({ length: 4 }, (_, i) => <Block key={i} className="h-10 w-full" />)}
            </div>
          </aside>
          <div className="min-w-0 flex-1">
            <header aria-hidden="true" className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5">
              <Block className="h-8 w-20" />
              <Block className="h-8 w-28" />
            </header>
            <main className="p-5 lg:p-6">
              <ContentSkeleton />
            </main>
          </div>
        </div>
      )}

      {variant === "teacher" && (
        <div className="flex min-h-screen bg-slate-50">
          <aside aria-hidden="true" className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 md:block">
            <Block className="mb-10 h-8 w-40" />
            <div className="space-y-4">
              {Array.from({ length: 5 }, (_, i) => <Block key={i} className="h-10 w-full" />)}
            </div>
          </aside>
          <main className="min-w-0 flex-1 space-y-6 p-5 sm:p-8">
            <div className="space-y-3">
              <Block className="h-8 w-44" />
              <Block className="h-4 w-64 max-w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => <Block key={i} className="h-24" />)}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Block className="h-64" />
              <Block className="h-64" />
            </div>
            <Block className="h-64" />
          </main>
        </div>
      )}
    </div>
  );
}

export function TableSkeletonRows({ columns, rows = 4 }: { columns: number; rows?: number }) {
  return Array.from({ length: rows }, (_, row) => (
    <tr key={row} aria-hidden="true">
      {Array.from({ length: columns }, (_, column) => (
        <td key={column} className="px-4 py-3">
          <Block className="h-4 w-full max-w-32" />
        </td>
      ))}
    </tr>
  ));
}
