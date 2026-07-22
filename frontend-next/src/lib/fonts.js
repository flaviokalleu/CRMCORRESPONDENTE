import { Fraunces } from "next/font/google";

// Fraunces — serifa de alto contraste com "optical sizing", vernáculo do
// mercado imobiliário de luxo (Sotheby's, incorporadoras premium). Usada com
// restrição, só em títulos de display na landing — o corpo continua em
// Plus Jakarta Sans (layout raiz). Escopada por className, não sobrescreve o
// resto do app.
export const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});
