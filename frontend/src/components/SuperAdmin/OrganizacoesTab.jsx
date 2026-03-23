import React, { useEffect, useState, useCallback } from "react";
import {
  Building2, Search, ChevronLeft, ChevronRight, Edit3, Eye, Ban, CheckCircle,
  Loader2, RefreshCw, AlertTriangle, Package, Settings, Save,
  ToggleLeft, ToggleRight, HardDrive
} from "lucide-react";
import { fetchTenants, fetchPlans, fetchTenantDetails, createTenant, updateTenant, toggleTenantStatus, changePlan } from "../../services/superAdminApi";
import { Modal, statusBadge, formatCurrency, inputCls, MODULE_META, ModuleToggle } from "./shared";

const OrganizacoesTab = () => {
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editTab, setEditTab] = useState("dados");
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planTarget, setPlanTarget] = useState(null);
  const [newPlanId, setNewPlanId] = useState("");
  const [newCiclo, setNewCiclo] = useState("mensal");
  const [actionLoading, setActionLoading] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ nome: "", slug: "", email: "", cnpj: "", telefone: "", plan_id: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const getTenantPlan = (t) => t.subscriptions?.[0]?.plan?.nome || "—";
  const getTenantStatus = (t) => (t.ativo ? "Ativo" : "Inativo");

  const loadTenants = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTenants({ search, page, limit: 10 });
      setTenants(data.tenants || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Erro ao carregar organizações:", err);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  const loadPlans = useCallback(async () => {
    try {
      const data = await fetchPlans();
      setPlans(data);
    } catch (err) {
      console.error("Erro ao carregar planos:", err);
    }
  }, []);

  useEffect(() => { loadTenants(); }, [loadTenants]);
  useEffect(() => { loadPlans(); }, [loadPlans]);

  // ── Toggle Status ──
  const handleToggleStatus = async (tenant) => {
    try {
      setActionLoading(tenant.id);
      await toggleTenantStatus(tenant.id);
      loadTenants();
    } catch (err) {
      console.error("Erro ao alterar status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Change Plan ──
  const handleChangePlan = async () => {
    if (!planTarget || !newPlanId) return;
    try {
      setActionLoading(planTarget.id);
      await changePlan(planTarget.id, { plan_id: parseInt(newPlanId), ciclo: newCiclo });
      setPlanModalOpen(false);
      setPlanTarget(null);
      setNewPlanId("");
      loadTenants();
    } catch (err) {
      console.error("Erro ao alterar plano:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Create ──
  const handleCreate = async () => {
    setCreateError("");
    if (!createForm.nome || !createForm.slug || !createForm.email) {
      setCreateError("Nome, slug e email são obrigatórios");
      return;
    }
    try {
      setCreateLoading(true);
      await createTenant({ ...createForm, plan_id: createForm.plan_id ? parseInt(createForm.plan_id) : undefined });
      setCreateOpen(false);
      setCreateForm({ nome: "", slug: "", email: "", cnpj: "", telefone: "", plan_id: "" });
      loadTenants();
    } catch (err) {
      setCreateError(err.response?.data?.error || "Erro ao criar empresa");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleNomeChange = (val) => {
    const slug = val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    setCreateForm((f) => ({ ...f, nome: val, slug }));
  };

  // ── Details ──
  const openDetails = async (tenant) => {
    try {
      const data = await fetchTenantDetails(tenant.id);
      setSelectedTenant(data);
    } catch {
      setSelectedTenant(tenant);
    }
    setDetailsOpen(true);
  };

  // ── Edit ──
  const openEdit = async (tenant) => {
    try {
      const data = await fetchTenantDetails(tenant.id);
      setEditForm({
        nome: data.nome || "", email: data.email || "", cnpj: data.cnpj || "",
        telefone: data.telefone || "", endereco: data.endereco || "", cidade: data.cidade || "",
        estado: data.estado || "", cep: data.cep || "", dominio_customizado: data.dominio_customizado || "",
        use_custom_modules: data.use_custom_modules || false,
        max_clientes: data.max_clientes ?? "", max_usuarios: data.max_usuarios ?? "",
        max_imoveis: data.max_imoveis ?? "", max_alugueis: data.max_alugueis ?? "",
        max_storage_mb: data.max_storage_mb ?? "", max_file_size_mb: data.max_file_size_mb ?? "",
        has_whatsapp: data.has_whatsapp, has_pagamentos: data.has_pagamentos,
        has_ai_analysis: data.has_ai_analysis, has_relatorios_avancados: data.has_relatorios_avancados,
        has_multi_usuarios: data.has_multi_usuarios, has_api_access: data.has_api_access,
        has_suporte_prioritario: data.has_suporte_prioritario, has_dominio_customizado: data.has_dominio_customizado,
        _tenant: data,
      });
      setSelectedTenant(data);
    } catch {
      setEditForm({ ...tenant, _tenant: tenant });
      setSelectedTenant(tenant);
    }
    setEditTab("dados");
    setEditError("");
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedTenant) return;
    setEditError("");
    try {
      setEditLoading(true);
      const { _tenant, ...payload } = editForm;
      ['max_clientes', 'max_usuarios', 'max_imoveis', 'max_alugueis', 'max_storage_mb', 'max_file_size_mb'].forEach(f => {
        if (payload[f] === "" || payload[f] === undefined) payload[f] = null;
        else payload[f] = parseInt(payload[f]);
      });
      await updateTenant(selectedTenant.id, payload);
      setEditOpen(false);
      loadTenants();
    } catch (err) {
      setEditError(err.response?.data?.error || "Erro ao salvar alterações");
    } finally {
      setEditLoading(false);
    }
  };

  const handleModuleToggle = (field, value) => setEditForm(f => ({ ...f, [field]: value }));

  const getEditPlan = () => {
    const t = editForm._tenant || selectedTenant;
    return t?.subscriptions?.[0]?.plan || null;
  };

  const openPlanModal = (tenant) => {
    setPlanTarget(tenant);
    const currentSub = tenant.subscriptions?.[0];
    setNewPlanId(currentSub?.plan?.id?.toString() || "");
    setNewCiclo(currentSub?.ciclo || "mensal");
    setPlanModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Buscar por nome, email ou CNPJ..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-caixa-orange/50 transition-colors" />
        </div>
        <button onClick={loadTenants} className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
          <RefreshCw size={18} />
        </button>
        <button onClick={() => setCreateOpen(true)}
          className="px-4 py-2.5 bg-caixa-orange text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 font-medium text-sm">
          <Building2 size={18} /> Nova Empresa
        </button>
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                {["Nome", "Email", "CNPJ", "Plano", "Status", "Clientes", "Usuários", "Imóveis", "Ações"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10"><Loader2 className="w-6 h-6 text-caixa-orange animate-spin mx-auto" /></td></tr>
              ) : tenants.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-500">Nenhuma empresa encontrada.</td></tr>
              ) : tenants.map((t) => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white text-sm font-medium">{t.nome}</p>
                      <p className="text-gray-500 text-xs">{t.slug}.crmimob.com.br</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{t.email}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{t.cnpj || "—"}</td>
                  <td className="px-4 py-3 text-sm"><span className="text-caixa-orange font-medium">{getTenantPlan(t)}</span></td>
                  <td className="px-4 py-3">{statusBadge(getTenantStatus(t))}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm text-center">{t.stats?.clientes ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm text-center">{t.stats?.usuarios ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm text-center">{t.stats?.imoveis ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openDetails(t)} title="Ver detalhes" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Eye size={16} /></button>
                      <button onClick={() => openEdit(t)} title="Editar empresa" className="p-1.5 rounded-lg text-gray-400 hover:text-caixa-orange hover:bg-orange-500/10 transition-colors"><Edit3 size={16} /></button>
                      <button onClick={() => handleToggleStatus(t)} title={t.ativo ? "Suspender" : "Ativar"} disabled={actionLoading === t.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-50">
                        {actionLoading === t.id ? <Loader2 size={16} className="animate-spin" /> : t.ativo ? <Ban size={16} /> : <CheckCircle size={16} />}
                      </button>
                      <button onClick={() => openPlanModal(t)} title="Alterar plano" className="p-1.5 rounded-lg text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-colors"><Package size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors"><ChevronLeft size={18} /></button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors"><ChevronRight size={18} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title="Detalhes da Empresa" wide>
        {selectedTenant && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ["Nome", selectedTenant.nome], ["Slug", selectedTenant.slug], ["Email", selectedTenant.email],
                ["CNPJ", selectedTenant.cnpj], ["Telefone", selectedTenant.telefone], ["Endereço", selectedTenant.endereco],
                ["Cidade", selectedTenant.cidade], ["Estado", selectedTenant.estado], ["CEP", selectedTenant.cep],
                ["Status", selectedTenant.ativo ? "Ativo" : "Inativo"], ["Domínio", selectedTenant.dominio_customizado],
                ["Criado em", selectedTenant.created_at ? new Date(selectedTenant.created_at).toLocaleDateString("pt-BR") : "—"],
              ].map(([label, val]) => (
                <div key={label}><p className="text-xs text-gray-500 mb-1">{label}</p><p className="text-white text-sm">{val || "—"}</p></div>
              ))}
            </div>
            {selectedTenant.stats && (
              <div className="border-t border-white/10 pt-4">
                <p className="text-sm font-semibold text-gray-400 mb-3">Recursos</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[["Clientes", selectedTenant.stats.clientes], ["Usuários", selectedTenant.stats.usuarios],
                    ["Imóveis", selectedTenant.stats.imoveis], ["Aluguéis", selectedTenant.stats.alugueis]].map(([label, val]) => (
                    <div key={label} className="bg-white/5 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-white">{val ?? 0}</p><p className="text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedTenant.subscriptions?.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <p className="text-sm font-semibold text-gray-400 mb-3">Assinaturas</p>
                <div className="space-y-2">
                  {selectedTenant.subscriptions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div><span className="text-white font-medium text-sm">{sub.plan?.nome || "—"}</span><span className="text-gray-500 text-xs ml-2">({sub.ciclo})</span></div>
                      <div className="flex items-center gap-2"><span className="text-gray-400 text-sm">{formatCurrency(sub.valor)}</span>{statusBadge(sub.status)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Change Plan Modal */}
      <Modal open={planModalOpen} onClose={() => setPlanModalOpen(false)} title="Alterar Plano">
        {planTarget && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Alterar plano de <span className="text-white font-medium">{planTarget.nome}</span></p>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Plano</label>
              <select value={newPlanId} onChange={(e) => setNewPlanId(e.target.value)} className={inputCls}>
                <option value="" className="bg-caixa-secondary">Selecione um plano</option>
                {plans.map((p) => <option key={p.id} value={p.id} className="bg-caixa-secondary">{p.nome} — {formatCurrency(p.preco_mensal)}/mês</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ciclo</label>
              <select value={newCiclo} onChange={(e) => setNewCiclo(e.target.value)} className={inputCls}>
                <option value="mensal" className="bg-caixa-secondary">Mensal</option>
                <option value="anual" className="bg-caixa-secondary">Anual</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setPlanModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleChangePlan} disabled={!newPlanId || actionLoading === planTarget?.id}
                className="px-4 py-2 bg-caixa-orange text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2">
                {actionLoading === planTarget?.id && <Loader2 size={16} className="animate-spin" />} Salvar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Tenant Modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setCreateError(""); }} title="Nova Empresa" wide>
        <div className="space-y-4">
          {createError && <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"><AlertTriangle size={16} /> {createError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-400 mb-1">Nome da Empresa *</label><input type="text" value={createForm.nome} onChange={(e) => handleNomeChange(e.target.value)} placeholder="Ex: Imobiliária Brasil" className={inputCls} /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Slug *</label><input type="text" value={createForm.slug} onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))} placeholder="imobiliaria-brasil" className={inputCls} />{createForm.slug && <p className="text-xs text-gray-500 mt-1">{createForm.slug}.crmimob.com.br</p>}</div>
            <div><label className="block text-sm text-gray-400 mb-1">Email *</label><input type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="contato@empresa.com" className={inputCls} /></div>
            <div><label className="block text-sm text-gray-400 mb-1">CNPJ</label><input type="text" value={createForm.cnpj} onChange={(e) => setCreateForm((f) => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" className={inputCls} /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Telefone</label><input type="text" value={createForm.telefone} onChange={(e) => setCreateForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" className={inputCls} /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Plano Inicial</label>
              <select value={createForm.plan_id} onChange={(e) => setCreateForm((f) => ({ ...f, plan_id: e.target.value }))} className={inputCls}>
                <option value="" className="bg-caixa-secondary">Free (padrão)</option>
                {plans.map((p) => <option key={p.id} value={p.id} className="bg-caixa-secondary">{p.nome} — {formatCurrency(p.preco_mensal)}/mês</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setCreateOpen(false); setCreateError(""); }} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors">Cancelar</button>
            <button onClick={handleCreate} disabled={createLoading} className="px-4 py-2 bg-caixa-orange text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2 font-medium">
              {createLoading && <Loader2 size={16} className="animate-spin" />} Criar Empresa
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Tenant Modal (Dados + Limites + Módulos) */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar Empresa" wide>
        <div className="space-y-4">
          {editError && <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"><AlertTriangle size={16} /> {editError}</div>}

          {/* Sub-tabs */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {[{ key: "dados", label: "Dados", icon: Building2 }, { key: "limites", label: "Limites", icon: Settings }, { key: "modulos", label: "Módulos", icon: Package }].map(t => (
              <button key={t.key} onClick={() => setEditTab(t.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center ${editTab === t.key ? "bg-caixa-orange text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>

          {/* Tab: Dados */}
          {editTab === "dados" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Nome da Empresa</label><input type="text" value={editForm.nome || ""} onChange={e => setEditForm(f => ({...f, nome: e.target.value}))} className={inputCls} /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Email</label><input type="email" value={editForm.email || ""} onChange={e => setEditForm(f => ({...f, email: e.target.value}))} className={inputCls} /></div>
              <div><label className="block text-sm text-gray-400 mb-1">CNPJ</label><input type="text" value={editForm.cnpj || ""} onChange={e => setEditForm(f => ({...f, cnpj: e.target.value}))} className={inputCls} /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Telefone</label><input type="text" value={editForm.telefone || ""} onChange={e => setEditForm(f => ({...f, telefone: e.target.value}))} className={inputCls} /></div>
              <div className="sm:col-span-2"><label className="block text-sm text-gray-400 mb-1">Endereço</label><input type="text" value={editForm.endereco || ""} onChange={e => setEditForm(f => ({...f, endereco: e.target.value}))} className={inputCls} /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Cidade</label><input type="text" value={editForm.cidade || ""} onChange={e => setEditForm(f => ({...f, cidade: e.target.value}))} className={inputCls} /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Estado</label><input type="text" value={editForm.estado || ""} onChange={e => setEditForm(f => ({...f, estado: e.target.value}))} maxLength={2} placeholder="GO" className={inputCls} /></div>
              <div><label className="block text-sm text-gray-400 mb-1">CEP</label><input type="text" value={editForm.cep || ""} onChange={e => setEditForm(f => ({...f, cep: e.target.value}))} placeholder="00000-000" className={inputCls} /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Domínio Customizado</label><input type="text" value={editForm.dominio_customizado || ""} onChange={e => setEditForm(f => ({...f, dominio_customizado: e.target.value}))} placeholder="crm.empresa.com.br" className={inputCls} /></div>
            </div>
          )}

          {/* Tab: Limites */}
          {editTab === "limites" && (() => {
            const plan = getEditPlan();
            return (
              <div className="space-y-4">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-300">Limites customizados por empresa. Deixe em branco para usar o limite do plano{plan ? ` (${plan.nome})` : ""}. Use <strong>0</strong> para ilimitado.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[{ key: "max_clientes", label: "Máx. Clientes", planVal: plan?.max_clientes }, { key: "max_usuarios", label: "Máx. Usuários", planVal: plan?.max_usuarios },
                    { key: "max_imoveis", label: "Máx. Imóveis", planVal: plan?.max_imoveis }, { key: "max_alugueis", label: "Máx. Aluguéis", planVal: plan?.max_alugueis },
                    { key: "max_storage_mb", label: "Armazenamento (MB)", planVal: plan?.max_storage_mb },
                    { key: "max_file_size_mb", label: "Máx. por Arquivo (MB)", planVal: plan?.max_file_size_mb }].map(({ key, label, planVal }) => (
                    <div key={key}>
                      <label className="block text-sm text-gray-400 mb-1">{label}{planVal !== undefined && planVal !== null && <span className="text-gray-600 ml-1">(plano: {planVal === 0 ? "ilimitado" : planVal})</span>}</label>
                      <input type="number" value={editForm[key] ?? ""} onChange={e => setEditForm(f => ({...f, [key]: e.target.value}))}
                        placeholder={planVal !== undefined ? `Herdar do plano (${planVal === 0 ? "ilimitado" : planVal})` : "Sem limite"} min={0} className={inputCls} />
                    </div>
                  ))}
                </div>

                {/* Barra de uso de storage */}
                {(() => {
                  const t = editForm._tenant || selectedTenant;
                  const usedBytes = parseInt(t?.storage_used_bytes || 0);
                  const usedMb = Math.round((usedBytes / (1024 * 1024)) * 100) / 100;
                  const limitMb = parseInt(editForm.max_storage_mb || plan?.max_storage_mb || 500) || 0;
                  const percent = limitMb > 0 ? Math.min(100, Math.round((usedMb / limitMb) * 100)) : 0;
                  const barColor = percent > 90 ? "bg-red-500" : percent > 70 ? "bg-yellow-500" : "bg-green-500";

                  return (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <HardDrive size={20} className="text-gray-400" />
                        <span className="text-sm font-medium text-white">Uso de Armazenamento</span>
                      </div>
                      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-2">
                        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${limitMb === 0 ? 5 : percent}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{usedMb} MB usado{usedMb !== 1 ? 's' : ''}</span>
                        <span>{limitMb === 0 ? "Ilimitado" : `${limitMb} MB total`}</span>
                      </div>
                      {percent > 80 && limitMb > 0 && (
                        <p className="text-xs text-yellow-400 mt-2">Atenção: {percent}% do armazenamento utilizado</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* Tab: Módulos */}
          {editTab === "modulos" && (() => {
            const plan = getEditPlan();
            return (
              <div className="space-y-4">
                <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${editForm.use_custom_modules ? "bg-caixa-orange/10 border-caixa-orange/40" : "bg-white/5 border-white/10"}`}>
                  <div>
                    <p className="text-white font-semibold">Módulos Customizados</p>
                    <p className="text-sm text-gray-400 mt-0.5">{editForm.use_custom_modules ? "Módulos são controlados individualmente para esta empresa" : `Módulos são herdados do plano${plan ? ` "${plan.nome}"` : ""}`}</p>
                  </div>
                  <button onClick={() => setEditForm(f => ({...f, use_custom_modules: !f.use_custom_modules}))} className="transition-transform hover:scale-105">
                    {editForm.use_custom_modules ? <ToggleRight size={40} className="text-caixa-orange" /> : <ToggleLeft size={40} className="text-gray-600" />}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.keys(MODULE_META).map(field => (
                    <ModuleToggle key={field} field={field} value={editForm[field]} planValue={plan?.[field]} useCustom={editForm.use_custom_modules} onChange={handleModuleToggle} />
                  ))}
                </div>
                {!editForm.use_custom_modules && plan && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-300">Ative "Módulos Customizados" para permitir controle individual. Atualmente todos os módulos seguem o plano <strong>{plan.nome}</strong>.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Save / Cancel */}
          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <button onClick={() => setEditOpen(false)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors">Cancelar</button>
            <button onClick={handleEditSave} disabled={editLoading}
              className="px-5 py-2 bg-caixa-orange text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2 font-medium">
              {editLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Alterações
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrganizacoesTab;
