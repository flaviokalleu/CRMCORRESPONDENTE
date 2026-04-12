import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, CheckCheck, Clock, AlertTriangle, DollarSign, Calendar, FileText, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getSocketUrl } from "../utils/socketConfig";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const TIPO_ICONS = {
  info: Info,
  alerta: AlertTriangle,
  sucesso: Check,
  erro: X,
  vencimento: Clock,
  proposta: FileText,
  visita: Calendar,
  pagamento: DollarSign,
};

const TIPO_COLORS = {
  info: "text-blue-400",
  alerta: "text-amber-400",
  sucesso: "text-emerald-400",
  erro: "text-red-400",
  vencimento: "text-amber-400",
  proposta: "text-purple-400",
  visita: "text-cyan-400",
  pagamento: "text-emerald-400",
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const token = localStorage.getItem("authToken");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchCount = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API_URL}/notificacoes/nao-lidas`, { headers });
      setNaoLidas(data.count || 0);
    } catch { /* */ }
  }, [token]);

  const fetchNotificacoes = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/notificacoes`, { headers, params: { limit: 20 } });
      setNotificacoes(data.data || []);
    } catch { /* */ }
    setLoading(false);
  }, [token]);

  // Poll a cada 30s
  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30000);
    return () => clearInterval(id);
  }, [fetchCount]);

  // Socket.io para real-time
  useEffect(() => {
    try {
      const { io } = require("socket.io-client");
      const socketUrl = getSocketUrl();
      const socket = io(socketUrl, { transports: ["websocket"] });

      // Escutar notificações do usuário
      const userId = JSON.parse(atob(token?.split(".")[1] || "e30="))?.id;
      if (userId) {
        socket.on(`notification:${userId}`, () => {
          fetchCount();
          if (open) fetchNotificacoes();
        });
      }

      return () => socket.disconnect();
    } catch { /* Socket.io não disponível */ }
  }, [token, open, fetchCount, fetchNotificacoes]);

  useEffect(() => {
    if (open) fetchNotificacoes();
  }, [open, fetchNotificacoes]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const marcarLida = async (id) => {
    try {
      await axios.put(`${API_URL}/notificacoes/${id}/ler`, {}, { headers });
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
      setNaoLidas(prev => Math.max(0, prev - 1));
    } catch { /* */ }
  };

  const marcarTodas = async () => {
    try {
      await axios.put(`${API_URL}/notificacoes/ler-todas`, {}, { headers });
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
      setNaoLidas(0);
    } catch { /* */ }
  };

  const handleClick = (notif) => {
    if (!notif.lida) marcarLida(notif.id);
    if (notif.link) {
      navigate(notif.link);
      setOpen(false);
    }
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-white/10 bg-caixa-primary shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Notificações</h3>
              {naoLidas > 0 && (
                <button onClick={marcarTodas} className="flex items-center gap-1 text-[10px] text-caixa-orange hover:text-caixa-orange/80">
                  <CheckCheck className="h-3 w-3" /> Marcar todas
                </button>
              )}
            </div>

            {/* Lista */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex h-20 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-caixa-orange border-t-transparent" />
                </div>
              ) : notificacoes.length === 0 ? (
                <div className="flex h-20 items-center justify-center text-xs text-white/30">
                  Nenhuma notificação
                </div>
              ) : (
                notificacoes.map((n) => {
                  const Icon = TIPO_ICONS[n.tipo] || Info;
                  const iconColor = TIPO_COLORS[n.tipo] || "text-white/40";
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${!n.lida ? "bg-white/[0.02]" : ""}`}
                    >
                      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconColor}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`truncate text-xs font-medium ${!n.lida ? "text-white" : "text-white/50"}`}>
                            {n.titulo}
                          </p>
                          {!n.lida && <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-caixa-orange" />}
                        </div>
                        {n.mensagem && (
                          <p className="mt-0.5 line-clamp-2 text-[10px] text-white/30">{n.mensagem}</p>
                        )}
                        <p className="mt-0.5 text-[9px] text-white/20">{timeAgo(n.created_at)}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
