"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";

// WhatsApp flutuante.
//
// Foi o padrão mais universal da pesquisa: 4 das 5 empresas analisadas da
// região têm (Bela Mares com três números separados por cidade, Construtora
// Mabel, Luh e Kaza). Faz sentido — no mercado local o contato acontece no
// WhatsApp, não em formulário de e-mail.
//
// Copiamos também a ideia da Bela Mares de separar por atendimento, mas com
// o texto já preenchido: o leigo trava quando abre uma conversa em branco.
const CANAIS = [
  {
    id: "comprar",
    rotulo: "Quero comprar um imóvel",
    texto: "Olá! Vi o site e quero comprar um imóvel. Podem me ajudar?",
  },
  {
    id: "alugar",
    rotulo: "Quero alugar um imóvel",
    texto: "Olá! Vi o site e quero alugar um imóvel. Podem me ajudar?",
  },
  {
    id: "financiar",
    rotulo: "Quero saber se tenho financiamento",
    texto: "Olá! Gostaria de saber se consigo financiamento para comprar um imóvel.",
  },
  {
    id: "anunciar",
    rotulo: "Quero vender ou alugar o meu",
    texto: "Olá! Tenho um imóvel e gostaria de vender ou alugar com vocês.",
  },
];

export function WhatsAppFlutuante({ numero = "5561999999999" }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 print:hidden">
      {aberto && (
        <div className="w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-cx-border bg-white shadow-2xl">
          <div className="bg-[#075E54] px-4 py-3">
            <p className="text-sm font-bold text-white">Fale com a gente</p>
            <p className="text-xs text-white/90">Respondemos pelo WhatsApp</p>
          </div>
          <ul className="p-2">
            {CANAIS.map((c) => (
              <li key={c.id}>
                <a
                  href={`https://wa.me/${numero}?text=${encodeURIComponent(c.texto)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg px-3 py-2.5 text-sm text-cx-text transition-colors hover:bg-cx-bg"
                >
                  {c.rotulo}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label={aberto ? "Fechar atendimento" : "Falar no WhatsApp"}
        // Contraste medido: branco sobre o #25D366 da marca dá 1,98:1 e
        // reprova AA; o #128C7E fica em 4,14:1, ainda abaixo. O verde escuro
        // #075E54 (também da paleta oficial do WhatsApp) chega a 7,67:1 e
        // continua inconfundível como "botão do WhatsApp".
        className="inline-flex items-center gap-2 rounded-full bg-[#075E54] px-5 py-3.5 font-bold text-white shadow-lg transition-transform hover:scale-105"
      >
        {aberto ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <>
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm">WhatsApp</span>
          </>
        )}
      </button>
    </div>
  );
}
