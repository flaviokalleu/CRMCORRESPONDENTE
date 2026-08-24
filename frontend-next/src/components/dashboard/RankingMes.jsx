import { Trophy } from "lucide-react";
import { GlassCard, GlassCardHeader } from "./GlassCard";

// Ranking do mês: avatar com inicial, nome, "N clientes" + barra relativa ao
// primeiro colocado (dá a leitura da distância entre eles) e a medalha #N.
export function RankingMes({ usuarios }) {
  // O Go serializa slice nil como `null` (não `[]`), e o default de parâmetro
  // só cobre `undefined` — daí o guard explícito em vez de `usuarios = []`.
  const lista = Array.isArray(usuarios) ? usuarios.slice(0, 5) : [];
  const topo = lista[0]?.clientes || 1;

  return (
    <GlassCard>
      <GlassCardHeader icon={Trophy} title="Ranking do Mês" />

      {lista.length === 0 ? (
        <p className="py-10 text-center text-xs text-cx-muted">Nenhum cadastro no mês.</p>
      ) : (
        <ul className="space-y-2.5">
          {lista.map((item, i) => {
            const nome = `${item.user?.first_name ?? ""} ${item.user?.last_name ?? ""}`.trim() || "—";
            const inicial = nome.charAt(0).toUpperCase();
            const pct = Math.max(6, Math.round(((item.clientes ?? 0) / topo) * 100));

            return (
              <li
                key={item.user?.id ?? i}
                className="flex items-center gap-3 rounded-xl border border-cx-border bg-cx-surface px-3 py-2.5"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-caixa-orange-light to-cx-orange-dark text-sm font-bold text-white">
                  {inicial}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-cx-text">{nome}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-tabular shrink-0 text-[0.7rem] text-cx-muted">
                      {(item.clientes ?? 0).toLocaleString("pt-BR")} clientes
                    </span>
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-cx-border">
                      <span
                        className="block h-full rounded-full bg-cx-orange"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  </div>
                </div>

                <span className="font-tabular grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cx-surface text-[0.7rem] font-bold text-cx-muted ring-1 ring-cx-border">
                  #{i + 1}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
