import { MessageCircle, Phone } from "@/components/icons";

// Contato a um toque — WhatsApp e ligar — para qualquer lista do dia a dia.
// Sem hooks: serve em Server e Client Components. Alvos de 40px (classes
// .lst-acao em crm-design.css › "Listas do dia a dia").

export function soDigitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

// Telefone brasileiro → número internacional para wa.me / tel:.
// "(61) 99342-7781" → "5561993427781". Já com 55 na frente, mantém.
export function foneInternacional(telefone) {
  const d = soDigitos(telefone);
  if (!d) return "";
  if (d.length >= 12 && d.startsWith("55")) return d;
  return `55${d}`;
}

export function linkWhatsApp(telefone, texto) {
  const numero = foneInternacional(telefone);
  if (!numero) return "";
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export function ContatoRapido({ telefone, nome, mensagem, className = "" }) {
  const numero = foneInternacional(telefone);
  if (!numero) return <span className="text-cx-muted">Sem telefone</span>;
  const quem = nome || "o contato";
  return (
    <span className={`lst-contato ${className}`}>
      <a
        href={linkWhatsApp(telefone, mensagem)}
        target="_blank"
        rel="noreferrer"
        className="lst-acao lst-acao-whats"
        title="Chamar no WhatsApp"
        aria-label={`Chamar ${quem} no WhatsApp`}
      >
        <MessageCircle aria-hidden="true" />
      </a>
      <a href={`tel:+${numero}`} className="lst-acao" title="Ligar" aria-label={`Ligar para ${quem}`}>
        <Phone aria-hidden="true" />
      </a>
      <span className="lst-fone tabular-nums text-cx-muted">{telefone}</span>
    </span>
  );
}
