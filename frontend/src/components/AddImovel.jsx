import React, { useState, useRef } from "react";
import generateStableKey from 'utils/generateStableKey';
import axios from "axios";
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, MapPin, Bed, Bath, Tag, DollarSign, FileText, Camera, Upload,
  Loader2, Save, Trash2, CheckCircle, AlertCircle, Building, Plus, X,
  ImageIcon, Paperclip, ArrowRight, Globe, Users, Shield
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

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
const selectClass = `${inputClass} cursor-pointer [&>option]:bg-white [&>option]:text-gray-800`;

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

// ─── Input field ─────────────────────────────────────────────────────────────
const InputField = ({ label, name, type = 'text', icon: Icon, required, placeholder, value, onChange, error, children, ...props }) => (
  <div className="space-y-1.5">
    <label className={labelClass}>
      <Icon className="w-3 h-3" />
      {label} {required && <span className="text-[#F97316]">*</span>}
    </label>
    {children || (
      <input type={type} name={name} value={value} onChange={onChange} required={required}
        placeholder={placeholder}
        className={`${inputClass} ${error ? 'ring-2 ring-red-500/40 border-red-500/30' : ''}`}
        style={inputStyle} {...props} />
    )}
    {error && (
      <p className="text-red-400 text-[10px] flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />{error}
      </p>
    )}
  </div>
);

