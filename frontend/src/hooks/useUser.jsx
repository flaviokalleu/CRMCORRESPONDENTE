import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const useUser = () => {
    const [user, setUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userRoles, setUserRoles] = useState([]);
    const [primaryRole, setPrimaryRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Função para determinar os papéis do usuário baseado nas flags
    const getUserRoles = useCallback((userData) => {
        const roles = [];
        
        if (userData.is_administrador) roles.push('administrador');
        if (userData.is_corretor) roles.push('corretor');
        if (userData.is_correspondente) roles.push('correspondente');
        
        return roles;
    }, []);

    // Função para determinar o papel primário (prioridade: admin > corretor > correspondente)
    const getPrimaryRole = useCallback((roles) => {
        if (roles.includes('administrador')) return 'administrador';
        if (roles.includes('corretor')) return 'corretor';
        if (roles.includes('correspondente')) return 'correspondente';
        return null;
    }, []);

    // Função para buscar dados do usuário
    const fetchUser = useCallback(async (showRefreshing = false) => {
        try {
            if (showRefreshing) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            
            setError(null);

            // Verificar se existe token
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Token de autenticação não encontrado');
            }

            // Configurar headers de autorização
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            };

            const response = await axios.get(`${process.env.REACT_APP_API_URL}/user/me`, config);
            
            if (response.data && response.data.user) {
                const userData = response.data.user;
                const roles = getUserRoles(userData);
                const primary = getPrimaryRole(roles);

                setUser(userData);
                setUserId(userData.id);
                setUserRoles(roles);
                setPrimaryRole(primary);
            } else {
                throw new Error('Dados do usuário não encontrados na resposta');
            }

        } catch (err) {
            console.error('Erro ao buscar usuário:', err);
            
            // Tratamento específico de erros
            if (err.response) {
                switch (err.response.status) {
                    case 401:
                        setError('Sessão expirada. Faça login novamente.');
                        // Limpar dados de autenticação
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        break;
                    case 403:
                        setError('Acesso negado. Verifique suas permissões.');
                        break;
                    case 404:
                        setError('Usuário não encontrado.');
                        break;
                    case 500:
                        setError('Erro interno do servidor. Tente novamente mais tarde.');
                        break;
                    default:
                        setError('Erro ao buscar informações do usuário.');
                }
            } else if (err.request) {
                setError('Erro de conexão. Verifique sua internet.');
            } else {
                setError(err.message || 'Erro desconhecido.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [getUserRoles, getPrimaryRole]);

    // Função para atualizar dados do usuário
    const updateUser = useCallback(async (userData) => {
        try {
            setRefreshing(true);
            setError(null);

            const token = localStorage.getItem('token');
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };

            const response = await axios.put(
                `${process.env.REACT_APP_API_URL}/user/profile`, 
                userData, 
                config
            );

            if (response.data && response.data.user) {
                const updatedUser = response.data.user;
                const roles = getUserRoles(updatedUser);
                const primary = getPrimaryRole(roles);

                setUser(updatedUser);
                setUserRoles(roles);
                setPrimaryRole(primary);

                return { success: true, user: updatedUser };
            }

        } catch (err) {
            console.error('Erro ao atualizar usuário:', err);
            const errorMessage = err.response?.data?.message || 'Erro ao atualizar perfil';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setRefreshing(false);
        }
    }, [getUserRoles, getPrimaryRole]);

    // Função para refresh manual
    const refreshUser = useCallback(() => {
        fetchUser(true);
    }, [fetchUser]);

    // Função para verificar se o usuário tem um papel específico
    const hasRole = useCallback((role) => {
        return userRoles.includes(role);
    }, [userRoles]);

    // Função para verificar se o usuário tem múltiplos papéis
    const hasMultipleRoles = useCallback(() => {
        return userRoles.length > 1;
    }, [userRoles]);

    // Função para verificar se o usuário tem permissões
    const hasPermission = useCallback((permission) => {
        switch (permission) {
            case 'admin':
                return hasRole('administrador');
            case 'manage_properties':
                return hasRole('administrador') || hasRole('corretor');
            case 'manage_clients':
                return hasRole('administrador') || hasRole('corretor') || hasRole('correspondente');
            case 'view_reports':
                return hasRole('administrador') || hasRole('corretor');
            default:
                return false;
        }
    }, [hasRole]);

    // Função para logout
    const logout = useCallback(() => {
        setUser(null);
        setUserId(null);
        setUserRoles([]);
        setPrimaryRole(null);
        setError(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }, []);

    // Effect inicial
    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    // Função para obter o nome completo do usuário
    const getFullName = useCallback(() => {
        if (!user) return '';
        return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }, [user]);

    // Função para obter a inicial do usuário
    const getUserInitials = useCallback(() => {
        if (!user) return '';
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }, [user]);

    return {
        // Dados do usuário
        user,
        userId,
        userRoles,
        primaryRole,
        
        // Estados de carregamento
        loading,
        error,
        refreshing,
        
        // Funções de ação
        fetchUser,
        updateUser,
        refreshUser,
        logout,
        
        // Funções de verificação
        hasRole,
        hasMultipleRoles,
        hasPermission,
        
        // Funções utilitárias
        getFullName,
        getUserInitials,
        
        // Dados derivados (para compatibilidade)
        userType: primaryRole, // Mantido para compatibilidade com código existente
        isAuthenticated: !!user,
        isAdmin: hasRole('administrador'),
        isCorretor: hasRole('corretor'),
        isCorrespondente: hasRole('correspondente')
    };
};

export default useUser;
