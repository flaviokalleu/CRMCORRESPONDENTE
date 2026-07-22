import { apiGet } from "@/lib/api-server";
import { ContratoVincularForm } from "@/components/aluguel/ContratoVincularForm";
import { ContratoRowActions } from "@/components/aluguel/ContratoRowActions";

export const metadata = { title: "Contratos" };

// Server Component: lista de contratos de aluguel. Busca direto no backend
// Go (Bearer via cookie httpOnly). Referência de lógica:
// frontend/src/pages/ContratosList.jsx (frontend/src/components/ListaContratos.jsx).
export default async function ContratosListPage() {
  const [contratos, opcoes] = await Promise.all([apiGet("/contratos"), apiGet("/contratos/opcoes")]);

  const lista = contratos || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Gerenciamento de Contratos</h1>
        <p className="text-sm text-white/50 mt-1">Cadastre e gerencie todos os contratos de aluguel</p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-base font-semibold text-white mb-4">Novo contrato</h2>
        <ContratoVincularForm opcoes={opcoes || { imoveis: [], proprietarios: [], inquilinos: [] }} />
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-base font-semibold text-white mb-4">Contratos cadastrados</h2>
        {lista.length === 0 ? (
          <p className="text-white/50 text-sm">Nenhum contrato cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04]">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-white/70">ID</th>
                  <th className="px-4 py-2 text-left font-medium text-white/70">Inquilino</th>
                  <th className="px-4 py-2 text-left font-medium text-white/70">Imóvel</th>
                  <th className="px-4 py-2 text-left font-medium text-white/70">Proprietário</th>
                  <th className="px-4 py-2 text-left font-medium text-white/70">Documentos</th>
                  <th className="px-4 py-2 text-left font-medium text-white/70">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} className="border-t border-white/5">
                    <td className="px-4 py-2 text-white/80">#{c.id}</td>
                    <td className="px-4 py-2 text-white">{c.nome || c.inquilino_nome || "-"}</td>
                    <td className="px-4 py-2 text-white/70">{c.imovel?.nome_imovel || "Não vinculado"}</td>
                    <td className="px-4 py-2 text-white/70">{c.proprietario?.name || c.proprietario_nome || "-"}</td>
                    <td className="px-4 py-2 text-white/70">
                      {Array.isArray(c.contrato_documentos) ? c.contrato_documentos.length : 0}
                    </td>
                    <td className="px-4 py-2">
                      <ContratoRowActions contrato={c} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
