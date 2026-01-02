import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaUser, FaEnvelope, FaPhone, FaIdCard, FaCalendarAlt, 
  FaSave, FaTimes, FaArrowLeft, FaArrowRight, FaUpload, 
  FaFileAlt, FaCheck, FaExclamationTriangle, FaEye, 
  FaTrash, FaSpinner, FaEdit, FaBriefcase, FaDollarSign,
  FaHeart, FaMapMarkerAlt, FaUsers, FaCheckCircle,
  FaCloudUploadAlt, FaFilePdf, FaImage
} from "react-icons/fa";
import { MdWork, MdVisibility } from "react-icons/md";
import Toast from "./Toast";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const STEPS = [
  { id: 1, title: "Dados Pessoais", icon: FaUser, color: "from-blue-500 to-blue-600" },
  { id: 2, title: "Profissionais", icon: FaBriefcase, color: "from-green-500 to-green-600" },
  { id: 3, title: "Documentos", icon: FaFileAlt, color: "from-purple-500 to-purple-600" }
];

const FILE_TYPES = {
  documentos_pessoais: { 
    label: "Documentos Pessoais", 
    accept: ".pdf,.jpg,.jpeg,.png", 
    backendField: "documentosPessoais",
    icon: FaIdCard,
    required: true
  },
  extrato_bancario: { 
    label: "Extrato Bancário", 
    accept: ".pdf,.jpg,.jpeg,.png", 
    backendField: "extratoBancario",
    icon: FaDollarSign,
    required: true
  },
  documentos_dependente: { 
    label: "Documentos do Dependente", 
    accept: ".pdf,.jpg,.jpeg,.png", 
    backendField: "documentosDependente",
    icon: FaUsers,
    required: false
  },
  documentos_conjuge: { 
    label: "Documentos do Cônjuge", 
    accept: ".pdf,.jpg,.jpeg,.png", 
    backendField: "documentosConjuge",
    icon: FaHeart,
    required: false
  },
  fiador_documentos: { 
    label: "Documentos do Fiador", 
    accept: ".pdf,.jpg,.jpeg,.png", 
    backendField: "fiadorDocumentos",
    icon: FaUser,
    required: false
  },
  formularios_caixa: { 
    label: "Formulários Caixa", 
    accept: ".pdf,.jpg,.jpeg,.png", 
    backendField: "formulariosCaixa",
    icon: FaFileAlt,
    required: false
  },
  tela_aprovacao: {
    label: "Tela de Aprovação",
    accept: ".pdf,.jpg,.jpeg,.png",
    backendField: "tela_aprovacao",
    icon: FaEye,
    required: false
  }
};

const ESTADO_CIVIL_OPTIONS = [
  { value: "solteiro", label: "Solteiro(a)", icon: "👤" },
  { value: "casado", label: "Casado(a)", icon: "💑" },
  { value: "divorciado", label: "Divorciado(a)", icon: "💔" },
  { value: "viuvo", label: "Viúvo(a)", icon: "🖤" },
  { value: "uniao_estavel", label: "União Estável", icon: "👫" }
];

const RENDA_TIPO_OPTIONS = [
  { value: "formal", label: "Formal", icon: "🏢" },
  { value: "informal", label: "Informal", icon: "💼" },
  { value: "mista", label: "Mista", icon: "🔄" }
];

// ✅ ADICIONAR OPÇÕES DE STATUS
const STATUS_OPTIONS = Object.entries({
  aguardando_aprovacao: { name: "Aguardando Aprovação", icon: "⏳" },
  proposta_apresentada: { name: "Proposta Apresentada", icon: "📋" },
  documentacao_pendente: { name: "Documentação Pendente", icon: "📄" },
  visita_efetuada: { name: "Visita Efetuada", icon: "🏠" },
  aguardando_cancelamento_qv: { name: "Aguardando Cancelamento/QV", icon: "🔄" },
  condicionado: { name: "Condicionado", icon: "⚠️" },
  cliente_aprovado: { name: "Aprovado", icon: "✅" },
  reprovado: { name: "Reprovado", icon: "❌" },
  reserva: { name: "Reserva", icon: "�" },
  conferencia_documento: { name: "Conferência de Documento", icon: "📁" },
  nao_descondiciona: { name: "Não Descondiciona", icon: "⛔" },
  conformidade: { name: "Conformidade", icon: "✔️" },
  concluido: { name: "Venda Concluída", icon: "🎉" },
  nao_deu_continuidade: { name: "Não Deu Continuidade", icon: "⏸️" },
  aguardando_reserva_orcamentaria: { name: "Aguardando Reserva Orçamentária", icon: "💰" },
  fechamento_proposta: { name: "Fechamento Proposta", icon: "🤝" },
  processo_em_aberto: { name: "Processo Aberto", icon: "📁" },
}).map(([value, { name, icon }]) => ({
  value,
  label: name,
  icon
}));

