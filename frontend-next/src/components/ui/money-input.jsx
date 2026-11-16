"use client";

import { maskMoney, soDigitos } from "@/lib/masks";

// Campo de dinheiro pt-BR com o "R$" em bloco próprio (.crm-money).
// `value` é o texto já mascarado ("1.500,00"); `onChange` recebe o texto
// mascarado. Para converter em número use parseMoney de @/lib/masks.
// `semCentavos` digita só reais inteiros ("300.000").
export function MoneyInput({ value, onChange, semCentavos = false, grande = false, placeholder, ...props }) {
  const mascarar = (v) => {
    if (!semCentavos) return maskMoney(v);
    // Colar "350.000,50" virava 35.000.050 (os centavos entravam como reais).
    const d = soDigitos(String(v ?? "").split(",")[0]).slice(0, 13);
    return d ? Number(d).toLocaleString("pt-BR") : "";
  };
  return (
    <div className={`crm-money ${grande ? "crm-money-lg" : ""}`}>
      <span aria-hidden="true">R$</span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(mascarar(e.target.value))}
        placeholder={placeholder ?? (semCentavos ? "0" : "0,00")}
        {...props}
      />
    </div>
  );
}
