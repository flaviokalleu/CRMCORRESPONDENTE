// Validações de formulário compartilhadas (pt-BR). Devolvem true/false; a
// mensagem fica com quem chama, perto do campo.
import { soDigitos } from "@/lib/masks";

// CPF com dígitos verificadores. Vazio não é validado aqui (campo opcional).
export function cpfValido(v) {
  const d = soDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(d[t])) return false;
  }
  return true;
}

// Telefone com DDD: 10 (fixo) ou 11 (celular) dígitos.
export const telefoneValido = (v) => [10, 11].includes(soDigitos(v).length);

export const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v ?? "").trim());

// CNPJ com os dois dígitos verificadores (mesma regra do Go, validacao.CNPJValido).
export function cnpjValido(v) {
  const d = soDigitos(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (const n of [12, 13]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * pesos[13 - n + i];
    const r = soma % 11;
    if (Number(d[n]) !== (r < 2 ? 0 : 11 - r)) return false;
  }
  return true;
}
