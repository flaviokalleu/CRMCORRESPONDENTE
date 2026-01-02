import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Typography,
  Alert,
  Box,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  SwapHoriz as SwitchIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  CleaningServices as CleanIcon
} from '@mui/icons-material';

const WhatsAppSessionManager = () => {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState('');
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
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/whatsapp/sessions`);
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
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/whatsapp/session/create`, {
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
        `${process.env.REACT_APP_API_URL}/whatsapp/session/${sessionToDelete.id}?force=${forceDelete}`,
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
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/whatsapp/session/switch`, {
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
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/whatsapp/sessions/cleanup`, {
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
      return <Chip label="Ativa e Conectada" color="success" size="small" />;
    } else if (session.isActive) {
      return <Chip label="Ativa (Desconectada)" color="warning" size="small" />;
    } else {
      return <Chip label="Inativa" color="default" size="small" />;
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Gerenciador de Sessões WhatsApp
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box display="flex" gap={2} mb={3}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          disabled={loading}
        >
          Nova Sessão
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadSessions}
          disabled={loading}
        >
          Atualizar
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<CleanIcon />}
          onClick={cleanupOldSessions}
          disabled={loading}
          color="warning"
        >
          Limpar Antigas
        </Button>
      </Box>

      <Typography variant="h6" gutterBottom>
        Sessões Disponíveis ({sessions.length})
      </Typography>
      
      <List>
        {sessions.map((session) => (
          <ListItem 
            key={session.id}
            divider
            sx={{ 
              bgcolor: session.isActive ? 'action.hover' : 'transparent',
              borderLeft: session.isActive ? '4px solid #1976d2' : 'none'
            }}
          >
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle1">{session.id}</Typography>
                  {getStatusChip(session)}
                </Box>
              }
              secondary={
                <Typography variant="body2" color="textSecondary">
                  Última atividade: {new Date(session.updatedAt).toLocaleString('pt-BR')}
                  {session.isActive && (
                    <Typography component="span" color="primary" sx={{ ml: 1 }}>
                      (Sessão Ativa)
                    </Typography>
                  )}
                </Typography>
              }
            />
            
            <ListItemSecondaryAction>
              <Box display="flex" gap={1}>
                {!session.isActive && (
                  <IconButton
                    edge="end"
                    onClick={() => switchSession(session.id)}
                    disabled={loading}
                    title="Trocar para esta sessão"
                  >
                    <SwitchIcon />
                  </IconButton>
                )}
                
                <IconButton
                  edge="end"
                  onClick={() => {
                    setSessionToDelete(session);
                    setDeleteConfirmOpen(true);
                  }}
                  disabled={loading}
                  title="Deletar sessão"
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {sessions.length === 0 && !loading && (
        <Typography variant="body1" color="textSecondary" textAlign="center" py={4}>
          Nenhuma sessão encontrada. Crie uma nova sessão para começar.
        </Typography>
      )}

      {/* Dialog - Criar Nova Sessão */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Criar Nova Sessão</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="ID da Sessão"
            fullWidth
            variant="outlined"
            value={newSessionId}
            onChange={(e) => setNewSessionId(e.target.value)}
            helperText="Use um nome único para identificar a sessão (ex: empresa_1, filial_sp)"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={forceCreate}
                onChange={(e) => setForceCreate(e.target.checked)}
              />
            }
            label="Forçar criação (sobrescrever se existir)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
          <Button onClick={createSession} variant="contained" disabled={loading}>
            Criar Sessão
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog - Confirmar Deleção */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirmar Deleção</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja deletar a sessão <strong>"{sessionToDelete?.id}"</strong>?
          </Typography>
          
          {sessionToDelete?.isActive && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Esta é a sessão ativa! A deleção forçará desconexão.
            </Alert>
          )}
          
          <FormControlLabel
            control={
              <Switch
                checked={forceDelete}
                onChange={(e) => setForceDelete(e.target.checked)}
              />
            }
            label="Forçar remoção (mesmo se ativa)"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={deleteSession} variant="contained" color="error" disabled={loading}>
            Deletar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WhatsAppSessionManager;
