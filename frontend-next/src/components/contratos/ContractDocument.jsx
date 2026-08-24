"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Home } from "lucide-react";
import { pickClauseIcon } from "@/lib/contract-icons";

// Palavras-chave que ganham negrito dentro do texto corrido das partes —
// funcionam como rótulo dentro da frase (CPF, RG, Rua, E-mail…), não a
// frase inteira em negrito.
const BOLD_KEYWORDS = /(CPF|RG|CNPJ|CRECI|E-mail|Tel|Rua|End\.|Estado civil)/g;

function withBoldTerms(text) {
  if (!text) return null;
  return text.split(BOLD_KEYWORDS).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-cx-text">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

// Blocos editáveis: um anel discreto no hover/foco avisa que dá para clicar
// e escrever, sem poluir o documento em repouso nem sair na impressão.
const EDITAVEL =
  "outline-none rounded-sm transition-colors hover:bg-cx-blue-soft/60 focus:bg-cx-blue-soft focus:ring-1 focus:ring-cx-blue/40 print:hover:bg-transparent print:focus:bg-transparent print:focus:ring-0";

// Documento de contrato em folha branca, no padrão dos instrumentos da
// Caixa: tarja azul institucional no topo, seções com friso, cláusulas
// numeradas em selo e rodapé de identificação da imobiliária.
//
// Cada bloco de texto é contentEditable; `serialize()` reconstrói o HTML
// "limpo" (papel formal, sem o chrome visual) para copiar/baixar. A
// impressão usa o próprio DOM (ver @media print no globals.css), por isso
// os blocos levam `contract-block` — é o que evita quebra no meio de uma
// cláusula ao paginar.
export const ContractDocument = forwardRef(function ContractDocument(
  { doc, empresaNome = "Sua Imobiliária" },
  ref,
) {
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
              }</span></div>`,
          )
          .join("")}</div>`;
      }

      return html;
    },
  }));

  return (
    <article className="overflow-hidden rounded-xl border border-cx-border bg-white shadow-lg shadow-black/5">
      {/* Tarja institucional */}
      <header className="bg-cx-blue px-6 py-5 sm:px-10 sm:py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/90">
            <Home className="h-5 w-5 shrink-0" strokeWidth={1.8} />
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em]">{empresaNome}</span>
          </div>
          <span className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/70">
            Instrumento particular
          </span>
        </div>

        <h1
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          className={`mt-4 text-center text-base font-bold uppercase leading-snug tracking-wide text-white sm:text-xl ${EDITAVEL} focus:bg-white/15 focus:ring-white/40`}
        >
          {doc.title}
        </h1>
        <div className="mx-auto mt-3 h-0.5 w-20 rounded-full bg-cx-orange" />
      </header>

      <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
        {/* ── Partes ───────────────────────────────────────────────── */}
        {doc.parties.length > 0 && (
          <section className="space-y-4">
            <SectionTitle>Partes contratantes</SectionTitle>

            <div className="space-y-3">
              {doc.parties.map((party, i) => (
                <div
                  key={i}
                  className="contract-block rounded-lg border border-cx-border bg-cx-bg/60 px-4 py-3.5"
                >
                  {party.label && (
                    <p className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-cx-blue">
                      {party.label}
                    </p>
                  )}
                  <p
                    ref={(el) => (partyRefs.current[i] = el)}
                    contentEditable
                    suppressContentEditableWarning
                    className={`text-[0.82rem] leading-relaxed text-cx-text ${EDITAVEL}`}
                  >
                    {withBoldTerms(party.detail)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Cláusulas ────────────────────────────────────────────── */}
        {doc.clauses.length > 0 && (
          <section className="space-y-4">
            <SectionTitle>Cláusulas e condições</SectionTitle>

            <ol className="space-y-5">
              {doc.clauses.map((clause, i) => {
                const Icon = pickClauseIcon(clause.title);
                return (
                  <li key={i} className="contract-block flex gap-3.5">
                    {/* Selo numerado */}
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cx-blue text-[0.7rem] font-bold text-white">
                      {clause.number}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 border-b border-cx-border pb-1.5">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-cx-orange-text" strokeWidth={2} />
                        <h3
                          ref={(el) => (clauseTitleRefs.current[i] = el)}
                          contentEditable
                          suppressContentEditableWarning
                          className={`flex-1 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-cx-blue ${EDITAVEL}`}
                        >
                          {clause.title}
                        </h3>
                      </div>

                      <p
                        ref={(el) => (clauseBodyRefs.current[i] = el)}
                        contentEditable
                        suppressContentEditableWarning
                        className={`mt-2 text-justify text-[0.82rem] leading-relaxed text-cx-text ${EDITAVEL}`}
                      >
                        {clause.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* ── Assinaturas ──────────────────────────────────────────── */}
        {doc.signature.length > 0 && (
          <section className="contract-block grid gap-x-10 gap-y-8 pt-6 sm:grid-cols-2">
            {doc.signature.map((caption, i) => (
              <div key={i} className="text-center">
                <div className="h-px w-full bg-cx-text/40" />
                <p
                  ref={(el) => (sigRefs.current[i] = el)}
                  contentEditable
                  suppressContentEditableWarning
                  className={`mt-2 text-[0.72rem] text-cx-muted ${EDITAVEL}`}
                >
                  {caption}
                </p>
              </div>
            ))}
          </section>
        )}

        {/* ── Testemunhas ──────────────────────────────────────────── */}
        <section className="contract-block pt-2">
          <p className="mb-4 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-cx-blue">Testemunhas</p>
          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {[1, 2].map((n) => (
              <div key={n} className="text-center">
                <div className="h-px w-full bg-cx-text/40" />
                <p className="mt-2 text-[0.72rem] text-cx-muted">
                  Nome: [NOME DA TESTEMUNHA {n}] — CPF: [000.000.000-00]
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Rodapé de identificação */}
      <footer className="grid gap-x-6 gap-y-2 border-t-2 border-cx-orange bg-cx-bg px-6 py-4 text-[0.65rem] leading-relaxed text-cx-muted sm:grid-cols-3 sm:px-10">
        <p>
          [Endereço do escritório]
          <br />
          CEP: [00000-000], [Cidade] – [UF]
        </p>
        <p>
          [(00) 00000-0000]
          <br />
          [contato@suaimobiliaria.com.br]
        </p>
        <p className="font-bold text-cx-text">
          {empresaNome}
          <br />
          <span className="font-normal text-cx-muted">CRECI [00000-J]</span>
        </p>
      </footer>
    </article>
  );
});

function SectionTitle({ children }) {
  return (
    <div>
      <h2 className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-cx-text">{children}</h2>
      <div className="mt-1.5 h-0.5 w-12 rounded-full bg-cx-orange" />
    </div>
  );
}
