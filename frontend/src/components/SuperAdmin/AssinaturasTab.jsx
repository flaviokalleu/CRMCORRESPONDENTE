import React, { useEffect, useState, useCallback } from "react";
import { Filter, Loader2, RefreshCw } from "lucide-react";
import { fetchSubscriptions } from "../../services/superAdminApi";
import { statusBadge, formatCurrency } from "./shared";

const AssinaturasTab = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const loadSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const data = await fetchSubscriptions(params);
      setSubscriptions(data);
    } catch (err) {
      console.error("Erro ao carregar assinaturas:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadSubscriptions(); }, [loadSubscriptions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-caixa-orange/50 appearance-none cursor-pointer min-w-[180px] transition-colors">
            <option value="" className="bg-caixa-secondary">Todos os status</option>
            {["ativo", "inativo", "trial", "cancelado", "pendente", "suspenso"].map((s) => (
              <option key={s} value={s} className="bg-caixa-secondary capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <button onClick={loadSubscriptions} className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                {["Organização", "Plano", "Status", "Ciclo", "Valor", "Data Início"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10"><Loader2 className="w-6 h-6 text-caixa-orange animate-spin mx-auto" /></td></tr>
              ) : subscriptions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500">Nenhuma assinatura encontrada.</td></tr>
              ) : subscriptions.map((sub, idx) => (
                <tr key={sub.id || idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white text-sm font-medium">{sub.tenant?.nome || sub.tenant_nome || "—"}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm capitalize">{sub.plan?.nome || sub.plano || "—"}</td>
                  <td className="px-4 py-3">{statusBadge(sub.status)}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm capitalize">{sub.ciclo || "—"}</td>
                  <td className="px-4 py-3 text-white text-sm font-medium">{formatCurrency(sub.valor)}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {sub.data_inicio ? new Date(sub.data_inicio).toLocaleDateString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AssinaturasTab;
