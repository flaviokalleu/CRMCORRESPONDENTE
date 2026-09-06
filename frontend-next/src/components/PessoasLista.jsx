"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Inbox, Loader2, Plus, Search } from "lucide-react";

// Mesma máscara de CPF de ClientesLista.jsx — mantida idêntica de propósito,
// não reinventada.
const maskCPF = (v) =>
  (v || "").replace(/\D/g, "").slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");

const PAPEL_OPCOES = [
  { value: "", label: "Todos" },
  { value: "comprador", label: "Compradores" },
  { value: "inquilino", label: "Inquilinos" },
  { value: "proprietario", label: "Proprietários" },
];

// Um tom por papel — a pessoa pode ter vários ao mesmo tempo, então a cor
// aqui é o que deixa a combinação legível de relance, não uma taxonomia de
// severidade (diferente do status de cliente).
const PAPEL_BADGE = {
  comprador: { label: "Comprador", className: "border-blue-200 bg-blue-50 text-blue-700" },
  inquilino: { label: "Inquilino", className: "border-amber-200 bg-amber-50 text-amber-700" },
  proprietario: { label: "Proprietário", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

function PapelBadges({ papeis }) {
  const ativos = Object.keys(PAPEL_BADGE).filter((chave) => papeis?.[chave]);
  if (ativos.length === 0) return <span className="text-cx-muted">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {ativos.map((chave) => (
        <span
          key={chave}
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${PAPEL_BADGE[chave].className}`}
        >
          {PAPEL_BADGE[chave].label}
        </span>
      ))}
    </div>
  );
}

export function PessoasLista({ initialPessoas = [], initialPapel = "", initialBusca = "" }) {
  const router = useRouter();
  const pathname = usePathname();

  const [pessoas, setPessoas] = useState(initialPessoas);
  const [busca, setBusca] = useState(initialBusca);
  const [papel, setPapel] = useState(initialPapel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchLista = useCallback(async ({ busca, papel }) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (busca) params.set("busca", busca);
      if (papel) params.set("papel", papel);
      const qs = params.toString();
      const res = await fetch(`/api/backend/pessoas${qs ? `?${qs}` : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => []);
      setPessoas(Array.isArray(data) ? data : []);
    } catch {
      setError("Não foi possível carregar as pessoas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Busca e filtro de papel refletem na URL (?busca=&papel=) para a view ser
  // linkável e sobreviver a um reload — só o dado inicial vem do servidor
  // (initialPessoas), toda mudança depois passa pelo proxy client-side.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (busca) params.set("busca", busca);
      if (papel) params.set("papel", papel);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      fetchLista({ busca, papel });
    }, 300);
    return () => clearTimeout(t);
  }, [busca, papel, pathname, router, fetchLista]);

  const total = pessoas.length;
  const filtrando = Boolean(busca || papel);

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-cx-text">Pessoas</h1>
          <p className="text-sm text-cx-muted">
            {loading ? "Carregando…" : `${total} pessoa${total === 1 ? "" : "s"}${filtrando ? " no filtro" : ""}`}
          </p>
        </div>
        <Link
          href="/pessoas/nova"
          className="inline-flex items-center gap-2 rounded-lg bg-cx-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cx-orange-dark"
        >
          <Plus className="h-4 w-4" /> Nova pessoa
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-cx-border bg-cx-surface p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cx-muted" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF ou e-mail…"
            className="w-full rounded-lg border border-cx-border bg-cx-surface py-2.5 pl-9 pr-3 text-sm text-cx-text placeholder-[#9aa6b4] outline-none transition-colors focus:border-cx-blue focus:ring-2 focus:ring-cx-blue/20"
          />
        </div>
        <select
          value={papel}
          onChange={(e) => setPapel(e.target.value)}
          className="rounded-lg border border-cx-border bg-cx-surface px-3 py-2.5 text-sm text-cx-text outline-none transition-colors focus:border-cx-blue [&>option]:bg-white [&>option]:text-cx-text"
          aria-label="Filtrar por papel"
        >
          {PAPEL_OPCOES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border border-cx-border bg-cx-surface">
        {pessoas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cx-border bg-cx-surface text-cx-muted">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Inbox className="h-6 w-6" />}
            </div>
            <div>
              <p className="text-sm font-medium text-cx-text">
                {loading ? "Carregando pessoas…" : "Nenhuma pessoa encontrada"}
              </p>
              {!loading && (
                <p className="text-xs text-cx-muted">
                  {filtrando ? "Ajuste a busca ou o filtro de papel." : "Cadastre a primeira pessoa para começar."}
                </p>
              )}
            </div>
            {!loading && !filtrando && (
              <Link
                href="/pessoas/nova"
                className="mt-1 inline-flex items-center gap-2 rounded-lg bg-cx-orange px-4 py-2 text-sm font-semibold text-white hover:bg-cx-orange-dark"
              >
                <Plus className="h-4 w-4" /> Nova pessoa
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-cx-border/[0.15] text-[10px] uppercase tracking-[0.1em] text-cx-muted">
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">CPF</th>
                  <th className="px-4 py-3 font-semibold">Contato</th>
                  <th className="px-4 py-3 font-semibold">Papéis</th>
                </tr>
              </thead>
              <tbody className={loading ? "opacity-50 transition-opacity" : "transition-opacity"}>
                {pessoas.map((p) => (
                  <tr key={p.id} className="border-b border-cx-border/[0.12] last:border-0 hover:bg-cx-surface">
                    <td className="px-4 py-3 font-medium text-cx-text">{p.nome || "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-cx-muted">{p.cpf ? maskCPF(p.cpf) : "—"}</td>
                    <td className="px-4 py-3 text-cx-muted">
                      <p className="truncate">{p.email || "sem e-mail"}</p>
                      {p.telefone && <p className="truncate text-xs">{p.telefone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <PapelBadges papeis={p.papeis} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
