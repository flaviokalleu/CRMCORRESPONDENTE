import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Save, 
  Upload, 
  Trash2,
  Home,
  Building2,
  CalendarDays,
  DollarSign,
  MapPin,
  FileText,
  User
} from 'lucide-react';
import { toast } from 'react-toastify';
import generateStableKey from '../utils/generateStableKey';

const ModalLaudo = ({ isOpen, onClose, laudo, modoEdicao, onSalvar }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    parceiro: '',
    tipo_imovel: 'casa',
    valor_solicitado: '',
    valor_liberado: '',
    vencimento: '',
    endereco: '',
    observacoes: ''
  });
  const [arquivos, setArquivos] = useState({});
  const [arquivosExistentes, setArquivosExistentes] = useState({});

  // Inicializar formulário
  useEffect(() => {
    if (modoEdicao && laudo) {
      setFormData({
        parceiro: laudo.parceiro || '',
        tipo_imovel: laudo.tipo_imovel || 'casa',
        valor_solicitado: laudo.valor_solicitado || '',
        valor_liberado: laudo.valor_liberado || '',
        vencimento: laudo.vencimento ? new Date(laudo.vencimento).toISOString().split('T')[0] : '',
        endereco: laudo.endereco || '',
        observacoes: laudo.observacoes || ''
      });
      setArquivosExistentes(laudo.arquivos || {});
    } else {
      setFormData({
        parceiro: '',
        tipo_imovel: 'casa',
        valor_solicitado: '',
        valor_liberado: '',
        vencimento: '',
        endereco: '',
        observacoes: ''
      });
      setArquivosExistentes({});
    }
    setArquivos({});
  }, [laudo, modoEdicao, isOpen]);

  // Validar formulário
  const validarFormulario = () => {
    const erros = [];
    
    if (!formData.parceiro.trim()) erros.push('Parceiro é obrigatório');
    if (!formData.valor_solicitado || parseFloat(formData.valor_solicitado) <= 0) {
      erros.push('Valor solicitado deve ser maior que zero');
    }
    if (!formData.vencimento) erros.push('Data de vencimento é obrigatória');
    if (!formData.endereco.trim()) erros.push('Endereço é obrigatório');
    
    if (formData.valor_liberado && parseFloat(formData.valor_liberado) < 0) {
      erros.push('Valor liberado deve ser positivo');
    }

    const hoje = new Date();
    const vencimento = new Date(formData.vencimento);
    if (vencimento <= hoje) {
      erros.push('Data de vencimento deve ser futura');
    }

    if (erros.length > 0) {
      toast.error(erros.join(', '));
      return false;
    }
    
    return true;
  };

  // Salvar laudo
  const handleSalvar = async () => {
    if (!validarFormulario()) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const formDataToSend = new FormData();
      
      // Adicionar dados do formulário
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '') {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Adicionar arquivos
      Object.keys(arquivos).forEach(categoria => {
        if (arquivos[categoria] && arquivos[categoria].length > 0) {
          arquivos[categoria].forEach(arquivo => {
            formDataToSend.append(categoria, arquivo);
          });
        }
      });

      // ✅ CORREÇÃO: URL corrigida removendo duplicação
      const url = modoEdicao 
        ? `${process.env.REACT_APP_API_URL}/laudos/${laudo.id}`
        : `${process.env.REACT_APP_API_URL}/laudos`;
      
      const method = modoEdicao ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        // Verificar se é HTML (página de erro 404)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error(`Erro ${response.status}: Rota não encontrada`);
        }
        
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success(modoEdicao ? 'Laudo atualizado com sucesso!' : 'Laudo criado com sucesso!');
        onSalvar(data.data);
        onClose();
      } else {
        throw new Error(data.message || 'Erro ao salvar laudo');
      }
    } catch (error) {
      console.error('Erro ao salvar laudo:', error);
      toast.error(`Erro ao salvar laudo: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Manipular arquivos
  const handleArquivoChange = (categoria, files) => {
    setArquivos(prev => ({
      ...prev,
      [categoria]: Array.from(files)
    }));
  };

  const removerArquivo = (categoria, index) => {
    setArquivos(prev => ({
      ...prev,
      [categoria]: prev[categoria].filter((_, i) => i !== index)
    }));
  };

  const removerArquivoExistente = (categoria) => {
    setArquivosExistentes(prev => {
      const novo = { ...prev };
      delete novo[categoria];
      return novo;
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-caixa-primary/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-caixa-primary/20"
        >
          {/* Header */}
          <div className="bg-caixa-primary p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {modoEdicao ? 'Editar Laudo' : 'Novo Laudo'}
                </h2>
                <p className="text-white/80 mt-1">
                  {modoEdicao ? 'Atualize as informações do laudo' : 'Preencha os dados para criar um novo laudo'}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna 1 - Informações básicas */}
              <div className="space-y-6">
                {/* Parceiro */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                    <User className="w-4 h-4 text-caixa-orange" />
                    Parceiro *
                  </label>
                  <input
                    type="text"
                    value={formData.parceiro}
                    onChange={(e) => setFormData({ ...formData, parceiro: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                    placeholder="Nome do parceiro/empresa"
                    required
                  />
                </div>

                {/* Tipo de Imóvel */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                    <Home className="w-4 h-4 text-caixa-orange" />
                    Tipo de Imóvel *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 p-3 border-2 border-caixa-primary/30 rounded-xl cursor-pointer hover:bg-caixa-primary/5 transition-colors">
                      <input
                        type="radio"
                        name="tipo_imovel"
                        value="casa"
                        checked={formData.tipo_imovel === 'casa'}
                        onChange={(e) => setFormData({ ...formData, tipo_imovel: e.target.value })}
                        className="text-caixa-primary focus:ring-caixa-primary"
                      />
                      <Home className="w-4 h-4 text-caixa-orange" />
                      <span className="text-caixa-primary font-medium">Casa</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 border-2 border-caixa-primary/30 rounded-xl cursor-pointer hover:bg-caixa-primary/5 transition-colors">
                      <input
                        type="radio"
                        name="tipo_imovel"
                        value="apartamento"
                        checked={formData.tipo_imovel === 'apartamento'}
                        onChange={(e) => setFormData({ ...formData, tipo_imovel: e.target.value })}
                        className="text-caixa-primary focus:ring-caixa-primary"
                      />
                      <Building2 className="w-4 h-4 text-caixa-orange" />
                      <span className="text-caixa-primary font-medium">Apartamento</span>
                    </label>
                  </div>
                </div>

                {/* Valores */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                      <DollarSign className="w-4 h-4 text-caixa-orange" />
                      Valor Solicitado *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor_solicitado}
                      onChange={(e) => setFormData({ ...formData, valor_solicitado: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                      <DollarSign className="w-4 h-4 text-caixa-orange" />
                      Valor Liberado
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor_liberado}
                      onChange={(e) => setFormData({ ...formData, valor_liberado: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {/* Vencimento */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                    <CalendarDays className="w-4 h-4 text-caixa-orange" />
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    value={formData.vencimento}
                    onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Coluna 2 - Endereço, observações e arquivos */}
              <div className="space-y-6">
                {/* Endereço */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                    <MapPin className="w-4 h-4 text-caixa-orange" />
                    Endereço *
                  </label>
                  <textarea
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200 resize-none"
                    rows="3"
                    placeholder="Endereço completo do imóvel"
                    required
                  />
                </div>

                {/* Observações */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                    <FileText className="w-4 h-4 text-caixa-orange" />
                    Observações
                  </label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200 resize-none"
                    rows="4"
                    placeholder="Observações adicionais sobre o laudo"
                  />
                </div>

                {/* Upload de Arquivos */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-4">
                    <Upload className="w-4 h-4 text-caixa-orange" />
                    Arquivos
                  </label>
                  
                  {/* Arquivos existentes */}
                  {Object.keys(arquivosExistentes).length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-caixa-primary mb-2">Arquivos atuais:</h4>
                      {Object.entries(arquivosExistentes).map(([categoria, arquivos]) => (
                        <div key={categoria} className="mb-2">
                          <div className="flex items-center justify-between p-3 bg-caixa-primary/5 rounded-xl border border-caixa-primary/20">
                            <span className="text-sm text-caixa-primary font-medium">
                              {categoria}: {arquivos.length} arquivo(s)
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              type="button"
                              onClick={() => removerArquivoExistente(categoria)}
                              className="text-caixa-orange hover:text-caixa-orange/80 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload de novos arquivos */}
                  <div className="space-y-3">
                    {['laudo', 'documentos', 'fotos'].map((categoria) => (
                      <div key={categoria}>
                        <label className="block text-xs font-medium text-caixa-primary mb-1 capitalize">
                          {categoria}
                        </label>
                        <input
                          type="file"
                          multiple
                          onChange={(e) => handleArquivoChange(categoria, e.target.files)}
                          className="w-full px-3 py-2 border-2 border-caixa-primary/30 rounded-xl text-sm focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        />
                        {arquivos[categoria] && arquivos[categoria].length > 0 && (
                          <div className="mt-2 space-y-1">
                            {arquivos[categoria].map((arquivo, index) => (
                              <div key={generateStableKey('arquivo', arquivo, index)} className="flex items-center justify-between p-2 bg-caixa-orange/10 rounded-xl border border-caixa-orange/20">
                                <span className="text-sm text-caixa-orange font-medium truncate">
                                  {arquivo.name}
                                </span>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  type="button"
                                  onClick={() => removerArquivo(categoria, index)}
                                  className="text-caixa-orange hover:text-caixa-orange/80 ml-2"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </motion.button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-caixa-primary/5 px-6 py-4 flex items-center justify-between border-t border-caixa-primary/20">
            <p className="text-sm text-caixa-primary">
              * Campos obrigatórios
            </p>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2 border-2 border-caixa-primary text-caixa-primary rounded-xl hover:bg-caixa-primary/5 transition-colors disabled:opacity-50 font-medium"
              >
                Cancelar
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSalvar}
                disabled={loading}
                className="px-6 py-2 bg-caixa-orange text-white rounded-xl hover:bg-caixa-orange/90 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 font-medium shadow-lg"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {loading ? 'Salvando...' : 'Salvar'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModalLaudo;