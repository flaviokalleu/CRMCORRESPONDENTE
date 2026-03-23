import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Edit3, Loader2 } from "lucide-react";
import { fetchPlans, updatePlanApi } from "../../services/superAdminApi";
import { Modal, LoadingSpinner, COLORS, formatCurrency, inputCls } from "./shared";

const PlanosTab = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editPlan, setEditPlan] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      const data = await fetchPlans();
      setPlans(data);
    } catch (err) {
      console.error("Erro ao carregar planos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const openEdit = (plan) => {
    setEditPlan(plan);
    setFormData({
      nome: plan.nome || "",
      preco_mensal: plan.preco_mensal || plan.preco || "",
      max_clientes: plan.max_clientes ?? "",
      max_usuarios: plan.max_usuarios ?? "",
      max_imoveis: plan.max_imoveis ?? "",
      descricao: plan.descricao || "",
    });
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!editPlan) return;
    try {
      setSaving(true);
      await updatePlanApi(editPlan.id, formData);
      setEditModalOpen(false);
      loadPlans();
    } catch (err) {
      console.error("Erro ao salvar plano:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.length === 0 ? (
          <p className="text-gray-500 col-span-full text-center py-10">Nenhum plano cadastrado.</p>
        ) : plans.map((plan, idx) => (
          <motion.div key={plan.id || idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-caixa-orange/30 transition-colors relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
            <div className="mb-4">
              <h3 className="text-white font-bold text-lg capitalize">{plan.nome}</h3>
              <p className="text-gray-500 text-sm mt-1">{plan.descricao || ""}</p>
            </div>
            <p className="text-3xl font-bold text-caixa-orange mb-4">
              {formatCurrency(plan.preco_mensal || plan.preco)}<span className="text-sm text-gray-500 font-normal">/mês</span>
            </p>
            <div className="space-y-2 mb-5">
              {[["Clientes", plan.max_clientes], ["Usuários", plan.max_usuarios], ["Imóveis", plan.max_imoveis]].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{label}</span>
                  <span className="text-white font-medium">{val === 0 ? "Ilimitado" : val}</span>
                </div>
              ))}
            </div>
            <button onClick={() => openEdit(plan)}
              className="w-full py-2 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:border-caixa-orange/50 hover:bg-caixa-orange/10 transition-all flex items-center justify-center gap-2 text-sm">
              <Edit3 size={14} /> Editar plano
            </button>
          </motion.div>
        ))}
      </div>

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Plano">
        <div className="space-y-4">
          {[
            { key: "nome", label: "Nome do Plano", type: "text" },
            { key: "preco_mensal", label: "Preço Mensal (R$)", type: "number" },
            { key: "max_clientes", label: "Máx. Clientes (0 = ilimitado)", type: "number" },
            { key: "max_usuarios", label: "Máx. Usuários (0 = ilimitado)", type: "number" },
            { key: "max_imoveis", label: "Máx. Imóveis (0 = ilimitado)", type: "number" },
            { key: "descricao", label: "Descrição", type: "text" },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-sm text-gray-400 mb-1">{label}</label>
              <input type={type} value={formData[key] ?? ""} onChange={(e) => setFormData((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-caixa-orange/50" />
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-caixa-orange text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {saving && <Loader2 size={16} className="animate-spin" />} Salvar Alterações
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PlanosTab;
