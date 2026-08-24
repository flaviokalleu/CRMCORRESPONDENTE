// Filtros da vitrine pública.
//
// O endpoint /public/imoveis devolve a lista inteira sem parâmetros de busca,
// então o recorte acontece aqui, no servidor, antes de renderizar. Para o
// volume atual isso é adequado; se a carteira crescer muito, o filtro deve
// migrar para query no Go.

// O endereço vem no formato "Rua X, 123 - Bairro, Cidade/UF". A cidade é o
// trecho depois da última vírgula, antes da barra.
export function cidadeDoImovel(imovel) {
  const end = imovel?.endereco || "";
  const parte = end.split(",").pop() || "";
  return parte.split("/")[0].trim();
}

const normalizar = (s) =>
  (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export function valorDoImovel(imovel) {
  return imovel?.valor_venda || imovel?.valor_avaliacao || 0;
}

// Lista de opções montada a partir dos dados REAIS, não fixa no código — foi
// assim que "Cobertura" apareceu na carteira sem estar no filtro.
export function opcoesDeFiltro(imoveis = []) {
  const tipos = [...new Set(imoveis.map((i) => i.tipo).filter(Boolean))].sort();
  const cidades = [...new Set(imoveis.map(cidadeDoImovel).filter(Boolean))].sort();
  return { tipos, cidades };
}

export function filtrarImoveis(imoveis = [], filtros = {}) {
  const { cidade, tipo, ate, quartos } = filtros;
  const teto = Number(ate) || 0;
  const minQuartos = Number(quartos) || 0;

  return imoveis.filter((i) => {
    if (cidade && normalizar(cidadeDoImovel(i)) !== normalizar(cidade)) return false;
    if (tipo && normalizar(i.tipo) !== normalizar(tipo)) return false;
    if (teto > 0 && valorDoImovel(i) > teto) return false;
    if (minQuartos > 0 && (i.quartos || 0) < minQuartos) return false;
    return true;
  });
}

// Rótulos legíveis dos filtros ativos, para o usuário ver o que está aplicado
// e poder remover um a um.
export function filtrosAtivos(filtros = {}) {
  const brl = (n) =>
    Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const out = [];
  if (filtros.finalidade === "aluguel") out.push({ chave: "finalidade", rotulo: "Para alugar" });
  if (filtros.cidade) out.push({ chave: "cidade", rotulo: filtros.cidade });
  if (filtros.tipo) out.push({ chave: "tipo", rotulo: filtros.tipo });
  if (filtros.quartos) out.push({ chave: "quartos", rotulo: `${filtros.quartos}+ quartos` });
  if (filtros.ate) out.push({ chave: "ate", rotulo: `até ${brl(filtros.ate)}` });
  return out;
}
