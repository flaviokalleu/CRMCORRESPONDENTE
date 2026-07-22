import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, ArrowLeftRight, Sparkles, X } from 'lucide-react';

const Chip = ({ children, color = 'default' }) => {
  const colors = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    default: 'bg-gray-200 text-gray-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};

const Alert = ({ severity = 'error', onClose, children }) => {
  const styles = severity === 'error'
    ? 'bg-red-50 text-red-700 border-red-200'
    : severity === 'warning'
      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
      : 'bg-green-50 text-green-700 border-green-200';
  return (
    <div className={`flex items-center justify-between border rounded-md px-3 py-2 mb-4 ${styles}`}>
      <span>{children}</span>
      {onClose && (
        <button onClick={onClose} className="ml-3 opacity-70 hover:opacity-100">
          <X size={16} />
        </button>
      )}
    </div>
  );
};

const Switch = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange({ target: { checked: !checked } })}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const Dialog = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

const WhatsAppSessionManager = () => {
  const [sessions, setSessions] = useState([]);
  const [, setCurrentSession] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados dos diálogos
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSessionId, setNewSessionId] = useState('');
  const [forceCreate, setForceCreate] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [forceDelete, setForceDelete] = useState(false);

  // Carregar lista de sessões
  const loadSessions = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/whatsapp/sessions`);
      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions);
        setCurrentSession(data.currentSession);
      } else {
        setError(data.error || 'Erro ao carregar sessões');
      }
    } catch (error) {
      setError('Erro de conexão: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Criar nova sessão
  const createSession = async () => {
    if (!newSessionId.trim()) {
      setError('ID da sessão é obrigatório');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/whatsapp/session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: newSessionId.trim(),
          forceCreate
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Sessão "${data.sessionId}" criada com sucesso`);
        setCreateDialogOpen(false);
        setNewSessionId('');
        setForceCreate(false);
        loadSessions();
      } else {
        setError(data.error || 'Erro ao criar sessão');
      }
    } catch (error) {
      setError('Erro de conexão: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Deletar sessão
  const deleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/whatsapp/session/${sessionToDelete.id}?force=${forceDelete}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        setSuccess(`Sessão "${data.sessionId}" deletada com sucesso`);
        setDeleteConfirmOpen(false);
        setSessionToDelete(null);
        setForceDelete(false);
        loadSessions();
      } else {
        setError(data.error || 'Erro ao deletar sessão');
      }
    } catch (error) {
      setError('Erro de conexão: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Trocar sessão ativa
  const switchSession = async (sessionId) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/whatsapp/session/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Trocando para sessão "${sessionId}"`);
        loadSessions();
      } else {
        setError(data.error || 'Erro ao trocar sessão');
      }
    } catch (error) {
      setError('Erro de conexão: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Limpar sessões antigas
  const cleanupOldSessions = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/whatsapp/sessions/cleanup`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`${data.deletedCount} sessões antigas removidas`);
        loadSessions();
      } else {
        setError(data.error || 'Erro na limpeza');
      }
    } catch (error) {
      setError('Erro de conexão: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();

    // Atualizar lista a cada 30 segundos
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  // Limpar mensagens após 5 segundos
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const getStatusChip = (session) => {
    if (session.isActive && session.isConnected) {
      return <Chip color="success">Ativa e Conectada</Chip>;
    } else if (session.isActive) {
      return <Chip color="warning">Ativa (Desconectada)</Chip>;
    } else {
      return <Chip color="default">Inativa</Chip>;
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Gerenciador de Sessões WhatsApp</h2>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setCreateDialogOpen(true)}
          disabled={loading}
          className="flex items-center gap-1 px-4 py-2 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Plus size={16} /> Nova Sessão
        </button>

        <button
          onClick={loadSessions}
          disabled={loading}
          className="flex items-center gap-1 px-4 py-2 rounded-md font-medium border border-gray-400 hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} /> Atualizar
        </button>

        <button
          onClick={cleanupOldSessions}
          disabled={loading}
          className="flex items-center gap-1 px-4 py-2 rounded-md font-medium border border-yellow-500 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 transition-colors"
        >
          <Sparkles size={16} /> Limpar Antigas
        </button>
      </div>

      <h3 className="text-lg font-medium mb-2">Sessões Disponíveis ({sessions.length})</h3>

      <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
        {sessions.map((session) => (
          <li
            key={session.id}
            className={`flex items-center justify-between p-3 ${session.isActive ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{session.id}</span>
                {getStatusChip(session)}
              </div>
              <div className="text-sm text-gray-500">
                Última atividade: {new Date(session.updatedAt).toLocaleString('pt-BR')}
                {session.isActive && <span className="ml-2 text-blue-600">(Sessão Ativa)</span>}
              </div>
            </div>

            <div className="flex gap-1">
              {!session.isActive && (
                <button
                  onClick={() => switchSession(session.id)}
                  disabled={loading}
                  title="Trocar para esta sessão"
                  className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                >
                  <ArrowLeftRight size={18} />
                </button>
              )}

              <button
                onClick={() => {
                  setSessionToDelete(session);
                  setDeleteConfirmOpen(true);
                }}
                disabled={loading}
                title="Deletar sessão"
                className="p-2 rounded-full text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {sessions.length === 0 && !loading && (
        <p className="text-center text-gray-500 py-8">
          Nenhuma sessão encontrada. Crie uma nova sessão para começar.
        </p>
      )}

      {/* Dialog - Criar Nova Sessão */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <div className="px-5 pt-5">
          <h3 className="text-lg font-semibold">Criar Nova Sessão</h3>
        </div>
        <div className="px-5 py-4">
          <label className="block text-sm mb-1">ID da Sessão</label>
          <input
            autoFocus
            type="text"
            value={newSessionId}
            onChange={(e) => setNewSessionId(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Use um nome único para identificar a sessão (ex: empresa_1, filial_sp)
          </p>

          <div className="flex items-center gap-2 mt-4">
            <Switch checked={forceCreate} onChange={(e) => setForceCreate(e.target.checked)} />
            <span className="text-sm">Forçar criação (sobrescrever se existir)</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={() => setCreateDialogOpen(false)} className="px-4 py-2 rounded-md hover:bg-gray-100">
            Cancelar
          </button>
          <button
            onClick={createSession}
            disabled={loading}
            className="px-4 py-2 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            Criar Sessão
          </button>
        </div>
      </Dialog>

      {/* Dialog - Confirmar Deleção */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <div className="px-5 pt-5">
          <h3 className="text-lg font-semibold">Confirmar Deleção</h3>
        </div>
        <div className="px-5 py-4">
          <p>
            Tem certeza que deseja deletar a sessão <strong>"{sessionToDelete?.id}"</strong>?
          </p>

          {sessionToDelete?.isActive && (
            <div className="mt-3">
              <Alert severity="warning">Esta é a sessão ativa! A deleção forçará desconexão.</Alert>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <Switch checked={forceDelete} onChange={(e) => setForceDelete(e.target.checked)} />
            <span className="text-sm">Forçar remoção (mesmo se ativa)</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={() => setDeleteConfirmOpen(false)} className="px-4 py-2 rounded-md hover:bg-gray-100">
            Cancelar
          </button>
          <button
            onClick={deleteSession}
            disabled={loading}
            className="px-4 py-2 rounded-md font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            Deletar
          </button>
        </div>
      </Dialog>
    </div>
  );
};

export default WhatsAppSessionManager;
