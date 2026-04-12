import React, { useState, useEffect, useMemo } from "react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from "axios";
import InputMask from "react-input-mask";
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, CreditCard, Briefcase, Calendar,
  Upload, Wallet, Save, Clock, FileText, MapPin,
  Heart, Users, ChevronRight, CheckCircle, Loader2,
  Shield, Baby, Globe, Building, CircleDot, Link2,
  UserPlus, ArrowRight, Sparkles, AlertCircle
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const API_URL = process.env.REACT_APP_API_URL;
const ESTADOS_API_URL = process.env.REACT_APP_ESTADOS_API_URL || `${process.env.REACT_APP_API_URL}/estados`;
const MUNICIPIOS_API_URL = process.env.REACT_APP_MUNICIPIOS_API_URL || `${process.env.REACT_APP_API_URL}/municipios`;

// ─── Design tokens ────────────────────────────────────────────────────────────
const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';
const INPUT_BG = 'rgba(255,255,255,0.05)';
const ACCENT = '#F97316';
const ACCENT_GRADIENT = 'linear-gradient(135deg, #F97316, #EA580C)';

// ─── Motion ───────────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [.22, 1, .36, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

// ─── Shared input class ──────────────────────────────────────────────────────
const inputClass = `w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-[#F97316]/60 focus:border-[#F97316]/40`;
const inputStyle = { backgroundColor: INPUT_BG, border: `1px solid ${BORDER}` };
const labelClass = "flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase text-white/50 mb-1.5";
const selectClass = `${inputClass} cursor-pointer [&>option]:bg-white [&>option]:text-gray-800`;

