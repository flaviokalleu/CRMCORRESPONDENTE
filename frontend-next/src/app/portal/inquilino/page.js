"use client";

import { useEffect, useState } from "react";

// Página PÚBLICA (fora do grupo `(app)`): o Portal do Inquilino tem seu
// próprio login por CPF com JWT separado (tipo "inquilino"), guardado no
// cookie httpOnly PRÓPRIO `cri_portal_token` (ver src/app/api/portal/*).
// Não usa hasSession()/AuthContext do CRM principal. Referência de lógica:
// frontend/src/pages/PortalInquilinoPage.jsx.
export default function PortalInquilinoPage() {
  const [logado, setLogado] = useState(false);
  const [nomeInquilino, setNomeInquilino] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState(null);
  const [cobrancas, setCobrancas] = useState([]);
  const [recibos, setRecibos] = useState([]);
  const [chamados, setChamados] = useState([]);
  const [tab, setTab] = useState("cobrancas");
  const [modalChamado, setModalChamado] = useState(false);
  const [formChamado, setFormChamado] = useState({ titulo: "", descricao: "", categoria: "outros", prioridade: "media" });

  useEffect(() => {
    if (logado) carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logado]);

  function formatCpfMask(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }

  async function login(e) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, "") }),
      });
      const data = await res.json();
      if (res.ok) {
        setLogado(true);
        setNomeInquilino(data.nome || "");
      } else {
        setErro(data.error || "Acesso ao portal indisponível no momento.");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/portal/logout", { method: "POST" });
    } finally {
      setLogado(false);
      setDados(null);
      setCobrancas([]);
      setRecibos([]);
      setChamados([]);
    }
  }

  async function carregarDados() {
    setLoading(true);
    try {
      const [dadosRes, cobrancasRes, recibosRes, chamadosRes] = await Promise.all([
        fetch("/api/portal/meus-dados"),
        fetch("/api/portal/cobrancas"),
        fetch("/api/portal/recibos"),
        fetch("/api/portal/chamados"),
      ]);

      if (dadosRes.status === 401) {
        await logout();
        return;
      }

      setDados(await dadosRes.json());
      setCobrancas(await cobrancasRes.json());
      setRecibos(await recibosRes.json());
      setChamados(await chamadosRes.json());
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(v) {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatDate(d) {
    return d ? new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR") : "-";
  }

  async function baixarArquivo(path, filename) {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error("Arquivo não disponível");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Arquivo não disponível para download.");
    }
  }

  async function abrirChamado() {
    if (!formChamado.titulo || !formChamado.descricao) {
      alert("Preencha título e descrição");
      return;
    }
    try {
      const res = await fetch("/api/portal/chamados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formChamado),
      });
      if (res.ok) {
        setModalChamado(false);
        setFormChamado({ titulo: "", descricao: "", categoria: "outros", prioridade: "media" });
        carregarDados();
        alert("Chamado aberto com sucesso!");
      } else {
        alert("Erro ao abrir chamado");
      }
    } catch {
      alert("Erro ao abrir chamado");
    }
  }

  // ---------- TELA DE LOGIN ----------
  if (!logado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Portal do Inquilino</h1>
            <p className="text-gray-500 mt-2">Acesse suas cobranças, recibos e contrato</p>
          </div>

          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Seu CPF</label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(formatCpfMask(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg text-center tracking-wider"
              />
            </div>

            {erro && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{erro}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="text-center text-gray-400 text-xs mt-6">CRM IMOB - Gestão Imobiliária</p>
        </div>
      </div>
    );
  }

  if (loading && !dados) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  const proximaCobranca = cobrancas.find((c) => c.status === "PENDING" || c.status === "OVERDUE");

  const statusLabel = {
    PENDING: "Pendente",
    CONFIRMED: "Pago",
    RECEIVED: "Recebido",
    OVERDUE: "Vencido",
    REFUNDED: "Estornado",
    CANCELLED: "Cancelado",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Portal do Inquilino</p>
            <p className="font-bold text-gray-900">{nomeInquilino}</p>
          </div>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-300">
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500 mb-2">Próximo vencimento</p>
            {proximaCobranca ? (
              <>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(proximaCobranca.valor)}</p>
                <p className="text-sm text-gray-500 mt-1">Vence: {formatDate(proximaCobranca.data_vencimento)}</p>
                {proximaCobranca.invoice_url && (
                  <a
                    href={proximaCobranca.invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
                  >
                    Pagar agora
                  </a>
                )}
              </>
            ) : (
              <p className="text-green-600 font-medium">Tudo em dia!</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500 mb-2">Status</p>
            <p className={`text-xl font-bold ${dados?.em_atraso ? "text-red-600" : "text-green-600"}`}>
              {dados?.em_atraso ? "Em atraso" : "Em dia"}
            </p>
            {dados?.imovel && (
              <p className="text-sm text-gray-500 mt-1">
                Aluguel: {formatCurrency(dados.imovel.valor_aluguel)} / Dia {dados.imovel.dia_vencimento}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500 mb-2">Seu imóvel</p>
            {dados?.imovel ? (
              <>
                <p className="font-bold text-gray-900">{dados.imovel.nome_imovel}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {dados.imovel.quartos} quartos &bull; {dados.imovel.banheiro} banheiros
                </p>
              </>
            ) : (
              <p className="text-gray-400 text-sm">Nenhum imóvel vinculado</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 bg-white rounded-xl border border-gray-200 p-1">
          {[
            { key: "cobrancas", label: "Cobranças" },
            { key: "recibos", label: "Recibos" },
            { key: "chamados", label: "Chamados" },
            { key: "contrato", label: "Contrato" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm ${
                tab === t.key ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {tab === "cobrancas" &&
            (cobrancas.length === 0 ? (
              <p className="text-center py-8 text-gray-400">Nenhuma cobrança encontrada.</p>
            ) : (
              cobrancas.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {statusLabel[c.status] || c.status} &bull; {c.tipo === "avulso" ? "Avulsa" : "Recorrente"}
                    </p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(c.valor)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Vence: {formatDate(c.data_vencimento)}
                      {c.data_pagamento && ` · Pago: ${formatDate(c.data_pagamento)}`}
                    </p>
                  </div>
                  {c.invoice_url && (c.status === "PENDING" || c.status === "OVERDUE") && (
                    <a
                      href={c.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 text-center"
                    >
                      Pagar
                    </a>
                  )}
                </div>
              ))
            ))}

          {tab === "recibos" &&
            (recibos.length === 0 ? (
              <p className="text-center py-8 text-gray-400">Nenhum recibo disponível.</p>
            ) : (
              recibos.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{formatCurrency(r.valor)}</p>
                    <p className="text-xs text-gray-500">Pago em: {formatDate(r.data_pagamento)}</p>
                  </div>
                  <button
                    onClick={() => baixarArquivo(`/api/portal/recibo/${r.id}/pdf`, `recibo_${r.id}.pdf`)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    Baixar
                  </button>
                </div>
              ))
            ))}

          {tab === "chamados" && (
            <div className="space-y-3">
              <button
                onClick={() => setModalChamado(true)}
                className="w-full py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600"
              >
                Abrir novo chamado
              </button>
              {chamados.length === 0 && <p className="text-center py-8 text-gray-400">Nenhum chamado registrado.</p>}
              {chamados.map((ch) => (
                <div key={ch.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-900">{ch.titulo}</h4>
                    <span className="px-2 py-1 rounded-full text-xs font-medium border border-gray-300 text-gray-700">
                      {ch.status === "em_andamento" ? "Em andamento" : ch.status}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{ch.descricao}</p>
                  <div className="flex gap-3 text-xs text-gray-400">
                    <span>Categoria: {ch.categoria}</span>
                    <span>Prioridade: {ch.prioridade}</span>
                  </div>
                  {ch.resposta_admin && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-sky-300 font-medium mb-1">Resposta do administrador:</p>
                      <p className="text-sm text-blue-800">{ch.resposta_admin}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "contrato" && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Contrato de locação</h3>
              <p className="text-gray-500 mb-4">
                {dados?.data_inicio_contrato
                  ? `Vigência: ${formatDate(dados.data_inicio_contrato)} a ${
                      dados.data_fim_contrato ? formatDate(dados.data_fim_contrato) : "indeterminado"
                    }`
                  : "Contate o administrador para mais informações."}
              </p>
              <button
                onClick={() => baixarArquivo("/api/portal/contrato", "contrato.pdf")}
                className="inline-block px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800"
              >
                Baixar contrato
              </button>
            </div>
          )}
        </div>
      </main>

      {modalChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Abrir chamado de manutenção</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={formChamado.titulo}
                  onChange={(e) => setFormChamado({ ...formChamado, titulo: e.target.value })}
                  placeholder="Ex: Vazamento no banheiro"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={formChamado.descricao}
                  onChange={(e) => setFormChamado({ ...formChamado, descricao: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    value={formChamado.categoria}
                    onChange={(e) => setFormChamado({ ...formChamado, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="hidraulica">Hidráulica</option>
                    <option value="eletrica">Elétrica</option>
                    <option value="estrutural">Estrutural</option>
                    <option value="pintura">Pintura</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                  <select
                    value={formChamado.prioridade}
                    onChange={(e) => setFormChamado({ ...formChamado, prioridade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalChamado(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button onClick={abrirChamado} className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600">
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center py-6 text-gray-400 text-xs">CRM IMOB - Portal do Inquilino</footer>
    </div>
  );
}
