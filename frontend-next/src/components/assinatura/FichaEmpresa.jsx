"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { brl, data, dataDaFatura, STATUS_FATURA, FORMA, situacaoEmTexto } from "./formatos";

async function api(metodo, caminho, corpo) {
  const res = await fetch(`/api/backend/super-admin${caminho}`, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await res.json().catch(() => ({}));
  return { ok: res.ok, dados };
}

// Ficha de uma imobiliária: situação no topo, ações mais usadas primeiro
// (prorrogar, entrar como), depois plano/condições e faturas.
export function FichaEmpresa({ tenantId, planos, onFechar, onMudou }) {
  const router = useRouter();
  const [ficha, setFicha] = useState(null);
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    const { ok, dados } = await api("GET", `/assinaturas/${tenantId}`);
    setFicha(ok ? dados : { erro: dados.error || "Não foi possível carregar." });
  }, [tenantId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function acao(metodo, caminho, corpo, sucesso) {
    setOcupado(true);
    setAviso("");
    const { ok, dados } = await api(metodo, caminho, corpo);
    setOcupado(false);
    setAviso(ok ? sucesso : dados.error || "Não deu certo. Tente de novo.");
    if (ok) {
      await carregar();
      onMudou?.();
    }
  }

  async function entrarComo() {
    setOcupado(true);
    const res = await fetch("/api/ver-empresa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tenantId }),
    });
    setOcupado(false);
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setAviso("Não foi possível entrar como esta empresa.");
    }
  }

  const t = ficha?.tenant;
  const sub = ficha?.assinatura;
  const situacao = ficha?.acesso ? situacaoEmTexto(ficha.acesso) : null;
  const plataforma = ficha && tenantId === 1;

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{t?.nome || "Carregando…"}</DialogTitle>
          <DialogDescription>{t?.email}</DialogDescription>
        </DialogHeader>

        {ficha?.erro && <p role="alert" className="text-base text-destructive">{ficha.erro}</p>}

        {situacao && (
          <div className={`ass-destaque ass-tom-${situacao.tom} rounded-lg bg-[var(--muted)] p-4`}>
            <span className="ass-selo">{situacao.selo}</span>
            <p className="mt-2 text-base font-semibold text-cx-text">{situacao.titulo}</p>
            <p className="text-sm text-cx-muted">
              Plano {ficha.plano?.nome || "—"}
              {ficha.acesso?.pago_ate ? ` · pago até ${data(ficha.acesso.pago_ate)}` : ""}
              {t?.bloqueado_motivo ? ` · motivo do bloqueio: ${t.bloqueado_motivo}` : ""}
            </p>
          </div>
        )}

        {aviso && <p role="status" className="text-sm font-semibold text-cx-text">{aviso}</p>}

        {sub && !plataforma && (
          <>
            <AcoesRapidas t={t} ocupado={ocupado} acao={acao} entrarComo={entrarComo} tenantId={tenantId} />
            <PlanoECondicoes sub={sub} planos={planos} ocupado={ocupado} acao={acao} tenantId={tenantId} />
            <Faturas faturas={ficha.faturas || []} ocupado={ocupado} acao={acao} />
          </>
        )}
        {plataforma && <p className="text-sm text-cx-muted">Esta é a empresa da plataforma: não é cobrada nem bloqueada.</p>}
      </DialogContent>
    </Dialog>
  );
}

function AcoesRapidas({ t, ocupado, acao, entrarComo, tenantId }) {
  const [dias, setDias] = useState("7");
  return (
    <section className="space-y-3">
      <h3 className="text-base">Ações</h3>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm font-semibold text-cx-text">
          Prorrogar por
          <span className="mt-1 flex items-center gap-2">
            <input type="number" min="1" max="366" value={dias} onChange={(e) => setDias(e.target.value)} className="cx-input h-10 w-20" />
            <span className="text-sm font-normal text-cx-muted">dias</span>
          </span>
        </label>
        <Button variant="outline" disabled={ocupado} onClick={() => acao("POST", `/assinaturas/${tenantId}/prorrogar`, { dias: Number(dias) }, `Prorrogado por ${dias} dias.`)}>
          Prorrogar
        </Button>
        <Button variant="outline" disabled={ocupado} onClick={entrarComo}>Entrar como esta empresa</Button>
        {t?.bloqueado ? (
          <Button variant="outline" disabled={ocupado} onClick={() => acao("POST", `/assinaturas/${tenantId}/desbloquear`, null, "Empresa desbloqueada.")}>
            Desbloquear
          </Button>
        ) : (
          <Button
            variant="destructive"
            disabled={ocupado}
            onClick={() => {
              const motivo = window.prompt("Motivo do bloqueio (a empresa não vê este texto):", "");
              if (motivo !== null) acao("POST", `/assinaturas/${tenantId}/bloquear`, { motivo }, "Empresa bloqueada.");
            }}
          >
            Bloquear
          </Button>
        )}
      </div>
    </section>
  );
}

