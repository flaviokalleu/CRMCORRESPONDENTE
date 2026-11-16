"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, ImagePlus, Upload, X } from "@/components/icons";

// Confere um arquivo contra o `accept` do input ("image/*,application/pdf,.doc").
// O navegador só filtra a janela de escolha; arrastar ou "Todos os arquivos"
// passava qualquer coisa.
function aceita(file, accept) {
  if (!accept) return true;
  const nome = file.name.toLowerCase();
  const tipo = (file.type || "").toLowerCase();
  return accept.split(",").map((a) => a.trim().toLowerCase()).some((a) =>
    a.startsWith(".") ? nome.endsWith(a) : a.endsWith("/*") ? tipo.startsWith(a.slice(0, -1)) : tipo === a,
  );
}

// Área para escolher arquivos (toque ou clique) com prévia das imagens e
// botão para remover. `files` é sempre um array; `onChange` recebe o array novo.
// Arquivo fora do `accept` ou maior que `maxMB` é recusado com aviso na hora.
export function Dropzone({ id, files = [], onChange, accept, multiple = false, texto, imagem = false, maxMB = 10 }) {
  const [aviso, setAviso] = useState("");
  const previews = useMemo(
    () => (imagem ? files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })) : []),
    [files, imagem],
  );
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const Icone = imagem ? ImagePlus : Upload;
  const capaUnica = imagem && !multiple && previews[0];

  return (
    <div className="space-y-2">
      <label className="crm-dropzone" htmlFor={id}>
        {capaUnica ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capaUnica.url} alt={`Prévia de ${capaUnica.name}`} />
        ) : (
          <>
            <Icone aria-hidden="true" />
            <span>{texto ?? (multiple ? "Toque para escolher os arquivos" : "Toque para escolher o arquivo")}</span>
          </>
        )}
        <input
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          className="crm-dropzone-input"
          onChange={(e) => {
            const escolhidos = Array.from(e.target.files ?? []);
            const recusados = [];
            const novos = escolhidos.filter((f) => {
              if (!aceita(f, accept)) { recusados.push(`“${f.name}” não é um tipo aceito`); return false; }
              if (f.size > maxMB * 1024 * 1024) { recusados.push(`“${f.name}” passa de ${maxMB} MB`); return false; }
              return true;
            });
            setAviso(recusados.length ? `${recusados.join("; ")}. ${imagem ? "Envie fotos JPG, PNG ou WEBP." : ""}`.trim() : "");
            if (novos.length) onChange(multiple ? [...files, ...novos] : novos.slice(0, 1));
            e.target.value = "";
          }}
        />
      </label>
      {aviso && (
        <p id={`${id}-erro`} className="crm-field-error" role="alert">{aviso}</p>
      )}
      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {imagem && multiple ? (
            <div className="crm-thumbs">
              {previews.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.url} src={p.url} alt={p.name} />
              ))}
            </div>
          ) : !capaUnica ? (
            files.map((f, i) => (
              <span key={`${f.name}-${i}`} className="crm-file-chip">
                <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{f.name}</span>
              </span>
            ))
          ) : null}
          <button type="button" className="crm-link-btn" onClick={() => onChange([])}>
            <X className="h-4 w-4" aria-hidden="true" /> {files.length > 1 ? "Remover todos" : "Remover"}
          </button>
        </div>
      )}
    </div>
  );
}
