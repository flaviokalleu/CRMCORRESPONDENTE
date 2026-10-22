import Link from "next/link";
import { House } from "@/components/icons";
import { LoginBrandPanel } from "@/components/LoginBrandPanel";

// Moldura das telas de acesso no padrão Login InnLex: divisão 55/45 —
// painel da marca à esquerda, o formulário (children) à direita. Abaixo de
// 980px fica só o formulário, com o logo no topo.
export function AuthSplit({ title, description, children, footer }) {
  return (
    <div className="lg">
      <LoginBrandPanel />
      <section className="lg-side">
        <div className="lg-side-top">
          <Link href="/" className="lg-side-logo"><House /><span>Webba <span>CRM</span></span></Link>
        </div>
        <div className="lg-main">
          <div className="lg-panel">
            <div className="lg-mark" aria-hidden="true"><House /></div>
            <h2 className="lg-title">{title}</h2>
            {description && <p className="lg-desc">{description}</p>}
            {children}
            {footer && <p className="lg-help">{footer}</p>}
          </div>
        </div>
        <div className="lg-legal"><span>© {new Date().getFullYear()} Webba CRM</span><Link href="/">Voltar ao site</Link></div>
      </section>
    </div>
  );
}
