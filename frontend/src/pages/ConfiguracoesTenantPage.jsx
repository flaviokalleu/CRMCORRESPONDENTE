import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Save,
  Upload,
  Image,
  MapPin,
  Mail,
  Phone,
  FileText,
  Settings,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Zap,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

const ConfiguracoesTenantPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    slug: "",
    cnpj: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
  });

  const [configuracoes, setConfiguracoes] = useState({
    notificacoes_email: true,
    notificacoes_whatsapp: true,
    gerar_boleto_automatico: false,
    permitir_portal_inquilino: true,
    exigir_vistoria: true,
    tema_escuro: true,
  });

  // Estados para integração Asaas
  const [asaasConfig, setAsaasConfig] = useState({
    asaas_api_key: "",
    asaas_webhook_token: "",
    asaas_api_key_configured: false,
    asaas_api_key_preview: null,
    webhook_url: "",
  });
  const [savingAsaas, setSavingAsaas] = useState(false);
  const [testandoAsaas, setTestandoAsaas] = useState(false);
  const [asaasTesteResult, setAsaasTesteResult] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookToken, setShowWebhookToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [asaasMsg, setAsaasMsg] = useState({ type: "", text: "" });

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("authToken");
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  // Buscar dados do tenant ao montar
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/tenant-settings/settings`,
          getAuthHeaders()
        );
        const data = response.data;

        setFormData({
          nome: data.nome || "",
          slug: data.slug || "",
          cnpj: data.cnpj || "",
          email: data.email || "",
          telefone: data.telefone || "",
          endereco: data.endereco || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          cep: data.cep || "",
        });

        if (data.configuracoes && typeof data.configuracoes === "object") {
          setConfiguracoes((prev) => ({ ...prev, ...data.configuracoes }));
        }

        if (data.logo) {
          setLogoPreview(`${API_URL}/uploads/${data.logo}`);
        }

        // Construir URL do webhook imediatamente a partir do slug
        const builtWebhookUrl = data.slug
          ? `${API_URL.replace(/\/api\/?$/, '')}/api/asaas/webhook/${data.slug}`
          : '';

        if (builtWebhookUrl) {
          setAsaasConfig((prev) => ({ ...prev, webhook_url: builtWebhookUrl }));
        }

        // Carregar config Asaas
        try {
          const asaasRes = await axios.get(
            `${API_URL}/tenant-settings/settings/asaas`,
            getAuthHeaders()
          );
          setAsaasConfig((prev) => ({
            ...prev,
            ...asaasRes.data,
            asaas_api_key: "",
            asaas_webhook_token: asaasRes.data.asaas_webhook_token || "",
            // Prefere a URL do backend; se ausente usa a construída localmente
            webhook_url: asaasRes.data.webhook_url || builtWebhookUrl || prev.webhook_url,
          }));
        } catch {}
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        setMessage({
          type: "error",
          text: "Erro ao carregar configurações da organização.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [getAuthHeaders]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (key) => {
    setConfiguracoes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      await axios.put(
        `${API_URL}/tenant-settings/settings`,
        { ...formData, configuracoes },
        getAuthHeaders()
      );
      setMessage({
        type: "success",
        text: "Configurações salvas com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      const msg =
        error.response?.data?.error || "Erro ao salvar configurações.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "A imagem deve ter no máximo 5MB." });
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);
    setMessage({ type: "", text: "" });

    try {
      const data = new FormData();
      data.append("logo", logoFile);

      const token = localStorage.getItem("authToken");
      await axios.post(`${API_URL}/tenant-settings/settings/logo`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setLogoFile(null);
      setMessage({ type: "success", text: "Logo atualizado com sucesso!" });
    } catch (error) {
      console.error("Erro ao enviar logo:", error);
      setMessage({ type: "error", text: "Erro ao enviar o logo." });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveAsaas = async () => {
    setSavingAsaas(true);
    setAsaasMsg({ type: "", text: "" });
    setAsaasTesteResult(null);
    try {
      const payload = {};
      if (asaasConfig.asaas_api_key) payload.asaas_api_key = asaasConfig.asaas_api_key;
      if (asaasConfig.asaas_webhook_token !== undefined) payload.asaas_webhook_token = asaasConfig.asaas_webhook_token;

      const res = await axios.put(
        `${API_URL}/tenant-settings/settings/asaas`,
        payload,
        getAuthHeaders()
      );
      const d = res.data;
      setAsaasConfig((prev) => ({
        ...prev,
        asaas_api_key: "",
        asaas_api_key_configured: d.asaas_api_key_configured,
        asaas_api_key_preview: d.asaas_api_key_preview ?? prev.asaas_api_key_preview,
        webhook_url: d.webhook_url || prev.webhook_url,
      }));
      if (d.teste_conexao) setAsaasTesteResult(d.teste_conexao);
      setAsaasMsg({ type: "success", text: "Integração Asaas salva com sucesso!" });
    } catch (error) {
      setAsaasMsg({ type: "error", text: error.response?.data?.error || "Erro ao salvar." });
    } finally {
      setSavingAsaas(false);
    }
  };

  const handleTestarAsaas = async () => {
    setTestandoAsaas(true);
    setAsaasTesteResult(null);
    try {
      const res = await axios.post(
        `${API_URL}/tenant-settings/settings/asaas/testar`,
        asaasConfig.asaas_api_key ? { asaas_api_key: asaasConfig.asaas_api_key } : {},
        getAuthHeaders()
      );
      setAsaasTesteResult(res.data);
    } catch (error) {
      setAsaasTesteResult({ success: false, error: error.response?.data?.error || error.message });
    } finally {
      setTestandoAsaas(false);
    }
  };

  const copiarWebhookUrl = () => {
    navigator.clipboard.writeText(asaasConfig.webhook_url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const estados = [
    "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
    "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
  ];

  const toggleItems = [
    { key: "notificacoes_email", label: "Notificações por e-mail", desc: "Receber alertas e avisos por e-mail" },
    { key: "notificacoes_whatsapp", label: "Notificações por WhatsApp", desc: "Receber alertas e avisos por WhatsApp" },
    { key: "gerar_boleto_automatico", label: "Gerar boleto automático", desc: "Gerar boletos automaticamente ao criar cobranças" },
    { key: "permitir_portal_inquilino", label: "Portal do inquilino", desc: "Permitir que inquilinos acessem o portal" },
    { key: "exigir_vistoria", label: "Exigir vistoria", desc: "Exigir vistoria obrigatória nos imóveis" },
    { key: "tema_escuro", label: "Tema escuro", desc: "Usar tema escuro como padrão" },
  ];

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-caixa-orange" />
          <span className="ml-3 text-gray-300">Carregando configurações...</span>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-4xl mx-auto p-4 md:p-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-caixa-orange/20 rounded-xl">
            <Building2 className="w-7 h-7 text-caixa-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Configurações da Organização
            </h1>
            <p className="text-gray-400 text-sm">
              Gerencie os dados e preferências da sua empresa
            </p>
          </div>
        </div>

        {/* Mensagem de feedback */}
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
              message.type === "success"
                ? "bg-green-500/10 border border-green-500/30 text-green-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm">{message.text}</span>
            <button
              onClick={() => setMessage({ type: "", text: "" })}
              className="ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Seção: Logo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0f1d32] border border-white/10 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Image className="w-5 h-5 text-caixa-orange" />
            <h2 className="text-lg font-semibold text-white">Logo</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-32 h-32 rounded-2xl bg-[#162a4a] border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="w-12 h-12 text-gray-500" />
              )}
            </div>

            <div className="flex flex-col gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-caixa-orange/20 text-caixa-orange hover:bg-caixa-orange/30 transition-colors text-sm font-medium">
                <Upload className="w-4 h-4" />
                Escolher imagem
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
              </label>

              {logoFile && (
                <button
                  onClick={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-caixa-orange text-white hover:bg-orange-600 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {uploadingLogo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Enviar logo
                </button>
              )}

              <p className="text-xs text-gray-500">
                JPEG, PNG, WebP ou SVG. Máximo 5MB.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Seção: Dados da Empresa */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#0f1d32] border border-white/10 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-caixa-orange" />
            <h2 className="text-lg font-semibold text-white">
              Dados da Empresa
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">
                Nome da Empresa
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#162a4a] border border-white/10 text-white placeholder-gray-500 focus:border-caixa-orange focus:ring-1 focus:ring-caixa-orange outline-none transition-colors text-sm"
                  placeholder="Nome da empresa"
                />
              </div>
            </div>

            {/* Slug (somente leitura) */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Slug</label>
              <input
                type="text"
                value={formData.slug}
                disabled
                className="w-full px-4 py-2.5 rounded-xl bg-[#162a4a]/50 border border-white/5 text-gray-500 text-sm cursor-not-allowed"
              />
            </div>

            {/* CNPJ */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">CNPJ</label>
              <input
                type="text"
                name="cnpj"
                value={formData.cnpj}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl bg-[#162a4a] border border-white/10 text-white placeholder-gray-500 focus:border-caixa-orange focus:ring-1 focus:ring-caixa-orange outline-none transition-colors text-sm"
                placeholder="00.000.000/0000-00"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#162a4a] border border-white/10 text-white placeholder-gray-500 focus:border-caixa-orange focus:ring-1 focus:ring-caixa-orange outline-none transition-colors text-sm"
                  placeholder="contato@empresa.com.br"
                />
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#162a4a] border border-white/10 text-white placeholder-gray-500 focus:border-caixa-orange focus:ring-1 focus:ring-caixa-orange outline-none transition-colors text-sm"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">
                Endereço
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#162a4a] border border-white/10 text-white placeholder-gray-500 focus:border-caixa-orange focus:ring-1 focus:ring-caixa-orange outline-none transition-colors text-sm"
                  placeholder="Rua, número, complemento"
                />
              </div>
            </div>

            {/* Cidade */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Cidade
              </label>
              <input
                type="text"
                name="cidade"
                value={formData.cidade}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl bg-[#162a4a] border border-white/10 text-white placeholder-gray-500 focus:border-caixa-orange focus:ring-1 focus:ring-caixa-orange outline-none transition-colors text-sm"
                placeholder="Cidade"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Estado
              </label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl bg-[#162a4a] border border-white/10 text-white focus:border-caixa-orange focus:ring-1 focus:ring-caixa-orange outline-none transition-colors text-sm"
              >
                <option value="">Selecione</option>
                {estados.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            {/* CEP */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">CEP</label>
              <input
                type="text"
                name="cep"
                value={formData.cep}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl bg-[#162a4a] border border-white/10 text-white placeholder-gray-500 focus:border-caixa-orange focus:ring-1 focus:ring-caixa-orange outline-none transition-colors text-sm"
                placeholder="00000-000"
              />
            </div>
          </div>
        </motion.div>

        {/* Seção: Configurações */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#0f1d32] border border-white/10 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-caixa-orange" />
            <h2 className="text-lg font-semibold text-white">Preferências</h2>
          </div>

          <div className="space-y-4">
            {toggleItems.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl bg-[#162a4a]/50 border border-white/5"
              >
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <button
                  onClick={() => handleToggle(item.key)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    configuracoes[item.key] ? "bg-caixa-orange" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      configuracoes[item.key] ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Seção: Integração Asaas */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-[#0f1d32] border border-white/10 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Integração Asaas</h2>
            {asaasConfig.asaas_api_key_configured && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Configurado</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-6">Cobranças e repasses automáticos via PIX usando sua conta própria do Asaas.</p>

          {/* Mensagem feedback Asaas */}
          {asaasMsg.text && (
            <div className={`mb-4 p-3 rounded-xl flex items-center gap-3 text-sm ${
              asaasMsg.type === "success"
                ? "bg-green-500/10 border border-green-500/30 text-green-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}>
              {asaasMsg.type === "success" ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {asaasMsg.text}
            </div>
          )}

          <div className="space-y-5">
            {/* URL do Webhook */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                URL do Webhook <span className="text-xs text-gray-500">(registre esta URL no painel Asaas)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={asaasConfig.webhook_url}
                  placeholder="Aguardando carregamento das configurações..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#0a1628] border border-white/10 text-gray-300 text-sm font-mono cursor-default placeholder-gray-600"
                />
                <button
                  onClick={copiarWebhookUrl}
                  disabled={!asaasConfig.webhook_url}
                  className="px-3 py-2.5 rounded-xl bg-[#162a4a] border border-white/10 text-gray-300 hover:text-white transition-colors disabled:opacity-40"
                  title="Copiar URL"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Chave de API do Asaas
                {asaasConfig.asaas_api_key_configured && (
                  <span className="ml-2 text-xs text-gray-500">(atual: {asaasConfig.asaas_api_key_preview})</span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={asaasConfig.asaas_api_key}
                  onChange={(e) => setAsaasConfig((p) => ({ ...p, asaas_api_key: e.target.value }))}
                  placeholder={asaasConfig.asaas_api_key_configured ? "\u2022\u2022\u2022\u2022 (deixe em branco para manter)" : "$aact_..."}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#162a4a] border border-white/10 text-white placeholder-gray-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors text-sm font-mono"
                />
                <button
                  onClick={() => setShowApiKey((v) => !v)}
                  className="px-3 py-2.5 rounded-xl bg-[#162a4a] border border-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Webhook Token */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Token do Webhook <span className="text-xs text-gray-500">(opcional — para validar chamadas do Asaas)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type={showWebhookToken ? "text" : "password"}
                  value={asaasConfig.asaas_webhook_token}
                  onChange={(e) => setAsaasConfig((p) => ({ ...p, asaas_webhook_token: e.target.value }))}
                  placeholder="Token secreto para validar o webhook"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#162a4a] border border-white/10 text-white placeholder-gray-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors text-sm font-mono"
                />
                <button
                  onClick={() => setShowWebhookToken((v) => !v)}
                  className="px-3 py-2.5 rounded-xl bg-[#162a4a] border border-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  {showWebhookToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Resultado do teste */}
            {asaasTesteResult && (
              <div className={`p-3 rounded-xl text-sm ${
                asaasTesteResult.success
                  ? "bg-green-500/10 border border-green-500/30 text-green-400"
                  : "bg-red-500/10 border border-red-500/30 text-red-400"
              }`}>
                {asaasTesteResult.success ? (
                  <span>Conexão OK — Saldo disponível: <strong>R$ {parseFloat(asaasTesteResult.balance?.balance ?? 0).toFixed(2)}</strong></span>
                ) : (
                  <span>Falha: {JSON.stringify(asaasTesteResult.error)}</span>
                )}
              </div>
            )}

            {/* Botões Asaas */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleTestarAsaas}
                disabled={testandoAsaas}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {testandoAsaas ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Testar Conexão
              </button>
              <button
                onClick={handleSaveAsaas}
                disabled={savingAsaas}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 text-white font-semibold hover:bg-cyan-700 transition-colors text-sm disabled:opacity-50"
              >
                {savingAsaas ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Integração
              </button>
            </div>
          </div>
        </motion.div>

        {/* Botão Salvar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-end"
        >
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-caixa-orange text-white font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 shadow-lg shadow-orange-500/20"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Salvar Configurações
          </button>
        </motion.div>
      </motion.div>
    </MainLayout>
  );
};

export default ConfiguracoesTenantPage;
