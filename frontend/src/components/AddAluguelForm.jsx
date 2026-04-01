import React, { useState, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, MapPin, Bed, Bath, DollarSign, FileText, Camera, Upload,
  Loader2, Save, CheckCircle, AlertCircle, Calendar, ArrowRight,
  ImageIcon, Building
} from "lucide-react";

export const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api/";

// ─── Design tokens ────────────────────────────────────────────────────────────
const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';
const INPUT_BG = 'rgba(255,255,255,0.05)';
const ACCENT_GRADIENT = 'linear-gradient(135deg, #F97316, #EA580C)';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [.22, 1, .36, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const inputClass = `w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-[#F97316]/60 focus:border-[#F97316]/40`;
const inputStyle = { backgroundColor: INPUT_BG, border: `1px solid ${BORDER}` };
const labelClass = "flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase text-white/50 mb-1.5";

// ─── Section wrapper ─────────────────────────────────────────────────────────
const FormSection = ({ icon, title, subtitle, children }) => (
  <motion.div variants={fadeUp}
    className="rounded-2xl p-4 sm:p-5 backdrop-blur-md space-y-4"
    style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
    <div className="flex items-center gap-3 pb-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: ACCENT_GRADIENT }}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {subtitle && <p className="text-[10px] text-white/40 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </motion.div>
);

// ─── File drop zone ──────────────────────────────────────────────────────────
const FileDropZone = ({ label, icon: Icon, files, onChange, multiple = false, hint }) => {
  const [dragOver, setDragOver] = useState(false);
  const ref = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files;
    if (f.length > 0) onChange({ target: { files: multiple ? f : [f[0]], name: '' } });
  };

  const fileCount = multiple ? (files?.length || 0) : (files ? 1 : 0);

  return (
    <div className="space-y-1.5">
      <p className={labelClass}><Icon className="w-3 h-3" />{label}</p>
      <div
        className={`relative rounded-xl p-5 transition-all duration-200 cursor-pointer group ${
          dragOver ? 'border-[#F97316]/50 bg-white/[0.04]' : 'hover:border-[#F97316]/30 hover:bg-white/[0.03]'
        }`}
        style={{ border: `1.5px dashed ${dragOver ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.12)'}`, backgroundColor: 'rgba(255,255,255,0.02)' }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={handleDrop}
        onClick={() => ref.current?.click()}>
        <input ref={ref} type="file" accept="image/*" multiple={multiple}
          onChange={onChange} className="hidden" />
        <div className="text-center">
          <Upload className="w-6 h-6 text-white/20 group-hover:text-[#F97316] transition-colors mx-auto mb-2" />
          <p className="text-[10px] text-white/30 group-hover:text-white/50 transition-colors">
            Clique ou arraste imagens
          </p>
          <p className="text-[9px] text-white/20 mt-1">PNG, JPG até 10MB</p>
        </div>
        {fileCount > 0 && (
          <div className="mt-2 text-[10px] font-medium text-center" style={{ color: '#F97316' }}>
            {fileCount} arquivo(s) selecionado(s)
          </div>
        )}
      </div>
      {hint && <p className="text-[9px] text-white/25">{hint}</p>}
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────
const AddAluguelForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    nome_imovel: "", descricao: "", valor_aluguel: "",
    quartos: "", banheiro: "", dia_vencimento: "",
  });
  const [fotoCapa, setFotoCapa] = useState(null);
  const [fotoAdicional, setFotoAdicional] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "valor_aluguel") {
      const numero = value.replace(/\D/g, "");
      if (!numero) { setFormData({ ...formData, [name]: "" }); return; }
      const valorFormatado = (parseFloat(numero) / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      });
      setFormData({ ...formData, [name]: valorFormatado });
    } else {
      setFormData({
        ...formData,
        [name]: name === "nome_imovel" || name === "descricao" ? value.toUpperCase() : value,
      });
    }
  };

  const converterValorParaDecimal = (valorFormatado) => {
    if (!valorFormatado) return "";
    return parseFloat(valorFormatado.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess(false);

    if (!formData.nome_imovel.trim()) { setError("Nome do imóvel é obrigatório"); setLoading(false); return; }
    if (!formData.descricao.trim()) { setError("Descrição é obrigatória"); setLoading(false); return; }
    if (!formData.valor_aluguel) { setError("Valor do aluguel é obrigatório"); setLoading(false); return; }

    const formDataToSend = new FormData();
    formDataToSend.append("nome_imovel", formData.nome_imovel);
    formDataToSend.append("descricao", formData.descricao);
    formDataToSend.append("valor_aluguel", converterValorParaDecimal(formData.valor_aluguel));
    formDataToSend.append("quartos", formData.quartos);
    formDataToSend.append("banheiro", formData.banheiro);
    formDataToSend.append("dia_vencimento", formData.dia_vencimento);
    if (fotoCapa) formDataToSend.append("foto_capa", fotoCapa);
    if (fotoAdicional) {
      Array.from(fotoAdicional).forEach((file) => formDataToSend.append("fotos_adicionais", file));
    }

    try {
      await axios.post(`${API_URL}/alugueis`, formDataToSend);
      setSuccess(true);
      setFormData({ nome_imovel: "", descricao: "", valor_aluguel: "", quartos: "", banheiro: "", dia_vencimento: "" });
      setFotoCapa(null); setFotoAdicional(null);
      if (onSuccess) onSuccess();
    } catch (error) {
      if (error.response?.data?.error) setError(error.response.data.error);
      else if (error.response?.data?.detalhes) setError(`Erro: ${error.response.data.detalhes.map(d => d.mensagem).join(', ')}`);
      else setError("Erro ao cadastrar imóvel. Tente novamente.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full bg-caixa-gradient">
      <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:px-6">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: ACCENT_GRADIENT }}>
            <Building className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Cadastro de Imóvel para Aluguel</h1>
            <p className="text-[11px] text-white/40">Preencha os dados do imóvel para locação</p>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <motion.div className="space-y-4" initial="hidden" animate="show" variants={stagger}>

            {/* ═══ INFORMAÇÕES DO IMÓVEL ═══ */}
            <FormSection icon={<Home className="w-4 h-4 text-white" />} title="Informações do Imóvel"
              subtitle="Nome, valor e localização">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}><MapPin className="w-3 h-3" />Nome/Endereço *</label>
                  <input type="text" name="nome_imovel" value={formData.nome_imovel} onChange={handleChange}
                    className={inputClass} style={inputStyle}
                    placeholder="APARTAMENTO RUA DAS FLORES, 123" required />
                </div>
                <div>
                  <label className={labelClass}><DollarSign className="w-3 h-3" />Valor do Aluguel *</label>
                  <input type="text" name="valor_aluguel" value={formData.valor_aluguel} onChange={handleChange}
                    className={inputClass} style={inputStyle} placeholder="1.500,00" required />
                  <p className="text-[9px] text-white/25 mt-1">Digite apenas números</p>
                </div>
              </div>
            </FormSection>

            {/* ═══ CARACTERÍSTICAS ═══ */}
            <FormSection icon={<Bed className="w-4 h-4 text-white" />} title="Características"
              subtitle="Quartos, banheiros e vencimento">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}><Bed className="w-3 h-3" />Quartos *</label>
                  <input type="number" name="quartos" value={formData.quartos} onChange={handleChange}
                    min="0" max="10" className={inputClass} style={inputStyle} placeholder="3" required />
                </div>
                <div>
                  <label className={labelClass}><Bath className="w-3 h-3" />Banheiros *</label>
                  <input type="number" name="banheiro" value={formData.banheiro} onChange={handleChange}
                    min="1" max="10" className={inputClass} style={inputStyle} placeholder="2" required />
                </div>
                <div>
                  <label className={labelClass}><Calendar className="w-3 h-3" />Dia Vencimento *</label>
                  <input type="number" name="dia_vencimento" value={formData.dia_vencimento} onChange={handleChange}
                    min={1} max={31} className={inputClass} style={inputStyle} placeholder="10" required />
                  <p className="text-[9px] text-white/25 mt-1">Dia do mês (1 a 31)</p>
                </div>
              </div>
            </FormSection>

            {/* ═══ DESCRIÇÃO ═══ */}
            <FormSection icon={<FileText className="w-4 h-4 text-white" />} title="Descrição"
              subtitle="Detalhes e diferenciais do imóvel">
              <div>
                <label className={labelClass}><FileText className="w-3 h-3" />Descrição do Imóvel *</label>
                <textarea name="descricao" value={formData.descricao} onChange={handleChange}
                  className={`${inputClass} resize-y min-h-[100px]`} style={inputStyle} rows="4"
                  placeholder="DESCREVA O IMÓVEL: LOCALIZAÇÃO, CARACTERÍSTICAS, DIFERENCIAIS..." required />
              </div>
            </FormSection>

            {/* ═══ FOTOS ═══ */}
            <FormSection icon={<Camera className="w-4 h-4 text-white" />} title="Fotos do Imóvel"
              subtitle="Imagens para o anúncio">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileDropZone label="Foto de Capa" icon={ImageIcon} files={fotoCapa}
                  onChange={(e) => setFotoCapa(e.target.files[0])}
                  hint="Foto principal do anúncio" />
                <FileDropZone label="Fotos Adicionais" icon={Camera} files={fotoAdicional}
                  onChange={(e) => setFotoAdicional(e.target.files)} multiple
                  hint="Selecione múltiplas fotos" />
              </div>
            </FormSection>

            {/* ═══ BOTÃO ═══ */}
            <motion.div variants={fadeUp}>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                type="submit" disabled={loading}
                className={`w-full py-4 rounded-xl text-sm text-white font-bold flex items-center justify-center gap-2
                  shadow-lg shadow-[#F97316]/20 transition-all duration-200 ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl hover:shadow-[#F97316]/30'}`}
                style={{ background: ACCENT_GRADIENT }}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Cadastrando...</>
                ) : (
                  <><Save className="w-4 h-4" />Cadastrar Imóvel para Aluguel<ArrowRight className="w-3.5 h-3.5 ml-1" /></>
                )}
              </motion.button>
            </motion.div>

            {/* ═══ STATUS ═══ */}
            <AnimatePresence>
              {(error || success) && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 p-4 rounded-xl backdrop-blur-md"
                  style={{
                    backgroundColor: success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${success ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  }}>
                  {success
                    ? <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#10b981' }} />
                    : <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} />}
                  <span className="text-sm font-medium" style={{
                    color: success ? '#10b981' : '#ef4444'
                  }}>{success ? 'Imóvel cadastrado com sucesso!' : error}</span>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </form>
      </div>
    </div>
  );
};

export default AddAluguelForm;
