import React, { useEffect, useState, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import {
  MessageCircle,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Power,
  RefreshCw,
  Smartphone,
  ScanLine,
  Settings,
  Plus,
  Trash2,
  ArrowLeftRight,
  Sparkles,
  Phone,
  Clock,
  AlertTriangle,
  X,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import QRCodeLib from "qrcode";
import { useAuth } from "../context/AuthContext";

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ─── Session Manager (inline, redesigned) ────────────────────────────────────

const SessionManager = () => {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSessionId, setNewSessionId] = useState("");
  const [forceCreate, setForceCreate] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [forceDelete, setForceDelete] = useState(false);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/whatsapp/sessions`
        , { headers: getAuthHeaders() }
      );
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions);
        setCurrentSession(data.currentSession);
      } else {
        setError(data.error || "Erro ao carregar sessoes");
      }
    } catch (err) {
      setError("Erro de conexao: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!newSessionId.trim()) {
      setError("O nome da sessao e obrigatorio");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/whatsapp/session/create`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            sessionId: newSessionId.trim(),
            forceCreate,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setSuccess(`Sessao "${data.sessionId}" criada com sucesso!`);
        setShowCreateDialog(false);
        setNewSessionId("");
        setForceCreate(false);
        loadSessions();
      } else {
        setError(data.error || "Erro ao criar sessao");
      }
    } catch (err) {
      setError("Erro de conexao: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/whatsapp/session/${sessionToDelete.id}?force=${forceDelete}`,
        { method: "DELETE", headers: getAuthHeaders() }
      );
      const data = await response.json();
      if (data.success) {
        setSuccess(`Sessao "${data.sessionId}" removida com sucesso!`);
        setShowDeleteDialog(false);
        setSessionToDelete(null);
        setForceDelete(false);
        loadSessions();
      } else {
        setError(data.error || "Erro ao deletar sessao");
      }
    } catch (err) {
      setError("Erro de conexao: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchSession = async (sessionId) => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/whatsapp/session/switch`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ sessionId }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setSuccess(`Trocando para sessao "${sessionId}"`);
        loadSessions();
      } else {
        setError(data.error || "Erro ao trocar sessao");
      }
    } catch (err) {
      setError("Erro de conexao: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldSessions = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/whatsapp/sessions/cleanup`,
        { method: "POST", headers: getAuthHeaders() }
      );
      const data = await response.json();
      if (data.success) {
        setSuccess(`${data.deletedCount} sessoes antigas removidas`);
        loadSessions();
      } else {
        setError(data.error || "Erro na limpeza");
      }
    } catch (err) {
      setError("Erro de conexao: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    // Sem interval: atualize manualmente pelo botão Atualizar
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const getStatusBadge = (session) => {
    if (session.isActive && session.isConnected) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
          <CheckCircle2 size={12} /> Ativa e Conectada
        </span>
      );
    } else if (session.isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-caixa-orange/20 text-caixa-orange border border-caixa-orange/30">
          <AlertTriangle size={12} /> Ativa (Desconectada)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/50 border border-white/10">
        <WifiOff size={12} /> Inativa
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">
          <XCircle size={16} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-3 rounded-xl text-sm">
          <CheckCircle2 size={16} className="shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess("")}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowCreateDialog(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-caixa-orange hover:bg-caixa-orange-dark text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <Plus size={16} /> Nova Sessao
        </button>
        <button
          onClick={loadSessions}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 border border-white/10"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />{" "}
          Atualizar
        </button>
        <button
          onClick={cleanupOldSessions}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-caixa-orange rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 border border-caixa-orange/30"
        >
          <Trash2 size={16} /> Limpar Antigas
        </button>
      </div>

      {/* Sessions List */}
      <div>
        <p className="text-white/60 text-sm mb-2">
          Sessoes disponiveis ({sessions.length})
        </p>
        {sessions.length === 0 && !loading ? (
          <div className="text-center py-6 text-white/40 text-sm">
            <MessageCircle size={32} className="mx-auto mb-2 opacity-40" />
            Nenhuma sessao encontrada. Crie uma nova sessao para comecar.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                  session.isActive
                    ? "bg-white/10 border-caixa-orange/40"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium text-sm">
                      {session.id}
                    </span>
                    {getStatusBadge(session)}
                  </div>
                  <p className="text-white/40 text-xs mt-1">
                    <Clock size={10} className="inline mr-1" />
                    Ultima atividade:{" "}
                    {new Date(session.updatedAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!session.isActive && (
                    <button
                      onClick={() => switchSession(session.id)}
                      disabled={loading}
                      title="Trocar para esta sessao"
                      className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-50"
                    >
                      <ArrowLeftRight size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSessionToDelete(session);
                      setShowDeleteDialog(true);
                    }}
                    disabled={loading}
                    title="Deletar sessao"
                    className="p-2 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/10 w-full max-w-md">
            <h3 className="text-white text-lg font-semibold mb-4">
              Criar Nova Sessao
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-white/60 text-sm mb-1">
                  Nome da Sessao
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newSessionId}
                  onChange={(e) => setNewSessionId(e.target.value)}
                  placeholder="Ex: empresa_1, filial_sp"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-caixa-orange transition-colors"
                />
                <p className="text-white/40 text-xs mt-1">
                  Use um nome unico para identificar a sessao
                </p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setForceCreate(!forceCreate)}
                  className="text-white/60 hover:text-caixa-orange transition-colors"
                >
                  {forceCreate ? (
                    <ToggleRight size={28} className="text-caixa-orange" />
                  ) : (
                    <ToggleLeft size={28} />
                  )}
                </button>
                <span className="text-white/60 text-sm">
                  Forcar criacao (sobrescrever se existir)
                </span>
              </label>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 rounded-xl text-white/60 hover:bg-white/10 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={createSession}
                disabled={loading}
                className="bg-caixa-orange hover:bg-caixa-orange-dark text-white rounded-xl px-5 py-2 font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Criar Sessao"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/10 w-full max-w-md">
            <h3 className="text-white text-lg font-semibold mb-4">
              Confirmar Remocao
            </h3>
            <p className="text-white/80 text-sm mb-3">
              Tem certeza que deseja remover a sessao{" "}
              <strong className="text-white">
                "{sessionToDelete?.id}"
              </strong>
              ?
            </p>
            {sessionToDelete?.isActive && (
              <div className="flex items-center gap-2 bg-caixa-orange/20 border border-caixa-orange/30 text-caixa-orange px-3 py-2 rounded-xl text-sm mb-3">
                <AlertTriangle size={16} />
                Esta e a sessao ativa! A remocao forcara desconexao.
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer mt-2">
              <button
                type="button"
                onClick={() => setForceDelete(!forceDelete)}
                className="text-white/60 hover:text-red-400 transition-colors"
              >
                {forceDelete ? (
                  <ToggleRight size={28} className="text-red-400" />
                ) : (
                  <ToggleLeft size={28} />
                )}
              </button>
              <span className="text-white/60 text-sm">
                Forcar remocao (mesmo se ativa)
              </span>
            </label>
            <div className="flex gap-2 mt-6 justify-end">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 rounded-xl text-white/60 hover:bg-white/10 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={deleteSession}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-5 py-2 font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Remover"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main WhatsAppQRCode Component ───────────────────────────────────────────

const WhatsAppQRCode = () => {
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [sessionInfo, setSessionInfo] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState("default");
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [idle, setIdle] = useState(true);
  const socketRef = useRef(null);
  const empresaLabel = user?.tenant_nome || user?.tenantName || user?.empresa_nome || user?.company_name || "sua empresa";

  // Mapeia eventos do socket para o estado do componente
  const handleWhatsAppEvent = useCallback((data) => {
    if (data.sessionId) setCurrentSessionId(data.sessionId);

    if (data.type === 'qr') {
      setQrCode(data.qrCode || "");
      setConnecting(false);
      setBlocked(false);
      setIdle(false);
      setIsConnected(false);
    } else if (data.type === 'status') {
      if (data.status === 'ready') {
        setIsConnected(true);
        setQrCode("");
        setQrImage("");
        setConnecting(false);
        setIdle(false);
        setBlocked(false);
        setError("");
      } else if (data.status === 'disconnected') {
        setIsConnected(false);
        setQrCode("");
        setQrImage("");
        setIdle(true);
        setConnecting(false);
      }
    } else if (data.type === 'error') {
      setError(data.message || 'Erro na conexão');
      setConnecting(false);
      setIdle(true);
    }
  }, []);

  // Checar status inicial (UMA vez) — sem inicializar nada
  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/whatsapp/qr-code`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();

      if (data.sessionId) setCurrentSessionId(data.sessionId);
      if (data.sessionInfo) setSessionInfo(data.sessionInfo);

      if (data.blocked) {
        setBlocked(true); setIdle(false); setIsConnected(false);
      } else if (data.authenticated) {
        setIsConnected(true); setBlocked(false); setIdle(false); setQrCode(""); setError("");
      } else if (data.hasQrCode && data.qrCode) {
        setQrCode(data.qrCode); setIsConnected(false); setBlocked(false); setIdle(false); setConnecting(false);
      } else if (data.idle) {
        setIdle(true); setIsConnected(false);
      } else if (data.isInitializing) {
        setIdle(false); setConnecting(true);
      }
    } catch {
      // ignora
    }
  }, []);

  // Conexão Socket.IO — substitui todo o polling
  useEffect(() => {
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:8000';
    const socket = io(socketUrl, { withCredentials: true, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WA] Socket conectado:', socket.id);
      if (user?.tenant_id) {
        socket.emit('subscribe:whatsapp', { tenantId: user.tenant_id });
      }
    });

    socket.on('whatsapp:update', (data) => {
      // Filtro de segurança: ignora eventos de outros tenants
      if (user?.tenant_id && data.tenantId && Number(data.tenantId) !== Number(user.tenant_id)) return;
      handleWhatsAppEvent(data);
    });

    socket.on('disconnect', () => console.log('[WA] Socket desconectado'));

    // Busca estado atual uma única vez (socket não repete eventos passados)
    checkStatus();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.tenant_id, handleWhatsAppEvent, checkStatus]);

  // Gerar imagem do QR
  useEffect(() => {
    if (qrCode) {
      QRCodeLib.toDataURL(qrCode, { width: 280, margin: 2 }, (err, url) => {
        if (!err) setQrImage(url);
      });
    } else {
      setQrImage("");
    }
  }, [qrCode]);

  // ─── Ações do usuário ───

  // Conectar WhatsApp (botão principal)
  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError("");
      setIdle(false);
      setBlocked(false);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/whatsapp/connect`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId: currentSessionId }),
      });
      const data = await response.json();
      if (data.hasQrCode && data.qrCode) {
        setQrCode(data.qrCode);
      } else if (data.success) {
        setSuccessMessage(data.message);
      }
    } catch (err) {
      setError("Não foi possível conectar. Verifique se o servidor está rodando.");
    } finally {
      setConnecting(false);
    }
  };

  // Reset conexão bloqueada
  const handleReset = async () => {
    try {
      setLoading(true);
      setError("");
      await fetch(`${process.env.REACT_APP_API_URL}/whatsapp/reset`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      setBlocked(false);
      setIsConnected(false);
      setQrCode("");
      setIdle(true);
      setSuccessMessage("Reset realizado. Clique em Conectar para gerar um novo QR Code.");
    } catch (err) {
      setError("Não foi possível resetar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Desconectar
  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await fetch(`${process.env.REACT_APP_API_URL}/whatsapp/disconnect`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ deleteSession: false }),
      });
      setIsConnected(false);
      setQrCode("");
      setQrImage("");
      setSuccessMessage("Desconectado com sucesso.");
      setSessionInfo(null);
      setIdle(true);
    } catch (err) {
      setError("Não foi possível desconectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Status badge ───
  const statusBadge = () => {
    if (loading) {
      return (
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-caixa-orange/20 text-caixa-orange border border-caixa-orange/30">
          <Loader2 size={14} className="animate-spin" />
          Aguardando QR Code...
        </span>
      );
    }
    if (isConnected) {
      return (
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30">
          <Wifi size={14} />
          Conectado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30">
        <WifiOff size={14} />
        Desconectado
      </span>
    );
  };

  // ─── Render ───
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <MessageCircle size={28} className="text-caixa-orange" />
            WhatsApp
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Conecte o WhatsApp da empresa {empresaLabel} para enviar e receber mensagens pelo sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          {statusBadge()}
          <button
            onClick={() => setShowSessionManager(!showSessionManager)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
              showSessionManager
                ? "bg-caixa-orange/20 text-caixa-orange border-caixa-orange/30"
                : "bg-white/10 text-white/70 border-white/10 hover:bg-white/20"
            }`}
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Sessoes</span>
          </button>
        </div>
      </div>

      {/* Session Manager Panel */}
      {showSessionManager && (
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-5 border border-white/10">
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <Settings size={20} className="text-caixa-orange" />
            Sessões da Empresa
          </h2>
          <SessionManager />
        </div>
      )}

      {/* Session Info Card */}
      {sessionInfo && isConnected && (
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-5 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <Smartphone size={16} className="text-caixa-orange" />
            Informacoes da Sessao
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/40 text-xs mb-1">Sessao</p>
              <p className="text-white font-medium text-sm">
                {currentSessionId}
              </p>
            </div>
            {sessionInfo.phoneNumber && (
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-white/40 text-xs mb-1">Telefone</p>
                <p className="text-white font-medium text-sm flex items-center gap-1.5">
                  <Phone size={14} className="text-green-400" />
                  {sessionInfo.phoneNumber}
                </p>
              </div>
            )}
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/40 text-xs mb-1">Status</p>
              <p className="text-white font-medium text-sm">
                {sessionInfo.status === "active" ? (
                  <span className="text-green-400">Ativo</span>
                ) : (
                  <span className="text-caixa-orange">
                    {sessionInfo.status || "Desconhecido"}
                  </span>
                )}
              </p>
            </div>
          </div>
          {sessionInfo.lastActivity && (
            <p className="text-white/40 text-xs mt-3 flex items-center gap-1">
              <Clock size={12} />
              Ultima atividade:{" "}
              {new Date(sessionInfo.lastActivity).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 backdrop-blur-xl bg-red-500/10 rounded-2xl p-5 border border-red-500/20">
          <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-300 font-medium text-sm">{error}</p>
            <button
              onClick={checkStatus}
              className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs mt-2 transition-colors"
            >
              <RefreshCw size={12} /> Tentar novamente
            </button>
          </div>
          <button
            onClick={() => setError("")}
            className="text-red-400/60 hover:text-red-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 sm:p-8 border border-white/10">
        {blocked ? (
          /* ── Bloqueado ── */
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
              <AlertTriangle size={36} className="text-red-400" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Conexão Bloqueada</h2>
            <p className="text-white/60 text-sm text-center max-w-md mb-6">
              O WhatsApp bloqueou esta sessão. Isso acontece quando a sessão expira ou há muitas tentativas.
            </p>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 bg-caixa-orange hover:bg-caixa-orange-dark text-white rounded-xl px-6 py-3 font-semibold transition-colors"
            >
              <RefreshCw size={18} />
              Resetar e Tentar Novamente
            </button>
          </div>

        ) : connecting || loading ? (
          /* ── Conectando ── */
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-caixa-orange/20 flex items-center justify-center">
              <Loader2 size={36} className="text-caixa-orange animate-spin" />
            </div>
            <p className="text-white font-semibold text-lg mt-6">Conectando ao WhatsApp...</p>
            <p className="text-white/60 text-sm mt-1">Buscando a versão mais recente e gerando QR Code</p>
            <button
              onClick={handleReset}
              className="mt-6 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-xl px-5 py-2 text-sm font-medium transition-colors"
            >
              <RefreshCw size={14} />
              Cancelar e tentar novamente
            </button>
          </div>

        ) : isConnected ? (
          /* ── Conectado ── */
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
              <CheckCircle2 size={48} className="text-green-400" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">WhatsApp Conectado!</h2>
            {successMessage && <p className="text-green-400 font-medium text-sm mb-1">{successMessage}</p>}
            <p className="text-white/60 text-sm mb-8 text-center max-w-md">
              Seu WhatsApp está conectado e pronto para enviar e receber mensagens pelo sistema.
            </p>
            <div className="flex items-center gap-4 bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-3 mb-8">
              <Sparkles size={18} className="text-green-400" />
              <span className="text-green-300 text-sm">Tudo funcionando perfeitamente!</span>
            </div>
            <button
              onClick={handleDisconnect}
              className="inline-flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl px-6 py-3 font-semibold transition-colors border border-red-500/30"
            >
              <Power size={18} />
              Desconectar WhatsApp
            </button>
          </div>

        ) : qrImage ? (
          /* ── QR Code Exibido ── */
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex flex-col items-center flex-1">
              <div className="bg-white rounded-2xl p-4 shadow-2xl shadow-black/20">
                <img src={qrImage} alt="QR Code do WhatsApp" className="w-64 h-64 sm:w-72 sm:h-72" />
              </div>
              <p className="text-white/40 text-xs mt-3 flex items-center gap-1">
                <RefreshCw size={10} />
                Atualiza em tempo real via socket
              </p>
            </div>
            <div className="flex-1 w-full lg:max-w-sm">
              <h2 className="text-white text-xl font-bold mb-5">Como conectar</h2>
              <div className="space-y-4">
                {[
                  { n: '1', title: 'Abra o WhatsApp no celular', desc: 'Toque no ícone do WhatsApp no seu telefone' },
                  { n: '2', title: 'Acesse "Aparelhos conectados"', desc: 'Toque nos três pontinhos (menu) e depois em "Aparelhos conectados"' },
                  { n: '3', title: 'Toque em "Conectar aparelho"', desc: 'Toque no botão verde para abrir o leitor' },
                  { n: '4', title: 'Aponte a câmera para o QR Code', desc: 'Escaneie o código que aparece aqui ao lado' },
                ].map(step => (
                  <div key={step.n} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-caixa-orange/20 flex items-center justify-center shrink-0">
                      <span className="text-caixa-orange font-bold text-sm">{step.n}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{step.title}</p>
                      <p className="text-white/50 text-xs mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        ) : (
          /* ── Estado Idle — Esperando o usuário clicar ── */
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center mb-6">
              <MessageCircle size={40} className="text-white/20" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">WhatsApp Desconectado</h2>
            <p className="text-white/60 text-sm text-center max-w-md mb-8">
              Clique no botão abaixo para gerar o QR Code e conectar o WhatsApp da empresa {empresaLabel} ao sistema.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-3 bg-caixa-orange hover:bg-caixa-orange-dark text-white rounded-xl px-8 py-4 text-lg font-semibold transition-colors shadow-lg shadow-caixa-orange/20 disabled:opacity-50"
            >
              <ScanLine size={22} />
              Conectar WhatsApp
            </button>
            <p className="text-white/30 text-xs text-center mt-3">
              Você vai precisar do celular com WhatsApp instalado
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppQRCode;
