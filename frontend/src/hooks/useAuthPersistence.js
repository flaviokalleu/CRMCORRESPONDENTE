import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const useAuthPersistence = () => {
  const { checkAuth, isAuthenticated, user } = useAuth();

  useEffect(() => {
    // Verificar autenticação quando a aba ganhar foco
    const handleFocus = () => {
      console.log('👁️ Aba ganhou foco, verificando autenticação...');
      checkAuth();
    };

    // Verificar autenticação quando sair do modo offline
    const handleOnline = () => {
      console.log('🌐 Voltou online, verificando autenticação...');
      checkAuth();
    };

    // Salvar estado do usuário no sessionStorage como backup
    const saveUserState = () => {
      if (isAuthenticated && user) {
        sessionStorage.setItem('userBackup', JSON.stringify({
          user,
          timestamp: Date.now()
        }));
      } else {
        sessionStorage.removeItem('userBackup');
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    // Salvar estado quando mudar
    saveUserState();

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [checkAuth, isAuthenticated, user]);

  // Recuperar estado se necessário
  useEffect(() => {
    if (!isAuthenticated && !user) {
      const backup = sessionStorage.getItem('userBackup');
      if (backup) {
        try {
          const { timestamp } = JSON.parse(backup);
          // Se o backup é muito antigo (mais de 1 hora), ignorar
          if (Date.now() - timestamp > 60 * 60 * 1000) {
            sessionStorage.removeItem('userBackup');
          }
        } catch (error) {
          sessionStorage.removeItem('userBackup');
        }
      }
    }
  }, [isAuthenticated, user]);
};