// ─── Section Header ──────────────────────────────────────────────────────────
const FormSection = ({ icon, title, subtitle, children, delay = 0 }) => (
  <motion.div variants={fadeUp} transition={{ delay }}
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

// ─── File Drop Zone ──────────────────────────────────────────────────────────
const FileDropZone = ({ label, icon, files, onChange }) => (
  <div className="space-y-1.5">
    <p className={labelClass}>{icon}{label}</p>
    <label className="flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-xl cursor-pointer
      transition-all duration-200 hover:border-[#F97316]/40 hover:bg-white/[0.04] group"
      style={{ border: `1.5px dashed rgba(255,255,255,0.15)`, backgroundColor: 'rgba(255,255,255,0.02)' }}>
      <Upload className="w-5 h-5 text-white/25 group-hover:text-[#F97316] transition-colors" />
      <span className="text-[11px] text-white/30 group-hover:text-white/50 transition-colors text-center">
        Clique para selecionar ou arraste arquivos
      </span>
      <input type="file" multiple onChange={onChange} className="hidden" />
    </label>
    {files.length > 0 && (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {files.map((f, i) => (
          <span key={i} className="text-[9px] px-2 py-1 rounded-md font-medium text-white/60 truncate max-w-[140px]"
            style={{ backgroundColor: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
            {f.name}
          </span>
        ))}
      </div>
    )}
  </div>
);

// ─── Step indicator ──────────────────────────────────────────────────────────
const STEPS = [
  { key: 'pessoal', label: 'Dados Pessoais', icon: User },
  { key: 'local', label: 'Localização', icon: MapPin },
  { key: 'profissional', label: 'Profissional', icon: Briefcase },
  { key: 'beneficios', label: 'Benefícios', icon: Shield },
  { key: 'documentos', label: 'Documentos', icon: FileText },
];

const ClientForm = ({ onSuccess }) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [valorRenda, setValorRenda] = useState("");
  const [estadoCivil, setEstadoCivil] = useState("solteiro");
  const [naturalidade, setNaturalidade] = useState("");
  const [profissao, setProfissao] = useState("");
  const [dataAdmissao, setDataAdmissao] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [dataCriacao, setDataCriacao] = useState(new Date().toISOString().split('T')[0]);
  const [rendaTipo, setRendaTipo] = useState("");
  const [possui_carteira_mais_tres_anos, setPossuiCarteiraMaisTresAnos] = useState("nao");
  const [numeroPis, setNumeroPis] = useState("");
  const [possuiDependente, setPossuiDependente] = useState("nao");
  const [qtdDependentes, setQtdDependentes] = useState("");
  const [nomeDependentes, setNomeDependentes] = useState("");
  const [documentosPessoais, setDocumentosPessoais] = useState([]);
  const [extratoBancario, setExtratoBancario] = useState([]);
  const [documentosDependente, setDocumentosDependente] = useState([]);
  const [documentosConjuge, setDocumentosConjuge] = useState([]);
  const [cadastrarConjuge, setCadastrarConjuge] = useState(false);
  const [conjugeNome, setConjugeNome] = useState("");
  const [conjugeEmail, setConjugeEmail] = useState("");
  const [conjugeTelefone, setConjugeTelefone] = useState("");
  const [conjugeCpf, setConjugeCpf] = useState("");
  const [conjugeProfissao, setConjugeProfissao] = useState("");
  const [conjugeDataNascimento, setConjugeDataNascimento] = useState("");
  const [conjugeValorRenda, setConjugeValorRenda] = useState("");
  const [conjugeRendaTipo, setConjugeRendaTipo] = useState("");
  const [conjugeDataAdmissao, setConjugeDataAdmissao] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [estados, setEstados] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [estado, setEstado] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [userId, setUserId] = useState("");
  const [vincularUsuario, setVincularUsuario] = useState(false);

  useEffect(() => {
    const fetchEstados = async () => {
      try {
        const { data } = await axios.get(ESTADOS_API_URL);
        setEstados(data);
      } catch (error) {
        console.error("Erro ao buscar estados:", error);
      }
    };
    fetchEstados();
  }, []);

  useEffect(() => {
    if (estado) {
      const fetchMunicipios = async () => {
        try {
          const estadoSelecionado = estados.find((est) => est.sigla === estado);
          if (estadoSelecionado) {
            const { data } = await axios.get(`${MUNICIPIOS_API_URL}/${estadoSelecionado.id}`);
            setMunicipios(data);
          }
        } catch (error) {
          console.error("Erro ao buscar municípios:", error);
        }
      };
      fetchMunicipios();
    } else {
      setMunicipios([]);
    }
  }, [estado, estados]);

  const formatarValorRenda = (value) => {
    if (!value) return '';
    const numero = value.toString().replace(/\D/g, '');
    if (!numero) return '';
    const valorDecimal = parseInt(numero, 10) / 100;
    return valorDecimal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDateForSend = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.slice(0, 10);
  };

  const converterRendaParaEnvio = (valorFormatado) => {
    if (!valorFormatado) return '';
    const numero = valorFormatado.toString().replace(/\D/g, '');
    if (!numero) return '';
    const valorDecimal = parseInt(numero, 10) / 100;
    return valorDecimal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem("authToken");
    if (!token) { toast.error("Token de autenticação não encontrado."); setLoading(false); return; }

    const formData = new FormData();
    formData.append("nome", nome.toUpperCase());
    formData.append("email", email.toUpperCase());
    formData.append("telefone", telefone);
    formData.append("cpf", cpf);
    formData.append("valor_renda", converterRendaParaEnvio(valorRenda));
    formData.append("estado_civil", estadoCivil.toUpperCase());
    formData.append("naturalidade", naturalidade.toUpperCase());
    formData.append("profissao", profissao.toUpperCase());
    formData.append("data_nascimento", formatDateForSend(dataNascimento));
    formData.append("data_criacao", formatDateForSend(dataCriacao));
    formData.append("renda_tipo", rendaTipo.toUpperCase());
    formData.append("possui_carteira_mais_tres_anos", possui_carteira_mais_tres_anos === "sim" ? 1 : 0);
    formData.append("numero_pis", numeroPis);
    formData.append("possui_dependente", possuiDependente === "sim" ? 1 : 0);
    formData.append("qtd_dependentes", qtdDependentes);
    formData.append("nome_dependentes", nomeDependentes);
    formData.append("observacoes", observacoes);
    if ((rendaTipo === "formal" || rendaTipo === "mista") && dataAdmissao) {
      formData.append("data_admissao", formatDateForSend(dataAdmissao));
    } else { formData.append("data_admissao", ""); }

    documentosPessoais.forEach((file) => formData.append("documentosPessoais", file));
    extratoBancario.forEach((file) => formData.append("extratoBancario", file));
    documentosDependente.forEach((file) => formData.append("documentosDependente", file));
    documentosConjuge.forEach((file) => formData.append("documentosConjuge", file));

    if (estadoCivil === "casado" && cadastrarConjuge) {
      formData.append("conjuge_nome", conjugeNome.toUpperCase());
      formData.append("conjuge_email", conjugeEmail.toUpperCase());
      formData.append("conjuge_telefone", conjugeTelefone);
      formData.append("conjuge_cpf", conjugeCpf);
      formData.append("conjuge_profissao", conjugeProfissao.toUpperCase());
      formData.append("conjuge_data_nascimento", formatDateForSend(conjugeDataNascimento));
      formData.append("conjuge_valor_renda", converterRendaParaEnvio(conjugeValorRenda));
      formData.append("conjuge_renda_tipo", conjugeRendaTipo.toUpperCase());
      formData.append("conjuge_data_admissao", formatDateForSend(conjugeDataAdmissao));
    }
    if ((user?.is_administrador || user?.is_correspondente) && vincularUsuario && userId) {
      formData.append("userId", userId);
    }

    try {
      const response = await axios.post(`${API_URL}/clientes`, formData, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
      });
      setMessage("Cliente cadastrado com sucesso!");
      toast.success("Cliente cadastrado com sucesso!");
      setNome(""); setEmail(""); setTelefone(""); setCpf(""); setValorRenda("");
      setProfissao(""); setDataNascimento(""); setDataCriacao(new Date().toISOString().split('T')[0]);
      setObservacoes(""); setDocumentosPessoais([]); setExtratoBancario([]);
      setDocumentosDependente([]); setDocumentosConjuge([]);
      if (onSuccess) onSuccess();
      setCadastrarConjuge(false); setConjugeNome(""); setConjugeEmail("");
      setConjugeTelefone(""); setConjugeCpf(""); setConjugeProfissao("");
      setConjugeDataNascimento(""); setConjugeValorRenda(""); setConjugeRendaTipo("");
      setConjugeDataAdmissao("");
    } catch (error) {
      let msg = "Erro ao adicionar cliente.";
      if (Array.isArray(error.response?.data?.details) && error.response.data.details.length > 0) {
        msg = error.response.data.details.map((detail) => detail.message).join(' | ');
      } else if (error.response?.data?.message) msg = error.response.data.message;
      else if (error.response?.data?.error) msg = error.response.data.error;
      else if (error.message) msg = error.message;
      setMessage(msg); toast.error(msg);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (user?.is_administrador || user?.is_correspondente) {
      axios.get(`${API_URL}/user`, { headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` } })
        .then(res => {
          if (Array.isArray(res.data.users)) setUsuarios(res.data.users);
          else if (Array.isArray(res.data)) setUsuarios(res.data);
          else setUsuarios([]);
        }).catch(() => setUsuarios([]));
    }
  }, [user]);

  // Progress calculation
  const progress = useMemo(() => {
    let filled = 0; let total = 5;
    if (nome) filled++;
    if (cpf) filled++;
    if (estado && naturalidade) filled++;
    if (profissao && rendaTipo) filled++;
    if (dataNascimento) filled++;
    return Math.round((filled / total) * 100);
  }, [nome, cpf, estado, naturalidade, profissao, rendaTipo, dataNascimento]);

  return (
    <div className="min-h-screen w-full bg-caixa-gradient">
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop closeOnClick
        pauseOnFocusLoss draggable pauseOnHover theme="dark" />

      <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:px-6">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: ACCENT_GRADIENT }}>
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Cadastro de Cliente</h1>
              <p className="text-[11px] text-white/40">Preencha os dados para registrar um novo cliente</p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <motion.div className="h-full rounded-full" style={{ background: ACCENT_GRADIENT }}
                initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: [.22, 1, .36, 1] }} />
            </div>
            <span className="text-[11px] font-bold" style={{ color: ACCENT }}>{progress}%</span>
          </div>
        </motion.div>

        {/* ── Step pills ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.key}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.45)' }}>
                <Icon className="w-3 h-3" />
                {step.label}
              </div>
            );
          })}
        </motion.div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit}>
          <motion.div className="space-y-4" initial="hidden" animate="show" variants={stagger}>

            {/* ═══ SEÇÃO 1: DADOS PESSOAIS ═══ */}
            <FormSection icon={<User className="w-4 h-4 text-white" />} title="Dados Pessoais"
              subtitle="Informações básicas de identificação do cliente">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Nome */}
                <div className="sm:col-span-2">
                  <label className={labelClass}><User className="w-3 h-3" />Nome completo *</label>
                  <input type="text" value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())}
                    className={inputClass} style={inputStyle} placeholder="MARIA DA SILVA" required />
                </div>
                {/* Email */}
                <div>
                  <label className={labelClass}><Mail className="w-3 h-3" />E-mail *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value.toUpperCase())}
                    className={inputClass} style={inputStyle} placeholder="MARIA@EMAIL.COM" required />
                </div>
                {/* Telefone */}
                <div>
                  <label className={labelClass}><Phone className="w-3 h-3" />Telefone *</label>
                  <InputMask mask="(99) 99999-9999" value={telefone} onChange={(e) => setTelefone(e.target.value)}
                    className={inputClass} style={inputStyle} placeholder="(00) 00000-0000" required />
                </div>
                {/* CPF */}
                <div>
                  <label className={labelClass}><CreditCard className="w-3 h-3" />CPF *</label>
                  <InputMask mask="999.999.999-99" value={cpf} onChange={(e) => setCpf(e.target.value)}
                    className={inputClass} style={inputStyle} placeholder="000.000.000-00" required />
                </div>
                {/* Valor Renda */}
                <div>
                  <label className={labelClass}><Wallet className="w-3 h-3" />Renda mensal *</label>
                  <input type="text" value={formatarValorRenda(valorRenda)}
                    onChange={(e) => setValorRenda(e.target.value.replace(/\D/g, ""))}
                    className={inputClass} style={inputStyle} placeholder="2.000,00" required />
                  <p className="text-[9px] text-white/25 mt-1">Digite apenas números</p>
                </div>
                {/* Estado Civil */}
                <div>
                  <label className={labelClass}><Heart className="w-3 h-3" />Estado civil *</label>
                  <select value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value)}
                    className={selectClass} style={inputStyle}>
                    <option value="solteiro">Solteiro(a)</option>
                    <option value="casado">Casado(a)</option>
                    <option value="divorciado">Divorciado(a)</option>
                    <option value="viuvo">Viuvo(a)</option>
                  </select>
                </div>
                {/* Data nascimento */}
                <div>
                  <label className={labelClass}><Calendar className="w-3 h-3" />Nascimento *</label>
                  <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)}
                    className={inputClass} style={inputStyle} required />
                </div>
                {/* Data criacao */}
                <div>
                  <label className={labelClass}><Clock className="w-3 h-3" />Data do cadastro *</label>
                  <input type="date" value={dataCriacao} onChange={(e) => setDataCriacao(e.target.value)}
                    className={inputClass} style={inputStyle} required />
                </div>
              </div>
            </FormSection>

            {/* ═══ SEÇÃO 2: LOCALIZAÇÃO ═══ */}
            <FormSection icon={<MapPin className="w-4 h-4 text-white" />} title="Localização"
              subtitle="Endereço e naturalidade">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Estado */}
                <div>
                  <label className={labelClass}><Globe className="w-3 h-3" />Estado *</label>
                  <select value={estado} onChange={(e) => setEstado(e.target.value)}
                    className={selectClass} style={inputStyle} required>
                    <option value="">Selecione o estado</option>
                    {estados.map((est) => (
                      <option key={est.id} value={est.sigla}>{est.nome}</option>
                    ))}
                  </select>
                </div>
                {/* Cidade */}
                <div>
                  <label className={labelClass}><Building className="w-3 h-3" />Cidade *</label>
                  <select value={naturalidade} onChange={(e) => setNaturalidade(e.target.value)}
                    className={selectClass} style={inputStyle} required>
                    <option value="">Selecione a cidade</option>
                    {municipios.map((m) => (
                      <option key={m.id} value={`${m.nome} - ${estado}`}>{m.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </FormSection>

            {/* ═══ SEÇÃO 3: PROFISSIONAL ═══ */}
            <FormSection icon={<Briefcase className="w-4 h-4 text-white" />} title="Dados Profissionais"
              subtitle="Informações de trabalho e renda">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Profissão */}
                <div>
                  <label className={labelClass}><Briefcase className="w-3 h-3" />Profissão *</label>
                  <input type="text" value={profissao} onChange={(e) => setProfissao(e.target.value.toUpperCase())}
                    className={inputClass} style={inputStyle} placeholder="GERENTE DE VENDAS" required />
                </div>
                {/* Tipo renda */}
                <div>
                  <label className={labelClass}><CircleDot className="w-3 h-3" />Tipo de renda *</label>
                  <select value={rendaTipo} onChange={(e) => setRendaTipo(e.target.value)}
                    className={selectClass} style={inputStyle}>
                    <option value="">Selecione</option>
                    <option value="formal">Formal</option>
                    <option value="informal">Informal</option>
                    <option value="mista">Mista</option>
                  </select>
                </div>
                {/* Data admissão */}
                {(rendaTipo === "formal" || rendaTipo === "mista") && (
                  <div>
                    <label className={labelClass}><Calendar className="w-3 h-3" />Data de admissão</label>
                    <input type="date" value={dataAdmissao} onChange={(e) => setDataAdmissao(e.target.value)}
                      className={inputClass} style={inputStyle} />
                  </div>
                )}
              </div>
            </FormSection>

            {/* ═══ SEÇÃO 4: BENEFÍCIOS & DEPENDENTES ═══ */}
            <FormSection icon={<Shield className="w-4 h-4 text-white" />} title="Benefícios & Dependentes"
              subtitle="Carteira, PIS e dependentes">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Carteira 3 anos */}
                <div>
                  <label className={labelClass}><Shield className="w-3 h-3" />Carteira +3 anos? *</label>
                  <select value={possui_carteira_mais_tres_anos}
                    onChange={(e) => setPossuiCarteiraMaisTresAnos(e.target.value)}
                    className={selectClass} style={inputStyle}>
                    <option value="">Selecione</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </div>
                {/* PIS */}
                {possui_carteira_mais_tres_anos === "sim" && (
                  <div>
                    <label className={labelClass}><CreditCard className="w-3 h-3" />Número do PIS</label>
                    <input type="text" value={numeroPis} onChange={(e) => setNumeroPis(e.target.value)}
                      className={inputClass} style={inputStyle} placeholder="123.45678.90-1" />
                  </div>
                )}
                {/* Dependentes */}
                <div>
                  <label className={labelClass}><Baby className="w-3 h-3" />Possui dependentes? *</label>
                  <select value={possuiDependente} onChange={(e) => setPossuiDependente(e.target.value)}
                    className={selectClass} style={inputStyle}>
                    <option value="">Selecione</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </div>
                {possuiDependente === "sim" && (
                  <>
                    <div>
                      <label className={labelClass}><Users className="w-3 h-3" />Qtd dependentes</label>
                      <input type="text" value={qtdDependentes} onChange={(e) => setQtdDependentes(e.target.value)}
                        className={inputClass} style={inputStyle} placeholder="2" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}><Users className="w-3 h-3" />Nomes dos dependentes</label>
                      <input type="text" value={nomeDependentes} onChange={(e) => setNomeDependentes(e.target.value)}
                        className={inputClass} style={inputStyle} placeholder="Nomes separados por vírgula" />
                    </div>
                  </>
                )}
              </div>
            </FormSection>

            {/* ═══ SEÇÃO 5: VINCULAR USUÁRIO ═══ */}
            {(user?.is_administrador || user?.is_correspondente) && (
              <FormSection icon={<Link2 className="w-4 h-4 text-white" />} title="Vincular Responsável"
                subtitle="Atribuir este cliente a outro usuário do sistema">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                      vincularUsuario ? 'bg-[#F97316]' : ''}`}
                      style={vincularUsuario ? {} : { backgroundColor: INPUT_BG, border: `1px solid ${BORDER}` }}>
                      {vincularUsuario && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input type="checkbox" checked={vincularUsuario}
                      onChange={e => setVincularUsuario(e.target.checked)} className="hidden" />
                    <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors">
                      Vincular cliente a outro usuário
                    </span>
                  </label>
                  <AnimatePresence>
                    {vincularUsuario && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                        <select value={userId} onChange={e => setUserId(e.target.value)}
                          className={selectClass} style={inputStyle} required={vincularUsuario}>
                          <option value="">Selecione o usuário</option>
                          {usuarios.map(u => (
                            <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>
                          ))}
                        </select>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FormSection>
            )}

            {/* ═══ SEÇÃO 6: CÔNJUGE ═══ */}
            {estadoCivil === "casado" && (
              <FormSection icon={<Heart className="w-4 h-4 text-white" />} title="Dados do Cônjuge"
                subtitle="Informações do parceiro(a) para compor renda">
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                      cadastrarConjuge ? 'bg-[#F97316]' : ''}`}
                      style={cadastrarConjuge ? {} : { backgroundColor: INPUT_BG, border: `1px solid ${BORDER}` }}>
                      {cadastrarConjuge && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input type="checkbox" checked={cadastrarConjuge}
                      onChange={e => setCadastrarConjuge(e.target.checked)} className="hidden" />
                    <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors">
                      Cadastrar cônjuge junto ao cliente
                    </span>
                  </label>

                  <AnimatePresence>
                    {cadastrarConjuge && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className={labelClass}><User className="w-3 h-3" />Nome cônjuge *</label>
                          <input type="text" value={conjugeNome}
                            onChange={e => setConjugeNome(e.target.value.toUpperCase())}
                            className={inputClass} style={inputStyle} placeholder="JOÃO DA SILVA" required />
                        </div>
                        <div>
                          <label className={labelClass}><Mail className="w-3 h-3" />E-mail cônjuge *</label>
                          <input type="email" value={conjugeEmail}
                            onChange={e => setConjugeEmail(e.target.value.toUpperCase())}
                            className={inputClass} style={inputStyle} placeholder="JOAO@EMAIL.COM" required />
                        </div>
                        <div>
                          <label className={labelClass}><Phone className="w-3 h-3" />Telefone cônjuge *</label>
                          <InputMask mask="(99) 99999-9999" value={conjugeTelefone}
                            onChange={e => setConjugeTelefone(e.target.value)}
                            className={inputClass} style={inputStyle} placeholder="(00) 00000-0000" required />
                        </div>
                        <div>
                          <label className={labelClass}><CreditCard className="w-3 h-3" />CPF cônjuge *</label>
                          <InputMask mask="999.999.999-99" value={conjugeCpf}
                            onChange={e => setConjugeCpf(e.target.value)}
                            className={inputClass} style={inputStyle} placeholder="000.000.000-00" required />
                        </div>
                        <div>
                          <label className={labelClass}><Briefcase className="w-3 h-3" />Profissão cônjuge *</label>
                          <input type="text" value={conjugeProfissao}
                            onChange={e => setConjugeProfissao(e.target.value.toUpperCase())}
                            className={inputClass} style={inputStyle} placeholder="ENGENHEIRO" required />
                        </div>
                        <div>
                          <label className={labelClass}><Calendar className="w-3 h-3" />Nascimento cônjuge *</label>
                          <input type="date" value={conjugeDataNascimento}
                            onChange={e => setConjugeDataNascimento(e.target.value)}
                            className={inputClass} style={inputStyle} required />
                        </div>
                        <div>
                          <label className={labelClass}><Wallet className="w-3 h-3" />Renda cônjuge *</label>
                          <input type="text" value={formatarValorRenda(conjugeValorRenda)}
                            onChange={e => setConjugeValorRenda(e.target.value.replace(/\D/g, ""))}
                            className={inputClass} style={inputStyle} placeholder="2.000,00" required />
                        </div>
                        <div>
                          <label className={labelClass}><CircleDot className="w-3 h-3" />Tipo renda cônjuge *</label>
                          <select value={conjugeRendaTipo} onChange={e => setConjugeRendaTipo(e.target.value)}
                            className={selectClass} style={inputStyle} required>
                            <option value="">Selecione</option>
                            <option value="formal">Formal</option>
                            <option value="informal">Informal</option>
                            <option value="mista">Mista</option>
                          </select>
                        </div>
                        {(conjugeRendaTipo === "formal" || conjugeRendaTipo === "mista") && (
                          <div>
                            <label className={labelClass}><Calendar className="w-3 h-3" />Admissão cônjuge</label>
                            <input type="date" value={conjugeDataAdmissao}
                              onChange={e => setConjugeDataAdmissao(e.target.value)}
                              className={inputClass} style={inputStyle} />
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FormSection>
            )}

            {/* ═══ SEÇÃO 7: OBSERVAÇÕES ═══ */}
            <FormSection icon={<FileText className="w-4 h-4 text-white" />} title="Observações"
              subtitle="Informações adicionais sobre o cliente">
              <div>
                <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)}
                  className={`${inputClass} min-h-[80px] resize-y`} style={inputStyle}
                  placeholder="Observações opcionais sobre o cliente..." rows={3} />
              </div>
            </FormSection>

            {/* ═══ SEÇÃO 8: DOCUMENTOS ═══ */}
            <FormSection icon={<Upload className="w-4 h-4 text-white" />} title="Upload de Documentos"
              subtitle="Anexe os documentos necessários para análise">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileDropZone label="Documentos pessoais"
                  icon={<FileText className="w-3 h-3" />}
                  files={documentosPessoais}
                  onChange={(e) => setDocumentosPessoais(Array.from(e.target.files))} />
                <FileDropZone label="Extrato / Contra Cheque"
                  icon={<Wallet className="w-3 h-3" />}
                  files={extratoBancario}
                  onChange={(e) => setExtratoBancario(Array.from(e.target.files))} />
                {possuiDependente === "sim" && (
                  <FileDropZone label="Docs dependentes"
                    icon={<Users className="w-3 h-3" />}
                    files={documentosDependente}
                    onChange={(e) => setDocumentosDependente(Array.from(e.target.files))} />
                )}
                {estadoCivil === "casado" && (
                  <FileDropZone label="Docs cônjuge"
                    icon={<Heart className="w-3 h-3" />}
                    files={documentosConjuge}
                    onChange={(e) => setDocumentosConjuge(Array.from(e.target.files))} />
                )}
              </div>
            </FormSection>

            {/* ═══ BOTÃO SUBMIT ═══ */}
            <motion.div variants={fadeUp}>
              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                type="submit" disabled={loading}
                className={`w-full py-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-3
                  shadow-lg shadow-[#F97316]/20 transition-all duration-200 ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl hover:shadow-[#F97316]/30'}`}
                style={{ background: ACCENT_GRADIENT }}>
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Cadastrando...</>
                ) : (
                  <><Save className="w-5 h-5" />Cadastrar Cliente<ArrowRight className="w-4 h-4 ml-1" /></>
                )}
              </motion.button>
            </motion.div>

            {/* ═══ STATUS ═══ */}
            <AnimatePresence>
              {message && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} className="flex items-center gap-3 p-4 rounded-xl backdrop-blur-md"
                  style={{
                    backgroundColor: message.includes("sucesso") ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${message.includes("sucesso") ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  }}>
                  {message.includes("sucesso")
                    ? <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#10b981' }} />
                    : <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} />}
                  <span className="text-sm font-medium" style={{
                    color: message.includes("sucesso") ? '#10b981' : '#ef4444'
                  }}>{message}</span>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </form>
      </div>
    </div>
  );
};

export default ClientForm;
