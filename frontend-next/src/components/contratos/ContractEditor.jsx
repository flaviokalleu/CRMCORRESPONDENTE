"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Download, Printer, Scale } from "lucide-react";
import { ICONS } from "@/lib/contract-icons";
import { htmlToPlainText } from "@/lib/contract-templates";
import { ContractDocument } from "./ContractDocument";

const DOC_STYLES = `
  body { font-family: Georgia, "Times New Roman", serif; color:#1c1a17; line-height:1.75; max-width:760px; margin:48px auto; padding:0 24px; }
  .contract-title { font-size:1.35rem; font-weight:700; text-align:center; margin-bottom:1.5rem; }
  .contract-clause { font-size:1rem; font-weight:700; margin:1.75rem 0 .5rem; }
  .contract-p { margin:0 0 .9rem; font-size:.92rem; text-align:justify; }
  .contract-sig-row { display:flex; gap:2rem; margin-top:2.5rem; justify-content:space-between; }
  .contract-sig-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:.35rem; }
  .contract-sig-rule { width:100%; border-top:1px solid #a89e8f; }
  .contract-sig-caption { font-size:.78rem; color:#5c5850; }
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

  // Imprime a própria página (não um blob HTML reconstruído) — o CSS de
  // impressão global (@media print) esconde tudo exceto #contract-print-area,
  // então o PDF sai visualmente idêntico ao documento em tela (mesmas
  // classes, mesmas cores, mesmos ícones), sem precisar reconstruir estilo.
  const handlePrint = () => window.print();

  return (
    <div className="terminal-surface relative min-h-full">
      <div className="aurora left-[-8%] top-[-12%] h-72 w-72 bg-caixa-orange/8" />

      <div className="relative mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
        <div className="print:hidden">
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs font-medium text-white/45 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            Modelos de contrato
          </Link>

          <div className="mt-3 flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-caixa-orange to-caixa-orange-dark text-white shadow-lg shadow-caixa-orange/25">
              {Icon && <Icon className="h-5 w-5" strokeWidth={1.7} />}
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">{label}</h1>
              <p className="mt-0.5 text-sm text-white/45">{description}</p>
              {proposta && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] text-white/60">
                  <Scale className="h-3 w-3 text-caixa-orange-light" />
                  {proposta.cliente?.nome || "cliente"} <span className="text-white/25">·</span> {proposta.imovel?.nome_imovel || "imóvel"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Barra de ações */}
        <div className="print:hidden sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#0f1c33]/90 p-2 shadow-lg shadow-black/20 backdrop-blur-md">
          <p className="px-1 text-[0.7rem] text-white/40">
            Clique em qualquer bloco para editar — cada parte e cláusula tem seu próprio cartão.
          </p>
          <button onClick={handleCopy} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado!" : "Copiar texto"}
          </button>
          <button onClick={handleDownloadHtml} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white">
            {downloaded ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Download className="h-3.5 w-3.5" />}
            Baixar .html
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-caixa-orange to-caixa-orange-dark px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-caixa-orange/25 transition-transform hover:scale-[1.02]"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir / Salvar PDF
          </button>
        </div>

        <div id="contract-print-area">
          <ContractDocument ref={docRef} doc={doc} />
        </div>

        <p className="text-center text-[0.7rem] text-white/30 print:hidden">
          Campos entre colchetes [ASSIM] precisam ser preenchidos manualmente.
        </p>
      </div>
    </div>
  );
}
