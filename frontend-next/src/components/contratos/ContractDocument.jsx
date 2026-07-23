"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Handshake, Home, User } from "lucide-react";
import { pickClauseIcon } from "@/lib/contract-icons";

// Palavras-chave que ganham negrito dentro do texto corrido das partes —
// replica o padrão do modelo de referência (CPF, RG, Rua, E-mail... em
// negrito como rótulo dentro da frase, não a frase toda).
const BOLD_KEYWORDS = /(CPF|RG|CNPJ|CRECI|E-mail|Tel|Rua|End\.|Estado civil)/g;

function withBoldTerms(text) {
  if (!text) return null;
  return text.split(BOLD_KEYWORDS).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-bold">
        {part}
      </strong>
    ) : (
      part
    )
  );
}

const isPrazoClause = (title) => /praz|vig[êe]ncia/i.test(title || "");

// Timeline decorativa para cláusulas de prazo/vigência — réplica do
// elemento gráfico do modelo de referência (linha com extremidades em
// teal, marcos de data, selo central). Puramente ilustrativa.
function PrazoTimeline() {
  return (
    <div className="my-3 flex items-center gap-0" contentEditable={false}>
      <span className="h-8 w-1.5 shrink-0 rounded-full bg-teal-500" />
      <div className="relative h-px flex-1 bg-[#141210]">
        <span className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#141210]" />
        <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#141210]" />
        <span className="absolute left-0 -top-6 text-[0.65rem] font-bold uppercase text-[#141210]">[Data início]</span>
        <span className="absolute right-0 -top-6 text-[0.65rem] font-bold uppercase text-[#141210]">[Data término]</span>
        <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-dashed border-[#141210] bg-[#FDFCFA]">
          <Handshake className="h-4 w-4 text-teal-600" strokeWidth={2} />
        </span>
      </div>
      <span className="h-8 w-1.5 shrink-0 rounded-full bg-teal-500" />
    </div>
  );
}

// Documento no estilo "template de imobiliária" (folha branca, faixa navy
// no cabeçalho com friso teal, avatares circulares conectados por uma
// linha às fichas de cada parte, pílulas navy com ícone por assunto de
// cláusula, rodapé de três colunas) — réplica do padrão de mercado
// (Box Imobiliário 360 / Redesign360) em vez de cartões escuros genéricos.
// Cada bloco de texto continua contentEditable; `serialize()` reconstrói o
// HTML "limpo" (papel formal) para copiar/baixar/imprimir.
export const ContractDocument = forwardRef(function ContractDocument({ doc, empresaNome = "Sua Imobiliária" }, ref) {
  const titleRef = useRef(null);
  const partyRefs = useRef([]);
  const clauseTitleRefs = useRef([]);
  const clauseBodyRefs = useRef([]);
  const sigRefs = useRef([]);

  useImperativeHandle(ref, () => ({
    serialize() {
      let html = `<h1 class="contract-title">${titleRef.current?.innerHTML || ""}</h1>`;

      doc.parties.forEach((party, i) => {
        const detail = partyRefs.current[i]?.innerHTML || "";
        html += party.label
          ? `<p class="contract-p"><strong>${party.label}:</strong> ${detail}</p>`
          : `<p class="contract-p">${detail}</p>`;
      });

      doc.clauses.forEach((clause, i) => {
        const title = clauseTitleRefs.current[i]?.innerHTML || "";
        const body = clauseBodyRefs.current[i]?.innerHTML || "";
        html += `<h3 class="contract-clause">CLÁUSULA ${clause.number}ª — ${title}</h3><p class="contract-p">${body}</p>`;
      });

      if (doc.signature.length) {
        html += `<div class="contract-sig-row">${doc.signature
          .map(
            (_, i) =>
              `<div class="contract-sig-col"><span class="contract-sig-rule"></span><span class="contract-sig-caption">${
                sigRefs.current[i]?.innerHTML || ""
              }</span></div>`
          )
          .join("")}</div>`;
      }

      return html;
    },
  }));

  return (
    <div className="overflow-hidden rounded-sm bg-[#FDFCFA] text-[#141210] shadow-2xl shadow-black/40">
      {/* Faixa de cabeçalho — navy com friso teal, logo à direita */}
      <div className="flex items-center justify-between gap-4 pr-6 pt-6 sm:pr-10 sm:pt-8">
        <div className="flex items-center rounded-r-xl border-y-2 border-r-2 border-teal-400 bg-gradient-to-br from-caixa-primary to-caixa-secondary py-4 pl-6 pr-6 sm:py-5 sm:pl-10">
          <h1
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            className="text-sm font-extrabold uppercase leading-snug tracking-wide text-white outline-none sm:text-lg"
          >
            {doc.title}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[#0b1426]">
          <Home className="h-7 w-7 text-teal-500" strokeWidth={1.6} />
          <span className="hidden text-[0.65rem] font-extrabold uppercase tracking-widest sm:inline">{empresaNome}</span>
        </div>
      </div>

      <div className="space-y-7 px-6 pb-8 pt-10 sm:px-10 sm:pt-12">
        {/* Partes — cabeçalho de seção sublinhado + avatar conectado ao texto */}
        {doc.parties.length > 0 && (
          <div className="space-y-6">
            {doc.parties.map((party, i) => (
              <div key={i}>
                {party.label && (
                  <div className="mb-3">
                    <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#0b1426]">{party.label}</h2>
                    <div className="mt-1 h-0.5 w-14 rounded-full bg-teal-500" />
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <div className="flex shrink-0 flex-col items-center self-stretch">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-teal-500 text-teal-600">
                      <User className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span className="mt-1 w-0.5 flex-1 rounded-full bg-teal-500/25" />
                  </div>
                  <p
                    ref={(el) => (partyRefs.current[i] = el)}
                    contentEditable
                    suppressContentEditableWarning
                    className="flex-1 pb-1 pt-1 text-sm leading-relaxed text-[#141210] outline-none"
                  >
                    {withBoldTerms(party.detail)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Título da seção de cláusulas */}
        {doc.clauses.length > 0 && (
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#0b1426]">Cláusulas e condições</h2>
            <div className="mt-1.5 h-0.5 w-16 rounded-full bg-teal-500" />
          </div>
        )}

        {/* Cláusulas — pílula navy com ícone do assunto + texto numerado */}
        <div className="space-y-5">
          {doc.clauses.map((clause, i) => {
            const Icon = pickClauseIcon(clause.title);
            return (
              <div key={i}>
                <div className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-caixa-primary to-caixa-secondary px-3.5 py-1.5 shadow-sm">
                  <h3
                    ref={(el) => (clauseTitleRefs.current[i] = el)}
                    contentEditable
                    suppressContentEditableWarning
                    className="text-xs font-bold uppercase tracking-wide text-white outline-none"
                  >
                    {clause.title}
                  </h3>
                  <Icon className="h-3.5 w-3.5 shrink-0 text-teal-400" strokeWidth={2} />
                </div>

                {isPrazoClause(clause.title) && <PrazoTimeline />}

                <p className="mt-2 pl-1 text-sm leading-relaxed text-[#141210]">
                  <strong className="font-bold">{clause.number})</strong>{" "}
                  <span
                    ref={(el) => (clauseBodyRefs.current[i] = el)}
                    contentEditable
                    suppressContentEditableWarning
                    className="text-justify outline-none"
                  >
                    {clause.body}
                  </span>
                </p>
              </div>
            );
          })}
        </div>

        {/* Assinaturas */}
        {doc.signature.length > 0 && (
          <div className="flex flex-wrap gap-x-10 gap-y-6 pt-8">
            {doc.signature.map((caption, i) => (
              <div key={i} className="min-w-[200px] flex-1 text-center">
                <div className="h-px w-full bg-[#a89e8f]" />
                <p
                  ref={(el) => (sigRefs.current[i] = el)}
                  contentEditable
                  suppressContentEditableWarning
                  className="mt-2 text-xs text-[#5c5850] outline-none"
                >
                  {caption}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rodapé — três colunas com divisores + bloco de acento teal */}
      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2 border-t-2 border-teal-500 bg-[#f4f1ea] px-6 py-3.5 text-[0.65rem] text-[#5c5850] sm:px-10">
        <p className="border-r border-[#d4cfc7] pr-6">[Endereço do escritório]<br />CEP: [00000-000], [Cidade] – [UF]</p>
        <p className="border-r border-[#d4cfc7] pr-6">[(00) 00000-0000]<br />[contato@suaimobiliaria.com.br]</p>
        <p className="font-bold text-[#141210]">
          {empresaNome}
          <br />
          <span className="font-normal text-[#5c5850]">CRECI [00000-J]</span>
        </p>
        <span className="absolute bottom-0 right-0 h-full w-3 bg-teal-500" />
      </div>
    </div>
  );
});
