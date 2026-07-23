import { AlertTriangle, Bell, Info } from "lucide-react";

const ICONS = { warning: AlertTriangle, alert: AlertTriangle, info: Info };

export function NotificationsList({ notifications }) {
  if (!notifications?.length) {
    return <p className="py-6 text-center text-xs text-white/40">Nenhuma notificação no momento.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {notifications.slice(0, 6).map((n, i) => {
        const Icon = ICONS[n.type] || Bell;
        const tone =
          n.type === "warning" || n.type === "alert"
            ? "bg-amber-500/10 text-amber-400"
            : "bg-blue-500/10 text-blue-400";
        return (
          <li key={i} className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/85">{n.title}</p>
              <p className="line-clamp-1 text-xs text-white/40">{n.message}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
