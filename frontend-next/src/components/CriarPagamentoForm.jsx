"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Client Component: cria pagamentos avulsos (boleto/pix/universal) via proxy
// Next.js (/api/backend/pagamentos/<tipo>) — nunca fala com o Go direto.
// Porta a lógica de frontend/src/components/Pagamentos/CriarPagamento.jsx,
// sem o polimento visual (funcional > bonito).
export function CriarPagamentoForm() {
  const router = useRouter();

  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [resultado, setResultado] = useState(null);

  const [formData, setFormData] = useState({
    cliente_id: "",
    tipo: "universal",
    titulo: "",
    descricao: "",
    valor: "",
    data_vencimento: "",
    observacoes: "",
    enviar_whatsapp: false,
    enviar_email: false,
  });

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setFormData((prev) => ({ ...prev, data_vencimento: d.toISOString().split("T")[0] }));

    (async () => {
      try {
        setLoadingClientes(true);
        const res = await fetch("/api/backend/clientes", { headers: { "Content-Type": "application/json" } });
        if (res.ok) {
          const data = await res.json();
          setClientes(data.clientes || []);
        }
      } catch {
        setError("Erro ao carregar clientes");
      } finally {
        setLoadingClientes(false);
      }
    })();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const endpointPorTipo = {
    boleto: "/api/backend/pagamentos/boleto",
    pix: "/api/backend/pagamentos/pix",
    universal: "/api/backend/pagamentos/universal",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setResultado(null);

    try {
      const endpoint = endpointPorTipo[formData.tipo];
      const payload = {
        cliente_id: parseInt(formData.cliente_id, 10),
        titulo: formData.titulo,
        descricao: formData.descricao,
        valor: parseFloat(String(formData.valor).replace(",", ".")) || 0,
        observacoes: formData.observacoes,
        enviar_whatsapp: formData.enviar_whatsapp,
        enviar_email: formData.enviar_email,
      };
      // PIX não tem data_vencimento (expira automaticamente).
      if (formData.tipo !== "pix") {
        payload.data_vencimento = formData.data_vencimento;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess("Pagamento criado com sucesso!");
        setResultado(data);
        setFormData((prev) => ({
          ...prev,
          titulo: "",
          descricao: "",
          valor: "",
          observacoes: "",
        }));
      } else {
        setError(data.error || "Erro ao criar pagamento");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-cx-text">Criar Pagamento</h1>
        <Link href="/pagamentos/lista" className="text-sm text-cx-muted hover:text-cx-text underline">
          Ver lista
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="crm-form space-y-4 rounded-xl border border-cx-border bg-cx-surface p-4">
        <div>
          <label className="block text-xs text-cx-muted mb-1">Tipo de pagamento *</label>
          <select
            value={formData.tipo}
            onChange={(e) => handleChange("tipo", e.target.value)}
            className="w-full rounded-md bg-cx-surface border border-cx-border text-cx-text px-3 py-2 text-sm"
          >
            <option value="universal">Universal (PIX, Cartão, Boleto)</option>
            <option value="boleto">Boleto</option>
            <option value="pix">PIX</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-cx-muted mb-1">Cliente *</label>
          <select
            value={formData.cliente_id}
            onChange={(e) => handleChange("cliente_id", e.target.value)}
            required
            disabled={loadingClientes}
            className="w-full rounded-md bg-cx-surface border border-cx-border text-cx-text px-3 py-2 text-sm"
          >
            <option value="">{loadingClientes ? "Carregando..." : "Selecione um cliente"}</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} {c.cpf ? `- ${c.cpf}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-cx-muted mb-1">Título *</label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => handleChange("titulo", e.target.value)}
              required
              placeholder="Ex: Consultoria imobiliária"
              className="w-full rounded-md bg-cx-surface border border-cx-border text-cx-text px-3 py-2 text-sm placeholder-[#9aa6b4]"
            />
          </div>
          <div>
            <label className="block text-xs text-cx-muted mb-1">Valor (R$) *</label>
            <input
              type="text"
              inputMode="decimal"
              value={formData.valor}
              onChange={(e) => handleChange("valor", e.target.value)}
              required
              placeholder="0,00"
              className="w-full rounded-md bg-cx-surface border border-cx-border text-cx-text px-3 py-2 text-sm placeholder-[#9aa6b4]"
            />
          </div>
        </div>

        {formData.tipo !== "pix" && (
          <div>
            <label className="block text-xs text-cx-muted mb-1">Data de vencimento</label>
            <input
              type="date"
              value={formData.data_vencimento}
              onChange={(e) => handleChange("data_vencimento", e.target.value)}
              className="w-full rounded-md bg-cx-surface border border-cx-border text-cx-text px-3 py-2 text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-cx-muted mb-1">Descrição</label>
          <textarea
            value={formData.descricao}
            onChange={(e) => handleChange("descricao", e.target.value)}
            rows={2}
            className="w-full rounded-md bg-cx-surface border border-cx-border text-cx-text px-3 py-2 text-sm placeholder-[#9aa6b4]"
            placeholder="Descrição do serviço ou produto"
          />
        </div>

        <div>
          <label className="block text-xs text-cx-muted mb-1">Observações</label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => handleChange("observacoes", e.target.value)}
            rows={2}
            className="w-full rounded-md bg-cx-surface border border-cx-border text-cx-text px-3 py-2 text-sm placeholder-[#9aa6b4]"
            placeholder="Observações adicionais"
          />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-cx-muted">
            <input
              type="checkbox"
              checked={formData.enviar_whatsapp}
              onChange={(e) => handleChange("enviar_whatsapp", e.target.checked)}
            />
            Enviar por WhatsApp
          </label>
          <label className="flex items-center gap-2 text-sm text-cx-muted">
            <input
              type="checkbox"
              checked={formData.enviar_email}
              onChange={(e) => handleChange("enviar_email", e.target.checked)}
            />
            Enviar por Email
          </label>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || loadingClientes}
          className="w-full rounded-md bg-cx-orange hover:bg-cx-orange-dark disabled:opacity-50 text-white text-sm font-semibold py-2.5"
        >
          {loading ? "Criando..." : "Criar pagamento"}
        </button>
      </form>

      {success && resultado && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 space-y-2">
          <p className="font-semibold">{success}</p>
          <p>ID: #{resultado.pagamento?.id}</p>
          {resultado.asaas?.invoice_url && (
            <p>
              Link:{" "}
              <a
                href={resultado.asaas.invoice_url}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {resultado.asaas.invoice_url}
              </a>
            </p>
          )}
          <button
            onClick={() => router.push("/pagamentos/lista")}
            className="mt-2 rounded-md bg-cx-surface hover:bg-cx-bg text-cx-text px-3 py-1.5 text-xs"
          >
            Ver lista de pagamentos
          </button>
        </div>
      )}
    </div>
  );
}
