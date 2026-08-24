"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Client Component: cadastro de imóvel para aluguel. Referência de lógica:
// frontend/src/components/AddAluguelForm.jsx. Envia multipart/form-data via
// proxy `/api/backend/alugueis` (nunca axios, nunca chamada direta ao Go).
export default function AddAluguelPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nome_imovel: "",
    descricao: "",
    valor_aluguel: "",
    quartos: "",
    banheiro: "",
    dia_vencimento: "",
  });
  const [fotoCapa, setFotoCapa] = useState(null);
  const [fotosAdicionais, setFotosAdicionais] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!formData.nome_imovel.trim()) return setError("Nome do imóvel é obrigatório");
    if (!formData.descricao.trim()) return setError("Descrição é obrigatória");
    if (!formData.valor_aluguel) return setError("Valor do aluguel é obrigatório");

    setLoading(true);

    const fd = new FormData();
    fd.append("nome_imovel", formData.nome_imovel);
    fd.append("descricao", formData.descricao);
    fd.append("valor_aluguel", formData.valor_aluguel);
    fd.append("quartos", formData.quartos);
    fd.append("banheiro", formData.banheiro);
    fd.append("dia_vencimento", formData.dia_vencimento);
    if (fotoCapa) fd.append("foto_capa", fotoCapa);
    if (fotosAdicionais) {
      Array.from(fotosAdicionais).forEach((file) => fd.append("fotos_adicionais", file));
    }

    try {
      const res = await fetch("/api/backend/alugueis", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao cadastrar imóvel. Tente novamente.");
      }
      setSuccess(true);
      setFormData({ nome_imovel: "", descricao: "", valor_aluguel: "", quartos: "", banheiro: "", dia_vencimento: "" });
      setFotoCapa(null);
      setFotosAdicionais(null);
      router.push("/alugueis");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-cx-text">Cadastrar imóvel para aluguel</h1>
        <Link href="/alugueis" className="text-sm text-cx-muted hover:text-cx-text">
          Voltar
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-cx-muted mb-1">Nome / Endereço *</label>
          <input
            type="text"
            name="nome_imovel"
            value={formData.nome_imovel}
            onChange={handleChange}
            required
            placeholder="Apartamento Rua das Flores, 123"
            className="w-full rounded-md border border-cx-border bg-cx-surface px-3 py-2 text-cx-text placeholder-[#9aa6b4] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          />
        </div>

        <div>
          <label className="block text-sm text-cx-muted mb-1">Descrição *</label>
          <textarea
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            required
            rows={4}
            placeholder="Descreva o imóvel: localização, características, diferenciais..."
            className="w-full rounded-md border border-cx-border bg-cx-surface px-3 py-2 text-cx-text placeholder-[#9aa6b4] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm text-cx-muted mb-1">Valor do aluguel *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="valor_aluguel"
              value={formData.valor_aluguel}
              onChange={handleChange}
              required
              placeholder="1500.00"
              className="w-full rounded-md border border-cx-border bg-cx-surface px-3 py-2 text-cx-text placeholder-[#9aa6b4] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />
          </div>
          <div>
            <label className="block text-sm text-cx-muted mb-1">Quartos</label>
            <input
              type="number"
              min="0"
              max="10"
              name="quartos"
              value={formData.quartos}
              onChange={handleChange}
              placeholder="3"
              className="w-full rounded-md border border-cx-border bg-cx-surface px-3 py-2 text-cx-text placeholder-[#9aa6b4] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />
          </div>
          <div>
            <label className="block text-sm text-cx-muted mb-1">Banheiros</label>
            <input
              type="number"
              min="0"
              max="10"
              name="banheiro"
              value={formData.banheiro}
              onChange={handleChange}
              placeholder="2"
              className="w-full rounded-md border border-cx-border bg-cx-surface px-3 py-2 text-cx-text placeholder-[#9aa6b4] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />
          </div>
          <div>
            <label className="block text-sm text-cx-muted mb-1">Dia vencimento</label>
            <input
              type="number"
              min="1"
              max="31"
              name="dia_vencimento"
              value={formData.dia_vencimento}
              onChange={handleChange}
              placeholder="10"
              className="w-full rounded-md border border-cx-border bg-cx-surface px-3 py-2 text-cx-text placeholder-[#9aa6b4] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-cx-muted mb-1">Foto de capa</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFotoCapa(e.target.files[0] || null)}
              className="w-full text-sm text-cx-muted file:mr-3 file:rounded-md file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-white file:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-cx-muted mb-1">Fotos adicionais</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFotosAdicionais(e.target.files)}
              className="w-full text-sm text-cx-muted file:mr-3 file:rounded-md file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-white file:text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
            Imóvel cadastrado com sucesso!
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "Cadastrando..." : "Cadastrar imóvel"}
        </button>
      </form>
    </div>
  );
}
