import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  User, 
  Lock, 
  Palette, 
  Save, 
  Eye, 
  EyeOff,
  Upload,
  RefreshCw,
  Monitor,
  Shield,
  Bell,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Configuracoes = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('perfil');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Estados para dados pessoais
  const [perfilData, setPerfilData] = useState({
    first_name: '',
    last_name: '',
    telefone: '',
    address: ''
  });

  // Estados para alteração de senha
  const [senhaData, setSenhaData] = useState({
    senha_atual: '',
    nova_senha: '',
    confirmar_senha: ''
  });
  
  const [showPasswords, setShowPasswords] = useState({
    atual: false,
    nova: false,
    confirmar: false
  });

  // Estados para configurações do sistema
  const [systemConfig, setSystemConfig] = useState({
    nome_sistema: '',
    cor_primaria: '#003366',
    cor_secundaria: '#ff7b00',
    cor_texto: '#ffffff',
    tema_escuro: true,
    logo_url: ''
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar dados do usuário
      if (user) {
        setPerfilData({
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          telefone: user.telefone || '',
          address: user.address || ''
        });
      }

      // Carregar configurações do sistema
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/config/system`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSystemConfig(data.data);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showMessage('error', 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Salvar dados pessoais
  const salvarPerfil = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/config/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(perfilData)
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', data.message);
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      showMessage('error', error.message || 'Erro ao salvar dados pessoais');
    } finally {
      setLoading(false);
    }
  };

  // Alterar senha
  const alterarSenha = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/config/user/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(senhaData)
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', data.message);
        setSenhaData({
          senha_atual: '',
          nova_senha: '',
          confirmar_senha: ''
        });
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      showMessage('error', error.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  // Salvar configurações do sistema
  const salvarConfigSystem = async (e) => {
    e.preventDefault();
    
    if (!user?.is_administrador) {
      showMessage('error', 'Apenas administradores podem alterar configurações do sistema');
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const formData = new FormData();
      Object.keys(systemConfig).forEach(key => {
        if (systemConfig[key] !== null && systemConfig[key] !== undefined) {
          formData.append(key, systemConfig[key]);
        }
      });
      
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/config/system`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', data.message);
        setSystemConfig(data.data);
        setLogoFile(null);
        setLogoPreview(null);
        
        // Aplicar mudanças de cor em tempo real
        document.documentElement.style.setProperty('--cor-primaria', systemConfig.cor_primaria);
        document.documentElement.style.setProperty('--cor-secundaria', systemConfig.cor_secundaria);
        
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      showMessage('error', error.message || 'Erro ao salvar configurações do sistema');
    } finally {
      setLoading(false);
    }
  };

  // Handle logo upload
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const tabs = [
    { id: 'perfil', label: 'Dados Pessoais', icon: User },
    { id: 'senha', label: 'Alterar Senha', icon: Lock },
    ...(user?.is_administrador ? [
      { id: 'sistema', label: 'Configurações do Sistema', icon: Settings },
      { id: 'aparencia', label: 'Aparência', icon: Palette }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-caixa-gray-900 via-caixa-primary to-caixa-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-caixa-orange to-caixa-orange-light rounded-2xl flex items-center justify-center">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Configurações</h1>
              <p className="text-caixa-extra-light">Personalize sua conta e o sistema</p>
            </div>
          </div>

          {/* Message Alert */}
          <AnimatePresence>
            {message.text && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-xl border-l-4 mb-6 ${
                  message.type === 'success'
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-red-500/20 border-red-500 text-red-400'
                }`}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-caixa-orange text-white shadow-lg'
                          : 'text-caixa-extra-light hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </motion.div>

          {/* Content Area */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3"
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8">
              
              {/* Dados Pessoais */}
              {activeTab === 'perfil' && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <User className="w-6 h-6 text-caixa-orange" />
                    <h2 className="text-2xl font-bold text-white">Dados Pessoais</h2>
                  </div>
                  
                  <form onSubmit={salvarPerfil} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                          Nome
                        </label>
                        <input
                          type="text"
                          value={perfilData.first_name}
                          onChange={(e) => setPerfilData({...perfilData, first_name: e.target.value})}
                          className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                          placeholder="Seu nome"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                          Sobrenome
                        </label>
                        <input
                          type="text"
                          value={perfilData.last_name}
                          onChange={(e) => setPerfilData({...perfilData, last_name: e.target.value})}
                          className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                          placeholder="Seu sobrenome"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Telefone
                      </label>
                      <input
                        type="tel"
                        value={perfilData.telefone}
                        onChange={(e) => setPerfilData({...perfilData, telefone: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Endereço
                      </label>
                      <textarea
                        value={perfilData.address}
                        onChange={(e) => setPerfilData({...perfilData, address: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                        placeholder="Seu endereço completo"
                        rows="3"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-caixa-orange to-caixa-orange-light hover:from-caixa-orange-dark hover:to-caixa-orange text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Save className="w-5 h-5" />
                      )}
                      Salvar Dados
                    </button>
                  </form>
                </div>
              )}

              {/* Alterar Senha */}
              {activeTab === 'senha' && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Lock className="w-6 h-6 text-caixa-orange" />
                    <h2 className="text-2xl font-bold text-white">Alterar Senha</h2>
                  </div>
                  
                  <form onSubmit={alterarSenha} className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Senha Atual
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.atual ? 'text' : 'password'}
                          value={senhaData.senha_atual}
                          onChange={(e) => setSenhaData({...senhaData, senha_atual: e.target.value})}
                          className="w-full px-4 py-3 pr-12 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                          placeholder="Digite sua senha atual"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({...showPasswords, atual: !showPasswords.atual})}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-caixa-extra-light hover:text-white"
                        >
                          {showPasswords.atual ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Nova Senha
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.nova ? 'text' : 'password'}
                          value={senhaData.nova_senha}
                          onChange={(e) => setSenhaData({...senhaData, nova_senha: e.target.value})}
                          className="w-full px-4 py-3 pr-12 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                          placeholder="Digite a nova senha"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({...showPasswords, nova: !showPasswords.nova})}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-caixa-extra-light hover:text-white"
                        >
                          {showPasswords.nova ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Confirmar Nova Senha
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirmar ? 'text' : 'password'}
                          value={senhaData.confirmar_senha}
                          onChange={(e) => setSenhaData({...senhaData, confirmar_senha: e.target.value})}
                          className="w-full px-4 py-3 pr-12 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                          placeholder="Confirme a nova senha"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({...showPasswords, confirmar: !showPasswords.confirmar})}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-caixa-extra-light hover:text-white"
                        >
                          {showPasswords.confirmar ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-caixa-orange to-caixa-orange-light hover:from-caixa-orange-dark hover:to-caixa-orange text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Lock className="w-5 h-5" />
                      )}
                      Alterar Senha
                    </button>
                  </form>
                </div>
              )}

              {/* Configurações do Sistema - Apenas Admin */}
              {activeTab === 'sistema' && user?.is_administrador && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Settings className="w-6 h-6 text-caixa-orange" />
                    <h2 className="text-2xl font-bold text-white">Configurações do Sistema</h2>
                  </div>
                  
                  <form onSubmit={salvarConfigSystem} className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Nome do Sistema
                      </label>
                      <input
                        type="text"
                        value={systemConfig.nome_sistema}
                        onChange={(e) => setSystemConfig({...systemConfig, nome_sistema: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                        placeholder="Nome do sistema"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Logo do Sistema
                      </label>
                      <div className="flex items-center gap-4">
                        {(logoPreview || systemConfig.logo_url) && (
                          <img
                            src={logoPreview || `${process.env.REACT_APP_API_URL}/uploads/system/${systemConfig.logo_url}`}
                            alt="Logo"
                            className="w-16 h-16 object-contain bg-white/10 rounded-lg p-2"
                          />
                        )}
                        <label className="bg-caixa-primary/20 hover:bg-caixa-primary/30 border border-caixa-primary/30 rounded-xl px-4 py-3 cursor-pointer transition-colors flex items-center gap-2">
                          <Upload className="w-5 h-5 text-caixa-light" />
                          <span className="text-caixa-light">Escolher Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-caixa-orange to-caixa-orange-light hover:from-caixa-orange-dark hover:to-caixa-orange text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Save className="w-5 h-5" />
                      )}
                      Salvar Configurações
                    </button>
                  </form>
                </div>
              )}

              {/* Aparência - Apenas Admin */}
              {activeTab === 'aparencia' && user?.is_administrador && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Palette className="w-6 h-6 text-caixa-orange" />
                    <h2 className="text-2xl font-bold text-white">Personalizar Aparência</h2>
                  </div>
                  
                  <form onSubmit={salvarConfigSystem} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                          Cor Primária
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={systemConfig.cor_primaria}
                            onChange={(e) => setSystemConfig({...systemConfig, cor_primaria: e.target.value})}
                            className="w-12 h-12 rounded-lg border-2 border-white/20 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={systemConfig.cor_primaria}
                            onChange={(e) => setSystemConfig({...systemConfig, cor_primaria: e.target.value})}
                            className="flex-1 px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                          Cor Secundária
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={systemConfig.cor_secundaria}
                            onChange={(e) => setSystemConfig({...systemConfig, cor_secundaria: e.target.value})}
                            className="w-12 h-12 rounded-lg border-2 border-white/20 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={systemConfig.cor_secundaria}
                            onChange={(e) => setSystemConfig({...systemConfig, cor_secundaria: e.target.value})}
                            className="flex-1 px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Cor do Texto
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={systemConfig.cor_texto}
                          onChange={(e) => setSystemConfig({...systemConfig, cor_texto: e.target.value})}
                          className="w-12 h-12 rounded-lg border-2 border-white/20 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={systemConfig.cor_texto}
                          onChange={(e) => setSystemConfig({...systemConfig, cor_texto: e.target.value})}
                          className="flex-1 px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                      <div>
                        <label className="text-white font-semibold">Tema Escuro</label>
                        <p className="text-caixa-extra-light text-sm">Ativar modo escuro por padrão</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={systemConfig.tema_escuro}
                          onChange={(e) => setSystemConfig({...systemConfig, tema_escuro: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-caixa-orange"></div>
                      </label>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-caixa-orange to-caixa-orange-light hover:from-caixa-orange-dark hover:to-caixa-orange text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Palette className="w-5 h-5" />
                      )}
                      Aplicar Tema
                    </button>
                  </form>
                </div>
              )}

            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;