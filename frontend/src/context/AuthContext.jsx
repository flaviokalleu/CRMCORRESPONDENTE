import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const AuthContext = createContext(null); // <-- Adicione/garanta esta linha

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Função para verificar autenticação - MELHORADA
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      setLoading(false);
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/auth/check-auth`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // Timeout de 10 segundos
        }
      );

      if (response.data.authenticated) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        // Atualizar token se necessário
        if (response.data.token && response.data.token !== token) {
          localStorage.setItem('authToken', response.data.token);
        }
        
        return true;
      } else {
        throw new Error('Não autenticado');
      }
    } catch (error) {
      console.error('❌ Erro na verificação de autenticação:', error);
      
      // Se for erro 401 ou 403, limpar dados
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
      }
      
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar autenticação ao carregar e periodicamente
  useEffect(() => {
    // Verificação inicial
    checkAuth();

    // Verificação periódica a cada 5 minutos
    const interval = setInterval(() => {
      checkAuth();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [checkAuth]);

  // Função de login - MELHORADA
  const login = async (credentials) => {
    try {
      setLoading(true);
      const loginData = {
        email: credentials.email?.trim(),
        password: credentials.password
      };

      if (!loginData.email || !loginData.password) {
        throw new Error('Email e senha são obrigatórios');
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/login`,
        loginData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );

      const { token, refreshToken, user: userData } = response.data;

      if (!token || !userData) {
        throw new Error('Resposta inválida do servidor');
      }

      // Salvar tokens
      localStorage.setItem('authToken', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      // Atualizar estado
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('❌ Erro no login:', error);
      
      // Limpar dados em caso de erro
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsAuthenticated(false);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          'Erro ao fazer login';
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Função de logout - MELHORADA
  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        try {
          await axios.post(
            `${process.env.REACT_APP_API_URL}/auth/logout`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 5000
            }
          );
        } catch (error) {
          console.warn('⚠️ Erro ao fazer logout no servidor:', error.message);
        }
      }
    } catch (error) {
      console.error('❌ Erro durante logout:', error);
    } finally {
      // Sempre limpar dados locais
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsAuthenticated(false);
      
    }
  }, []);

  // Função para refresh do token
  const refreshAuth = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('Refresh token não encontrado');
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/refresh-token`,
        { refreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );

      const { token } = response.data;
      localStorage.setItem('authToken', token);
      
      return token;
    } catch (error) {
      console.error('❌ Erro ao renovar token:', error);
      await logout();
      throw error;
    }
  }, [logout]);

  // Interceptor para renovação automática de token
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          isAuthenticated &&
          (!originalRequest._retryCount || originalRequest._retryCount < 1)
        ) {
          originalRequest._retry = true;
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

          try {
            const newToken = await refreshAuth();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            console.error('❌ Falha ao renovar token automaticamente');
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [isAuthenticated, refreshAuth]);

  // Função para verificar se o usuário tem uma role específica
  const hasRole = useCallback((role) => {
    if (!user) return false;
    
    switch (role.toLowerCase()) {
      case 'administrador':
      case 'admin':
        return user.is_administrador;
      case 'correspondente':
        return user.is_correspondente;
      case 'corretor':
        return user.is_corretor;
      default:
        return false;
    }
  }, [user]);

  // Função para obter o tipo do usuário
  const getUserType = useCallback(() => {
    if (!user) return null;
    
    if (user.is_administrador) return 'administrador';
    if (user.is_correspondente) return 'correspondente';
    if (user.is_corretor) return 'corretor';
    return 'user';
  }, [user]);

  // Verificar se está próximo da expiração e avisar
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkExpiration = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      try {
        // Decodificar token para verificar expiração
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expTime = payload.exp * 1000; // Converter para ms
        const now = Date.now();
        const timeLeft = expTime - now;

        // Se restam menos de 10 minutos, tentar renovar
        if (timeLeft < 10 * 60 * 1000 && timeLeft > 0) {
          await refreshAuth();
        }
      } catch (error) {
        console.error('❌ Erro ao verificar expiração:', error);
      }
    };

    // Verificar a cada minuto
    const interval = setInterval(checkExpiration, 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshAuth]);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    checkAuth,
    refreshAuth,
    hasRole,
    getUserType
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
