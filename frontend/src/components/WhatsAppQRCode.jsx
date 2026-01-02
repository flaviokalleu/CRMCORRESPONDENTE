import React, { useEffect, useState, useCallback, useRef } from "react";
import { Button, CircularProgress, Chip, Box, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DisconnectIcon from "@mui/icons-material/PowerSettingsNew";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import SettingsIcon from "@mui/icons-material/Settings";
import QRCode from "qrcode";
import WhatsAppSessionManager from "./WhatsAppSessionManager";

const WhatsAppQRCode = () => {
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [sessionInfo, setSessionInfo] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState("default");
  const [showSessionManager, setShowSessionManager] = useState(false);
  const socketRef = useRef(null);
  const intervalRef = useRef(null);

  // Buscar QR Code
  const fetchQRCode = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/whatsapp/qr-code`);
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setSuccessMessage("Você está autenticado com sucesso!");
          setIsConnected(true);
          setQrCode("");
        } else if (data.hasQrCode && data.qrCode) {
          setQrCode(data.qrCode);
          setIsConnected(false);
        } else {
          setError("QR Code não disponível");
        }
      } else {
        setError(`Erro ao obter QR Code: ${response.statusText}`);
      }
    } catch (error) {
      setError(`Erro ao buscar QR Code: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Checar status de autenticação
  const checkAuthenticationStatus = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/whatsapp/status`);
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setSuccessMessage("Você está autenticado com sucesso!");
          setIsConnected(true);
          setQrCode("");
        } else {
          setIsConnected(false);
        }
        
        // Atualizar informações da sessão
        if (data.sessionInfo) {
          setSessionInfo(data.sessionInfo);
        }
        if (data.sessionId) {
          setCurrentSessionId(data.sessionId);
        }
      }
    } catch (error) {
      // Silencie erros de polling
    }
  }, []);

  // WebSocket
  const initializeWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    socketRef.current = new window.WebSocket(
      process.env.REACT_APP_WEBSOCKET_URL + "/whatsapp"
    );

    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "authenticated") {
          setSuccessMessage("Você está conectado com sucesso!");
          setIsConnected(true);
          setQrCode("");
          setLoading(false);
        } else if (data.status === "disconnected") {
          setSuccessMessage("Você foi desconectado.");
          setIsConnected(false);
          setQrCode("");
          setLoading(false);
        } else if (data.qrCode) {
          setQrCode(data.qrCode);
          setIsConnected(false);
          setLoading(false);
        }
      } catch (error) {
        // Ignore
      }
    };

    socketRef.current.onerror = () => {
      setError("Erro de conexão WebSocket");
      setLoading(false);
    };
  }, []);

  // Efeito principal
  useEffect(() => {
    initializeWebSocket();
    fetchQRCode();

    intervalRef.current = setInterval(() => {
      if (!isConnected) {
        fetchQRCode();
      }
      checkAuthenticationStatus();
    }, 5000);

    return () => {
      if (socketRef.current) socketRef.current.close();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isConnected, fetchQRCode, checkAuthenticationStatus, initializeWebSocket]);

  // Gerar imagem do QR Code
  useEffect(() => {
    if (qrCode) {
      QRCode.toDataURL(qrCode, { width: 256 }, (err, url) => {
        if (!err) setQrImage(url);
      });
    }
  }, [qrCode]);

  // Botão "QR Code Escaneado"
  const handleQRCodeScanned = () => {
    setSuccessMessage("QR Code escaneado com sucesso!");
    setIsConnected(true);
    setQrCode("");
  };

  // Botão "Desconectar"
  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await fetch(`${process.env.REACT_APP_API_URL}/whatsapp/disconnect`, { 
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteSession: false })
      });
      setIsConnected(false);
      setQrCode("");
      setSuccessMessage("Desconectado com sucesso.");
      setSessionInfo(null);
      fetchQRCode();
      initializeWebSocket();
    } catch (error) {
      setError("Erro ao desconectar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderSessionInfo = () => {
    if (!sessionInfo) return null;

    return (
      <Box mb={2} p={2} border="1px solid #444" borderRadius={2} bgcolor="rgba(255,255,255,0.1)">
        <Typography variant="subtitle2" color="white" gutterBottom>
          Informações da Sessão
        </Typography>
        <Box display="flex" flexDirection="column" gap={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="white">Sessão:</Typography>
            <Chip label={currentSessionId} size="small" color="primary" />
          </Box>
          {sessionInfo.phoneNumber && (
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="white">Telefone:</Typography>
              <Chip label={sessionInfo.phoneNumber} size="small" color="success" />
            </Box>
          )}
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="white">Status:</Typography>
            <Chip 
              label={sessionInfo.status || 'unknown'} 
              size="small" 
              color={sessionInfo.status === 'active' ? 'success' : 'warning'} 
            />
          </Box>
          {sessionInfo.lastActivity && (
            <Typography variant="caption" color="rgba(255,255,255,0.7)">
              Última atividade: {new Date(sessionInfo.lastActivity).toLocaleString('pt-BR')}
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  const renderConfetti = () => (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
      <div className="confetti" />
      <div className="confetti" />
      <div className="confetti" />
      <div className="confetti" />
      <div className="confetti" />
    </div>
  );

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      {isConnected && renderConfetti()}
      
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <h2 className="text-4xl font-bold animate-bounce">
          Escanear QR Code
        </h2>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => setShowSessionManager(!showSessionManager)}
          sx={{ color: 'white', borderColor: 'white' }}
        >
          {showSessionManager ? 'Ocultar' : 'Gerenciar Sessões'}
        </Button>
      </Box>

      {showSessionManager && (
        <Box 
          mb={4} 
          p={3} 
          bgcolor="rgba(255,255,255,0.1)" 
          borderRadius={2} 
          width="100%" 
          maxWidth={800}
        >
          <WhatsAppSessionManager />
        </Box>
      )}

      {renderSessionInfo()}

      {error && (
        <div className="bg-red-500 text-white p-4 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center">
          <CircularProgress className="text-white mb-4" />
          <p>Carregando QR Code...</p>
        </div>
      ) : isConnected ? (
        <div className="flex flex-col items-center text-center">
          <CheckCircleIcon className="text-green-500 text-6xl mb-4" />
          <p className="text-green-400 text-lg font-semibold mb-4">
            {successMessage}
          </p>
          <img
            src="https://res.cloudinary.com/amodelivery/image/upload/v1580151660/Blog/ezgif-3-360f65df4d8d.gif"
            alt="Meme"
            className="w-64 h-auto mb-4 rounded shadow-lg"
          />
          <Button
            onClick={handleDisconnect}
            variant="contained"
            color="error"
            startIcon={<DisconnectIcon />}
            className="mt-4 shadow-lg"
          >
            Desconectar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {qrImage && <img src={qrImage} alt="QR Code" className="w-64 h-auto mb-4" />}
          <p className="text-sm text-gray-300 mb-4">
            Escaneie este QR Code com seu WhatsApp
          </p>
          <Button
            onClick={handleQRCodeScanned}
            variant="contained"
            color="success"
            startIcon={<EmojiEmotionsIcon />}
            className="mt-4"
          >
            QR Code Escaneado
          </Button>
        </div>
      )}
    </div>
  );
};

export default WhatsAppQRCode;
