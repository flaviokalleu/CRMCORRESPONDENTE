// Metadados de imóvel — situação (status) e formatação. Mantém o mesmo sistema
// sóbrio da lista de clientes: pílula neutra + ponto semântico.

export const TONE_DOT = {
  positive: "#34d399", // emerald-400 — disponível
  attention: "#fbbf24", // amber-400 — reservado
  neutral: "#94a3b8", // slate-400 — vendido/encerrado
  negative: "#f87171", // red-400 — indisponível
};

export const SITUACAO_MAP = {
  disponivel: { label: "Disponível", tone: "positive" },
  reservado: { label: "Reservado", tone: "attention" },
  vendido: { label: "Vendido", tone: "neutral" },
  indisponivel: { label: "Indisponível", tone: "negative" },
  alugado: { label: "Alugado", tone: "neutral" },
};

export function situacaoInfo(value) {
  const key = (value || "").toString().toLowerCase();
  const meta = SITUACAO_MAP[key] || { label: value || "—", tone: "neutral" };
  return { ...meta, dot: TONE_DOT[meta.tone] };
}

// Categorias comuns — usadas como fallback no filtro quando os dados não trazem
// variedade suficiente.
export const TIPOS_PADRAO = [
  "Apartamento", "Casa", "Cobertura", "Sobrado", "Terreno", "Kitnet",
  "Sala Comercial", "Lote", "Chácara",
];

export function formatBRL(value) {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
}

// URL da imagem via proxy Next (/api/backend → Go /uploads/...). O caminho vem
// relativo à raiz de uploads (ex.: "imoveis/1/capa/foto.webp").
export function imovelImageUrl(path) {
  if (!path) return null;
  const clean = String(path).replace(/\\/g, "/").replace(/^\/+/, "");
  return `/api/backend/uploads/${clean}`;
}
