import {
  Users, Globe, Search, MessageCircle, Megaphone, Store, Signpost,
  Building2, Contact,
} from "lucide-react";

// Aparência derivada dos dados do cliente: cor do avatar, ícone/cor da origem e
// tempo relativo do último contato. Fica fora do componente de lista porque as
// três coisas são regra de leitura do domínio, não layout — o Kanban e o painel
// de edição usam as mesmas.
//
// Nenhuma cor é escrita solta aqui: todas saem dos tokens `wb-*` declarados em
// `src/app/globals.css`, referenciados por classe utilitária.

// Seis pares fundo/tinta para o avatar. A cor não carrega significado — é só
// para o olho distinguir uma linha da outra numa lista longa —, por isso é
// sorteada de forma determinística pelo nome, e não pelo status (que já tem a
// sua própria coluna colorida).
const PALETA_AVATAR = [
  "bg-wb-brand/10 text-wb-brand",
  "bg-wb-analytics/10 text-wb-analytics",
  "bg-wb-tech/10 text-wb-tech",
  "bg-wb-info/10 text-wb-info",
  "bg-wb-warn/10 text-wb-warn",
  "bg-wb-good/10 text-wb-good",
];

// Hash estável e barato (djb2 truncado). Precisa ser determinístico entre o
// servidor e o cliente: um Math.random aqui trocaria a cor na hidratação.
function hashDe(texto) {
  let h = 5381;
  for (let i = 0; i < texto.length; i += 1) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function corDoAvatar(nome) {
  return PALETA_AVATAR[hashDe(nome || "?") % PALETA_AVATAR.length];
}

export function iniciaisDe(nome) {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  return partes.length ? (partes[0][0] + (partes[1]?.[0] || "")).toUpperCase() : "?";
}

// Ícone e cor por canal de captação. O campo é texto livre (ver migration
// 0008), então o casamento é por palavra-chave em minúsculas e sem acento —
// "Indicação", "indicacao" e "Indicação de cliente" caem no mesmo lugar.
//
// Não são logotipos: o pacote de ícones não distribui marcas, e um Facebook
// desenhado à mão ficaria pior que uma forma genérica honesta.
const ORIGENS = [
  { chaves: ["indicac", "indicaç"], label: "Indicação", Icon: Users, cor: "text-wb-good" },
  { chaves: ["site", "portal", "web"], label: "Site", Icon: Globe, cor: "text-wb-brand" },
  { chaves: ["google", "busca"], label: "Google", Icon: Search, cor: "text-wb-warn" },
  { chaves: ["whatsapp", "whats"], label: "WhatsApp", Icon: MessageCircle, cor: "text-wb-good" },
  { chaves: ["facebook", "instagram", "social", "rede"], label: "Redes sociais", Icon: Contact, cor: "text-wb-analytics" },
  { chaves: ["campanha", "anuncio", "anúncio", "ads", "trafego", "tráfego"], label: "Campanha", Icon: Megaphone, cor: "text-wb-accent" },
  { chaves: ["balcao", "balcão", "loja", "presencial"], label: "Balcão", Icon: Store, cor: "text-wb-tech" },
  { chaves: ["placa", "outdoor", "rua"], label: "Placa", Icon: Signpost, cor: "text-wb-info" },
  { chaves: ["imobiliaria", "imobiliária", "parceiro"], label: "Parceria", Icon: Building2, cor: "text-wb-info" },
];

const semAcento = (v) =>
  (v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Devolve null quando não há origem gravada — a coluna mostra um traço, em vez
// de inventar um canal que ninguém informou.
export function origemVisual(origem) {
  const bruto = (origem || "").trim();
  if (!bruto) return null;
  const alvo = semAcento(bruto);
  const achado = ORIGENS.find((o) => o.chaves.some((c) => alvo.includes(semAcento(c))));
  // Origem desconhecida ainda aparece, com o texto que o usuário digitou.
  return achado
    ? { ...achado, label: bruto }
    : { label: bruto, Icon: Contact, cor: "text-cx-muted" };
}

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

// "há 2 horas", "há 3 dias". Sem biblioteca: são cinco faixas, e Intl.
// RelativeTimeFormat sozinho não escolhe a unidade.
export function tempoRelativo(iso) {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  const delta = Date.now() - data.getTime();
  if (delta < 0) return "agora";
  if (delta < MINUTO) return "agora";
  if (delta < HORA) {
    const n = Math.floor(delta / MINUTO);
    return `há ${n} ${n === 1 ? "minuto" : "minutos"}`;
  }
  if (delta < DIA) {
    const n = Math.floor(delta / HORA);
    return `há ${n} ${n === 1 ? "hora" : "horas"}`;
  }
  const dias = Math.floor(delta / DIA);
  if (dias < 30) return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
  const anos = Math.floor(meses / 12);
  return `há ${anos} ${anos === 1 ? "ano" : "anos"}`;
}

// Data absoluta curta, usada como segunda linha do último contato: o relativo
// diz "há 3 dias", e quem precisa do dia exato não abre o cliente para ver.
export function dataCurta(iso) {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  // "07/09/26" — o mês por extenso do pt-BR sai como "07 de set. de 26",
  // longo demais para uma segunda linha de célula.
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
