"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Client Component: formulário de vínculo inquilino + imóvel + proprietário
// (com upload opcional de documentos). Referência de lógica:
// frontend/src/components/ListaContratos.jsx (vincularContrato).
export function ContratoVincularForm({ opcoes, onSalvo }) {
  const router = useRouter();
  const [selectedInquilino, setSelectedInquilino] = useState("");
  const [selectedImovel, setSelectedImovel] = useState("");
  const [selectedProprietario, setSelectedProprietario] = useState("");
  const [arquivos, setArquivos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const enviando = useRef(false); // trava contra clique duplo

  async function handleSubmit(e) {
    e.preventDefault();
    if (enviando.current) return;
    setMsg("");
    setErr("");

    if (!selectedInquilino || !selectedImovel || !selectedProprietario) {
      setErr("Selecione inquilino, imóvel e proprietário.");
      return;
    }

    enviando.current = true;
    setSaving(true);
    try {
      const res = await fetch("/api/backend/contratos/vincular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Os ids vão como número: o <select> dá texto ("5") e o Go recusava
        // o JSON inteiro — nenhum contrato conseguia ser salvo pela tela.
        body: JSON.stringify({
          cliente_aluguel_id: Number(selectedInquilino),
          aluguel_id: Number(selectedImovel),
          proprietario_id: Number(selectedProprietario),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao vincular contrato");

      if (arquivos.length > 0) {
        const fd = new FormData();
        arquivos.forEach((file) => fd.append("documentos", file));
        const uploadRes = await fetch(`/api/backend/contratos/${selectedInquilino}/documentos`, {
          method: "POST",
          body: fd,
        });
        const uploadData = await uploadRes.json().catch(() => null);
        if (!uploadRes.ok) throw new Error(uploadData?.error || "Erro ao enviar documentos");
      }

      setMsg("Contrato vinculado e documentação salva com sucesso.");
      setArquivos([]);
      setSelectedInquilino("");
      setSelectedImovel("");
      setSelectedProprietario("");
      router.refresh();
      onSalvo?.();
    } catch (e2) {
      setErr(e2.message || "Erro ao salvar contrato");
    } finally {
      enviando.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="crm-form grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor="contrato-inquilino" className="block text-sm text-cx-muted mb-1">Inquilino</label>
        <select
          id="contrato-inquilino"
          value={selectedInquilino}
          onChange={(e) => setSelectedInquilino(e.target.value)}
          className="w-full rounded-md border border-cx-border bg-cx-surface px-3 py-2 text-cx-text"
        >
          <option value="">Selecione um inquilino</option>
          {(opcoes?.inquilinos || []).map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="contrato-imovel" className="block text-sm text-cx-muted mb-1">Imóvel</label>
        <select
          id="contrato-imovel"
          value={selectedImovel}
          onChange={(e) => setSelectedImovel(e.target.value)}
          className="w-full rounded-md border border-cx-border bg-cx-surface px-3 py-2 text-cx-text"
        >
          <option value="">Selecione um imóvel</option>
          {(opcoes?.imoveis || []).map((im) => (
            <option key={im.id} value={im.id}>
              {im.nome_imovel}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="contrato-proprietario" className="block text-sm text-cx-muted mb-1">Proprietário</label>
        <select
          id="contrato-proprietario"
          value={selectedProprietario}
          onChange={(e) => setSelectedProprietario(e.target.value)}
          className="w-full rounded-md border border-cx-border bg-cx-surface px-3 py-2 text-cx-text"
        >
          <option value="">Selecione um proprietário</option>
          {(opcoes?.proprietarios || []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="contrato-docs" className="block text-sm text-cx-muted mb-1">Contrato assinado e documentos (opcional)</label>
        <input
          id="contrato-docs"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={(e) => {
            const todos = Array.from(e.target.files || []);
            const ok = todos.filter((f) => /\.(pdf|jpe?g|png|docx?)$/i.test(f.name) && f.size <= 20 * 1024 * 1024);
            setErr(ok.length < todos.length ? "Alguns arquivos foram recusados: envie PDF, JPG, PNG, DOC ou DOCX de até 20 MB." : "");
            setArquivos(ok);
          }}
          className="w-full text-sm text-cx-muted file:mr-3 file:rounded-lg file:border-0 file:bg-cx-blue-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-cx-blue"
        />
      </div>

      <div className="md:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="cx-btn cx-btn-primary"
        >
          {saving ? "Salvando..." : "Salvar contrato"}
        </button>
        {arquivos.length > 0 && <span className="text-sm text-cx-muted">{arquivos.length} arquivo(s)</span>}
      </div>

      {msg && <p role="status" className="md:col-span-2 form-aviso" data-tom="ok">{msg}</p>}
      {err && <p role="alert" className="md:col-span-2 form-aviso" data-tom="erro">{err}</p>}
    </form>
  );
}
