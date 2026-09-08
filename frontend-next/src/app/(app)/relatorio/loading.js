import { Skeleton } from "@/components/ui/skeleton";

// Estado de carregamento (Next.js Suspense automático enquanto o Server
// Component da página busca `/report/relatorio/dados`). Tailwind + Skeleton
// (bg-muted + animate-pulse), sem CSS próprio — mesma família visual do
// resto do app, diferente do `dashboard/loading.js` antigo (que ainda usa
// classes `.ref-*` de crm-design.css, convenção que este projeto abandonou).
export default function RelatorioLoading() {
  return (
    <div className="space-y-4" role="status" aria-label="Carregando relatórios">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-cx-border bg-cx-surface p-4">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-14" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={`rounded-xl border border-cx-border bg-cx-surface p-4 ${i === 0 ? "lg:col-span-2" : ""}`}>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-3 h-40 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
