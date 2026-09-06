export function CaixaBrand({ subtitle = false }) {
  return <span className="caixa-brand" aria-label="CAIXA CRM Imobiliário"><span className="caixa-wordmark">CAI<span>X</span>A</span>{subtitle && <span className="caixa-brand-subtitle">CRM IMOBILIÁRIO</span>}</span>;
}
