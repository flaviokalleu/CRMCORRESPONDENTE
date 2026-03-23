import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText, DollarSign, Calculator, Calendar, ArrowRightLeft,
  MessageSquare, Clock,
} from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const TIPO_CONFIG = {
  nota: { icon: MessageSquare, color: "bg-blue-500", label: "Nota" },
  pagamento: { icon: DollarSign, color: "bg-emerald-500", label: "Pagamento" },
  simulacao: { icon: Calculator, color: "bg-purple-500", label: "Simulação" },
  visita: { icon: Calendar, color: "bg-cyan-500", label: "Visita" },
  proposta: { icon: ArrowRightLeft, color: "bg-amber-500", label: "Proposta" },
};

const STATUS_COLORS = {
  realizada: "text-emerald-400",
  agendada: "text-blue-400",
  cancelada: "text-red-400",
  aceita: "text-emerald-400",
  recusada: "text-red-400",
  pendente: "text-amber-400",
  em_negociacao: "text-amber-400",
  approved: "text-emerald-400",
  pending: "text-amber-400",
  rejected: "text-red-400",
};

const formatDate = (d) => {
  const date = new Date(d);
  const now = new Date();
  const diff = now - date;
  const dias = Math.floor(diff / 86400000);

  if (dias === 0) return `Hoje, ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  if (dias === 1) return `Ontem, ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  if (dias < 7) return `${dias} dias atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

const ClienteTimeline = ({ clienteId }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!clienteId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("authToken");
        const { data } = await axios.get(`${API_URL}/timeline/cliente/${clienteId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTimeline(data.data || []);
      } catch {
        setTimeline([]);
      }
      setLoading(false);
    };
    fetch();
  }, [clienteId]);

  const filtered = filter ? timeline.filter((t) => t.tipo === filter) : timeline;

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-caixa-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            !filter ? "bg-caixa-orange/20 text-caixa-orange" : "bg-white/5 text-white/40 hover:text-white"
          }`}
        >
          Tudo ({timeline.length})
        </button>
        {Object.entries(TIPO_CONFIG).map(([key, val]) => {
          const count = timeline.filter((t) => t.tipo === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filter === key ? "bg-caixa-orange/20 text-caixa-orange" : "bg-white/5 text-white/40 hover:text-white"
              }`}
            >
              {val.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/10">
          <div className="text-center">
            <Clock className="mx-auto h-8 w-8 text-white/10" />
            <p className="mt-2 text-xs text-white/30">Nenhum registro encontrado</p>
          </div>
        </div>
      ) : (
        <div className="relative ml-4 border-l border-white/10 pl-6">
          {filtered.map((item, idx) => {
            const config = TIPO_CONFIG[item.tipo] || { icon: FileText, color: "bg-gray-500", label: item.tipo };
            const Icon = config.icon;

            return (
              <motion.div
                key={`${item.tipo}-${item.id}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="relative mb-4 last:mb-0"
              >
                {/* Dot */}
                <div className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full ${config.color}`}>
                  <Icon className="h-3 w-3 text-white" />
                </div>

                {/* Content */}
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/20">
                        {config.label}
                      </span>
                      {item.status && (
                        <span className={`text-[10px] font-medium ${STATUS_COLORS[item.status] || "text-white/30"}`}>
                          {item.status}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/20">{formatDate(item.data)}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-white/80">{item.titulo}</p>
                  {item.descricao && (
                    <p className="mt-0.5 text-xs text-white/40">{item.descricao}</p>
                  )}
                  {item.usuario && (
                    <p className="mt-1 text-[10px] text-white/20">por {item.usuario}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClienteTimeline;
