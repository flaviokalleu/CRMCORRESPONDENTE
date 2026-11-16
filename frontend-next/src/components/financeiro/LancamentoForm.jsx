"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { MoneyInput } from "@/components/ui/money-input";
import { parseMoney } from "@/lib/masks";
import { formatBRL } from "@/components/ui/page";
import { hojeISO } from "@/lib/financeiro";

const TEXTOS = {
  receita: {
    rota: "receitas", abrir: "Lançar receita", titulo: "Novo dinheiro que entrou",
    exemploTipo: "Ex.: Comissão de venda", exemploDesc: "Ex.: Venda do apto 302 – Maria", salvar: "Salvar receita",
    ok: (v) => `Receita de ${v} lançada.`,
  },
  despesa: {
    rota: "despesas", abrir: "Lançar despesa", titulo: "Novo gasto",
    exemploTipo: "Ex.: Aluguel do escritório", exemploDesc: "Ex.: Sala comercial – novembro", salvar: "Salvar despesa",
    ok: (v) => `Despesa de ${v} lançada.`,
  },
};

// Teto da coluna numeric(12,2) do banco; categoria e descrição são varchar(255).
const VALOR_MAXIMO = 9999999999.99;
const MAX_TEXTO = 255;

const vazio = () => ({ tipo: "", valor: "", descricao: "", data: hojeISO() });

// Cadastro rápido que abre na própria lista (o usuário não perde de vista o
// que já lançou). Mesmo contrato de antes: POST /api/backend/{receitas|despesas}
// com { tipo, valor (número), descricao, data (ISO) }.
export function LancamentoForm({ tipo = "receita", categorias = [], abertoInicial = false }) {
  const t = TEXTOS[tipo];
  const router = useRouter();
  const [aberto, setAberto] = useState(abertoInicial);
  const [form, setForm] = useState(vazio);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const idBase = `lanc-${tipo}`;

  const muda = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }));
  };

  // Cancelar descarta o que foi digitado: reabrir começa limpo.
  const fechar = () => { setForm(vazio()); setErros({}); setAberto(false); };

  const enviar = async (e) => {
    e.preventDefault();
    const valor = parseMoney(form.valor);
    const novos = {};
    if (!form.tipo.trim()) novos.tipo = "Diga do que se trata (a categoria).";
    if (!(valor > 0)) novos.valor = "Informe um valor maior que zero.";
    else if (valor > VALOR_MAXIMO) novos.valor = "Valor alto demais. O máximo é R$ 9.999.999.999,99.";
    if (!form.data) novos.data = "Escolha a data.";
    setErros(novos);
    if (Object.keys(novos).length) return;

    setSalvando(true);
    try {
      const res = await fetch(`/api/backend/${t.rota}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: form.tipo.trim(),
          valor,
          descricao: form.descricao.trim(),
          data: new Date(`${form.data}T00:00:00Z`).toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 400 && /valor/i.test(data.error || "")) setErros({ valor: data.error });
        toast.error(data.error || "Não foi possível salvar. Tente de novo.");
        return;
      }
      toast.success(t.ok(formatBRL(valor)));
      setForm(vazio());
      setAberto(false);
      router.refresh();
    } catch {
      toast.error("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) {
    return (
      <Button type="button" onClick={() => setAberto(true)} className="gap-2">
        <Plus className="size-4" aria-hidden="true" /> {t.abrir}
      </Button>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="crm-form crm-card fin-novo w-full" aria-label={t.titulo}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink-heading">{t.titulo}</h2>
        <Button type="button" variant="ghost" size="icon" onClick={fechar} aria-label="Fechar">
          <X className="size-4" />
        </Button>
      </div>
      <div className="fin-novo-grade">
        <FormField id={`${idBase}-tipo`} label="Categoria" required error={erros.tipo} hint={categorias.length ? "Escolha uma já usada ou escreva uma nova." : undefined}>
          <input
            type="text"
            list={`${idBase}-categorias`}
            value={form.tipo}
            onChange={(e) => muda("tipo", e.target.value)}
            placeholder={t.exemploTipo}
            maxLength={MAX_TEXTO}
            autoComplete="off"
            autoFocus
          />
        </FormField>
        <datalist id={`${idBase}-categorias`}>
          {categorias.map((c) => <option key={c} value={c} />)}
        </datalist>
        <FormField id={`${idBase}-valor`} label="Valor" required error={erros.valor} semClonar>
          <MoneyInput
            id={`${idBase}-valor`}
            value={form.valor}
            onChange={(v) => muda("valor", v)}
            aria-invalid={erros.valor ? true : undefined}
            aria-describedby={erros.valor ? `${idBase}-valor-erro` : undefined}
          />
        </FormField>
        <FormField id={`${idBase}-data`} label="Data" required error={erros.data}>
          <input type="date" value={form.data} onChange={(e) => muda("data", e.target.value)} />
        </FormField>
        <FormField id={`${idBase}-desc`} label="Descrição" optional className="fin-novo-largo">
          <input type="text" value={form.descricao} onChange={(e) => muda("descricao", e.target.value)} placeholder={t.exemploDesc} maxLength={MAX_TEXTO} />
        </FormField>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={fechar}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>{salvando ? "Salvando…" : t.salvar}</Button>
      </div>
    </form>
  );
}