function PlanoECondicoes({ sub, planos, ocupado, acao, tenantId }) {
  const [planId, setPlanId] = useState(String(sub.plan_id));
  const [ciclo, setCiclo] = useState(sub.ciclo || "mensal");
  const [preco, setPreco] = useState(sub.preco_combinado != null ? String(sub.preco_combinado) : "");
  const [tolerancia, setTolerancia] = useState(String(sub.tolerancia_dias ?? 3));

  return (
    <section className="space-y-3">
      <h3 className="text-base">Plano e condições</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-cx-text">
          Plano
          <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="cx-input mt-1 h-10 w-full">
            {planos.map((p) => (
              <option key={p.id} value={p.id}>{p.nome} — {brl(p.preco_mensal)}/mês{p.ativo ? "" : " (fora da vitrine)"}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-cx-text">
          Ciclo
          <select value={ciclo} onChange={(e) => setCiclo(e.target.value)} className="cx-input mt-1 h-10 w-full">
            <option value="mensal">Mensal</option>
            <option value="anual">Anual</option>
          </select>
        </label>
      </div>
      <Button
        variant="outline"
        disabled={ocupado || (String(sub.plan_id) === planId && sub.ciclo === ciclo)}
        onClick={() => acao("PUT", `/subscriptions/${tenantId}/change-plan`, { plan_id: Number(planId), ciclo }, "Plano trocado. Vale a partir da próxima fatura.")}
      >
        Trocar plano agora
      </Button>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-cx-text">
          Preço combinado (R$/mês)
          <input
            type="number"
            min="0"
            step="0.01"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            placeholder="Vazio = preço do plano · 0 = cortesia"
            className="cx-input mt-1 h-10 w-full"
          />
        </label>
        <label className="text-sm font-semibold text-cx-text">
          Tolerância após o vencimento (dias)
          <input type="number" min="0" max="30" value={tolerancia} onChange={(e) => setTolerancia(e.target.value)} className="cx-input mt-1 h-10 w-full" />
        </label>
      </div>
      <Button
        variant="outline"
        disabled={ocupado}
        onClick={() =>
          acao(
            "PUT",
            `/assinaturas/${tenantId}/condicoes`,
            preco === ""
              ? { usar_tabela: true, tolerancia_dias: Number(tolerancia) }
              : { preco_combinado: Number(preco), tolerancia_dias: Number(tolerancia) },
            "Condições salvas. Valem a partir da próxima fatura."
          )
        }
      >
        Salvar condições
      </Button>
    </section>
  );
}

function Faturas({ faturas, ocupado, acao }) {
  return (
    <section className="space-y-2">
      <h3 className="text-base">Faturas</h3>
      {faturas.length === 0 && <p className="text-sm text-cx-muted">Nenhuma fatura ainda.</p>}
      <ul className="divide-y divide-[var(--border)]">
        {faturas.map((f) => {
          const s = STATUS_FATURA[f.status] || STATUS_FATURA.cancelada;
          const aberta = f.status === "pendente" || f.status === "vencida";
          return (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className="block font-semibold text-cx-text">{brl(f.valor)}</span>
                <span className="block text-sm text-cx-muted">
                  Vence {dataDaFatura(f.vencimento)}
                  {f.forma_pagamento ? ` · ${FORMA[f.forma_pagamento] || f.forma_pagamento}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className={`ass-selo ass-tom-${s.tom}`}>{s.texto}</span>
                {aberta && (
                  <>
                    <Button
                      size="sm"
                      disabled={ocupado}
                      onClick={() => window.confirm(`Confirmar que ${brl(f.valor)} foi recebido?`) && acao("POST", `/assinaturas/faturas/${f.id}/baixa`, null, "Baixa registrada. O acesso foi liberado.")}
                    >
                      Dar baixa
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={ocupado}
                      onClick={() => window.confirm("Cancelar esta fatura?") && acao("POST", `/assinaturas/faturas/${f.id}/cancelar`, null, "Fatura cancelada.")}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
