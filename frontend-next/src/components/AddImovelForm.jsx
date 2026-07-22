"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Client Component: cadastro de imóvel. Chama sempre o proxy Next
// (/api/backend/...) — nunca o Go direto e nunca localStorage.
//
// TODO(upload de imagens): o backend antigo aceitava multipart/form-data com
// campos `documentacao`, `imagens` (múltiplas) e `imagem_capa`. Portar upload
// de arquivo exige trocar o body para FormData e remover o header
// Content-Type manual (o browser define o boundary sozinho). Por ora o form
// envia só os campos de texto/JSON abaixo; upload fica para uma iteração
// futura quando o endpoint de arquivos estiver confirmado no Go.

const initialState = {
  nome_imovel: "",
  descricao_imovel: "",
  endereco: "",
  tipo: "novo",
  quartos: "",
  banheiro: "",
  valor_venda: "",
  valor_avaliacao: "",
  situacao_imovel: "",
  localizacao: "Valparaiso de Goiás - Goiás",
  exclusivo: "não",
  tem_inquilino: "não",
  observacoes: "",
};

export function AddImovelForm() {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!formData.nome_imovel.trim()) e.nome_imovel = "Nome é obrigatório";
    if (!formData.endereco.trim()) e.endereco = "Endereço é obrigatório";
    if (!formData.quartos) e.quartos = "Quartos é obrigatório";
    if (!formData.banheiro) e.banheiro = "Banheiros é obrigatório";
    if (!formData.valor_venda) e.valor_venda = "Valor de venda é obrigatório";
    if (!formData.situacao_imovel.trim()) e.situacao_imovel = "Situação é obrigatória";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setFormData(initialState);
    setErrors({});
    setMessage({ type: "", text: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      setMessage({ type: "error", text: "Corrija os erros no formulário." });
      return;
    }
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/backend/imoveis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quartos: Number(formData.quartos),
          banheiro: Number(formData.banheiro),
          valor_venda: Number(formData.valor_venda),
          valor_avaliacao: formData.valor_avaliacao ? Number(formData.valor_avaliacao) : null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || "Erro ao cadastrar imóvel");

      setMessage({ type: "success", text: "Imóvel cadastrado com sucesso!" });
      resetForm();
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erro ao cadastrar imóvel" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-caixa-orange/50 focus:ring-1 focus:ring-caixa-orange/30";
  const labelClass = "mb-1 block text-xs font-medium text-white/50";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Cadastro de Imóvel</h1>
        <p className="mt-1 text-sm text-white/40">Preencha as informações para cadastrar um novo imóvel.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Nome do Imóvel *</label>
          <input
            className={inputClass}
            value={formData.nome_imovel}
            onChange={(e) => handleChange("nome_imovel", e.target.value)}
            placeholder="Ex: Residencial Jardim Europa"
          />
          {errors.nome_imovel && <p className="mt-1 text-xs text-red-400">{errors.nome_imovel}</p>}
        </div>

        <div>
          <label className={labelClass}>Tipo</label>
          <select
            className={inputClass}
            value={formData.tipo}
            onChange={(e) => handleChange("tipo", e.target.value)}
          >
            <option value="novo">Novo</option>
            <option value="usado">Usado</option>
            <option value="agio">Ágio</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Situação do Imóvel *</label>
          <input
            className={inputClass}
            value={formData.situacao_imovel}
            onChange={(e) => handleChange("situacao_imovel", e.target.value)}
            placeholder="Pronto para morar"
          />
          {errors.situacao_imovel && <p className="mt-1 text-xs text-red-400">{errors.situacao_imovel}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Descrição</label>
          <textarea
            className={inputClass}
            rows={3}
            value={formData.descricao_imovel}
            onChange={(e) => handleChange("descricao_imovel", e.target.value)}
            placeholder="Descreva detalhes, diferenciais e características..."
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Endereço *</label>
          <input
            className={inputClass}
            value={formData.endereco}
            onChange={(e) => handleChange("endereco", e.target.value)}
            placeholder="Rua, número, bairro"
          />
          {errors.endereco && <p className="mt-1 text-xs text-red-400">{errors.endereco}</p>}
        </div>

        <div>
          <label className={labelClass}>Quartos *</label>
          <input
            type="number"
            className={inputClass}
            value={formData.quartos}
            onChange={(e) => handleChange("quartos", e.target.value)}
          />
          {errors.quartos && <p className="mt-1 text-xs text-red-400">{errors.quartos}</p>}
        </div>

        <div>
          <label className={labelClass}>Banheiros *</label>
          <input
            type="number"
            className={inputClass}
            value={formData.banheiro}
            onChange={(e) => handleChange("banheiro", e.target.value)}
          />
          {errors.banheiro && <p className="mt-1 text-xs text-red-400">{errors.banheiro}</p>}
        </div>

        <div>
          <label className={labelClass}>Valor de Avaliação (R$)</label>
          <input
            type="number"
            className={inputClass}
            value={formData.valor_avaliacao}
            onChange={(e) => handleChange("valor_avaliacao", e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Valor de Venda (R$) *</label>
          <input
            type="number"
            className={inputClass}
            value={formData.valor_venda}
            onChange={(e) => handleChange("valor_venda", e.target.value)}
          />
          {errors.valor_venda && <p className="mt-1 text-xs text-red-400">{errors.valor_venda}</p>}
        </div>

        <div>
          <label className={labelClass}>Exclusivo</label>
          <select
            className={inputClass}
            value={formData.exclusivo}
            onChange={(e) => handleChange("exclusivo", e.target.value)}
          >
            <option value="não">Não</option>
            <option value="sim">Sim</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Tem Inquilino</label>
          <select
            className={inputClass}
            value={formData.tem_inquilino}
            onChange={(e) => handleChange("tem_inquilino", e.target.value)}
          >
            <option value="não">Não</option>
            <option value="sim">Sim</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Observações</label>
          <textarea
            className={inputClass}
            rows={2}
            value={formData.observacoes}
            onChange={(e) => handleChange("observacoes", e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] p-3 text-xs text-white/40">
        Upload de imagens/documentação: TODO — endpoint de arquivos ainda não portado (ver comentário no topo deste
        arquivo).
      </div>

      {message.text && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={resetForm}
          className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
        >
          Limpar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-caixa-orange px-4 py-2 text-sm font-semibold text-white hover:bg-caixa-orange/90 disabled:opacity-50"
        >
          {loading ? "Cadastrando..." : "Cadastrar Imóvel"}
        </button>
      </div>
    </form>
  );
}
