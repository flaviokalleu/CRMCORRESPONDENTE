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
          "Content-Type": "multipart/form-data",
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
