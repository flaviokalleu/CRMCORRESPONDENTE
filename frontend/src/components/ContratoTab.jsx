import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Link2, Upload, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const cardStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
};

const inputClass = 'w-full rounded-xl px-4 py-3 text-white placeholder-white/40 bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/40';

export default function ContratoTab() {
  const [opcoes, setOpcoes] = useState({ imoveis: [], proprietarios: [], inquilinos: [] });
  const [contratos, setContratos] = useState([]);
  const [selectedInquilino, setSelectedInquilino] = useState('');
  const [selectedImovel, setSelectedImovel] = useState('');
  const [selectedProprietario, setSelectedProprietario] = useState('');
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const token = useMemo(() => localStorage.getItem('authToken'), []);

  const authHeaders = useMemo(() => ({
    Authorization: token ? `Bearer ${token}` : '',
  }), [token]);

  const carregar = async () => {
    try {
      setLoading(true);
      setErr('');

      const [opRes, contratosRes] = await Promise.all([
        fetch(`${API_URL}/contratos/opcoes`, { headers: authHeaders }),
        fetch(`${API_URL}/contratos`, { headers: authHeaders }),
      ]);

      if (!opRes.ok) throw new Error('Erro ao carregar opções');
      if (!contratosRes.ok) throw new Error('Erro ao carregar contratos');

      const opData = await opRes.json();
      const contratosData = await contratosRes.json();

      setOpcoes(opData);
      setContratos(contratosData);
    } catch (e) {
      setErr(e.message || 'Falha ao carregar dados da aba Contrato');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vincularContrato = async (e) => {
    e.preventDefault();
    setMsg('');
    setErr('');

    if (!selectedInquilino || !selectedImovel || !selectedProprietario) {
      setErr('Selecione inquilino, imóvel e proprietário.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/contratos/vincular`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cliente_aluguel_id: selectedInquilino,
          aluguel_id: selectedImovel,
          proprietario_id: selectedProprietario,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao vincular contrato');

      if (arquivos.length > 0) {
        const fd = new FormData();
        arquivos.forEach((file) => fd.append('documentos', file));

        const uploadRes = await fetch(`${API_URL}/contratos/${selectedInquilino}/documentos`, {
          method: 'POST',
          headers: {
            ...authHeaders,
          },
          body: fd,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Erro ao enviar documentos');
      }

      setMsg('Contrato vinculado e documentação salva com sucesso.');
      setArquivos([]);
      await carregar();
    } catch (e) {
      setErr(e.message || 'Erro ao salvar contrato');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Aba Contrato</h2>
            <p className="text-sm text-white/60">Vincule inquilino ao imóvel e proprietário, e suba os documentos.</p>
          </div>
        </div>

        <form onSubmit={vincularContrato} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/70 mb-2">Inquilino</label>
            <select className={`${inputClass} [&>option]:bg-white [&>option]:text-gray-900`} value={selectedInquilino} onChange={(e) => setSelectedInquilino(e.target.value)}>
              <option value="">Selecione</option>
              {opcoes.inquilinos.map((i) => (
                <option key={i.id} value={i.id}>{i.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">Imóvel</label>
            <select className={`${inputClass} [&>option]:bg-white [&>option]:text-gray-900`} value={selectedImovel} onChange={(e) => setSelectedImovel(e.target.value)}>
              <option value="">Selecione</option>
              {opcoes.imoveis.map((im) => (
                <option key={im.id} value={im.id}>{im.nome_imovel}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">Proprietário</label>
            <select className={`${inputClass} [&>option]:bg-white [&>option]:text-gray-900`} value={selectedProprietario} onChange={(e) => setSelectedProprietario(e.target.value)}>
              <option value="">Selecione</option>
              {opcoes.proprietarios.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">Documentação (contratos, anexos, etc)</label>
            <input
              type="file"
              multiple
              className={inputClass}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setArquivos(Array.from(e.target.files || []))}
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3 mt-2">
            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 transition text-white font-semibold disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Vincular Contrato
            </button>
            {arquivos.length > 0 && (
              <span className="text-sm text-white/70 inline-flex items-center gap-2">
                <Upload className="w-4 h-4 text-orange-400" />
                {arquivos.length} arquivo(s) selecionado(s)
              </span>
            )}
          </div>
        </form>

        {msg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {msg}
          </div>
        )}
        {err && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {err}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-5" style={cardStyle}>
        <h3 className="text-lg font-bold text-white mb-3">Contratos Vinculados</h3>
        {loading ? (
          <div className="text-white/70 inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>
        ) : contratos.length === 0 ? (
          <p className="text-white/60">Nenhum contrato vinculado ainda.</p>
        ) : (
          <div className="space-y-3">
            {contratos.map((c) => (
              <div key={c.id} className="rounded-xl p-3 bg-white/5 border border-white/10">
                <p className="text-white font-semibold">{c.nome}</p>
                <p className="text-white/70 text-sm">Imóvel: {c.imovel?.nome_imovel || 'Não vinculado'}</p>
                <p className="text-white/70 text-sm">Proprietário: {c.proprietario?.name || c.proprietario_nome || 'Não vinculado'}</p>
                <p className="text-white/60 text-xs mt-1">Documentos: {Array.isArray(c.contrato_documentos) ? c.contrato_documentos.length : 0}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
