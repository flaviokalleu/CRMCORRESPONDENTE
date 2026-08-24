"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

// TODO (segurança/infra pendente): o WebSocket nativo do Go (`/api/ws`) é
// cross-origin em relação ao Next (backend Go roda em outro host/porta) e o
// cookie httpOnly de sessão (`cri_token`) NÃO é enviado automaticamente numa
// conexão WebSocket para outra origem. Por isso esta página precisa de uma
// env var pública NEXT_PUBLIC_WS_URL (URL absoluta do backend Go) e, por ora,
// conecta sem anexar o token — o servidor Go precisa aceitar a conexão sem
// Authorization e (idealmente) exigir um token via query string assinado à
// parte, OU o ideal futuro é expor um endpoint que troque o cookie httpOnly
// por um token de curta duração especificamente para o handshake do WS.
// Documentado como pendência — não resolvido nesta tarefa.
function getWsBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_WS_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}`;
  }
  return "";
}

export default function WhatsAppQRPage() {
  const { user } = useAuth();
  const [qrImage, setQrImage] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [idle, setIdle] = useState(true);
  const [error, setError] = useState("");
  const wsRef = useRef(null);

  const empresaLabel = user?.tenant_nome || user?.tenantName || "sua empresa";

  const handleEvent = useCallback((data) => {
    if (data.type === "qr") {
      setQrCode(data.qrCode || "");
      setConnecting(false);
      setBlocked(false);
      setIdle(false);
      setIsConnected(false);
    } else if (data.type === "status") {
      if (data.status === "ready") {
        setIsConnected(true);
        setQrCode("");
        setConnecting(false);
        setIdle(false);
        setBlocked(false);
        setError("");
      } else if (data.status === "disconnected") {
        setIsConnected(false);
        setQrCode("");
        setIdle(true);
        setConnecting(false);
      }
    } else if (data.type === "error") {
      setError(data.message || "Erro na conexão");
      setConnecting(false);
      setIdle(true);
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/backend/whatsapp/qr-code");
      if (!res.ok) return;
      const data = await res.json();
      if (data.blocked) {
        setBlocked(true); setIdle(false); setIsConnected(false);
      } else if (data.authenticated) {
        setIsConnected(true); setBlocked(false); setIdle(false); setQrCode(""); setError("");
      } else if (data.hasQrCode && data.qrCode) {
        setQrCode(data.qrCode); setIsConnected(false); setBlocked(false); setIdle(false); setConnecting(false);
      } else if (data.idle) {
        setIdle(true); setIsConnected(false);
      } else if (data.isInitializing) {
        setIdle(false); setConnecting(true);
      }
    } catch {
      // ignora — status será atualizado via WS
    }
  }, []);

  // Conexão WebSocket nativa direto no backend Go (URL absoluta — não passa
  // pelo proxy `/api/backend`, que só serve fetch HTTP comum).
  useEffect(() => {
    let ws;
    let reconnectTimer;
    let closedByEffect = false;

    const connect = () => {
      const base = getWsBaseUrl();
      if (!base) return;
      ws = new WebSocket(`${base}/api/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (user?.tenant_id) {
          ws.send(JSON.stringify({ action: "subscribe", channel: "whatsapp", tenantId: user.tenant_id }));
        }
      };

      ws.onmessage = (evt) => {
        let envelope;
        try {
          envelope = JSON.parse(evt.data);
        } catch {
          return;
        }
        if (envelope?.event !== "whatsapp:update") return;
        const data = envelope.data || {};
        if (user?.tenant_id && data.tenantId && Number(data.tenantId) !== Number(user.tenant_id)) return;
        handleEvent(data);
      };

      ws.onclose = () => {
        if (!closedByEffect) reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();
    checkStatus();

    return () => {
      closedByEffect = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [user?.tenant_id, handleEvent, checkStatus]);

  // Gera a imagem do QR a partir do código recebido, via serviço externo de
  // renderização (evita depender da lib `qrcode` no bundle client).
  useEffect(() => {
    if (qrCode) {
      setQrImage(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrCode)}`);
    } else {
      setQrImage("");
    }
  }, [qrCode]);

  const handleConnect = async () => {
    setConnecting(true);
    setError("");
    setIdle(false);
    setBlocked(false);
    try {
      const res = await fetch("/api/backend/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "default" }),
      });
      const data = await res.json();
      if (data.hasQrCode && data.qrCode) setQrCode(data.qrCode);
    } catch {
      setError("Não foi possível conectar. Verifique se o servidor está rodando.");
    } finally {
      setConnecting(false);
    }
  };

  const handleReset = async () => {
    setError("");
    try {
      await fetch("/api/backend/whatsapp/reset", { method: "POST" });
      setBlocked(false);
      setIsConnected(false);
      setQrCode("");
      setIdle(true);
    } catch {
      setError("Não foi possível resetar. Tente novamente.");
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/backend/whatsapp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteSession: false }),
      });
      setIsConnected(false);
      setQrCode("");
      setIdle(true);
    } catch {
      setError("Não foi possível desconectar. Tente novamente.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-cx-text">WhatsApp</h1>
          <p className="text-sm text-cx-muted mt-1">
            Conecte o WhatsApp da empresa {empresaLabel} para enviar e receber mensagens pelo sistema.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
            isConnected
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {isConnected ? "Conectado" : "Desconectado"}
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-cx-border bg-cx-surface p-6">
        {blocked ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <p className="text-cx-text font-semibold">Conexão bloqueada</p>
            <p className="text-cx-muted text-sm text-center max-w-sm">
              O WhatsApp bloqueou esta sessão. Isso acontece quando a sessão expira ou há muitas tentativas.
            </p>
            <button onClick={handleReset} className="rounded-lg bg-cx-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-cx-orange-dark">
              Resetar e tentar novamente
            </button>
          </div>
        ) : connecting ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <p className="text-cx-text font-semibold">Conectando ao WhatsApp...</p>
            <p className="text-cx-muted text-sm">Gerando QR Code, aguarde.</p>
          </div>
        ) : isConnected ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <p className="text-cx-text text-lg font-bold">WhatsApp conectado!</p>
            <p className="text-cx-muted text-sm">Pronto para enviar e receber mensagens pelo sistema.</p>
            <button onClick={handleDisconnect} className="rounded-lg bg-red-50 border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">
              Desconectar WhatsApp
            </button>
          </div>
        ) : qrImage ? (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white rounded-xl p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImage} alt="QR Code do WhatsApp" className="w-64 h-64" />
            </div>
            <p className="text-cx-muted text-xs">Escaneie com o WhatsApp: Aparelhos conectados → Conectar aparelho.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <p className="text-cx-text font-semibold">WhatsApp desconectado</p>
            <p className="text-cx-muted text-sm text-center max-w-sm">
              Clique no botão abaixo para gerar o QR Code e conectar o WhatsApp da empresa {empresaLabel} ao sistema.
            </p>
            <button onClick={handleConnect} disabled={connecting} className="rounded-lg bg-cx-orange px-6 py-3 text-sm font-semibold text-white hover:bg-cx-orange-dark disabled:opacity-50">
              Conectar WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
