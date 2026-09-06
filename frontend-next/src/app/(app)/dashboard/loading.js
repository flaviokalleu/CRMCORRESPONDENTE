export default function DashboardLoading() {
  return <div className="ref-dashboard" role="status" aria-label="Carregando dashboard">
    <div className="ref-welcome"><div className="animate-pulse space-y-3"><div className="h-10 w-60 rounded-lg bg-blue-100" /><div className="h-4 w-80 max-w-full rounded bg-slate-200" /></div></div>
    <div className="ref-kpis">{Array.from({length: 5}, (_, i) => <div key={i} className="ref-kpi animate-pulse"><div className="ref-kpi-icon" /><div className="h-12 w-20 rounded bg-slate-100" /></div>)}</div>
    <div className="ref-charts">{Array.from({length: 3}, (_, i) => <div key={i} className="ref-panel h-64 animate-pulse"><div className="h-5 w-36 rounded bg-blue-100" /></div>)}</div>
    <div className="ref-lists">{Array.from({length: 3}, (_, i) => <div key={i} className="ref-panel h-72 animate-pulse"><div className="h-5 w-36 rounded bg-blue-100" /></div>)}</div>
  </div>;
}