// ─── Tag selector (dark theme) ───────────────────────────────────────────────
const TagSelector = ({ tags, setTags }) => {
  const [customTag, setCustomTag] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const predefinedTags = [
    "100% Financiado", "Alto Padrão", "Apartamento", "Casa", "Duplex",
    "Em construção", "Exclusivos", "Melhores Ofertas", "Próximo ao Centro",
    "Próximo à Escola", "Próximo ao Comércio", "Aceita Financiamento",
    "Reformado", "Com Lazer", "Garagem", "Jardim", "Área Privativa"
  ];

  const addCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags([...tags, customTag.trim()]);
      setCustomTag('');
      setShowCustomInput(false);
    }
  };

  const removeTag = (t) => setTags(tags.filter(tag => tag !== t));
  const toggleTag = (t) => tags.includes(t) ? removeTag(t) : setTags([...tags, t]);

  return (
    <div className="space-y-3">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
          {tags.map((tag, index) => (
            <motion.span key={generateStableKey(tag, index)}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg text-white"
              style={{ background: ACCENT_GRADIENT }}>
              {tag}
              <button type="button" onClick={() => removeTag(tag)}
                className="ml-0.5 hover:bg-white/20 rounded-full p-0.5 transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </motion.span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
        {predefinedTags.map((tag) => (
          <motion.button key={tag} type="button" whileTap={{ scale: 0.96 }}
            onClick={() => toggleTag(tag)}
            className={`px-2.5 py-2 text-[10px] font-semibold rounded-lg transition-all duration-200 ${
              tags.includes(tag)
                ? 'text-white shadow-md'
                : 'text-white/50 hover:text-white/80'
            }`}
            style={tags.includes(tag)
              ? { background: ACCENT_GRADIENT }
              : { backgroundColor: INPUT_BG, border: `1px solid ${BORDER}` }}>
            {tag}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-2">
        <AnimatePresence>
          {showCustomInput ? (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }} className="flex gap-2 flex-1">
              <input type="text" value={customTag} onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Tag personalizada" className={inputClass} style={inputStyle}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())} autoFocus />
              <button type="button" onClick={addCustomTag}
                className="px-3 py-2 rounded-lg text-white flex-shrink-0" style={{ background: ACCENT_GRADIENT }}>
                <Plus className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => { setShowCustomInput(false); setCustomTag(''); }}
                className="px-3 py-2 rounded-lg text-white/50 flex-shrink-0"
                style={{ backgroundColor: INPUT_BG, border: `1px solid ${BORDER}` }}>
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              type="button" onClick={() => setShowCustomInput(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-lg"
              style={{ background: ACCENT_GRADIENT }}>
              <Plus className="w-3.5 h-3.5" /> Tag Personalizada
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── File drop zone (dark theme) ─────────────────────────────────────────────
const FileUploadField = ({ label, accept, onChange, multiple = false, icon: Icon, value }) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) onChange({ target: { files: multiple ? files : [files[0]] } });
  };

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
        onClick={() => fileInputRef.current?.click()}>
        <input ref={fileInputRef} type="file" accept={accept} multiple={multiple}
          onChange={onChange} className="hidden" />
        <div className="text-center">
          <Upload className="w-6 h-6 text-white/20 group-hover:text-[#F97316] transition-colors mx-auto mb-2" />
          <p className="text-[10px] text-white/30 group-hover:text-white/50 transition-colors">
            Clique ou arraste arquivos
          </p>
          <p className="text-[9px] text-white/20 mt-1">
            {accept === 'image/*' ? 'PNG, JPG até 10MB' : accept === '.pdf' ? 'PDF até 10MB' : 'Qualquer arquivo'}
          </p>
        </div>
        {value && (
          <div className="mt-2 text-[10px] font-medium text-center" style={{ color: '#F97316' }}>
            {multiple && value.length ? `${value.length} arquivo(s)` :
             !multiple && value ? '1 arquivo selecionado' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────
const AddImovel = () => {
  const [formData, setFormData] = useState({
    nomeImovel: "", descricaoImovel: "", endereco: "", tipo: "novo",
    quartos: "", banheiro: "", valorAvaliacao: "", valorVenda: "",
    localizacao: "Valparaiso de Goiás - Goiás", exclusivo: "não",
    temInquilino: "não", situacaoImovel: "", observacoes: ""
  });
  const [tags, setTags] = useState([]);
  const [files, setFiles] = useState({ documentacao: null, imagens: [], imagemCapa: null });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const notificationRef = useRef(null);

  const formatCurrency = (value) => {
    if (!value) return "";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const handleCurrencyChange = (field, value) => {
    const num = value.replace(/\D/g, "");
    setFormData(prev => ({ ...prev, [field]: num ? (num / 100).toFixed(2) : "" }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validateForm = () => {
    const e = {};
    if (!formData.nomeImovel.trim()) e.nomeImovel = "Nome é obrigatório";
    if (!formData.endereco.trim()) e.endereco = "Endereço é obrigatório";
    if (!formData.quartos) e.quartos = "Quartos é obrigatório";
    if (!formData.banheiro) e.banheiro = "Banheiros é obrigatório";
    if (!formData.valorVenda) e.valorVenda = "Valor de venda é obrigatório";
    if (!formData.situacaoImovel.trim()) e.situacaoImovel = "Situação é obrigatória";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setFormData({ nomeImovel: "", descricaoImovel: "", endereco: "", tipo: "novo", quartos: "", banheiro: "", valorAvaliacao: "", valorVenda: "", localizacao: "Valparaiso de Goiás - Goiás", exclusivo: "não", temInquilino: "não", situacaoImovel: "", observacoes: "" });
    setTags([]); setFiles({ documentacao: null, imagens: [], imagemCapa: null }); setMessage({ type: '', text: '' }); setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) { setMessage({ type: 'error', text: 'Corrija os erros no formulário.' }); return; }
    setLoading(true); setMessage({ type: '', text: '' });
    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'nomeImovel') submitData.append('nome_imovel', value);
      else if (key === 'descricaoImovel') submitData.append('descricao_imovel', value);
      else if (key === 'valorAvaliacao') submitData.append('valor_avaliacao', value);
      else if (key === 'valorVenda') submitData.append('valor_venda', value);
      else if (key === 'temInquilino') submitData.append('tem_inquilino', value);
      else if (key === 'situacaoImovel') submitData.append('situacao_imovel', value);
      else submitData.append(key, value);
    });
    submitData.append("tags", tags.join(", "));
    if (files.documentacao) submitData.append("documentacao", files.documentacao);
    files.imagens.forEach((img) => submitData.append("imagens", img));
    if (files.imagemCapa) submitData.append("imagem_capa", files.imagemCapa);
    try {
      await axios.post(`${API_URL}/imoveis`, submitData, { headers: { "Content-Type": "multipart/form-data" } });
      setMessage({ type: 'success', text: 'Imóvel cadastrado com sucesso!' });
      setTimeout(() => resetForm(), 2000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Erro ao cadastrar imóvel.' });
    } finally {
      setLoading(false);
      notificationRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen w-full bg-caixa-gradient">
      <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:px-6">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: ACCENT_GRADIENT }}>
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Cadastro de Imóvel</h1>
            <p className="text-[11px] text-white/40">Preencha as informações para cadastrar um novo imóvel</p>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <motion.div className="space-y-4" initial="hidden" animate="show" variants={stagger}>

            {/* ═══ INFORMAÇÕES BÁSICAS ═══ */}
            <FormSection icon={<Building className="w-4 h-4 text-white" />} title="Informações Básicas"
              subtitle="Nome, tipo e descrição do imóvel">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <InputField label="Nome do Imóvel" name="nomeImovel" icon={Home} required
                    placeholder="Ex: Residencial Jardim Europa" value={formData.nomeImovel}
                    onChange={(e) => handleInputChange('nomeImovel', e.target.value)} error={errors.nomeImovel} />
                </div>
                <div>
                  <InputField label="Tipo" name="tipo" icon={Building} required value={formData.tipo}
                    onChange={(e) => handleInputChange('tipo', e.target.value)}>
                    <select value={formData.tipo} onChange={(e) => handleInputChange('tipo', e.target.value)}
                      className={selectClass} style={inputStyle} required>
                      <option value="novo">Novo</option>
                      <option value="usado">Usado</option>
                      <option value="agio">Ágio</option>
                    </select>
                  </InputField>
                </div>
              </div>
              <div>
                <InputField label="Descrição" name="descricaoImovel" icon={FileText}
                  value={formData.descricaoImovel} onChange={(e) => handleInputChange('descricaoImovel', e.target.value)}>
                  <textarea value={formData.descricaoImovel}
                    onChange={(e) => handleInputChange('descricaoImovel', e.target.value)}
                    className={`${inputClass} resize-y min-h-[80px]`} style={inputStyle} rows="3"
                    placeholder="Descreva detalhes, diferenciais e características..." />
                </InputField>
              </div>
            </FormSection>

            {/* ═══ LOCALIZAÇÃO ═══ */}
            <FormSection icon={<MapPin className="w-4 h-4 text-white" />} title="Localização"
              subtitle="Endereço e cidade do imóvel">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField label="Endereço" name="endereco" icon={MapPin} required
                  placeholder="Rua, número, bairro" value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)} error={errors.endereco} />
                <InputField label="Cidade/Estado" name="localizacao" icon={Globe}
                  value={formData.localizacao} onChange={(e) => handleInputChange('localizacao', e.target.value)}>
                  <select value={formData.localizacao} onChange={(e) => handleInputChange('localizacao', e.target.value)}
                    className={selectClass} style={inputStyle}>
                    <option value="Valparaiso de Goiás - Goiás">Valparaíso de Goiás - GO</option>
                    <option value="Cidade Ocidental - Goias">Cidade Ocidental - GO</option>
                    <option value="Luziania - Goias">Luziânia - GO</option>
                    <option value="Jardim Inga - Goias">Jardim Ingá - GO</option>
                  </select>
                </InputField>
              </div>
            </FormSection>

            {/* ═══ CARACTERÍSTICAS ═══ */}
            <FormSection icon={<Bed className="w-4 h-4 text-white" />} title="Características"
              subtitle="Quartos, banheiros e valores">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <InputField label="Quartos" name="quartos" type="number" icon={Bed} required
                  placeholder="3" value={formData.quartos}
                  onChange={(e) => handleInputChange('quartos', e.target.value)} error={errors.quartos} />
                <InputField label="Banheiros" name="banheiro" type="number" icon={Bath} required
                  placeholder="2" value={formData.banheiro}
                  onChange={(e) => handleInputChange('banheiro', e.target.value)} error={errors.banheiro} />
                <InputField label="Valor Avaliação" name="valorAvaliacao" icon={DollarSign}
                  placeholder="R$ 350.000" value={formatCurrency(formData.valorAvaliacao)}
                  onChange={(e) => handleCurrencyChange('valorAvaliacao', e.target.value)} />
                <InputField label="Valor Venda" name="valorVenda" icon={DollarSign} required
                  placeholder="R$ 320.000" value={formatCurrency(formData.valorVenda)}
                  onChange={(e) => handleCurrencyChange('valorVenda', e.target.value)} error={errors.valorVenda} />
              </div>
            </FormSection>

            {/* ═══ TAGS ═══ */}
            <FormSection icon={<Tag className="w-4 h-4 text-white" />} title="Tags do Imóvel"
              subtitle="Selecione características e diferenciais">
              <TagSelector tags={tags} setTags={setTags} />
            </FormSection>

            {/* ═══ DETALHES ADICIONAIS ═══ */}
            <FormSection icon={<FileText className="w-4 h-4 text-white" />} title="Detalhes Adicionais"
              subtitle="Situação, exclusividade e observações">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <InputField label="Situação do Imóvel" name="situacaoImovel" icon={Home} required
                  placeholder="Pronto para morar" value={formData.situacaoImovel}
                  onChange={(e) => handleInputChange('situacaoImovel', e.target.value)} error={errors.situacaoImovel} />
                <InputField label="Exclusivo" name="exclusivo" icon={Shield}
                  value={formData.exclusivo} onChange={(e) => handleInputChange('exclusivo', e.target.value)}>
                  <select value={formData.exclusivo} onChange={(e) => handleInputChange('exclusivo', e.target.value)}
                    className={selectClass} style={inputStyle}>
                    <option value="não">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </InputField>
                <InputField label="Tem Inquilino" name="temInquilino" icon={Users}
                  value={formData.temInquilino} onChange={(e) => handleInputChange('temInquilino', e.target.value)}>
                  <select value={formData.temInquilino} onChange={(e) => handleInputChange('temInquilino', e.target.value)}
                    className={selectClass} style={inputStyle}>
                    <option value="não">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </InputField>
              </div>
              <div>
                <InputField label="Observações" name="observacoes" icon={FileText}
                  value={formData.observacoes} onChange={(e) => handleInputChange('observacoes', e.target.value)}>
                  <textarea value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    className={`${inputClass} resize-y min-h-[70px]`} style={inputStyle} rows="3"
                    placeholder="Informações adicionais sobre o imóvel..." />
                </InputField>
              </div>
            </FormSection>

            {/* ═══ DOCUMENTOS E IMAGENS ═══ */}
            <FormSection icon={<Upload className="w-4 h-4 text-white" />} title="Documentos e Imagens"
              subtitle="Anexe documentação e fotos do imóvel">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FileUploadField label="Documentação (PDF)" accept=".pdf" icon={Paperclip}
                  onChange={(e) => setFiles(prev => ({ ...prev, documentacao: e.target.files[0] }))}
                  value={files.documentacao} />
                <FileUploadField label="Imagens do Imóvel" accept="image/*" multiple icon={ImageIcon}
                  onChange={(e) => setFiles(prev => ({ ...prev, imagens: Array.from(e.target.files) }))}
                  value={files.imagens} />
                <FileUploadField label="Imagem de Capa" accept="image/*" icon={Camera}
                  onChange={(e) => setFiles(prev => ({ ...prev, imagemCapa: e.target.files[0] }))}
                  value={files.imagemCapa} />
              </div>
            </FormSection>

            {/* ═══ BOTÕES ═══ */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                type="button" onClick={resetForm}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-white/60 flex items-center justify-center gap-2
                  hover:text-white/80 transition-all duration-200"
                style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
                <Trash2 className="w-4 h-4" /> Limpar
              </motion.button>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                type="submit" disabled={loading}
                className={`flex-[2] py-3.5 rounded-xl text-sm text-white font-bold flex items-center justify-center gap-2
                  shadow-lg shadow-[#F97316]/20 transition-all duration-200 ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl hover:shadow-[#F97316]/30'}`}
                style={{ background: ACCENT_GRADIENT }}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Cadastrando...</>
                ) : (
                  <><Save className="w-4 h-4" />Cadastrar Imóvel<ArrowRight className="w-3.5 h-3.5 ml-1" /></>
                )}
              </motion.button>
            </motion.div>

            {/* ═══ STATUS ═══ */}
            <div ref={notificationRef}>
              <AnimatePresence>
                {message.text && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3 p-4 rounded-xl backdrop-blur-md"
                    style={{
                      backgroundColor: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    }}>
                    {message.type === 'success'
                      ? <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#10b981' }} />
                      : <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} />}
                    <span className="text-sm font-medium" style={{
                      color: message.type === 'success' ? '#10b981' : '#ef4444'
                    }}>{message.text}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </motion.div>
        </form>
      </div>
    </div>
  );
};

export default AddImovel;
