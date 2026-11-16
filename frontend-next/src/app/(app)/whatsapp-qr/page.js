"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Lock, AlertCircle } from "@/components/icons";
import { EmptyState } from "@/components/ui/page";

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
  // Plano sem WhatsApp: o backend responde 403 FEATURE_NOT_AVAILABLE.
  const [semPlano, setSemPlano] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [desconectando, setDesconectando] = useState(false);
  const wsRef = useRef(null);

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
      if (res.status === 403) {
        const body = await res.json().catch(() => null);
        if (body?.code === "FEATURE_NOT_AVAILABLE") setSemPlano(true);
        return;
      }
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
    const statusTimer = setTimeout(checkStatus, 0);

    return () => {
      closedByEffect = true;
      clearTimeout(statusTimer);
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [user?.tenant_id, handleEvent, checkStatus]);

  // O QR permite vincular uma conta: renderizar localmente, sem enviar a terceiros.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const image = qrCode
          ? await (await import('qrcode')).toDataURL(qrCode, { width: 280, margin: 2 })
          : '';
        if (!cancelled) setQrImage(image);
      } catch {
        if (!cancelled) setError('Não foi possível gerar o QR Code. Tente novamente.');
      }
    })();
    return () => { cancelled = true; };
  }, [qrCode]);

  // Enquanto espera o QR (ou a leitura dele), confere o estado a cada 3 s.
  // A tela dependia só do WebSocket; quando ele não conecta (ex.: Next e Go
  // em portas diferentes, sem NEXT_PUBLIC_WS_URL), o QR nunca aparecia.
  useEffect(() => {
    if (isConnected || (!connecting && !qrCode)) return undefined;
    const t = setInterval(checkStatus, 3000);
    // Sem QR em 90 s: para de esperar e avisa (antes ficava girando para sempre).
    const limite = connecting && !qrCode
      ? setTimeout(() => {
          setConnecting(false);
          setError("O QR Code não chegou. Toque em Mostrar QR Code de novo em um minuto.");
        }, 90000)
      : null;
    return () => { clearInterval(t); if (limite) clearTimeout(limite); };
  }, [connecting, qrCode, isConnected, checkStatus]);

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
      if (res.status === 403 && data?.code === "FEATURE_NOT_AVAILABLE") { setSemPlano(true); return; }
      if (data.hasQrCode && data.qrCode) {
        setQrCode(data.qrCode);
        setConnecting(false);
      }
      // Sem QR ainda: continua "Gerando…" e o efeito acima busca o estado.
    } catch {
      setError("Não foi possível gerar o QR Code agora. Espere um minuto e tente de novo.");
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
      setError("Não foi possível recomeçar a conexão. Tente de novo.");
    }
  };

  const handleDisconnect = async () => {
    setDesconectando(true);
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
      setError("Não foi possível desconectar. Tente de novo.");
    } finally {
      setDesconectando(false);
      setConfirmarSaida(false);
    }
  };

  const passos = (
    <ol className="passos max-w-md text-left">
      <li><span>No celular da imobiliária, abra o <strong>WhatsApp</strong>.</span></li>
      <li><span>Toque em <strong>Mais opções</strong> (⋮) ou <strong>Configurações</strong> e depois em <strong>Aparelhos conectados</strong>.</span></li>
      <li><span>Toque em <strong>Conectar um aparelho</strong> e aponte a câmera para o QR Code desta tela.</span></li>
    </ol>
  );

  if (semPlano) {
    return (
      <div className="p-6 space-y-6">
        <div className="crm-page-header">
          <div>
            <h1>WhatsApp</h1>
            <p>Envie e receba mensagens dos clientes direto pelo sistema.</p>
          </div>
        </div>
        <EmptyState
          icon={Lock}
          title="Disponível em outro plano"
          hint="O seu plano atual não inclui o WhatsApp. Veja os planos e mude quando quiser — seus dados continuam todos aqui."
        >
          <Link href="/minha-assinatura" className="cx-btn cx-btn-primary">Ver planos</Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="crm-page-header">
        <div>
          <h1>WhatsApp</h1>
          <p>Conecte o WhatsApp da sua imobiliária para enviar e receber mensagens pelo sistema.</p>
        </div>
        <span className={`status-selo ${isConnected ? "status-ok" : "status-perigo"}`}>
          {isConnected ? "Conectado" : "Desconectado"}
        </span>
      </div>

      {error && (
        <p role="alert" className="form-aviso" data-tom="erro">
          <AlertCircle className="h-4 w-4" aria-hidden="true" /> {error}
        </p>
      )}

      <div className="crm-card p-6">
        {blocked ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
            <p className="text-cx-text font-semibold">A conexão caiu</p>
            <p className="text-cx-muted text-sm max-w-sm">
              O WhatsApp encerrou esta conexão. Isso acontece quando ela fica muito tempo parada ou depois de várias tentativas. É só conectar de novo.
            </p>
            <button type="button" onClick={handleReset} className="cx-btn cx-btn-primary">
              Conectar de novo
            </button>
          </div>
        ) : connecting ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2" role="status">
            <p className="text-cx-text font-semibold">Gerando o QR Code…</p>
            <p className="text-cx-muted text-sm">Leva alguns segundos.</p>
          </div>
        ) : isConnected ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
            <p className="text-cx-text text-lg font-bold">WhatsApp conectado</p>
            <p className="text-cx-muted text-sm">Pronto para enviar e receber mensagens pelo sistema.</p>
            <button type="button" onClick={() => setConfirmarSaida(true)} className="cx-btn cx-btn-danger">
              Desconectar WhatsApp
            </button>
          </div>
        ) : qrImage ? (
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
            <div className="rounded-xl border border-cx-border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImage} alt="QR Code para conectar o WhatsApp" className="w-64 h-64" />
            </div>
            <div className="space-y-3">
              <p className="text-cx-text font-semibold">Agora, no celular:</p>
              {passos}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 gap-5">
            <div className="space-y-3">
              <p className="text-cx-text font-semibold">Como conectar (leva 1 minuto)</p>
              {passos}
            </div>
            <button type="button" onClick={handleConnect} disabled={connecting} className="cx-btn cx-btn-primary">
              Mostrar QR Code
            </button>
          </div>
        )}
      </div>

      <Dialog open={confirmarSaida} onOpenChange={(v) => !v && setConfirmarSaida(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desconectar o WhatsApp?</DialogTitle>
            <DialogDescription>
              O sistema para de enviar e receber mensagens até você conectar de novo pelo QR Code. As conversas no celular não são apagadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setConfirmarSaida(false)} className="cx-btn cx-btn-outline">
              Continuar conectado
            </button>
            <button type="button" onClick={handleDisconnect} disabled={desconectando} className="cx-btn cx-btn-danger-solid">
              {desconectando ? "Desconectando…" : "Desconectar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