// ✅ COMPONENTE DE INPUT MEMOIZADO
const Input = React.memo(({ label, value, onChange, icon: Icon, type = "text", required, placeholder }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="group"
  >
    <label className="flex items-center gap-2 text-sm font-semibold text-caixa-primary mb-2">
      {Icon && <Icon className="w-4 h-4 text-caixa-orange" />}
      {label}
      {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <input
        type={type}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || `Digite ${label.toLowerCase()}...`}
        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-caixa-orange focus:ring-4 focus:ring-caixa-orange/20 transition-all duration-300 outline-none group-hover:border-gray-300"
        required={required}
        autoComplete="off"
      />
    </div>
  </motion.div>
));

// ✅ COMPONENTE DE SELECT MEMOIZADO
const Select = React.memo(({ label, value, onChange, options, icon: Icon, required, disabled }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="group"
  >
    <label className="flex items-center gap-2 text-sm font-semibold text-caixa-primary mb-2">
      {Icon && <Icon className="w-4 h-4 text-caixa-orange" />}
      {label}
      {required && <span className="text-red-500">*</span>}
      {disabled && <span className="text-xs text-gray-500 ml-2">(Somente Leitura)</span>}
    </label>
    <select
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 outline-none ${
        disabled 
          ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
          : 'bg-white border-gray-200 focus:border-caixa-orange focus:ring-4 focus:ring-caixa-orange/20 group-hover:border-gray-300'
      }`}
      required={required}
      disabled={disabled}
    >
      <option value="">Selecione uma opção...</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.icon ? `${opt.icon} ${opt.label}` : opt.label}
        </option>
      ))}
    </select>
  </motion.div>
));

// ✅ COMPONENTE DE CHECKBOX MEMOIZADO
const Checkbox = React.memo(({ label, checked, onChange, icon: Icon }) => (
  <motion.label
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-caixa-orange/50 hover:bg-caixa-orange/5 transition-all duration-300 cursor-pointer group"
  >
    <div className="relative">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only"
      />
      <div className={`w-5 h-5 rounded border-2 transition-all duration-300 flex items-center justify-center
        ${checked 
          ? 'bg-caixa-orange border-caixa-orange' 
          : 'border-gray-300 group-hover:border-caixa-orange'
        }`}
      >
        {checked && <FaCheck className="w-3 h-3 text-white" />}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-caixa-orange" />}
      <span className="text-caixa-primary font-medium">{label}</span>
    </div>
  </motion.label>
));

// ✅ COMPONENTE DE UPLOAD MEMOIZADO
const FileUpload = React.memo(({ field, config, files, onChange, onRemove, formData, getDocumentUrl, isDragging, setIsDragging }) => {
  const existingPath = formData[`${field}_path`];
  const hasExistingFile = existingPath && existingPath !== "";

  const getFileIcon = useCallback((fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FaFilePdf className="w-5 h-5 text-red-500" />;
    if (['jpg', 'jpeg', 'png'].includes(ext)) return <FaImage className="w-5 h-5 text-blue-500" />;
    return <FaFileAlt className="w-5 h-5 text-gray-500" />;
  }, []);

  const handleViewDocument = useCallback(() => {
    if (hasExistingFile) {
      const tipo = field === 'fiador_documentos' ? 'fiador' : 
                  field === 'formularios_caixa' ? 'formulario' : 
                  field === 'tela_aprovacao' ? 'tela_aprovacao' : null;
      const url = getDocumentUrl(existingPath, tipo);
      if (url) {
        window.open(url, '_blank');
      }
    }
  }, [hasExistingFile, field, existingPath, getDocumentUrl]);

  const handleFileSelect = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    onChange(field, selectedFiles);
  }, [field, onChange]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(null);
    const droppedFiles = Array.from(e.dataTransfer.files);
    onChange(field, droppedFiles);
  }, [field, onChange, setIsDragging]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(field);
  }, [field, setIsDragging]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(null);
  }, [setIsDragging]);

  const handleRemoveFile = useCallback((idx) => {
    onRemove(field, idx);
  }, [field, onRemove]);

  const acceptTypes = Array.isArray(config.accept) ? config.accept.join(",") : config.accept;
  const Icon = config.icon || FaFileAlt;
  const isCurrentlyDragging = isDragging === field;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-caixa-orange" />
          <span className="font-semibold text-caixa-primary">{config.label}</span>
          {config.required && <span className="text-red-500 text-sm">*</span>}
        </div>
      </div>

      {/* Upload Area */}
      <div className="p-4">
        <div
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer
            ${isCurrentlyDragging 
              ? 'border-caixa-orange bg-caixa-orange/5 scale-[1.02]' 
              : 'border-gray-300 hover:border-caixa-orange hover:bg-gray-50'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById(`file-input-${field}`).click()}
        >
          <input
            id={`file-input-${field}`}
            type="file"
            accept={acceptTypes}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="space-y-3">
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center
              ${isCurrentlyDragging ? 'bg-caixa-orange text-white' : 'bg-gray-100 text-gray-400'}
            `}>
              <FaCloudUploadAlt className="w-6 h-6" />
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700">
                {isCurrentlyDragging ? 'Solte os arquivos aqui' : 'Clique ou arraste arquivos'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Formatos aceitos: {acceptTypes}
              </p>
            </div>
          </div>
        </div>

        {/* Arquivo Existente */}
        {hasExistingFile && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaFileAlt className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Arquivo atual</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleViewDocument}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MdVisibility className="w-3 h-3" />
                Ver
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Lista de Novos Arquivos */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Novos arquivos:</h4>
            {files.map((file, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getFileIcon(file.name)}
                  <span className="text-sm text-green-700 truncate">{file.name}</span>
                  <span className="text-xs text-green-600">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleRemoveFile(idx)}
                  className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                >
                  <FaTrash className="w-3 h-3" />
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
});

const ModalEditarCliente = ({ cliente, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    valorRenda: "",
    estadoCivil: "",
    naturalidade: "",
    profissao: "",
    dataAdmissao: "",
    dataNascimento: "",
    rendaTipo: "",
    possuiCarteiraMaisTresAnos: false,
    numeroPis: "",
    possuiDependente: false,
    status: "",
    documentos_pessoais: [],
    extrato_bancario: [],
    documentos_dependente: [],
    documentos_conjuge: [],
    possuiConjuge: false,
    conjuge_nome: "",
    conjuge_email: "",
    conjuge_telefone: "",
    conjuge_cpf: "",
    conjuge_dataNascimento: "",
    conjuge_profissao: "",
    conjuge_naturalidade: "",
    conjuge_estadoCivil: "",
    conjuge_numeroPis: "",
    conjuge_valorRenda: "",
    conjuge_rendaTipo: "",
    conjuge_dataAdmissao: "",
    statusConjuge: "",
    documentos_conjuge: [],
    possuiFiador: false,
    fiador_nome: "",
    fiador_cpf: "",
    fiador_telefone: "",
    fiador_email: "",
    fiador_documentos: [],
    possuiFormulariosCaixa: false,
    formularios_caixa: [],
    userId: "",
    tela_aprovacao: [],
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [usuariosError, setUsuariosError] = useState(null);
  const { user, hasRole } = useAuth();

  // ✅ TOAST STATE
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success'
  });

  // ✅ FUNÇÃO PARA MOSTRAR TOAST - MEMOIZADA
  const showToast = useCallback((message, type = 'success') => {
    setToast({
      isVisible: true,
      message,
      type
    });
  }, []);

  // ✅ FUNÇÃO PARA FECHAR TOAST - MEMOIZADA
  const closeToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  // ✅ HANDLERS MEMOIZADOS
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleFileChange = useCallback((field, files) => {
    setFormData(prev => ({ ...prev, [field]: Array.from(files) }));
  }, []);

  const removeFile = useCallback((field, idx) => {
    setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }));
  }, []);

  // ✅ FUNÇÃO PARA URL DOS DOCUMENTOS - MEMOIZADA
  const getDocumentUrl = useCallback((documentPath, tipo) => {
    if (!documentPath) return null;
    
    if (typeof documentPath === 'string') {
      const normalizedPath = documentPath.replace(/\\/g, '/');
      
      let fullUrl;
      if (tipo === 'fiador' || tipo === 'formulario') {
        fullUrl = `${API_BASE_URL}/uploads/clientes/${normalizedPath}`;
      } else {
        fullUrl = `${API_BASE_URL}/uploads/${normalizedPath}`;
      }
      
      return fullUrl;
    }
    
    if (isFileObjectSafe(documentPath)) {
      try {
        return URL.createObjectURL(documentPath);
      } catch (error) {
        console.warn('⚠️ Erro ao criar blob URL:', error);
        return null;
      }
    }
    
    return null;
  }, []);

  // Buscar usuários (apenas admin/correspondente)
  useEffect(() => {
    const fetchUsuarios = async () => {
      setUsuariosLoading(true);
      setUsuariosError(null);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;
        const res = await axios.get(`${API_BASE_URL}/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.success && Array.isArray(res.data.users)) {
          setUsuarios(res.data.users);
        } else {
          setUsuarios([]);
        }
      } catch (err) {
        setUsuariosError("Erro ao buscar usuários");
        setUsuarios([]);
      } finally {
        setUsuariosLoading(false);
      }
    };
    if (isOpen) fetchUsuarios();
  }, [isOpen]);

  // Inicializar dados do cliente - SEM DEPS QUE CAUSAM RE-RENDER
  useEffect(() => {
    if (cliente?.id && isOpen) {
      setFormData({
        nome: cliente.nome || "",
        email: cliente.email || "",
        telefone: cliente.telefone || "",
        cpf: cliente.cpf || "",
        valorRenda: cliente.valor_renda || "",
        estadoCivil: cliente.estado_civil || "",
        naturalidade: cliente.naturalidade || "",
        profissao: cliente.profissao || "",
        dataAdmissao: cliente.data_admissao || "",
        dataNascimento: cliente.data_nascimento || "",
        rendaTipo: cliente.renda_tipo || "",
        possuiCarteiraMaisTresAnos: Boolean(cliente.possui_carteira_mais_tres_anos),
        numeroPis: cliente.numero_pis || "",
        possuiDependente: Boolean(cliente.possui_dependente),
        status: cliente.status || "",
        documentos_pessoais_path: cliente.documentos_pessoais || "",
        extrato_bancario_path: cliente.extrato_bancario || "",
        documentos_dependente_path: cliente.documentos_dependente || "",
        documentos_conjuge_path: cliente.documentos_conjuge || "",
        documentos_pessoais: [],
        extrato_bancario: [],
        documentos_dependente: [],
        documentos_conjuge: [],
        possuiFiador: Boolean(cliente.possui_fiador),
        fiador_nome: cliente.fiador_nome || "",
        fiador_cpf: cliente.fiador_cpf || "",
        fiador_telefone: cliente.fiador_telefone || "",
        fiador_email: cliente.fiador_email || "",
        fiador_documentos_path: cliente.fiador_documentos || "",
        fiador_documentos: [],
        possuiFormulariosCaixa: Boolean(cliente.possui_formularios_caixa),
        formularios_caixa_path: cliente.formularios_caixa || "",
        formularios_caixa: [],
        userId: cliente.userId || "",
        tela_aprovacao_path: cliente.tela_aprovacao || "",
        tela_aprovacao: [],
        possuiConjuge: Boolean(cliente.possui_conjuge),
        conjuge_nome: cliente.conjuge_nome || "",
        conjuge_email: cliente.conjuge_email || "",
        conjuge_telefone: cliente.conjuge_telefone || "",
        conjuge_cpf: cliente.conjuge_cpf || "",
        conjuge_dataNascimento: cliente.conjuge_data_nascimento || "",
        conjuge_profissao: cliente.conjuge_profissao || "",
        conjuge_naturalidade: cliente.conjuge_naturalidade || "",
        conjuge_estadoCivil: cliente.conjuge_estado_civil || "",
        conjuge_numeroPis: cliente.conjuge_numero_pis || "",
        conjuge_valorRenda: cliente.conjuge_valor_renda || "",
        conjuge_rendaTipo: cliente.conjuge_renda_tipo || "",
        conjuge_dataAdmissao: cliente.conjuge_data_admissao || "",
        statusConjuge: cliente.status_conjuge || "",
        documentos_conjuge: [],
      });
      setCurrentStep(1);
    }
  }, [cliente?.id, isOpen]); // ✅ APENAS DEPS ESSENCIAIS

  // ✅ VALIDAÇÃO MEMOIZADA
  const isValid = useMemo(() => {
    let valid = formData.nome && formData.email && formData.cpf && formData.status;
    if (formData.possuiConjuge) {
      valid = valid && formData.conjuge_nome && formData.conjuge_cpf;
    }
    return valid;
  }, [formData.nome, formData.email, formData.cpf, formData.status, formData.possuiConjuge, formData.conjuge_nome, formData.conjuge_cpf]);

  // Salvar
  const handleSave = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!isValid) {
      showToast("Preencha todos os campos obrigatórios corretamente", "error");
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      showToast("Token de autenticação não encontrado", "error");
      return;
    }

    if (!cliente?.id) {
      showToast("Cliente não identificado", "error");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const formDataToSubmit = new FormData();
      const fieldMapping = {
        nome: 'nome',
        email: 'email',
        telefone: 'telefone',
        cpf: 'cpf',
        valorRenda: 'valor_renda',
        estadoCivil: 'estado_civil',
        naturalidade: 'naturalidade',
        profissao: 'profissao',
        dataAdmissao: 'data_admissao',
        dataNascimento: 'data_nascimento',
        rendaTipo: 'renda_tipo',
        possuiCarteiraMaisTresAnos: 'possui_carteira_mais_tres_anos',
        numeroPis: 'numero_pis',
        possuiDependente: 'possui_dependente',
        status: 'status',
        possuiFiador: 'possui_fiador',
        fiador_nome: 'fiador_nome',
        fiador_cpf: 'fiador_cpf',
        fiador_telefone: 'fiador_telefone',
        fiador_email: 'fiador_email',
        possuiFormulariosCaixa: 'possui_formularios_caixa',
        userId: 'userId',
        // Campos do cônjuge
        possuiConjuge: 'possui_conjuge',
        conjuge_nome: 'conjuge_nome',
        conjuge_email: 'conjuge_email',
        conjuge_telefone: 'conjuge_telefone',
        conjuge_cpf: 'conjuge_cpf',
        conjuge_dataNascimento: 'conjuge_data_nascimento',
        conjuge_profissao: 'conjuge_profissao',
        conjuge_naturalidade: 'conjuge_naturalidade',
        conjuge_estadoCivil: 'conjuge_estado_civil',
        conjuge_numeroPis: 'conjuge_numero_pis',
        conjuge_valorRenda: 'conjuge_valor_renda',
        conjuge_rendaTipo: 'conjuge_renda_tipo',
        conjuge_dataAdmissao: 'conjuge_data_admissao',
      };

      // Enviar campos
      Object.entries(fieldMapping).forEach(([frontendField, backendField]) => {
        let value = formData[frontendField];
        // Sempre enviar userId (mesmo se igual ao anterior)
        if (frontendField === 'userId') {
          if (value !== undefined && value !== null && value !== "") {
            formDataToSubmit.append(backendField, String(value));
          } else {
            // Se o usuário desmarcar, envie vazio para desvincular
            formDataToSubmit.append(backendField, "");
          }
          return;
        }
        if (["nome", "email", "cpf", "status"].includes(frontendField)) {
          if (value !== undefined && value !== null && value !== "") {
            formDataToSubmit.append(backendField, value);
          }
        }
        else if (value !== undefined && value !== null && value !== "" && value !== false) {
          formDataToSubmit.append(backendField, value);
        }
        else if (typeof value === 'boolean') {
          formDataToSubmit.append(backendField, value);
        }
      });

      // Enviar arquivos
      Object.keys(FILE_TYPES).forEach(field => {
        const config = FILE_TYPES[field];
        const files = formData[field] || [];
        
        files.forEach((file) => {
          formDataToSubmit.append(config.backendField, file);
        });
      });

      const response = await axios.put(
        `${API_BASE_URL}/clientes/${cliente.id}`,
        formDataToSubmit,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
          timeout: 120000
        }
      );

      // ✅ ATUALIZAR CLIENTE COM DADOS DO SERVIDOR
      const updatedCliente = response.data.cliente || response.data;
      
      // ✅ CHAMAR onSave COM DADOS ATUALIZADOS DO SERVIDOR
      if (onSave) {
        onSave(updatedCliente);
      }

      showToast("✅ Cliente atualizado com sucesso!", "success");
      
      setTimeout(() => {
        onClose();
        setUploadProgress(0);
      }, 2000);

    } catch (error) {
      console.error("❌ Erro ao atualizar cliente:", error);
      
      let errorMessage = "Erro ao atualizar cliente. Tente novamente.";
      
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = "Erro de conexão. Verifique sua internet.";
      } else {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }, [isValid, showToast, cliente?.id, formData, onSave, onClose]);

  // ✅ RENDERIZAÇÃO DOS STEPS MEMOIZADA
  const renderStep = useMemo(() => {
    if (currentStep === 1) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="Nome Completo" 
              value={formData.nome} 
              onChange={v => handleInputChange("nome", v)} 
              icon={FaUser} 
              required 
            />
            <Input 
              label="Email" 
              value={formData.email} 
              onChange={v => handleInputChange("email", v)} 
              icon={FaEnvelope} 
              type="email"
              required 
            />
            {/* Dropdown de usuário responsável (apenas admin/correspondente) */}
            {hasRole && (hasRole('administrador') || hasRole('correspondente')) && usuarios && usuarios.length > 0 && (
              <Select
                label="Usuário Responsável"
                value={formData.userId ? String(formData.userId) : ""}
                onChange={v => handleInputChange("userId", v)}
                options={usuarios.map(u => ({
                  value: String(u.id),
                  label: `${u.displayName} (${u.role})`,
                }))}
                icon={FaUser}
                required={false}
              />
            )}
            <Input 
              label="Telefone" 
              value={formData.telefone} 
              onChange={v => handleInputChange("telefone", v)} 
              icon={FaPhone} 
            />
            <Input 
              label="CPF" 
              value={formData.cpf} 
              onChange={v => handleInputChange("cpf", v)} 
              icon={FaIdCard} 
              required 
            />
            <Input 
              label="Data de Nascimento" 
              value={formData.dataNascimento} 
              onChange={v => handleInputChange("dataNascimento", v)} 
              icon={FaCalendarAlt} 
              type="date" 
            />
            <Select 
              label="Estado Civil" 
              value={formData.estadoCivil} 
              onChange={v => handleInputChange("estadoCivil", v)} 
              options={ESTADO_CIVIL_OPTIONS}
              icon={FaHeart}
            />
            <Input 
              label="Naturalidade" 
              value={formData.naturalidade} 
              onChange={v => handleInputChange("naturalidade", v)} 
              icon={FaMapMarkerAlt} 
            />
            <Input 
              label="Número PIS" 
              value={formData.numeroPis} 
              onChange={v => handleInputChange("numeroPis", v)} 
              icon={FaIdCard} 
            />
          </div>

          {/* ✅ ADICIONAR CAMPO DE STATUS */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
              <FaEdit className="w-5 h-5" />
              Status do Cliente
              {/* Exibir indicador se o usuário não pode editar */}
              {!hasRole('administrador') && !hasRole('correspondente') && (
                <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                  Somente Leitura
                </span>
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <Select 
                label="Status" 
                value={formData.status} 
                onChange={v => handleInputChange("status", v)} 
                options={STATUS_OPTIONS}
                icon={FaEdit}
                required
                disabled={!hasRole('administrador') && !hasRole('correspondente')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Checkbox 
              label="Possui dependente" 
              checked={formData.possuiDependente} 
              onChange={v => handleInputChange("possuiDependente", v)}
              icon={FaUsers}
            />
            <Checkbox 
              label="Carteira há mais de 3 anos" 
              checked={formData.possuiCarteiraMaisTresAnos} 
              onChange={v => handleInputChange("possuiCarteiraMaisTresAnos", v)}
              icon={FaCheckCircle}
            />
            <Checkbox 
              label="Possui Cônjuge" 
              checked={formData.possuiConjuge} 
              onChange={v => handleInputChange("possuiConjuge", v)}
              icon={FaUser}
            />
            <Checkbox 
              label="Possui Fiador" 
              checked={formData.possuiFiador} 
              onChange={v => handleInputChange("possuiFiador", v)}
              icon={FaUser}
            />
            <Checkbox 
              label="Possui Formulários Caixa" 
              checked={formData.possuiFormulariosCaixa} 
              onChange={v => handleInputChange("possuiFormulariosCaixa", v)}
              icon={FaFileAlt}
            />
          </div>
          {/* Seção do Cônjuge */}
          {formData.possuiConjuge && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-6 mt-6"
            >
              <h3 className="text-lg font-bold text-pink-700 mb-4 flex items-center gap-2">
                <FaUser className="w-5 h-5" />
                Dados do Cônjuge
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  label="Nome do Cônjuge" 
                  value={formData.conjuge_nome} 
                  onChange={v => handleInputChange("conjuge_nome", v)} 
                  icon={FaUser} 
                  required={formData.possuiConjuge}
                />
                <Input 
                  label="Email do Cônjuge" 
                  value={formData.conjuge_email} 
                  onChange={v => handleInputChange("conjuge_email", v)} 
                  icon={FaEnvelope} 
                  type="email"
                />
                <Input 
                  label="Telefone do Cônjuge" 
                  value={formData.conjuge_telefone} 
                  onChange={v => handleInputChange("conjuge_telefone", v)} 
                  icon={FaPhone} 
                />
                <Input 
                  label="CPF do Cônjuge" 
                  value={formData.conjuge_cpf} 
                  onChange={v => handleInputChange("conjuge_cpf", v)} 
                  icon={FaIdCard} 
                  required={formData.possuiConjuge}
                />
                <Input 
                  label="Data de Nascimento do Cônjuge" 
                  value={formData.conjuge_dataNascimento} 
                  onChange={v => handleInputChange("conjuge_dataNascimento", v)} 
                  icon={FaCalendarAlt} 
                  type="date" 
                />
                <Input 
                  label="Profissão do Cônjuge" 
                  value={formData.conjuge_profissao} 
                  onChange={v => handleInputChange("conjuge_profissao", v)} 
                  icon={FaBriefcase} 
                />
                <Input 
                  label="Naturalidade do Cônjuge" 
                  value={formData.conjuge_naturalidade} 
                  onChange={v => handleInputChange("conjuge_naturalidade", v)} 
                  icon={FaMapMarkerAlt} 
                />
                <Input 
                  label="Número PIS do Cônjuge" 
                  value={formData.conjuge_numeroPis} 
                  onChange={v => handleInputChange("conjuge_numeroPis", v)} 
                  icon={FaIdCard} 
                />
                <Input 
                  label="Valor da Renda do Cônjuge" 
                  value={formData.conjuge_valorRenda} 
                  onChange={v => handleInputChange("conjuge_valorRenda", v)} 
                  icon={FaDollarSign} 
                  type="number"
                  placeholder="Ex: 5000.00"
                />
                <Select 
                  label="Tipo de Renda do Cônjuge" 
                  value={formData.conjuge_rendaTipo} 
                  onChange={v => handleInputChange("conjuge_rendaTipo", v)} 
                  options={RENDA_TIPO_OPTIONS}
                  icon={MdWork}
                />
                <Input 
                  label="Data de Admissão do Cônjuge" 
                  value={formData.conjuge_dataAdmissao} 
                  onChange={v => handleInputChange("conjuge_dataAdmissao", v)} 
                  icon={FaCalendarAlt} 
                  type="date" 
                />
              </div>
            </motion.div>
          )}
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="Profissão" 
              value={formData.profissao} 
              onChange={v => handleInputChange("profissao", v)} 
              icon={FaBriefcase} 
            />
            <Input 
              label="Data de Admissão" 
              value={formData.dataAdmissao} 
              onChange={v => handleInputChange("dataAdmissao", v)} 
              icon={FaCalendarAlt} 
              type="date" 
            />
            <Input 
              label="Valor da Renda" 
              value={formData.valorRenda} 
              onChange={v => handleInputChange("valorRenda", v)} 
              icon={FaDollarSign} 
              type="number"
              placeholder="Ex: 5000.00"
            />
            <Select 
              label="Tipo de Renda" 
              value={formData.rendaTipo} 
              onChange={v => handleInputChange("rendaTipo", v)} 
              options={RENDA_TIPO_OPTIONS}
              icon={MdWork}
            />
          </div>
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className="space-y-6">
          {/* Documentos Principais */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-caixa-primary flex items-center gap-2">
              <FaFileAlt className="w-5 h-5 text-caixa-orange" />
              Documentos Principais
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(FILE_TYPES)
                .filter(([field]) => !["fiador_documentos", "formularios_caixa", "tela_aprovacao"].includes(field))
                .map(([field, config]) => (
                  <FileUpload 
                    key={field} 
                    field={field} 
                    config={config} 
                    files={formData[field] || []} 
                    onChange={handleFileChange} 
                    onRemove={removeFile} 
                    formData={formData}
                    getDocumentUrl={getDocumentUrl}
                    isDragging={isDragging}
                    setIsDragging={setIsDragging}
                  />
                ))}
            </div>
          </div>

          {/* Tela de Aprovação */}
          {(hasRole && (hasRole('administrador') || hasRole('correspondente'))) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-bold text-green-700 flex items-center gap-2">
                <FaEye className="w-5 h-5" />
                Tela de Aprovação
              </h3>
              <FileUpload 
                field="tela_aprovacao" 
                config={FILE_TYPES.tela_aprovacao} 
                files={formData.tela_aprovacao || []} 
                onChange={handleFileChange} 
                onRemove={removeFile} 
                formData={formData}
                getDocumentUrl={getDocumentUrl}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
              />
            </motion.div>
          )}

          {/* Documentos do Fiador */}
          {formData.possuiFiador && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-bold text-cyan-700 flex items-center gap-2">
                <FaUser className="w-5 h-5" />
                Documentos do Fiador
              </h3>
              <FileUpload 
                field="fiador_documentos" 
                config={FILE_TYPES.fiador_documentos} 
                files={formData.fiador_documentos || []} 
                onChange={handleFileChange} 
                onRemove={removeFile} 
                formData={formData}
                getDocumentUrl={getDocumentUrl}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
              />
            </motion.div>
          )}

          {/* Formulários Caixa */}
          {formData.possuiFormulariosCaixa && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-bold text-orange-700 flex items-center gap-2">
                <FaFileAlt className="w-5 h-5" />
                Formulários Caixa
              </h3>
              <FileUpload 
                field="formularios_caixa" 
                config={FILE_TYPES.formularios_caixa} 
                files={formData.formularios_caixa || []} 
                onChange={handleFileChange} 
                onRemove={removeFile} 
                formData={formData}
                getDocumentUrl={getDocumentUrl}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
              />
            </motion.div>
          )}
        </div>
      );
    }

    return null;
  }, [currentStep, formData, handleInputChange, handleFileChange, removeFile, getDocumentUrl, isDragging, usuarios]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={closeToast}
        duration={4000}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden border border-gray-200"
        >
          {/* ✅ HEADER MODERNO */}
          <div className="bg-gradient-to-r from-caixa-primary to-caixa-secondary px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <FaEdit className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Editar Cliente</h2>
                  <p className="text-white/80">{cliente?.nome || "Cliente"}</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
              >
                <FaTimes className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </div>

          {/* ✅ STEPS MODERNOS */}
          <div className="bg-gray-50 px-8 py-4 border-b border-gray-200">
            <div className="flex items-center justify-center gap-4">
              {STEPS.map((step, idx) => (
                <React.Fragment key={step.id}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                      currentStep === step.id
                        ? `bg-gradient-to-r ${step.color} text-white shadow-lg shadow-blue-500/25`
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    }`}
                    onClick={() => setCurrentStep(step.id)}
                  >
                    <step.icon className="w-4 h-4" />
                    <span>{step.title}</span>
                    {currentStep === step.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 bg-white rounded-full"
                      />
                    )}
                  </motion.button>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-8 h-1 rounded-full transition-all duration-300 ${
                      currentStep > step.id ? 'bg-green-400' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ✅ PROGRESS BAR DURANTE UPLOAD */}
          {loading && uploadProgress > 0 && (
            <div className="px-8 py-4 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center gap-3 text-blue-700 mb-2">
                <FaSpinner className="w-5 h-5 animate-spin" />
                <span className="font-medium">Enviando arquivos... {uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* ✅ CONTEÚDO */}
          <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep}
            </motion.div>
          </div>

          {/* ✅ FOOTER MODERNO */}
          <div className="bg-white px-8 py-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentStep > 1 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    disabled={loading}
                  >
                    <FaArrowLeft className="w-4 h-4" />
                    Anterior
                  </motion.button>
                )}
                {currentStep < STEPS.length && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-6 py-3 bg-caixa-primary hover:bg-caixa-primary-dark text-white rounded-xl font-medium transition-colors"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    disabled={loading}
                  >
                    Próximo
                    <FaArrowRight className="w-4 h-4" />
                  </motion.button>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-3 px-8 py-3 rounded-xl font-semibold transition-all shadow-lg ${
                  isValid && !loading
                    ? 'bg-gradient-to-r from-caixa-orange to-caixa-orange-light hover:from-caixa-orange-dark hover:to-caixa-orange text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                onClick={handleSave}
                disabled={!isValid || loading}
                type="button"
              >
                {loading ? (
                  <>
                    <FaSpinner className="w-5 h-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <FaSave className="w-5 h-5" />
                    Salvar Cliente
                  </>
                )}
              </motion.button>
            </div>

            {/* Indicador de campos obrigatórios */}
            {!isValid && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2"
              >
                <FaExclamationTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700">
                  Preencha os campos obrigatórios: Nome, Email, CPF e Status
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

function isFileObjectSafe(obj) {
  return obj && typeof obj === "object" && "name" in obj && "size" in obj && "type" in obj;
}

export default ModalEditarCliente;