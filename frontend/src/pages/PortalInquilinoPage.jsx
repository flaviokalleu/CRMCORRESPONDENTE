import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Home, DollarSign, Calendar, CheckCircle, Clock, AlertTriangle,
  FileText, Download, ExternalLink, LogOut, Loader2, CreditCard,
  User, Shield, Receipt
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL;

const PortalInquilinoPage = () => {
  const [token, setToken] = useState(localStorage.getItem("portal_token") || null);
  const [nomeInquilino, setNomeInquilino] = useState(localStorage.getItem("portal_nome") || "");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState(null);
  const [cobrancas, setCobrancas] = useState([]);
  const [recibos, setRecibos] = useState([]);
  const [chamados, setChamados] = useState([]);
  const [tab, setTab] = useState("cobrancas");
  const [modalChamado, setModalChamado] = useState(false);
  const [formChamado, setFormChamado] = useState({ titulo: '', descricao: '', categoria: 'outros', prioridade: 'media' });

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    if (token) {
      carregarDados();
    }
  }, [token]);

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro("");
    try {
      const res = await fetch(`${API_URL}/portal/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("portal_token", data.token);
        localStorage.setItem("portal_nome", data.nome);
        setToken(data.token);
        setNomeInquilino(data.nome);
      } else {
        setErro(data.error || "CPF nao encontrado");
      }
    } catch (error) {
      setErro("Erro de conexao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("portal_nome");
    setToken(null);
    setDados(null);
    setCobrancas([]);
    setRecibos([]);
    setChamados([]);
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [dadosRes, cobrancasRes, recibosRes, chamadosRes] = await Promise.all([
        fetch(`${API_URL}/portal/meus-dados`, { headers }),
        fetch(`${API_URL}/portal/cobrancas`, { headers }),
        fetch(`${API_URL}/portal/recibos`, { headers }),
        fetch(`${API_URL}/portal/chamados`, { headers }),
      ]);

      if (dadosRes.status === 401) {
        logout();
        return;
      }

      setDados(await dadosRes.json());
      setCobrancas(await cobrancasRes.json());
      setRecibos(await recibosRes.json());
      setChamados(await chamadosRes.json());
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getStatusBadge = (status) => {
    const config = {
      PENDING: { label: "Pendente", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
      CONFIRMED: { label: "Pago", color: "bg-green-100 text-green-700 border-green-300" },
      RECEIVED: { label: "Recebido", color: "bg-green-100 text-green-700 border-green-300" },
      OVERDUE: { label: "Vencido", color: "bg-red-100 text-red-700 border-red-300" },
      REFUNDED: { label: "Estornado", color: "bg-gray-100 text-gray-700 border-gray-300" },
      CANCELLED: { label: "Cancelado", color: "bg-gray-100 text-gray-700 border-gray-300" },
    };
    const c = config[status] || config.PENDING;
    return <span className={`px-3 py-1 rounded-full text-xs font-medium border ${c.color}`}>{c.label}</span>;
  };

  const getScoreBadge = (score) => {
    if (score == null) return null;
    let color = "bg-red-100 text-red-700";
    let label = "Risco";
    if (score >= 80) { color = "bg-green-100 text-green-700"; label = "Excelente"; }
    else if (score >= 60) { color = "bg-yellow-100 text-yellow-700"; label = "Bom"; }
    else if (score >= 40) { color = "bg-orange-100 text-orange-700"; label = "Regular"; }

    return (
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${color}`}>{score}</span>
        <span className="text-gray-500 text-sm">{label}</span>
      </div>
    );
  };

  // ========== TELA DE LOGIN ==========
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FAF7F2] to-white flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#0B1426] to-[#162a4a] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Home className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Portal do Inquilino</h1>
            <p className="text-gray-500 mt-2">Acesse suas cobrancas, recibos e contrato</p>
          </div>

          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Seu CPF</label>
              <input type="text" value={cpf} onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00" maxLength={14} required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] transition-all text-lg text-center tracking-wider" />
            </div>

            {erro && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-red-600 text-sm">{erro}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#F97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#c2410c] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="text-center text-gray-400 text-xs mt-6">CRM IMOB - Gestao Imobiliaria</p>
        </motion.div>
      </div>
    );
  }

  // ========== LOADING ==========
  if (loading && !dados) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#F97316] animate-spin" />
      </div>
    );
  }

  // ========== PORTAL ==========
  const proximaCobranca = cobrancas.find(c => c.status === "PENDING" || c.status === "OVERDUE");

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0B1426] to-[#162a4a] rounded-xl flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Portal do Inquilino</p>
              <p className="font-bold text-gray-900">{nomeInquilino}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-all text-sm">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Cards Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Proxima Cobranca */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-[#F97316]" />
              <span className="text-sm font-medium text-gray-500">Proximo Vencimento</span>
            </div>
            {proximaCobranca ? (
              <>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(proximaCobranca.valor)}</p>
                <p className="text-sm text-gray-500 mt-1">Vence: {new Date(proximaCobranca.data_vencimento + 'T00:00:00').toLocaleDateString("pt-BR")}</p>
                {proximaCobranca.invoice_url && (
                  <a href={proximaCobranca.invoice_url} target="_blank" rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#F97316] text-white rounded-xl text-sm font-medium hover:bg-[#ea580c] transition-all">
                    <ExternalLink className="w-4 h-4" /> Pagar Agora
                  </a>
                )}
              </>
            ) : (
              <p className="text-green-600 font-medium">Tudo em dia!</p>
            )}
          </motion.div>

          {/* Status */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              {dados?.em_atraso ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
              <span className="text-sm font-medium text-gray-500">Status</span>
            </div>
            <p className={`text-2xl font-bold ${dados?.em_atraso ? "text-red-600" : "text-green-600"}`}>
              {dados?.em_atraso ? "Em Atraso" : "Em Dia"}
            </p>
            <p className="text-sm text-gray-500 mt-1">Aluguel: {formatCurrency(dados?.valor_aluguel)} / Dia {dados?.dia_vencimento}</p>
          </motion.div>

          {/* Score */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-500">Seu Score</span>
            </div>
            {dados?.score_inquilino != null ? getScoreBadge(dados.score_inquilino) : (
              <p className="text-gray-400 text-sm">Score ainda nao calculado</p>
            )}
          </motion.div>
        </div>

        {/* Imovel */}
        {dados?.imovel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Home className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-500">Seu Imovel</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{dados.imovel.nome_imovel}</p>
            <p className="text-gray-500 text-sm mt-1">{dados.imovel.descricao}</p>
            <div className="flex gap-4 mt-2 text-sm text-gray-500">
              <span>{dados.imovel.quartos} quartos</span>
              <span>{dados.imovel.banheiro} banheiros</span>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-xl border border-gray-200 p-1">
          {[
            { key: "cobrancas", label: "Cobrancas", icon: CreditCard },
            { key: "recibos", label: "Recibos", icon: Receipt },
            { key: "chamados", label: "Chamados", icon: AlertTriangle },
            { key: "contrato", label: "Contrato", icon: FileText },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                tab === t.key ? "bg-[#0B1426] text-white" : "text-gray-500 hover:bg-gray-100"
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-3">
          {tab === "cobrancas" && cobrancas.map((c) => (
            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(c.status)}
                  <span className="text-xs text-gray-400">{c.tipo === "avulso" ? "Avulsa" : "Recorrente"}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(c.valor)}</p>
                <div className="flex gap-4 text-xs text-gray-500 mt-1">
                  <span>Vence: {new Date(c.data_vencimento + 'T00:00:00').toLocaleDateString("pt-BR")}</span>
                  {c.data_pagamento && <span className="text-green-600">Pago: {new Date(c.data_pagamento + 'T00:00:00').toLocaleDateString("pt-BR")}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {c.invoice_url && (c.status === "PENDING" || c.status === "OVERDUE") && (
                  <a href={c.invoice_url} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#F97316] text-white rounded-lg text-sm font-medium hover:bg-[#ea580c] transition-all flex items-center gap-1">
                    <ExternalLink className="w-4 h-4" /> Pagar
                  </a>
                )}
              </div>
            </motion.div>
          ))}

          {tab === "recibos" && recibos.map((r) => (
            <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">{formatCurrency(r.valor)}</p>
                <p className="text-xs text-gray-500">Pago em: {r.data_pagamento ? new Date(r.data_pagamento + 'T00:00:00').toLocaleDateString("pt-BR") : "N/A"}</p>
              </div>
              {r.recibo_url && (
                <a href={`${API_URL}/portal/recibo/${r.id}/pdf`} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all flex items-center gap-1">
                  <Download className="w-4 h-4" /> Recibo
                </a>
              )}
            </motion.div>
          ))}

          {tab === "chamados" && (
            <div className="space-y-3">
              <button onClick={() => setModalChamado(true)}
                className="w-full py-3 bg-[#F97316] text-white rounded-xl font-medium hover:bg-[#ea580c] transition-all flex items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Abrir Novo Chamado
              </button>
              {chamados.length === 0 && <div className="text-center py-8 text-gray-400">Nenhum chamado registrado.</div>}
              {chamados.map((ch) => (
                <motion.div key={ch.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-900">{ch.titulo}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                      ch.status === 'aberto' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                      ch.status === 'em_andamento' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                      ch.status === 'resolvido' ? 'bg-green-100 text-green-700 border-green-300' :
                      'bg-gray-100 text-gray-700 border-gray-300'
                    }`}>{ch.status === 'em_andamento' ? 'Em Andamento' : ch.status}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{ch.descricao}</p>
                  <div className="flex gap-3 text-xs text-gray-400">
                    <span>Categoria: {ch.categoria}</span>
                    <span>Prioridade: {ch.prioridade}</span>
                    <span>{new Date(ch.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  {ch.resposta_admin && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-500 font-medium mb-1">Resposta do Administrador:</p>
                      <p className="text-sm text-blue-800">{ch.resposta_admin}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {tab === "contrato" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Contrato de Locacao</h3>
              <p className="text-gray-500 mb-4">
                {dados?.data_inicio_contrato
                  ? `Vigencia: ${new Date(dados.data_inicio_contrato + 'T00:00:00').toLocaleDateString("pt-BR")} a ${dados.data_fim_contrato ? new Date(dados.data_fim_contrato + 'T00:00:00').toLocaleDateString("pt-BR") : "Indeterminado"}`
                  : "Contato o administrador para mais informacoes."}
              </p>
              <a href={`${API_URL}/portal/contrato`}
                onClick={(e) => {
                  e.preventDefault();
                  fetch(`${API_URL}/portal/contrato`, { headers })
                    .then(res => {
                      if (res.ok) return res.blob();
                      throw new Error("Nenhum contrato disponivel");
                    })
                    .then(blob => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "contrato.pdf";
                      a.click();
                    })
                    .catch(() => alert("Nenhum contrato disponivel para download."));
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0B1426] text-white rounded-xl font-medium hover:bg-[#162a4a] transition-all">
                <Download className="w-5 h-5" /> Baixar Contrato
              </a>
            </motion.div>
          )}

          {tab === "cobrancas" && cobrancas.length === 0 && (
            <div className="text-center py-12 text-gray-400">Nenhuma cobranca encontrada.</div>
          )}
          {tab === "recibos" && recibos.length === 0 && (
            <div className="text-center py-12 text-gray-400">Nenhum recibo disponivel.</div>
          )}
        </div>
      </main>

      {/* Modal Abrir Chamado */}
      {modalChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Abrir Chamado de Manutencao</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titulo</label>
                <input type="text" value={formChamado.titulo} onChange={(e) => setFormChamado({...formChamado, titulo: e.target.value})}
                  placeholder="Ex: Vazamento no banheiro" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F97316]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
                <textarea value={formChamado.descricao} onChange={(e) => setFormChamado({...formChamado, descricao: e.target.value})}
                  placeholder="Descreva o problema em detalhes..." rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F97316]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select value={formChamado.categoria} onChange={(e) => setFormChamado({...formChamado, categoria: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="hidraulica">Hidraulica</option>
                    <option value="eletrica">Eletrica</option>
                    <option value="estrutural">Estrutural</option>
                    <option value="pintura">Pintura</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                  <select value={formChamado.prioridade} onChange={(e) => setFormChamado({...formChamado, prioridade: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="baixa">Baixa</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalChamado(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-all">Cancelar</button>
              <button onClick={async () => {
                if (!formChamado.titulo || !formChamado.descricao) { alert('Preencha titulo e descricao'); return; }
                try {
                  const res = await fetch(`${API_URL}/portal/chamados`, {
                    method: 'POST', headers, body: JSON.stringify(formChamado),
                  });
                  if (res.ok) {
                    setModalChamado(false);
                    setFormChamado({ titulo: '', descricao: '', categoria: 'outros', prioridade: 'media' });
                    carregarDados();
                    alert('Chamado aberto com sucesso!');
                  }
                } catch (e) { alert('Erro ao abrir chamado'); }
              }} className="flex-1 py-2 bg-[#F97316] text-white rounded-lg font-medium hover:bg-[#ea580c] transition-all">Enviar</button>
            </div>
          </motion.div>
        </div>
      )}

      <footer className="text-center py-6 text-gray-400 text-xs">CRM IMOB - Portal do Inquilino</footer>
    </div>
  );
};

export default PortalInquilinoPage;
