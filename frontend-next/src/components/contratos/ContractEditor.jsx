"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Download, Printer, Scale } from "lucide-react";
import { ICONS } from "@/lib/contract-icons";
import { htmlToPlainText } from "@/lib/contract-templates";
import { ContractDocument } from "./ContractDocument";

const DOC_STYLES = `
  body { font-family: Georgia, "Times New Roman", serif; color:#1f2a37; line-height:1.75; max-width:760px; margin:48px auto; padding:0 24px; }
  .contract-title { font-size:1.35rem; font-weight:700; text-align:center; margin-bottom:1.5rem; }
  .contract-clause { font-size:1rem; font-weight:700; margin:1.75rem 0 .5rem; }
  .contract-p { margin:0 0 .9rem; font-size:.92rem; text-align:justify; }
  .contract-sig-row { display:flex; gap:2rem; margin-top:2.5rem; justify-content:space-between; }
  .contract-sig-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:.35rem; }
  .contract-sig-rule { width:100%; border-top:1px solid #9aa6b4; }
  .contract-sig-caption { font-size:.78rem; color:#5b6b7c; }
`;

// CSS aplicado SÓ no documento de impressão (iframe). Mantém o visual da
// tela e resolve o que é específico de papel: tamanho A4, margens, cores de
// fundo preservadas (o navegador não as imprime por padrão) e cláusulas que
// não podem ser partidas no meio por uma quebra de página.
const PRINT_CSS = `
  /* As margens do papel são do @page. O documento então usa 100% da área
     útil — nada de padding do card competindo com a margem e encolhendo o
     texto para o meio da folha. */
  @page { size: A4; margin: 14mm; }
  html, body { background:#fff !important; margin:0; padding:0; width:auto; }

  /* Sem print-color-adjust: exact o Chrome descarta a tarja azul e os selos,
     e o contrato sai desbotado — o oposto de elegante. */
  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  #contract-print-area { box-shadow:none !important; }
  #contract-print-area article {
    border:0 !important; border-radius:0 !important; box-shadow:none !important;
    width:100% !important;
  }
  /* O miolo perde o padding lateral (a margem já é do papel); a tarja e o
     rodapé mantêm um respiro interno para o texto não encostar na cor. */
  #contract-print-area article > div {
    padding-left:0 !important; padding-right:0 !important;
    padding-top:7mm !important;
  }
  #contract-print-area article > header,
  #contract-print-area article > footer {
    padding-left:6mm !important; padding-right:6mm !important;
  }

  /* Cada parte, cláusula e bloco de assinatura é indivisível. */
  .contract-block { break-inside: avoid; page-break-inside: avoid; }
  h1, h2, h3 { break-after: avoid; page-break-after: avoid; }
`;

