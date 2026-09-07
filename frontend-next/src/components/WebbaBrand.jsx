// Wordmark da marca: WEBBA em itálico pesado com a 4ª letra em laranja — mesma
// posição que a letra destacada ocupa num wordmark de 5 letras. Cor vem de
// --color-wb-accent; nunca escrever o hex aqui.
export function WebbaBrand({ subtitle = false }) {
  return <span className="webba-brand" aria-label="Webba CRM Imobiliário"><span className="webba-wordmark">WEB<span>B</span>A</span>{subtitle && <span className="webba-brand-subtitle">CRM IMOBILIÁRIO</span>}</span>;
}
