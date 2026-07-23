import {
  Banknote,
  Briefcase,
  Calendar,
  ClipboardList,
  FileClock,
  FileSignature,
  FileText,
  FileX,
  Gavel,
  Hammer,
  Handshake,
  Home,
  KeyRound,
  Megaphone,
  Receipt,
  ShieldCheck,
  Store,
  TrendingUp,
  User,
  Wrench,
} from "lucide-react";

// Mapa nome (string, vindo de contract-templates.js) → componente lucide.
// Fica separado do template (que não deve importar React).
export const ICONS = {
  Home,
  Store,
  ClipboardList,
  FileSignature,
  FileClock,
  Receipt,
  Megaphone,
  KeyRound,
  Briefcase,
  FileX,
  Handshake,
  User,
};

// Ícone por assunto de cláusula, escolhido por palavra-chave no título —
// cada pílula de cláusula ganha um ícone que reflete o conteúdo real
// (objeto, prazo, pagamento, garantia...), não um ícone genérico repetido.
const CLAUSE_KEYWORDS = [
  [/objeto/i, Home],
  [/praz|vig[êe]ncia/i, Calendar],
  [/pagamento|alugu[ée]l|pre[cç]o|valor|sinal/i, Banknote],
  [/reajust/i, TrendingUp],
  [/garantia|fiador|cau[cç][ãa]o/i, ShieldCheck],
  [/despes|tribut|iptu|condom[íi]nio/i, Receipt],
  [/rescis|distrato|multa/i, FileX],
  [/foro|comarca/i, Gavel],
  [/uso|conserva[cç][ãa]o/i, Wrench],
  [/benfeitoria/i, Hammer],
  [/comiss[ãa]o|corretagem/i, Handshake],
  [/escritura|registro/i, FileSignature],
  [/posse|entrega|chaves/i, KeyRound],
];

export function pickClauseIcon(title) {
  const found = CLAUSE_KEYWORDS.find(([re]) => re.test(title || ""));
  return found ? found[1] : FileText;
}