// Editor de contrato — cada parte e cada cláusula é um cartão com sua
// própria cor/selo (ver ContractDocument), cobrindo o documento inteiro em
// vez de um bloco único de texto. Cópia/download/impressão reconstroem a
// versão "limpa" (papel formal, sem o chrome colorido) a partir do que foi
// editado nos cartões.
export function ContractEditor({ tipo, label, description, iconName, doc, proposta, backHref }) {
  const docRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const Icon = ICONS[iconName];

  const getCleanHtml = () => docRef.current?.serialize() || "";

  const handleCopy = async () => {
    const text = htmlToPlainText(getCleanHtml());
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadHtml = () => {
    const content = getCleanHtml();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${label}</title><style>${DOC_STYLES}</style></head><body>${content}</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tipo}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1500);
  };

  // Impressão em IFRAME dedicado.
  //
  // Antes isto era `window.print()` na própria página, contando com o
  // @media print global para esconder o chrome. Não funciona de forma
  // confiável: o documento vive dentro do shell do app (h-screen +
  // overflow hidden em três níveis), e o que ia para o papel era a fatia
  // visível do container rolável, não o contrato inteiro.
  //
  // Aqui montamos um documento isolado: clonamos o #contract-print-area,
  // copiamos as folhas de estilo da página (para o visual ser IDÊNTICO ao
  // da tela, com a tarja azul, os selos e as fontes) e aplicamos o CSS de
  // papel — A4, margens, cores preservadas e quebra de página que respeita
  // os blocos. Sem shell, sem scroll, sem hacks de position.
  const handlePrint = () => {
    const alvo = document.getElementById("contract-print-area");
    if (!alvo) return;

    const estilos = [...document.querySelectorAll('style, link[rel="stylesheet"]')]
      .map((n) => n.outerHTML)
      .join("");

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    // A largura do iframe precisa ser a ÁREA ÚTIL do papel, não a folha
    // inteira: o Chrome diagrama no tamanho do iframe e depois encaixa no
    // espaço imprimível. Com 794px (A4 cheia) contra 182mm de área útil ele
    // reduz tudo ~13%, e o contrato sai pequeno, sobrando borda — foi o
    // "não ocupa a folha".
    //   A4 210mm - margens 2x14mm = 182mm ≈ 688px a 96dpi.
    // Com width:0 seria pior ainda: o texto quebraria letra a letra.
    iframe.style.cssText =
      "position:fixed;left:-10000px;top:0;width:688px;height:1000px;border:0;opacity:0;";
    document.body.appendChild(iframe);

    const limpar = () => iframe.remove();

    // As fontes do app (next/font) chegam como variáveis CSS declaradas em
    // classes NO <html>. Sem copiar essas classes, o iframe cai no serif
    // padrão do navegador e o papel sai com outra tipografia que a tela.
    const classesHtml = document.documentElement.className;

    const doc = iframe.contentDocument;
    doc.open();
    doc.write(
      `<!DOCTYPE html><html lang="pt-BR" class="${classesHtml}"><head><meta charset="utf-8">` +
        `<title>${label}</title>${estilos}<style>${PRINT_CSS}</style></head>` +
        `<body>${alvo.outerHTML}</body></html>`,
    );
    doc.close();

    const imprimir = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        // O print() é modal na maioria dos navegadores, mas no Chrome ele
        // retorna antes de o usuário fechar o diálogo — por isso a remoção
        // atrasada, senão o iframe some no meio da impressão.
        setTimeout(limpar, 1000);
      }
    };

    // Espera as fontes/estilos assentarem para o papel não sair sem estilo.
    const pronto = doc.fonts?.ready ?? Promise.resolve();
    pronto.then(() => setTimeout(imprimir, 80)).catch(() => setTimeout(imprimir, 300));
  };

  return (
    <div className="cx-page min-h-full">
      <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
        <div className="print:hidden">
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs font-medium text-cx-muted hover:text-cx-text">
            <ArrowLeft className="h-3.5 w-3.5" />
            Modelos de contrato
          </Link>

          <div className="mt-3 flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cx-blue text-white">
              {Icon && <Icon className="h-5 w-5" strokeWidth={1.7} />}
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-cx-text">{label}</h1>
              <p className="mt-0.5 text-sm text-cx-muted">{description}</p>
              {proposta && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-cx-border bg-cx-surface px-2.5 py-1 text-[0.7rem] text-cx-muted">
                  <Scale className="h-3 w-3 text-cx-orange-text" />
                  {proposta.cliente?.nome || "cliente"} <span className="text-cx-muted">·</span> {proposta.imovel?.nome_imovel || "imóvel"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Barra de ações */}
        <div className="print:hidden sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-cx-border bg-cx-surface/95 p-2 shadow-md shadow-black/5 backdrop-blur-md">
          <p className="px-1 text-[0.7rem] text-cx-muted">
            Clique em qualquer bloco para editar — cada parte e cláusula tem seu próprio cartão.
          </p>
          <button onClick={handleCopy} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-cx-muted transition-colors hover:bg-cx-bg hover:text-cx-text">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado!" : "Copiar texto"}
          </button>
          <button onClick={handleDownloadHtml} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-cx-muted transition-colors hover:bg-cx-bg hover:text-cx-text">
            {downloaded ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Download className="h-3.5 w-3.5" />}
            Baixar .html
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cx-orange px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cx-orange-dark"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir / Salvar PDF
          </button>
        </div>

        <div id="contract-print-area">
          <ContractDocument ref={docRef} doc={doc} />
        </div>

        <p className="text-center text-[0.7rem] text-cx-muted print:hidden">
          Campos entre colchetes [ASSIM] precisam ser preenchidos manualmente.
        </p>
      </div>
    </div>
  );
}
