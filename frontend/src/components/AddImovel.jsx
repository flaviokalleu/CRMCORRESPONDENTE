import React, { useState, useRef } from "react";
import generateStableKey from 'utils/generateStableKey';
import axios from "axios";
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, MapPin, Bed, Bath, Tag, DollarSign, FileText, Camera, Upload, 
  Loader2, Save, Trash2, CheckCircle, AlertTriangle, Building, Plus, X,
  Eye, EyeOff, ImageIcon, Paperclip
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Componente de Input melhorado
const InputField = ({
  label,
  name,
  type = 'text',
  icon: Icon,
  required = false,
  placeholder,
  value,
  onChange,
  error,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
        <Icon className="w-4 h-4 text-caixa-orange" />
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children || (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 ${
            error 
              ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-200 focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary hover:border-gray-300'
          } ${className}`}
          {...props}
        />
      )}
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500 text-sm flex items-center gap-1"
        >
          <AlertTriangle className="h-3 w-3" />
          {error}
        </motion.p>
      )}
    </div>
  );
};

// Componente de Tags personalizáveis
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

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const toggleTag = (tag) => {
    if (tags.includes(tag)) {
      removeTag(tag);
    } else {
      setTags([...tags, tag]);
    }
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
        <Tag className="w-4 h-4 text-caixa-orange" />
        Tags do Imóvel
      </label>

      {/* Tags selecionadas */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
          {tags.map((tag, index) => (
            <motion.span
              key={generateStableKey(tag, index)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-1 px-3 py-1 bg-caixa-primary text-white text-sm rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </div>
      )}

      {/* Tags predefinidas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {predefinedTags.map((tag) => (
          <motion.button
            key={tag}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggleTag(tag)}
            className={`px-3 py-2 text-sm rounded-lg border-2 transition-all duration-200 ${
              tags.includes(tag)
                ? 'bg-caixa-primary text-white border-caixa-primary'
                : 'bg-white text-gray-700 border-gray-200 hover:border-caixa-primary/50 hover:bg-gray-50'
            }`}
          >
            {tag}
          </motion.button>
        ))}
      </div>

      {/* Botão para adicionar tag personalizada */}
      <div className="flex gap-2">
        <AnimatePresence>
          {showCustomInput ? (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="flex gap-2 flex-1"
            >
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Digite uma tag personalizada"
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary"
                onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                autoFocus
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="px-4 py-2 bg-caixa-primary text-white rounded-lg hover:bg-caixa-secondary transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomTag('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              type="button"
              onClick={() => setShowCustomInput(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-caixa-orange to-caixa-orange-light text-white rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Adicionar Tag Personalizada
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Componente de Upload de arquivos melhorado
const FileUploadField = ({ label, accept, onChange, multiple = false, icon: Icon, value }) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onChange({ target: { files: multiple ? files : [files[0]] } });
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
        <Icon className="w-4 h-4 text-caixa-orange" />
        {label}
      </label>
      
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-300 cursor-pointer ${
          dragOver 
            ? 'border-caixa-primary bg-caixa-primary/5' 
            : 'border-gray-300 hover:border-caixa-primary/50 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="text-center">
          <Icon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-1">
            Clique para selecionar ou arraste arquivos aqui
          </p>
          <p className="text-xs text-gray-400">
            {accept === 'image/*' ? 'PNG, JPG, JPEG até 10MB' : 'PDF até 10MB'}
          </p>
        </div>

        {value && (
          <div className="mt-3 text-xs text-caixa-primary font-medium">
            {multiple && value.length ? `${value.length} arquivo(s) selecionado(s)` : 
             !multiple && value ? '1 arquivo selecionado' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

const AddImovel = () => {
  // Estados do formulário
  const [formData, setFormData] = useState({
    nomeImovel: "",
    descricaoImovel: "",
    endereco: "",
    tipo: "novo",
    quartos: "",
    banheiro: "",
    valorAvaliacao: "",
    valorVenda: "",
    localizacao: "Valparaiso de Goiás - Goiás",
    exclusivo: "não",
    temInquilino: "não",
    situacaoImovel: "",
    observacoes: ""
  });

  const [tags, setTags] = useState([]);
  const [files, setFiles] = useState({
    documentacao: null,
    imagens: [],
    imagemCapa: null
  });

  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const notificationRef = useRef(null);

  // Formatação de moeda
  const formatCurrency = (value) => {
    if (!value) return "";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleCurrencyChange = (field, value) => {
    const numericValue = value.replace(/\D/g, "");
    setFormData(prev => ({
      ...prev,
      [field]: numericValue ? (numericValue / 100).toFixed(2) : ""
    }));
  };

  // Handler genérico para inputs
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Validação do formulário
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nomeImovel.trim()) newErrors.nomeImovel = "Nome do imóvel é obrigatório";
    if (!formData.endereco.trim()) newErrors.endereco = "Endereço é obrigatório";
    if (!formData.quartos) newErrors.quartos = "Número de quartos é obrigatório";
    if (!formData.banheiro) newErrors.banheiro = "Número de banheiros é obrigatório";
    if (!formData.valorVenda) newErrors.valorVenda = "Valor de venda é obrigatório";
    if (!formData.situacaoImovel.trim()) newErrors.situacaoImovel = "Situação do imóvel é obrigatória";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Reset do formulário
  const resetForm = () => {
    setFormData({
      nomeImovel: "",
      descricaoImovel: "",
      endereco: "",
      tipo: "novo",
      quartos: "",
      banheiro: "",
      valorAvaliacao: "",
      valorVenda: "",
      localizacao: "Valparaiso de Goiás - Goiás",
      exclusivo: "não",
      temInquilino: "não",
      situacaoImovel: "",
      observacoes: ""
    });
    setTags([]);
    setFiles({
      documentacao: null,
      imagens: [],
      imagemCapa: null
    });
    setMessage({ type: '', text: '' });
    setErrors({});
  };

  // Submit do formulário
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      setMessage({
        type: 'error',
        text: 'Por favor, corrija os erros no formulário antes de continuar.'
      });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    const submitData = new FormData();
    
    // Adicionar dados do formulário
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'nomeImovel') submitData.append('nome_imovel', value);
      else if (key === 'descricaoImovel') submitData.append('descricao_imovel', value);
      else if (key === 'valorAvaliacao') submitData.append('valor_avaliacao', value);
      else if (key === 'valorVenda') submitData.append('valor_venda', value);
      else if (key === 'temInquilino') submitData.append('tem_inquilino', value);
      else if (key === 'situacaoImovel') submitData.append('situacao_imovel', value);
      else submitData.append(key, value);
    });

    // Adicionar tags
    submitData.append("tags", tags.join(", "));

    // Adicionar arquivos
    if (files.documentacao) {
      submitData.append("documentacao", files.documentacao);
    }
    
    files.imagens.forEach((imagem) => {
      submitData.append("imagens", imagem);
    });
    
    if (files.imagemCapa) {
      submitData.append("imagem_capa", files.imagemCapa);
    }

    try {
      await axios.post(`${API_URL}/imoveis`, submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      setMessage({
        type: 'success',
        text: 'Imóvel cadastrado com sucesso!'
      });
      
      setTimeout(() => {
        resetForm();
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao cadastrar imóvel:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Erro ao cadastrar imóvel. Tente novamente.'
      });
    } finally {
      setLoading(false);
      if (notificationRef.current) {
        notificationRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-caixa-primary">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Header melhorado */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 mb-4">
            <Home className="w-8 h-8 text-caixa-orange" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Cadastro de Imóvel
            </h1>
          </div>
          <p className="text-white/90 text-lg max-w-2xl mx-auto">
            Preencha as informações abaixo para cadastrar um novo imóvel no sistema
          </p>
        </motion.div>

        {/* Formulário principal */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            
            {/* Seção 1: Informações Básicas */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Building className="w-5 h-5 text-caixa-orange" />
                Informações Básicas
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <InputField
                    label="Nome do Imóvel"
                    name="nomeImovel"
                    icon={Home}
                    required
                    placeholder="Ex: Residencial Jardim Europa"
                    value={formData.nomeImovel}
                    onChange={(e) => handleInputChange('nomeImovel', e.target.value)}
                    error={errors.nomeImovel}
                  />
                </div>

                <InputField
                  label="Tipo"
                  name="tipo"
                  icon={Building}
                  required
                  value={formData.tipo}
                  onChange={(e) => handleInputChange('tipo', e.target.value)}
                >
                  <select
                    value={formData.tipo}
                    onChange={(e) => handleInputChange('tipo', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-300"
                    required
                  >
                    <option value="novo">Novo</option>
                    <option value="usado">Usado</option>
                    <option value="agio">Ágio</option>
                  </select>
                </InputField>
              </div>

              <div className="mt-6">
                <InputField
                  label="Descrição do Imóvel"
                  name="descricaoImovel"
                  icon={FileText}
                  value={formData.descricaoImovel}
                  onChange={(e) => handleInputChange('descricaoImovel', e.target.value)}
                >
                  <textarea
                    value={formData.descricaoImovel}
                    onChange={(e) => handleInputChange('descricaoImovel', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-300 resize-none"
                    rows="4"
                    placeholder="Descreva detalhes, diferenciais e características do imóvel..."
                  />
                </InputField>
              </div>
            </div>

            {/* Seção 2: Localização */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-caixa-orange" />
                Localização
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="Endereço"
                  name="endereco"
                  icon={MapPin}
                  required
                  placeholder="Rua, número, bairro"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  error={errors.endereco}
                />

                <InputField
                  label="Cidade/Estado"
                  name="localizacao"
                  icon={MapPin}
                  value={formData.localizacao}
                  onChange={(e) => handleInputChange('localizacao', e.target.value)}
                >
                  <select
                    value={formData.localizacao}
                    onChange={(e) => handleInputChange('localizacao', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-300"
                  >
                    <option value="Valparaiso de Goiás - Goiás">Valparaíso de Goiás - Goiás</option>
                    <option value="Cidade Ocidental - Goias">Cidade Ocidental - Goiás</option>
                    <option value="Luziania - Goias">Luziânia - Goiás</option>
                    <option value="Jardim Inga - Goias">Jardim Ingá - Goiás</option>
                  </select>
                </InputField>
              </div>
            </div>

            {/* Seção 3: Características */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Bed className="w-5 h-5 text-caixa-orange" />
                Características
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <InputField
                  label="Quartos"
                  name="quartos"
                  type="number"
                  icon={Bed}
                  required
                  placeholder="Ex: 3"
                  value={formData.quartos}
                  onChange={(e) => handleInputChange('quartos', e.target.value)}
                  error={errors.quartos}
                />

                <InputField
                  label="Banheiros"
                  name="banheiro"
                  type="number"
                  icon={Bath}
                  required
                  placeholder="Ex: 2"
                  value={formData.banheiro}
                  onChange={(e) => handleInputChange('banheiro', e.target.value)}
                  error={errors.banheiro}
                />

                <InputField
                  label="Valor de Avaliação"
                  name="valorAvaliacao"
                  icon={DollarSign}
                  placeholder="Ex: R$ 350.000,00"
                  value={formatCurrency(formData.valorAvaliacao)}
                  onChange={(e) => handleCurrencyChange('valorAvaliacao', e.target.value)}
                />

                <InputField
                  label="Valor de Venda"
                  name="valorVenda"
                  icon={DollarSign}
                  required
                  placeholder="Ex: R$ 320.000,00"
                  value={formatCurrency(formData.valorVenda)}
                  onChange={(e) => handleCurrencyChange('valorVenda', e.target.value)}
                  error={errors.valorVenda}
                />
              </div>
            </div>

            {/* Seção 4: Tags */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6">
              <TagSelector tags={tags} setTags={setTags} />
            </div>

            {/* Seção 5: Detalhes Adicionais */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-caixa-orange" />
                Detalhes Adicionais
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <InputField
                  label="Situação do Imóvel"
                  name="situacaoImovel"
                  icon={Home}
                  required
                  placeholder="Ex: Pronto para morar"
                  value={formData.situacaoImovel}
                  onChange={(e) => handleInputChange('situacaoImovel', e.target.value)}
                  error={errors.situacaoImovel}
                />

                <InputField
                  label="Exclusivo"
                  name="exclusivo"
                  icon={Tag}
                  value={formData.exclusivo}
                  onChange={(e) => handleInputChange('exclusivo', e.target.value)}
                >
                  <select
                    value={formData.exclusivo}
                    onChange={(e) => handleInputChange('exclusivo', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-300"
                  >
                    <option value="não">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </InputField>

                <InputField
                  label="Tem Inquilino"
                  name="temInquilino"
                  icon={Home}
                  value={formData.temInquilino}
                  onChange={(e) => handleInputChange('temInquilino', e.target.value)}
                >
                  <select
                    value={formData.temInquilino}
                    onChange={(e) => handleInputChange('temInquilino', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-300"
                  >
                    <option value="não">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </InputField>
              </div>

              <div className="mt-6">
                <InputField
                  label="Observações"
                  name="observacoes"
                  icon={FileText}
                  value={formData.observacoes}
                  onChange={(e) => handleInputChange('observacoes', e.target.value)}
                >
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-300 resize-none"
                    rows="3"
                    placeholder="Informações adicionais sobre o imóvel..."
                  />
                </InputField>
              </div>
            </div>

            {/* Seção 6: Upload de Arquivos */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Upload className="w-5 h-5 text-caixa-orange" />
                Documentos e Imagens
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FileUploadField
                  label="Documentação (PDF)"
                  accept=".pdf"
                  icon={Paperclip}
                  onChange={(e) => setFiles(prev => ({ ...prev, documentacao: e.target.files[0] }))}
                  value={files.documentacao}
                />

                <FileUploadField
                  label="Imagens do Imóvel"
                  accept="image/*"
                  multiple
                  icon={ImageIcon}
                  onChange={(e) => setFiles(prev => ({ ...prev, imagens: Array.from(e.target.files) }))}
                  value={files.imagens}
                />

                <FileUploadField
                  label="Imagem de Capa"
                  accept="image/*"
                  icon={Camera}
                  onChange={(e) => setFiles(prev => ({ ...prev, imagemCapa: e.target.files[0] }))}
                  value={files.imagemCapa}
                />
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={resetForm}
                className="flex-1 py-4 px-6 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 border-2 border-gray-300 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Limpar Formulário
              </motion.button>
              
              <motion.button
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                type="submit"
                disabled={loading}
                className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-xl ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gradient-to-r from-caixa-orange to-caixa-orange-light hover:shadow-2xl text-white'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Cadastrar Imóvel
                  </>
                )}
              </motion.button>
            </div>
          </form>

          {/* Mensagens de feedback */}
          <div ref={notificationRef}>
            <AnimatePresence>
              {message.text && (
                <motion.div 
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  className={`mx-8 mb-8 p-6 rounded-xl border-2 flex items-center gap-3 ${
                    message.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle className="h-6 w-6 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 flex-shrink-0" />
                  )}
                  <span className="font-semibold text-lg">{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AddImovel;
