import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Link2, Upload, Loader2, CheckCircle2, AlertTriangle, Trash2, Edit2, Download, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').replace(/\/+$/, "");

const cardStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
};

const inputClass = 'w-full rounded-xl px-4 py-3 text-white placeholder-white/40 bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/40';

export default function ListaContratos() {
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
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [docsModal, setDocsModal] = useState(null);

  const token = useMemo(() => localStorage.getItem('authToken'), []);

  const authHeaders = useMemo(() => ({
    Authorization: token ? `Bearer ${token}` : '',
  }), [token]);

  const carregar = async () => {
    try {
      setLoading(true);
      setErr('');

      const [opRes, contratosRes] = await Promise.all([
        fetch(`${API_URL}/contratos/opcoes`, { 
          headers: authHeaders,
          cache: 'no-store'
        }),
        fetch(`${API_URL}/contratos`, { 
          headers: authHeaders,
          cache: 'no-store'
        }),
      ]);

      if (!opRes.ok) {
        const errText = await opRes.text();
        console.error('Erro ao carregar opções:', opRes.status, errText);
        throw new Error(`Erro ao carregar opções (${opRes.status})`);
      }
      if (!contratosRes.ok) {
        const errText = await contratosRes.text();
        console.error('Erro ao carregar contratos:', contratosRes.status, errText);
        throw new Error(`Erro ao carregar contratos (${contratosRes.status})`);
      }

      const opData = await opRes.json();
      const contratosData = await contratosRes.json();

      setOpcoes(opData);
      setContratos(contratosData);
    } catch (e) {
      console.error('Falha ao carregar dados dos contratos:', e.message);
      setErr(e.message || 'Falha ao carregar dados dos contratos');
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
      setSelectedInquilino('');
      setSelectedImovel('');
      setSelectedProprietario('');
      await carregar();
    } catch (e) {
      setErr(e.message || 'Erro ao salvar contrato');
    } finally {
      setSaving(false);
    }
  };

  const deletarContrato = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este contrato?')) return;
    
    try {
      setErr('');
      const res = await fetch(`${API_URL}/contratos/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      if (!res.ok) throw new Error('Erro ao deletar contrato');
      
      setMsg('Contrato deletado com sucesso');
      await carregar();
    } catch (e) {
      setErr(e.message || 'Falha ao deletar contrato');
    }
  };

  const abrirEdicao = (contrato) => {
    setEditForm({
      id: contrato.id,
      inquilino_id: contrato.cliente_aluguel_id || '',
      imovel_id: contrato.aluguel_id || '',
      proprietario_id: contrato.proprietario_id || '',
    });
    setEditModal(true);
  };

  const salvarEdicao = async () => {
    if (!editForm.inquilino_id || !editForm.imovel_id || !editForm.proprietario_id) {
      setErr('Todos os campos são obrigatórios');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/contratos/${editForm.id}/atualizar`, {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cliente_aluguel_id: editForm.inquilino_id,
          aluguel_id: editForm.imovel_id,
          proprietario_id: editForm.proprietario_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar contrato');

      setMsg('Contrato atualizado com sucesso');
      setEditModal(null);
      await carregar();
    } catch (e) {
      setErr(e.message || 'Falha ao atualizar contrato');
    } finally {
      setSaving(false);
    }
  };

  const abrirDocumentos = (contrato) => {
    const documentosNormalizados = Array.isArray(contrato.contrato_documentos)
      ? contrato.contrato_documentos.map((doc, index) => ({
          ...doc,
          _docId: doc?.id ?? `${contrato.id}-${index}`,
        }))
      : [];

    setDocsModal({
      contrato,
      documentos: documentosNormalizados,
    });
  };

  const baixarDocumento = async (doc) => {
    try {
      const docId = doc?._docId ?? doc?.id;
      if (!docId) {
        throw new Error('Documento sem identificador para download');
      }

      const res = await fetch(`${API_URL}/contratos/documento/${docId}/download`, {
        headers: authHeaders,
      });

      if (!res.ok) throw new Error('Erro ao baixar documento');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.nome_arquivo || doc.nome || `documento_${docId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.message || 'Erro ao baixar documento');
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-caixa-primary via-caixa-secondary to-caixa-primary">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Gerenciamento de Contratos</h1>
              <p className="text-white/60">Cadastre e gerencie todos os contratos de aluguel</p>
            </div>
          </div>
        </div>

        {/* Formulário de Cadastro */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6" 
          style={cardStyle}
        >
          <h2 className="text-xl font-bold text-white mb-4">Novo Contrato</h2>
          
          <form onSubmit={vincularContrato} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Inquilino</label>
              <select 
                className={`${inputClass} [&>option]:bg-gray-900 [&>option]:text-white`} 
                value={selectedInquilino} 
                onChange={(e) => setSelectedInquilino(e.target.value)}
              >
                <option value="">Selecione um inquilino</option>
                {opcoes.inquilinos?.map((i) => (
                  <option key={i.id} value={i.id}>{i.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Imóvel</label>
              <select 
                className={`${inputClass} [&>option]:bg-gray-900 [&>option]:text-white`} 
                value={selectedImovel} 
                onChange={(e) => setSelectedImovel(e.target.value)}
              >
                <option value="">Selecione um imóvel</option>
                {opcoes.imoveis?.map((im) => (
                  <option key={im.id} value={im.id}>{im.nome_imovel}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Proprietário</label>
              <select 
                className={`${inputClass} [&>option]:bg-gray-900 [&>option]:text-white`} 
                value={selectedProprietario} 
                onChange={(e) => setSelectedProprietario(e.target.value)}
              >
                <option value="">Selecione um proprietário</option>
                {opcoes.proprietarios?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Documentação</label>
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
                  {arquivos.length} arquivo(s)
                </span>
              )}
            </div>
          </form>

          <AnimatePresence>
            {msg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> {msg}
              </motion.div>
            )}
            {err && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" /> {err}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Lista de Contratos */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-6" 
          style={cardStyle}
        >
          <h2 className="text-xl font-bold text-white mb-4">Contratos Cadastrados</h2>
          
          {loading ? (
            <div className="text-white/70 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando contratos...
            </div>
          ) : contratos.length === 0 ? (
            <p className="text-white/60">Nenhum contrato cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/80 font-semibold">ID</th>
                    <th className="text-left py-3 px-4 text-white/80 font-semibold">Inquilino</th>
                    <th className="text-left py-3 px-4 text-white/80 font-semibold">Imóvel</th>
                    <th className="text-left py-3 px-4 text-white/80 font-semibold">Proprietário</th>
                    <th className="text-left py-3 px-4 text-white/80 font-semibold">Documentos</th>
                    <th className="text-center py-3 px-4 text-white/80 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {contratos.map((c, idx) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-white/5 hover:bg-white/5 transition"
                      >
                        <td className="py-3 px-4 text-white/80">#{c.id}</td>
                        <td className="py-3 px-4 text-white/80">{c.nome || c.inquilino_nome || '-'}</td>
                        <td className="py-3 px-4 text-white/80">{c.imovel?.nome_imovel || 'Não vinculado'}</td>
                        <td className="py-3 px-4 text-white/80">{c.proprietario?.name || c.proprietario_nome || '-'}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-medium">
                            <FileText className="w-3 h-3" />
                            {Array.isArray(c.contrato_documentos) ? c.contrato_documentos.length : 0}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => abrirDocumentos(c)}
                              title="Ver documentos"
                              className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => abrirEdicao(c)}
                              title="Editar contrato"
                              className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deletarContrato(c.id)}
                              title="Deletar contrato"
                              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Modal de Edição */}
        <AnimatePresence>
          {editModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="rounded-2xl p-6 w-full max-w-md"
                style={cardStyle}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">Editar Contrato</h3>
                  <button
                    onClick={() => setEditModal(false)}
                    className="p-1 rounded-lg hover:bg-white/10"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Inquilino</label>
                    <select
                      className={`${inputClass} [&>option]:bg-gray-900 [&>option]:text-white`}
                      value={editForm.inquilino_id}
                      onChange={(e) => setEditForm({ ...editForm, inquilino_id: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      {opcoes.inquilinos?.map((i) => (
                        <option key={i.id} value={i.id}>{i.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-white/70 mb-1">Imóvel</label>
                    <select
                      className={`${inputClass} [&>option]:bg-gray-900 [&>option]:text-white`}
                      value={editForm.imovel_id}
                      onChange={(e) => setEditForm({ ...editForm, imovel_id: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      {opcoes.imoveis?.map((im) => (
                        <option key={im.id} value={im.id}>{im.nome_imovel}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-white/70 mb-1">Proprietário</label>
                    <select
                      className={`${inputClass} [&>option]:bg-gray-900 [&>option]:text-white`}
                      value={editForm.proprietario_id}
                      onChange={(e) => setEditForm({ ...editForm, proprietario_id: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      {opcoes.proprietarios?.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarEdicao}
                    disabled={saving}
                    className="flex-1 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Salvar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Documentos */}
        <AnimatePresence>
          {docsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setDocsModal(null)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="rounded-2xl p-6 w-full max-w-md max-h-96 overflow-y-auto"
                style={cardStyle}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">Documentos do Contrato #{docsModal.contrato.id}</h3>
                  <button
                    onClick={() => setDocsModal(null)}
                    className="p-1 rounded-lg hover:bg-white/10"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {docsModal.documentos.length === 0 ? (
                  <p className="text-white/60">Nenhum documento vinculado.</p>
                ) : (
                  <div className="space-y-2">
                    {docsModal.documentos.map((doc, idx) => (
                      <div key={doc._docId || idx} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex-1">
                          <p className="text-white text-sm truncate">{doc.nome_arquivo || doc.nome || `Documento ${idx + 1}`}</p>
                          <p className="text-white/50 text-xs">
                            {doc.tamanho ? `${(doc.tamanho / 1024).toFixed(2)} KB` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => baixarDocumento(doc)}
                          title="Baixar documento"
                          className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
