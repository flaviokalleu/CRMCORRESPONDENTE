// Máscaras de digitação compartilhadas (pt-BR). Recebem o texto digitado e
// devolvem o texto formatado; aceitam colar com ou sem pontuação.

const digitos = (v, max) => String(v ?? "").replace(/\D/g, "").slice(0, max);

export function maskPhone(v) {
  const d = digitos(v, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskCpf(v) {
  const d = digitos(v, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function maskCnpj(v) {
  const d = digitos(v, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

// CPF (até 11 dígitos) ou CNPJ (12–14), decidindo pelo tamanho.
export function maskCpfCnpj(v) {
  return digitos(v, 14).length > 11 ? maskCnpj(v) : maskCpf(v);
}

export function maskCep(v) {
  const d = digitos(v, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

// Dinheiro: "150000" → "1.500,00" (digitação da direita para a esquerda).
export function maskMoney(v) {
  const d = digitos(v, 13);
  if (!d) return "";
  const n = Number(d) / 100;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// "1.500,00" → 1500
export function parseMoney(v) {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export const soDigitos = (v) => String(v ?? "").replace(/\D/g, "");
