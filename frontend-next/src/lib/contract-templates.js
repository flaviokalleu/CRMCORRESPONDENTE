// Pacote de modelos de contrato da imobiliária — texto gerado no cliente
// (sem depender de um endpoint novo no Go por tipo), pré-preenchido com os
// dados já disponíveis (cliente, imóvel, proposta) e com placeholders
// claros ([...]) para o que só existe no papel (prazo, fiador, testemunhas
// etc.). O resultado é sempre um texto editável — nunca um PDF fechado.
//
// Cobre os documentos que uma imobiliária/corretor de fato usa no dia a
// dia: venda, locação, intermediação/corretagem e administração.

const fmtMoeda = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);

const fmtData = (d) => {
  const date = d ? new Date(d) : new Date();
  if (Number.isNaN(date.getTime())) return "[DATA]";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};

const hoje = () => fmtData(new Date());

function ctxFrom({ cliente, imovel, proposta, empresa } = {}) {
  return {
    empresaNome: empresa?.nome || "[RAZÃO SOCIAL DA IMOBILIÁRIA]",
    empresaCnpj: empresa?.cnpj || "[CNPJ]",
    empresaEndereco: empresa?.endereco || "[ENDEREÇO DA IMOBILIÁRIA]",
    empresaCreci: empresa?.creci || "[CRECI-J]",

    clienteNome: cliente?.nome || "[NOME COMPLETO DA PARTE]",
    clienteCpf: cliente?.cpf || "[CPF]",
    clienteEstadoCivil: cliente?.estado_civil || "[ESTADO CIVIL]",
    clienteProfissao: cliente?.profissao || "[PROFISSÃO]",
    clienteEmail: cliente?.email || "[E-MAIL]",
    clienteTelefone: cliente?.telefone || "[TELEFONE]",

    imovelNome: imovel?.nome_imovel || "[IDENTIFICAÇÃO DO IMÓVEL]",
    imovelEndereco: imovel?.endereco || "[ENDEREÇO COMPLETO DO IMÓVEL]",
    imovelTipo: imovel?.tipo || "imóvel",
    imovelLocalizacao: imovel?.localizacao || "[CIDADE/UF]",
    imovelValorVenda: imovel?.valor_venda ? fmtMoeda(imovel.valor_venda) : "[VALOR]",
    imovelDescricao: imovel?.descricao_imovel || "[DESCRIÇÃO/CARACTERÍSTICAS DO IMÓVEL]",
    imovelQuartos: imovel?.quartos != null ? String(imovel.quartos) : "[Nº]",
    imovelBanheiros: imovel?.banheiro != null ? String(imovel.banheiro) : "[Nº]",

    valorOfertado: proposta?.valor_ofertado ? fmtMoeda(proposta.valor_ofertado) : "[VALOR ACORDADO]",
    formaPagamento: proposta?.forma_pagamento || "[FORMA DE PAGAMENTO]",

    // Fiador do cliente (quando cadastrado no CRM) — útil como garantia
    // locatícia já pré-preenchida em contratos de locação.
    clientePossuiFiador: !!cliente?.possui_fiador,
    clienteFiadorNome: cliente?.fiador_nome || "[NOME DO(A) FIADOR(A)]",
    clienteFiadorCpf: cliente?.fiador_cpf || "[CPF DO(A) FIADOR(A)]",
    clienteFiadorTelefone: cliente?.fiador_telefone || "[TELEFONE DO(A) FIADOR(A)]",
    clienteFiadorEmail: cliente?.fiador_email || "[E-MAIL DO(A) FIADOR(A)]",

    hoje: hoje(),
  };
}

// Ícone (nome do lucide-react) + tom por grupo — resolvido para o
// componente real na UI (gallery/editor), o template fica livre de React.
export const CONTRACT_GROUPS = [
  {
    label: "Locação",
    icon: "KeyRound",
    tone: "blue",
    description: "Contratos de aluguel e gestão do imóvel locado.",
    types: ["locacao_residencial", "locacao_comercial", "administracao_imoveis"],
  },
  {
    label: "Compra e venda",
    icon: "Handshake",
    tone: "orange",
    description: "Do sinal à escritura definitiva.",
    types: ["compra_venda", "promessa_compra_venda", "recibo_sinal"],
  },
  {
    label: "Intermediação",
    icon: "Briefcase",
    tone: "blue",
    description: "Autorizações e corretagem entre proprietário e imobiliária.",
    types: ["autorizacao_venda", "autorizacao_locacao", "prestacao_servico_corretagem"],
  },
  {
    label: "Encerramento",
    icon: "FileX",
    tone: "orange",
    description: "Distrato e rescisão de contratos vigentes.",
    types: ["rescisao_contrato"],
  },
];

// Ícone por tipo específico (mais preciso que o ícone do grupo).
export const CONTRACT_ICONS = {
  locacao_residencial: "Home",
  locacao_comercial: "Store",
  administracao_imoveis: "ClipboardList",
  compra_venda: "FileSignature",
  promessa_compra_venda: "FileClock",
  recibo_sinal: "Receipt",
  autorizacao_venda: "Megaphone",
  autorizacao_locacao: "KeyRound",
  prestacao_servico_corretagem: "Briefcase",
  rescisao_contrato: "FileX",
};

export const CONTRACT_TYPES = {
  locacao_residencial: {
    label: "Locação residencial",
    description: "Contrato de aluguel entre locador e locatário pessoa física.",
    build: (ctx) => {
      const c = ctxFrom(ctx);
      return `CONTRATO DE LOCAÇÃO RESIDENCIAL

LOCADOR(A): [NOME COMPLETO DO(A) PROPRIETÁRIO(A)], [nacionalidade], [estado civil], [profissão], portador(a) da cédula de identidade (RG) nº [RG] e inscrito(a) no CPF sob o nº [CPF], residente e domiciliado(a) em [ENDEREÇO COMPLETO DO(A) LOCADOR(A)], e-mail [E-MAIL DO(A) LOCADOR(A)], telefone [TELEFONE DO(A) LOCADOR(A)], doravante denominado(a) simplesmente LOCADOR(A).

LOCATÁRIO(A): ${c.clienteNome}, ${c.clienteEstadoCivil}, ${c.clienteProfissao}, portador(a) da cédula de identidade (RG) nº [RG DO(A) LOCATÁRIO(A)] e inscrito(a) no CPF sob o nº ${c.clienteCpf}, residente em [ENDEREÇO COMPLETO DO(A) LOCATÁRIO(A)], e-mail ${c.clienteEmail}, telefone/WhatsApp ${c.clienteTelefone}, doravante denominado(a) simplesmente LOCATÁRIO(A).

FIADOR(A)/GARANTIDOR(A): ${c.clientePossuiFiador ? `${c.clienteFiadorNome}, portador(a) do CPF nº ${c.clienteFiadorCpf}, telefone ${c.clienteFiadorTelefone}, e-mail ${c.clienteFiadorEmail}` : "[NOME COMPLETO DO(A) FIADOR(A), CPF, ENDEREÇO — PREENCHER SOMENTE SE A GARANTIA ADOTADA FOR A FIANÇA]"}.

INTERVENIENTE ANUENTE: ${c.empresaNome}, pessoa jurídica inscrita no CNPJ sob o nº ${c.empresaCnpj}, inscrição CRECI ${c.empresaCreci}, com sede em ${c.empresaEndereco}, doravante denominada simplesmente IMOBILIÁRIA.

As partes acima identificadas, qualificadas na forma do art. 104 e seguintes do Código Civil, têm entre si justo e acertado o presente Contrato de Locação Residencial, que se regerá pela Lei nº 8.245/1991 (Lei do Inquilinato), pelo Código Civil e pelas cláusulas seguintes:

CLÁUSULA 1ª — DO OBJETO
O(A) LOCADOR(A), na qualidade de legítimo(a) proprietário(a) e possuidor(a), dá em locação ao(à) LOCATÁRIO(A), que aceita, o imóvel do tipo ${c.imovelTipo}, denominado "${c.imovelNome}", situado em ${c.imovelEndereco}, ${c.imovelLocalizacao}, matrícula nº [MATRÍCULA NO CARTÓRIO DE REGISTRO DE IMÓVEIS], com as seguintes características: ${c.imovelDescricao}, ${c.imovelQuartos} dormitório(s) e ${c.imovelBanheiros} banheiro(s), destinado exclusivamente a fins residenciais, vedada a utilização para fins comerciais, industriais ou qualquer finalidade distinta sem prévia e expressa anuência, por escrito, do(a) LOCADOR(A) e da IMOBILIÁRIA.

CLÁUSULA 2ª — DA VISTORIA E DO ESTADO DO IMÓVEL
As partes procederão, na data de entrega das chaves, à vistoria de entrada do imóvel, da qual resultará laudo/termo descritivo e, sempre que possível, fotográfico, assinado por ambas as partes, que passa a integrar este contrato como Anexo I e servirá de parâmetro para a vistoria de saída ao término da locação; presume-se, na ausência de ressalvas expressas no termo, que o imóvel foi entregue em perfeito estado de conservação, limpeza e funcionamento das instalações elétricas, hidráulicas e demais equipamentos.

CLÁUSULA 3ª — DO PRAZO
O prazo da locação é de [PRAZO EM MESES] meses, com início em [DATA DE INÍCIO] e término em [DATA DE TÉRMINO], podendo ser prorrogado exclusivamente mediante termo aditivo escrito e assinado por ambas as partes.

CLÁUSULA 4ª — DA PRORROGAÇÃO
Findo o prazo ajustado sem manifestação de qualquer das partes, ou permanecendo o(a) LOCATÁRIO(A) na posse do imóvel por mais de 30 (trinta) dias sem oposição do(a) LOCADOR(A), a locação prorrogar-se-á automaticamente por prazo indeterminado, nos termos do art. 46, §1º, da Lei nº 8.245/1991, podendo, a partir de então, ser denunciada por qualquer das partes mediante aviso prévio escrito de 30 (trinta) dias, conforme art. 46, §2º, c/c art. 6º da mesma lei.

CLÁUSULA 5ª — DO ALUGUEL, FORMA DE PAGAMENTO E REAJUSTE
O aluguel mensal é de ${c.valorOfertado || "[VALOR DO ALUGUEL]"}, a ser pago até o dia [DIA] de cada mês, mediante [PIX/boleto/depósito/transferência bancária], diretamente ao(à) LOCADOR(A) ou à IMOBILIÁRIA quando esta estiver encarregada da cobrança, sendo o valor locatício reajustado anualmente, a cada aniversário deste contrato, pela variação acumulada do IGP-M/FGV no período, ou, em caso de sua extinção ou indisponibilidade, por outro índice oficial equivalente que reflita a correção monetária, a ser definido pelas partes ou por norma legal superveniente.

CLÁUSULA 6ª — DO ATRASO NO PAGAMENTO
O não pagamento do aluguel e demais encargos até a data do vencimento sujeitará o(a) LOCATÁRIO(A), independentemente de prévia notificação, à multa moratória de 2% (dois por cento) sobre o valor em atraso, a juros de mora de 1% (um por cento) ao mês, calculados pro rata die, e à correção monetária pelo mesmo índice de reajuste do aluguel, sem prejuízo da cobrança judicial do débito e da rescisão contratual com desocupação do imóvel por meio de ação de despejo, nos termos dos arts. 9º, II, e 62 e seguintes da Lei nº 8.245/1991.

CLÁUSULA 7ª — DA GARANTIA LOCATÍCIA
Como garantia do fiel cumprimento das obrigações assumidas neste contrato, as partes elegem a modalidade de ${c.clientePossuiFiador ? "fiança, prestada pelo(a) fiador(a) acima qualificado(a), que responde solidária e ilimitadamente pelas obrigações do(a) LOCATÁRIO(A) até a efetiva entrega das chaves, inclusive em caso de prorrogação do prazo contratual, renunciando expressamente ao benefício de ordem previsto no art. 827 do Código Civil e obrigando-se a manter, sob pena de rescisão contratual, idoneidade financeira e patrimonial equivalente à existente na data da assinatura" : "[caução em dinheiro, limitada ao equivalente a 3 (três) aluguéis nos termos do art. 38 da Lei nº 8.245/1991 / fiança / seguro-fiança / cessão fiduciária de quotas de fundo de investimento — especificar a modalidade escolhida, o valor e as condições de constituição, depósito e devolução da garantia]"}, sendo vedada, nos termos do art. 37, parágrafo único, da Lei do Inquilinato, a exigência cumulativa de mais de uma modalidade de garantia no mesmo contrato de locação.

CLÁUSULA 8ª — DO USO, DA CONSERVAÇÃO E DAS BENFEITORIAS
O(A) LOCATÁRIO(A) obriga-se a usar o imóvel exclusivamente para os fins pactuados, tratando-o com o mesmo zelo como se fosse seu, e a restituí-lo ao término da locação no estado em que o recebeu, conforme termo de vistoria de entrada, ressalvados os desgastes decorrentes do uso normal e regular; as benfeitorias necessárias, ainda que não autorizadas, e as úteis, desde que previamente autorizadas por escrito pelo(a) LOCADOR(A), serão indenizáveis e conferem direito de retenção nos termos dos arts. 35 e 36 da Lei nº 8.245/1991, ao passo que as benfeitorias voluptuárias não serão indenizadas, podendo ser levantadas pelo(a) LOCATÁRIO(A) ao término do contrato desde que não comprometam a estrutura ou a segurança do imóvel.

CLÁUSULA 9ª — DA SUBLOCAÇÃO E DA CESSÃO
É vedada a sublocação, cessão, empréstimo ou transferência, total ou parcial, do imóvel ou deste contrato, bem como a alteração de sua destinação, sem o prévio e expresso consentimento, por escrito, do(a) LOCADOR(A) e da IMOBILIÁRIA, sob pena de rescisão contratual imediata, sem prejuízo da multa prevista na Cláusula 12ª e da imediata retomada do imóvel.

CLÁUSULA 10ª — DAS DESPESAS E ENCARGOS
Correm por conta exclusiva do(a) LOCATÁRIO(A), a partir da entrega das chaves, as despesas ordinárias de condomínio, água, energia elétrica, gás, internet e demais taxas de consumo, bem como o IPTU quando expressamente pactuado entre as partes; correm por conta do(a) LOCADOR(A) as despesas extraordinárias de condomínio, assim entendidas as obras de reforma, decoração, pintura de fachadas e instalação de equipamentos de segurança, nos termos do art. 22, X, da Lei nº 8.245/1991, salvo disposição em contrário expressamente ajustada entre as partes.

CLÁUSULA 11ª — DO DIREITO DE PREFERÊNCIA
Na hipótese de o(a) LOCADOR(A) pretender alienar o imóvel durante a vigência desta locação, fica assegurado ao(à) LOCATÁRIO(A) o direito de preferência para adquiri-lo em igualdade de condições com terceiros, devendo o(a) LOCADOR(A) dar-lhe ciência do negócio mediante notificação por escrito com todas as condições da proposta, para manifestação no prazo de 30 (trinta) dias, sob pena de decadência, nos termos dos arts. 27 a 34 da Lei nº 8.245/1991.

CLÁUSULA 12ª — DA RESCISÃO ANTECIPADA E DA MULTA
A devolução do imóvel antes do término do prazo contratual pelo(a) LOCATÁRIO(A), sem justa causa, sujeitará este(a) ao pagamento de multa compensatória equivalente a 3 (três) aluguéis vigentes à época da rescisão, reduzida proporcionalmente ao período de cumprimento do contrato, nos termos do art. 4º da Lei nº 8.245/1991, ressalvada a hipótese de comprovada transferência do(a) LOCATÁRIO(A) por seu empregador para prestar serviços em localidade diversa, desde que notificado o(a) LOCADOR(A) com antecedência mínima de 30 (trinta) dias, mediante prova documental idônea.

CLÁUSULA 13ª — DA RESCISÃO POR INFRAÇÃO E DA AÇÃO DE DESPEJO
O descumprimento de qualquer obrigação contratual ou legal por qualquer das partes, inclusive o inadimplemento do aluguel ou encargos por período superior a 30 (trinta) dias, autoriza a parte prejudicada a considerar rescindido o contrato de pleno direito e a promover a imediata retomada do imóvel pelas vias legais cabíveis, inclusive ação de despejo, sem prejuízo da cobrança dos débitos em aberto, da multa compensatória prevista na Cláusula 12ª e de eventuais perdas e danos apurados.

CLÁUSULA 14ª — DA COMISSÃO DE INTERMEDIAÇÃO DA IMOBILIÁRIA
Pela intermediação e efetiva aproximação das partes que resultou na celebração deste contrato, é devida à IMOBILIÁRIA a comissão previamente ajustada com o(a) LOCADOR(A) em instrumento próprio de autorização de locação, comissão essa irretratável e irrevogável desde a assinatura deste contrato, nos termos do art. 725 do Código Civil, permanecendo devida ainda que as partes venham a desistir de sua concretização ou a alterar posteriormente as condições originalmente intermediadas; a IMOBILIÁRIA não responde pela solvência das partes, por vícios ocultos do imóvel não declarados pelo(a) LOCADOR(A), tampouco pela regularidade dos pagamentos futuros do aluguel quando não lhe for confiada a administração da locação em contrato específico.

CLÁUSULA 15ª — DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
Os dados pessoais das partes e, quando houver, do(a) fiador(a), coletados e tratados no âmbito deste contrato (nome, CPF/RG, endereço, e-mail, telefone e demais informações necessárias à qualificação civil e à execução do negócio), serão tratados pela IMOBILIÁRIA e pelas demais partes exclusivamente para as finalidades de formalização, execução, cobrança e cumprimento de obrigações legais e regulatórias decorrentes deste contrato, com fundamento no art. 7º, incisos V e X, da Lei nº 13.709/2018 (LGPD), sendo conservados pelo prazo necessário ao cumprimento dessas finalidades e de obrigações legais, fiscais e regulatórias, podendo ser compartilhados com cartórios, seguradoras, instituições financeiras e órgãos públicos quando estritamente necessário à execução do negócio, assegurados às partes os direitos previstos no art. 18 da referida lei.

CLÁUSULA 16ª — DAS COMUNICAÇÕES E NOTIFICAÇÕES
Toda comunicação, notificação, interpelação ou citação relativa a este contrato será considerada válida quando dirigida aos endereços físicos e eletrônicos indicados na qualificação das partes, presumindo-se recebida a que for enviada por carta com aviso de recebimento, e-mail com confirmação de entrega ou aplicativo de mensagens ao número de telefone indicado, cabendo a cada parte comunicar formalmente eventual alteração de endereço ou contato, sob pena de reputarem-se válidas as comunicações remetidas ao último endereço informado.

CLÁUSULA 17ª — DAS DISPOSIÇÕES GERAIS
Este instrumento representa a integralidade do acordo entre as partes quanto ao seu objeto, substituindo tratativas e entendimentos anteriores, verbais ou escritos; a tolerância de qualquer das partes quanto ao descumprimento de obrigação aqui prevista não implicará novação ou renúncia; a cessão da posição contratual somente será válida mediante anuência prévia e expressa da outra parte e da IMOBILIÁRIA; a eventual nulidade de qualquer cláusula não prejudicará a validade das demais; e o presente contrato é firmado em 3 (três) vias de igual teor e forma, na presença de duas testemunhas.

CLÁUSULA 18ª — DO FORO
Fica eleito o foro da comarca de ${c.imovelLocalizacao}, por ser o local de situação do imóvel, para dirimir quaisquer dúvidas ou litígios oriundos deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja, ressalvado o foro de domicílio do(a) LOCATÁRIO(A) quando este for consumidor(a) nos termos do Código de Defesa do Consumidor.

E por estarem justas e contratadas, as partes assinam o presente instrumento.

${c.imovelLocalizacao}, ${c.hoje}.


_______________________________________          _______________________________________
LOCADOR(A)                                        LOCATÁRIO(A): ${c.clienteNome}


_______________________________________          _______________________________________
FIADOR(A)/GARANTIDOR(A) (quando houver)           INTERVENIENTE: ${c.empresaNome}


_______________________________________          _______________________________________
TESTEMUNHA 1 (Nome/CPF)                           TESTEMUNHA 2 (Nome/CPF)`;
    },
  },

  locacao_comercial: {
    label: "Locação comercial",
    description: "Contrato de aluguel para uso comercial/empresarial.",
    build: (ctx) => {
      const c = ctxFrom(ctx);
      return `CONTRATO DE LOCAÇÃO NÃO RESIDENCIAL (COMERCIAL)

LOCADOR(A): [NOME/RAZÃO SOCIAL DO(A) PROPRIETÁRIO(A)], [nacionalidade/qualificação], inscrito(a) no CPF/CNPJ sob o nº [DOCUMENTO], com sede/residência em [ENDEREÇO DO(A) LOCADOR(A)], e-mail [E-MAIL DO(A) LOCADOR(A)], telefone [TELEFONE DO(A) LOCADOR(A)].

LOCATÁRIO(A): ${c.clienteNome}, [ou razão social/CNPJ da empresa exploradora do ponto, se pessoa jurídica], inscrito(a) no CPF/CNPJ sob o nº ${c.clienteCpf}, com sede/residência em [ENDEREÇO DO(A) LOCATÁRIO(A)], e-mail ${c.clienteEmail}, telefone ${c.clienteTelefone}.

FIADOR(A)/GARANTIDOR(A): [NOME COMPLETO, CPF/CNPJ, ENDEREÇO — PREENCHER QUANDO A GARANTIA ADOTADA FOR A FIANÇA].

INTERVENIENTE ANUENTE: ${c.empresaNome}, CNPJ ${c.empresaCnpj}, CRECI ${c.empresaCreci}, com sede em ${c.empresaEndereco}, doravante denominada IMOBILIÁRIA.

As partes têm entre si justo e acertado o presente Contrato de Locação Não Residencial, regido pela Lei nº 8.245/1991, pelo Código Civil e pelas cláusulas seguintes:

CLÁUSULA 1ª — DO OBJETO E DA DESTINAÇÃO
Locação do imóvel do tipo ${c.imovelTipo}, "${c.imovelNome}", situado em ${c.imovelEndereco}, ${c.imovelLocalizacao}, matrícula nº [MATRÍCULA NO CARTÓRIO], com as características ${c.imovelDescricao}, destinado exclusivamente à atividade de [RAMO DE ATIVIDADE], vedado uso diverso sem anuência expressa e por escrito do(a) LOCADOR(A).

CLÁUSULA 2ª — DA VISTORIA E DO ESTADO DO IMÓVEL
Na entrega das chaves será lavrado termo de vistoria descritivo e fotográfico, assinado pelas partes, que passa a integrar este contrato como Anexo I e servirá de parâmetro para a vistoria de saída, presumindo-se, na ausência de ressalva, a entrega do imóvel em perfeitas condições de uso.

CLÁUSULA 3ª — DO PRAZO
Prazo de [PRAZO EM MESES] meses, com início em [DATA DE INÍCIO] e término em [DATA DE TÉRMINO], prorrogável exclusivamente mediante termo aditivo escrito.

CLÁUSULA 4ª — DA AÇÃO RENOVATÓRIA
Caso o(a) LOCATÁRIO(A) explore no imóvel o mesmo ramo de atividade por prazo mínimo ininterrupto de 5 (cinco) anos, contados da soma dos prazos dos contratos escritos sucessivamente celebrados, poderá exercer o direito à renovação compulsória do contrato mediante ação renovatória, a ser proposta no prazo decadencial entre 1 (um) ano e 6 (seis) meses anteriores ao termo final deste contrato, nos termos dos arts. 51 a 57 da Lei nº 8.245/1991, sob pena de decadência do direito.

CLÁUSULA 5ª — DO ALUGUEL E REAJUSTE
Aluguel mensal de ${c.valorOfertado || "[VALOR DO ALUGUEL]"}, pago até o dia [DIA] de cada mês, mediante [PIX/boleto/transferência], reajustado anualmente pela variação acumulada do IGP-M/FGV, ou índice equivalente que o substitua.

CLÁUSULA 6ª — DO ATRASO NO PAGAMENTO
O atraso no pagamento do aluguel e encargos sujeitará o(a) LOCATÁRIO(A) a multa moratória de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês pro rata die e correção monetária pelo índice de reajuste, sem prejuízo da ação de despejo e da cobrança do débito.

CLÁUSULA 7ª — DA GARANTIA LOCATÍCIA
Modalidade de garantia adotada: [caução em dinheiro, limitada a 3 (três) aluguéis / fiança / seguro-fiança / cessão fiduciária de quotas de fundo de investimento], vedada a cumulação de mais de uma modalidade, nos termos do art. 37, parágrafo único, da Lei nº 8.245/1991, devendo os detalhes de valor e forma de constituição ser especificados em anexo próprio.

CLÁUSULA 8ª — DAS BENFEITORIAS E ADAPTAÇÕES
As benfeitorias necessárias, ainda que não autorizadas, e as úteis, quando previamente autorizadas por escrito, serão indenizáveis e conferem direito de retenção, nos termos dos arts. 35 e 36 da Lei nº 8.245/1991; as benfeitorias voluptuárias e as adaptações próprias do ramo de atividade do(a) LOCATÁRIO(A) (letreiros, instalações, divisórias) não serão indenizadas e deverão ser removidas ao término do contrato, com reposição do imóvel ao estado original, correndo os custos por conta do(a) LOCATÁRIO(A).

CLÁUSULA 9ª — DA SUBLOCAÇÃO, CESSÃO E TRESPASSE
É vedada a sublocação, cessão do contrato ou trespasse do fundo de comércio sem prévia anuência, por escrito, do(a) LOCADOR(A), sob pena de rescisão contratual imediata e aplicação da multa prevista na Cláusula 11ª.

CLÁUSULA 10ª — DAS DESPESAS E TRIBUTOS
Correm por conta do(a) LOCATÁRIO(A) o IPTU, as taxas, o condomínio ordinário e extraordinário e as despesas de consumo (água, luz, gás, internet) incidentes sobre o imóvel a partir da entrega das chaves, salvo disposição em contrário expressamente pactuada entre as partes.

CLÁUSULA 11ª — DA RESCISÃO ANTECIPADA E DA MULTA
A devolução do imóvel antes do término do prazo, sem justa causa, sujeita a parte infratora à multa compensatória equivalente a 3 (três) aluguéis vigentes, reduzida proporcionalmente ao período de cumprimento do contrato, nos termos do art. 4º da Lei nº 8.245/1991, sem prejuízo de perdas e danos comprovados.

CLÁUSULA 12ª — DA RESCISÃO POR INFRAÇÃO
O descumprimento de qualquer cláusula, inclusive o inadimplemento do aluguel por mais de 30 (trinta) dias, autoriza a parte prejudicada a rescindir o contrato de pleno direito e a promover a retomada do imóvel pelas vias legais cabíveis, inclusive ação de despejo, sem prejuízo da cobrança dos débitos e da multa prevista na Cláusula 11ª.

CLÁUSULA 13ª — DA COMISSÃO DE INTERMEDIAÇÃO DA IMOBILIÁRIA
É devida à IMOBILIÁRIA a comissão de intermediação previamente ajustada com o(a) LOCADOR(A), irretratável e irrevogável desde a assinatura deste contrato, nos termos do art. 725 do Código Civil, não respondendo a IMOBILIÁRIA pela solvência das partes nem por vícios ocultos do imóvel não declarados pelo(a) LOCADOR(A).

CLÁUSULA 14ª — DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
Os dados pessoais e cadastrais das partes serão tratados pela IMOBILIÁRIA exclusivamente para as finalidades de formalização, execução e cobrança das obrigações decorrentes deste contrato, com fundamento no art. 7º, incisos V e X, da Lei nº 13.709/2018, sendo conservados pelo prazo necessário ao cumprimento de tais finalidades e das obrigações legais, fiscais e regulatórias correlatas, assegurados os direitos do art. 18 da mesma lei.

CLÁUSULA 15ª — DAS COMUNICAÇÕES E NOTIFICAÇÕES
As comunicações relativas a este contrato serão válidas quando dirigidas aos endereços físico e eletrônico indicados na qualificação das partes, cabendo a cada parte informar formalmente eventual alteração de contato, sob pena de reputarem-se válidas as comunicações remetidas ao último endereço conhecido.

CLÁUSULA 16ª — DAS DISPOSIÇÕES GERAIS
Este instrumento representa a integralidade do acordo entre as partes; a cessão da posição contratual depende de anuência prévia e expressa da outra parte e da IMOBILIÁRIA; a nulidade de qualquer cláusula não prejudica as demais; o contrato é firmado em 3 (três) vias de igual teor, na presença de duas testemunhas.

CLÁUSULA 17ª — DO FORO
Fica eleito o foro da comarca de ${c.imovelLocalizacao}, local de situação do imóvel, com renúncia a qualquer outro, por mais privilegiado que seja.

${c.imovelLocalizacao}, ${c.hoje}.


_______________________________________          _______________________________________
LOCADOR(A)                                        LOCATÁRIO(A): ${c.clienteNome}


_______________________________________          _______________________________________
FIADOR(A)/GARANTIDOR(A) (quando houver)           INTERVENIENTE: ${c.empresaNome}


_______________________________________          _______________________________________
TESTEMUNHA 1 (Nome/CPF)                           TESTEMUNHA 2 (Nome/CPF)`;
    },
  },

  administracao_imoveis: {
    label: "Administração de imóveis",
    description: "Proprietário contrata a imobiliária para administrar a locação.",
    build: (ctx) => {
      const c = ctxFrom(ctx);
      return `CONTRATO DE ADMINISTRAÇÃO DE IMÓVEIS

CONTRATANTE (PROPRIETÁRIO/A): [NOME COMPLETO DO(A) PROPRIETÁRIO(A)], [nacionalidade], [estado civil], [profissão], CPF nº [CPF], residente em [ENDEREÇO DO(A) PROPRIETÁRIO(A)], e-mail [E-MAIL], telefone [TELEFONE].

CONTRATADA (ADMINISTRADORA): ${c.empresaNome}, CNPJ ${c.empresaCnpj}, CRECI ${c.empresaCreci}, com sede em ${c.empresaEndereco}.

CLÁUSULA 1ª — DO OBJETO E DOS PODERES OUTORGADOS
A CONTRATANTE outorga à CONTRATADA mandato para administrar a locação do imóvel "${c.imovelNome}", situado em ${c.imovelEndereco}, ${c.imovelLocalizacao}, compreendendo os poderes para divulgar o imóvel, selecionar e qualificar candidatos à locação, celebrar e assinar o respectivo contrato de locação em nome da CONTRATANTE mediante prévia aprovação desta, cobrar e receber aluguéis e encargos, promover a cobrança extrajudicial de débitos e representar a CONTRATANTE perante o(a) inquilino(a) nos assuntos rotineiros de administração, ficando ressalvado que atos de disposição do imóvel (venda, oneração) dependem de instrumento de mandato específico.

CLÁUSULA 2ª — DA TAXA DE ADMINISTRAÇÃO
Pela administração da locação, a CONTRATADA fará jus a uma taxa de administração de [PERCENTUAL]% sobre o valor de cada aluguel efetivamente recebido, descontada diretamente no repasse mensal, devida enquanto vigorar o contrato de locação administrado, independentemente do número de meses de vigência.

CLÁUSULA 3ª — DOS SERVIÇOS ADICIONAIS
Havendo necessidade de locação de novo inquilino, renovação contratual ou intermediação de venda do imóvel durante a vigência deste contrato, será devida à CONTRATADA a comissão específica correspondente, conforme tabela de honorários do CRECI regional e nos termos de instrumento de autorização próprio, não estando tais serviços incluídos na taxa de administração prevista na Cláusula 2ª.

CLÁUSULA 4ª — DO REPASSE DE VALORES
Os valores líquidos, deduzidas a taxa de administração e eventuais despesas previamente autorizadas, serão repassados à CONTRATANTE em até [X] dias úteis após o recebimento do aluguel pelo(a) inquilino(a), via [PIX/transferência bancária] para a conta indicada pela CONTRATANTE, que se responsabiliza pela exatidão dos dados bancários fornecidos.

CLÁUSULA 5ª — DA COBRANÇA E DA INADIMPLÊNCIA DO(A) INQUILINO(A)
A CONTRATADA se compromete a adotar a régua de cobrança usual do mercado (notificação, negativação e ajuizamento de ação de cobrança/despejo, mediante autorização e a expensas da CONTRATANTE) em caso de inadimplência do(a) inquilino(a); a CONTRATADA atua exclusivamente como mandatária/administradora, não respondendo pela solvência do(a) inquilino(a) nem se obrigando a antecipar ou garantir o pagamento dos aluguéis não recebidos, salvo se expressamente contratada, em instrumento apartado e mediante remuneração específica, a garantia de aluguéis (afiançadora).

CLÁUSULA 6ª — DAS OBRIGAÇÕES DA CONTRATADA
Zelar pela regularidade dos pagamentos, prestar contas mensalmente à CONTRATANTE, comunicar-lhe eventuais sinistros, resultados de vistorias e necessidade de reparos que excedam o valor de [VALOR LIMITE] sem prévia autorização, bem como manter a documentação da locação organizada e disponível para consulta.

CLÁUSULA 7ª — DAS OBRIGAÇÕES DA CONTRATANTE
Manter o imóvel em condições de habitabilidade e regularidade documental, arcar com reparos estruturais e custos que não sejam de responsabilidade do(a) inquilino(a) por lei ou pelo contrato de locação, fornecer à CONTRATADA a documentação atualizada do imóvel e autorizar, por escrito, despesas que superem o limite fixado na Cláusula 6ª.

CLÁUSULA 8ª — DA VISTORIA E MANUTENÇÃO
A CONTRATADA realizará ou acompanhará as vistorias de entrada e saída do imóvel, comunicando à CONTRATANTE eventuais danos ou pendências identificadas, cabendo a esta autorizar os reparos necessários no prazo de [PRAZO] dias.

CLÁUSULA 9ª — DO PRAZO E DA RESCISÃO
Este contrato vigora por prazo de [PRAZO] meses, renovável automaticamente por períodos iguais e sucessivos, podendo ser rescindido por qualquer das partes mediante aviso prévio por escrito de 30 (trinta) dias, sem prejuízo da conclusão dos atos de administração em curso e da prestação de contas final.

CLÁUSULA 10ª — DA VENDA DIRETA E DA COMISSÃO DE INTERMEDIAÇÃO
Caso a CONTRATANTE aliene o imóvel diretamente, ou por intermédio de terceiros, a pessoa apresentada, ainda que indiretamente, pela CONTRATADA durante a vigência deste contrato ou em até 90 (noventa) dias após seu término, será devida à CONTRATADA a comissão de intermediação praticada pelo mercado local, nos termos do art. 725 do Código Civil, a título de cláusula de vênia, independentemente da atuação da CONTRATADA ter sido apenas administrativa.

CLÁUSULA 11ª — DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
Os dados pessoais da CONTRATANTE, do(a) inquilino(a) e de eventuais fiadores, tratados no âmbito da administração da locação, serão utilizados pela CONTRATADA exclusivamente para as finalidades de execução deste contrato e do contrato de locação administrado, com fundamento no art. 7º, incisos V e X, da Lei nº 13.709/2018, podendo ser compartilhados com cartórios, birôs de crédito, seguradoras e instituições financeiras quando necessário à execução do negócio, assegurados os direitos do art. 18 da mesma lei.

CLÁUSULA 12ª — DAS COMUNICAÇÕES E NOTIFICAÇÕES
As comunicações relativas a este contrato serão válidas quando dirigidas aos endereços físico e eletrônico indicados na qualificação das partes, presumindo-se recebidas as enviadas por carta com aviso de recebimento, e-mail ou aplicativo de mensagens.

CLÁUSULA 13ª — DAS DISPOSIÇÕES GERAIS
Este instrumento representa a integralidade do acordo entre as partes quanto à administração do imóvel; a cessão da posição contratual depende de anuência prévia e expressa da outra parte; a nulidade de qualquer cláusula não prejudica as demais; o contrato é firmado em 2 (duas) vias de igual teor.

CLÁUSULA 14ª — DO FORO
Fica eleito o foro da comarca de ${c.imovelLocalizacao}, local de situação do imóvel, com renúncia a qualquer outro, por mais privilegiado que seja.

${c.imovelLocalizacao}, ${c.hoje}.


_______________________________________          _______________________________________
CONTRATANTE (Proprietário/a)                      CONTRATADA: ${c.empresaNome}


_______________________________________          _______________________________________
TESTEMUNHA 1 (Nome/CPF)                           TESTEMUNHA 2 (Nome/CPF)`;
    },
  },

  compra_venda: {
    label: "Compra e venda",
    description: "Escritura particular de compra e venda definitiva do imóvel.",
    build: (ctx) => {
      const c = ctxFrom(ctx);
      return `INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL

VENDEDOR(A): [NOME COMPLETO DO(A) PROPRIETÁRIO(A)], [nacionalidade], [estado civil], [profissão], portador(a) da cédula de identidade (RG) nº [RG] e inscrito(a) no CPF sob o nº [CPF], residente e domiciliado(a) em [ENDEREÇO DO(A) VENDEDOR(A)], e-mail [E-MAIL DO(A) VENDEDOR(A)], telefone [TELEFONE DO(A) VENDEDOR(A)].

COMPRADOR(A): ${c.clienteNome}, ${c.clienteEstadoCivil}, ${c.clienteProfissao}, portador(a) da cédula de identidade (RG) nº [RG DO(A) COMPRADOR(A)] e inscrito(a) no CPF sob o nº ${c.clienteCpf}, residente em [ENDEREÇO DO(A) COMPRADOR(A)], e-mail ${c.clienteEmail}, telefone ${c.clienteTelefone}.

INTERVENIENTE ANUENTE: ${c.empresaNome}, CNPJ ${c.empresaCnpj}, CRECI ${c.empresaCreci}, com sede em ${c.empresaEndereco}, doravante denominada IMOBILIÁRIA.

As partes têm entre si justo e contratado o presente instrumento particular de compra e venda, regido pelos arts. 481 e seguintes do Código Civil e pelas cláusulas a seguir:

CLÁUSULA 1ª — DO OBJETO
O(A) VENDEDOR(A) vende, como de fato vendido tem, ao(à) COMPRADOR(A), que compra, o imóvel "${c.imovelNome}", tipo ${c.imovelTipo}, situado em ${c.imovelEndereco}, ${c.imovelLocalizacao}, matrícula nº [MATRÍCULA NO CARTÓRIO DE REGISTRO DE IMÓVEIS], com as características ${c.imovelDescricao}, livre e desembaraçado de quaisquer ônus, dívidas, hipotecas, penhoras ou gravames que não os aqui expressamente declarados.

CLÁUSULA 2ª — DA REGULARIDADE DO IMÓVEL E DA MATRÍCULA
O(A) VENDEDOR(A) declara, sob as penas da lei, que é o(a) legítimo(a) e único(a) proprietário(a) do imóvel, que este se encontra livre de ações judiciais, penhoras, hipotecas, dívidas de condomínio, IPTU e quaisquer outros ônus reais ou pessoais não constantes da matrícula atualizada, obrigando-se a apresentar, antes da lavratura da escritura definitiva, certidões de propriedade e ônus reais atualizadas (concentradas na matrícula do imóvel, nos termos da Lei nº 13.097/2015, para fins de eficácia perante terceiros) e certidões pessoais de distribuidores cíveis, trabalhistas, fiscais e de protesto, respondendo pela evicção nos termos dos arts. 447 a 457 do Código Civil caso o(a) COMPRADOR(A) venha a perder, total ou parcialmente, a posse ou a propriedade do imóvel em razão de fato anterior a este contrato.

CLÁUSULA 3ª — DO PREÇO E DA FORMA DE PAGAMENTO
O preço certo e ajustado é de ${c.valorOfertado || c.imovelValorVenda}, a ser pago pelo(a) COMPRADOR(A) na forma: ${c.formaPagamento}, conforme cronograma detalhado a seguir: [DETALHAR PARCELAS, DATAS, DADOS DO FINANCIAMENTO BANCÁRIO E/OU UTILIZAÇÃO DE FGTS, SE HOUVER], reconhecendo as partes que o preço reflete o justo valor de mercado livremente negociado.

CLÁUSULA 4ª — DO ATRASO NO PAGAMENTO
O atraso no pagamento de qualquer parcela sujeitará o(a) COMPRADOR(A) a multa moratória de 2% (dois por cento) sobre o valor em atraso, juros de mora de 1% (um por cento) ao mês e correção monetária pelo IGP-M/FGV ou índice equivalente, sem prejuízo do vencimento antecipado das demais parcelas a critério do(a) VENDEDOR(A) em caso de atraso superior a [30] dias.

CLÁUSULA 5ª — DA POSSE E DA ENTREGA DAS CHAVES
A posse do imóvel será transmitida ao(à) COMPRADOR(A) em [DATA], condicionada à quitação integral do preço ou à condição pactuada na Cláusula 3ª, mediante entrega das chaves e lavratura de termo de vistoria/entrega, correndo por conta do(a) VENDEDOR(A), até a efetiva transmissão da posse, a manutenção do imóvel e o pagamento de suas despesas ordinárias.

CLÁUSULA 6ª — DOS VÍCIOS REDIBITÓRIOS
Responde o(a) VENDEDOR(A) pelos vícios ou defeitos ocultos que tornem o imóvel impróprio ao uso a que se destina ou lhe diminuam o valor, dos quais não tinha conhecimento e não declarou ao(à) COMPRADOR(A), nos termos dos arts. 441 a 446 do Código Civil, ficando desde já ressalvado que os vícios aparentes, identificáveis mediante vistoria prévia realizada pelo(a) COMPRADOR(A) antes da assinatura deste instrumento, foram por este(a) aceitos no estado em que se encontram.

CLÁUSULA 7ª — DAS CONDIÇÕES SUSPENSIVAS
Caso o pagamento total ou parcial do preço dependa da aprovação de financiamento bancário ou da liberação de recursos de FGTS, este contrato fica submetido à condição suspensiva de aprovação do crédito no prazo de [PRAZO] dias, nos termos do art. 125 do Código Civil, hipótese em que, não aprovado o financiamento por motivo não imputável ao(à) COMPRADOR(A), as partes restituir-se-ão ao estado anterior, com devolução dos valores eventualmente pagos, deduzida a comissão de corretagem já devida nos termos da Cláusula 11ª.

CLÁUSULA 8ª — DA ESCRITURA DEFINITIVA E DAS DESPESAS DE TRANSFERÊNCIA
As partes se comprometem a outorgar a escritura pública definitiva de compra e venda em até [PRAZO] dias após a quitação total do preço e a implementação das condições suspensivas, correndo por conta do(a) COMPRADOR(A) as despesas de ITBI, escritura pública e registro junto ao Cartório de Registro de Imóveis competente, e por conta do(a) VENDEDOR(A) eventuais débitos e certidões necessárias à comprovação da regularidade do imóvel, salvo disposição em contrário expressamente pactuada.

CLÁUSULA 9ª — DOS TRIBUTOS E DÉBITOS ANTERIORES
Os tributos, taxas condominiais e demais encargos incidentes sobre o imóvel até a data da efetiva transmissão da posse são de responsabilidade do(a) VENDEDOR(A), ainda que seus vencimentos ocorram em data posterior, passando a correr por conta do(a) COMPRADOR(A) a partir de então.

CLÁUSULA 10ª — DA CLÁUSULA PENAL E DA RESCISÃO
O descumprimento injustificado deste instrumento por qualquer das partes sujeitará o infrator ao pagamento de multa penal compensatória de 10% (dez por cento) sobre o valor do negócio, sem prejuízo da execução específica da obrigação de fazer (outorga da escritura), da rescisão contratual e de eventuais perdas e danos comprovados, aplicando-se, na compra e venda em que o(a) COMPRADOR(A) for consumidor(a), a proporcionalidade e a vedação a cláusulas abusivas previstas no Código de Defesa do Consumidor.

CLÁUSULA 11ª — DA COMISSÃO DE CORRETAGEM
A comissão de corretagem, no percentual de [PERCENTUAL]% sobre o valor da venda, é devida à IMOBILIÁRIA pela parte [VENDEDOR(A)/COMPRADOR(A)] responsável pela contratação da intermediação, nos termos do art. 725 do Código Civil, sendo irretratável e devida integralmente desde a data da assinatura deste instrumento ou do recebimento de sinal, ainda que as partes venham posteriormente a desistir do negócio, resilir ou rescindir este contrato por acordo mútuo, uma vez que a obrigação de resultado da IMOBILIÁRIA (efetiva aproximação das partes) já se encontra cumprida.

CLÁUSULA 12ª — DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
Os dados pessoais das partes, coletados e tratados no âmbito deste contrato, serão utilizados pela IMOBILIÁRIA exclusivamente para as finalidades de formalização, execução e cumprimento de obrigações legais decorrentes deste negócio, com fundamento no art. 7º, incisos V e X, da Lei nº 13.709/2018, podendo ser compartilhados com cartórios, instituições financeiras e órgãos públicos quando necessário à execução do negócio, assegurados os direitos do art. 18 da mesma lei.

CLÁUSULA 13ª — DAS COMUNICAÇÕES E NOTIFICAÇÕES
As comunicações relativas a este contrato serão válidas quando dirigidas aos endereços físico e eletrônico indicados na qualificação das partes, cabendo a cada parte informar formalmente eventual alteração de contato.

CLÁUSULA 14ª — DAS DISPOSIÇÕES GERAIS
Este instrumento representa a integralidade do acordo entre as partes quanto ao seu objeto; a cessão de direitos e obrigações decorrentes deste contrato depende de anuência prévia e expressa da outra parte; a nulidade de qualquer cláusula não prejudica as demais; o presente instrumento é firmado em 3 (três) vias de igual teor e forma, na presença de duas testemunhas.

CLÁUSULA 15ª — DO FORO
Fica eleito o foro da comarca de ${c.imovelLocalizacao}, local de situação do imóvel, com renúncia a qualquer outro, por mais privilegiado que seja, ressalvado o foro de domicílio do(a) COMPRADOR(A) quando este for consumidor(a), nos termos do Código de Defesa do Consumidor.

${c.imovelLocalizacao}, ${c.hoje}.


_______________________________________          _______________________________________
VENDEDOR(A)                                       COMPRADOR(A): ${c.clienteNome}


_______________________________________          _______________________________________
INTERVENIENTE: ${c.empresaNome}                  TESTEMUNHA 1 (Nome/CPF)


_______________________________________
TESTEMUNHA 2 (Nome/CPF)`;
    },
  },

  promessa_compra_venda: {
    label: "Promessa de compra e venda",
    description: "Compromisso preliminar antes da escritura definitiva.",
    build: (ctx) => {
      const c = ctxFrom(ctx);
      return `CONTRATO DE PROMESSA (COMPROMISSO) DE COMPRA E VENDA

PROMITENTE VENDEDOR(A): [NOME COMPLETO DO(A) PROPRIETÁRIO(A)], [nacionalidade], [estado civil], CPF nº [CPF], residente em [ENDEREÇO DO(A) PROMITENTE VENDEDOR(A)], e-mail [E-MAIL], telefone [TELEFONE].

PROMITENTE COMPRADOR(A): ${c.clienteNome}, ${c.clienteEstadoCivil}, ${c.clienteProfissao}, CPF ${c.clienteCpf}, residente em [ENDEREÇO DO(A) PROMITENTE COMPRADOR(A)], e-mail ${c.clienteEmail}, telefone ${c.clienteTelefone}.

INTERVENIENTE ANUENTE: ${c.empresaNome}, CNPJ ${c.empresaCnpj}, CRECI ${c.empresaCreci}, doravante denominada IMOBILIÁRIA.

As partes têm entre si justo e contratado o presente compromisso de compra e venda, regido pelos arts. 417 a 420 e 481 e seguintes do Código Civil e pelas cláusulas seguintes:

CLÁUSULA 1ª — DO OBJETO
Promessa de venda do imóvel "${c.imovelNome}", tipo ${c.imovelTipo}, situado em ${c.imovelEndereco}, ${c.imovelLocalizacao}, matrícula nº [MATRÍCULA NO CARTÓRIO], nas condições estabelecidas neste instrumento.

CLÁUSULA 2ª — DO PREÇO E DO SINAL (ARRAS CONFIRMATÓRIAS)
O preço total ajustado é de ${c.valorOfertado || c.imovelValorVenda}, tendo o(a) PROMITENTE COMPRADOR(A) pago, neste ato, o sinal de [VALOR DO SINAL], a título de arras confirmatórias, nos termos do art. 417 do Código Civil, o qual integra o preço total e tem caráter irretratável, confirmando a obrigação de ambas as partes de concluir o negócio, não se tratando de arras penitenciais e, portanto, não sendo lícito a qualquer das partes arrepender-se do negócio sem sujeição às consequências previstas na Cláusula 7ª.

CLÁUSULA 3ª — DO SALDO E DA FORMA DE PAGAMENTO
O saldo remanescente de [VALOR] será pago na forma: [DETALHAR: parcelas / financiamento bancário / FGTS], até [DATA LIMITE], sujeitando-se o atraso à multa moratória de 2% (dois por cento), juros de 1% (um por cento) ao mês e correção monetária pelo IGP-M/FGV.

CLÁUSULA 4ª — DA CONDIÇÃO SUSPENSIVA
Caso o pagamento do saldo dependa de aprovação de financiamento bancário, este compromisso fica submetido à condição suspensiva de aprovação do crédito no prazo de [PRAZO] dias, nos termos do art. 125 do Código Civil, não aprovado o qual por motivo não imputável ao(à) PROMITENTE COMPRADOR(A), as partes se restituirão ao estado anterior, com devolução do sinal, deduzida a comissão de corretagem já devida nos termos da Cláusula 9ª.

CLÁUSULA 5ª — DA REGULARIDADE DO IMÓVEL
O(A) PROMITENTE VENDEDOR(A) declara, sob as penas da lei, que o imóvel está livre de ônus, dívidas e ações judiciais não declaradas, comprometendo-se a apresentar as certidões negativas necessárias à lavratura da escritura definitiva, respondendo por eventuais vícios ocultos nos termos dos arts. 441 a 446 do Código Civil.

CLÁUSULA 6ª — DA POSSE
A posse do imóvel será transferida ao(à) PROMITENTE COMPRADOR(A) em [DATA/CONDIÇÃO], mediante termo de vistoria e entrega de chaves.

CLÁUSULA 7ª — DO INADIMPLEMENTO E DAS ARRAS
Em caso de desistência ou inadimplemento do(a) PROMITENTE COMPRADOR(A), o sinal pago ficará retido, em caráter compensatório, em favor do(a) PROMITENTE VENDEDOR(A) e da IMOBILIÁRIA (na proporção da comissão devida), nos termos do art. 418 do Código Civil; em caso de desistência ou inadimplemento do(a) PROMITENTE VENDEDOR(A), este(a) devolverá o sinal em dobro, atualizado monetariamente, conforme o mesmo dispositivo legal, sem prejuízo de a parte lesada exigir a execução específica da obrigação de outorgar a escritura definitiva, nos termos do art. 464 do Código Civil, em vez de se valer da resolução do contrato.

CLÁUSULA 8ª — DA ESCRITURA DEFINITIVA
Quitado o preço integral e implementadas as condições suspensivas, as partes outorgarão a escritura pública definitiva em até [PRAZO] dias, correndo as despesas de ITBI, escritura e registro por conta do(a) PROMITENTE COMPRADOR(A), salvo disposição em contrário.

CLÁUSULA 9ª — DA COMISSÃO DE CORRETAGEM
A comissão de corretagem, no percentual de [PERCENTUAL]% sobre o valor do negócio, é devida à IMOBILIÁRIA desde a assinatura deste compromisso, nos termos do art. 725 do Código Civil, sendo irretratável e devida independentemente de eventual desistência posterior de qualquer das partes, uma vez cumprida a obrigação de resultado de aproximação efetiva das partes.

CLÁUSULA 10ª — DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
Os dados pessoais das partes serão tratados pela IMOBILIÁRIA exclusivamente para as finalidades de formalização e execução deste contrato, com fundamento no art. 7º, incisos V e X, da Lei nº 13.709/2018, assegurados os direitos do art. 18 da mesma lei.

CLÁUSULA 11ª — DAS COMUNICAÇÕES E NOTIFICAÇÕES
As comunicações relativas a este contrato serão válidas quando dirigidas aos endereços físico e eletrônico indicados na qualificação das partes.

CLÁUSULA 12ª — DAS DISPOSIÇÕES GERAIS
Este instrumento representa a integralidade do acordo entre as partes; a cessão de direitos depende de anuência prévia e expressa da outra parte; a nulidade de qualquer cláusula não prejudica as demais; o contrato é firmado em 3 (três) vias de igual teor, na presença de duas testemunhas.

CLÁUSULA 13ª — DO FORO
Fica eleito o foro da comarca de ${c.imovelLocalizacao}, local de situação do imóvel, com renúncia a qualquer outro, por mais privilegiado que seja.

${c.imovelLocalizacao}, ${c.hoje}.


_______________________________________          _______________________________________
PROMITENTE VENDEDOR(A)                            PROMITENTE COMPRADOR(A): ${c.clienteNome}


_______________________________________          _______________________________________
INTERVENIENTE: ${c.empresaNome}                  TESTEMUNHA 1 (Nome/CPF)


_______________________________________
TESTEMUNHA 2 (Nome/CPF)`;
    },
  },

  recibo_sinal: {
    label: "Recibo de sinal (arras)",
    description: "Recibo simples do valor pago como sinal para reservar o imóvel.",
    build: (ctx) => {
      const c = ctxFrom(ctx);
      return `RECIBO DE SINAL (ARRAS CONFIRMATÓRIAS)

RECEBEDOR(A) (PROPRIETÁRIO/A): [NOME COMPLETO DO(A) PROPRIETÁRIO(A)], CPF [CPF], residente em [ENDEREÇO DO(A) RECEBEDOR(A)].

PAGADOR(A): ${c.clienteNome}, CPF ${c.clienteCpf}, e-mail ${c.clienteEmail}, telefone ${c.clienteTelefone}.

INTERVENIENTE: ${c.empresaNome}, CNPJ ${c.empresaCnpj}, CRECI ${c.empresaCreci}.

Recebi de ${c.clienteNome}, acima qualificado(a), a importância de [VALOR DO SINAL POR EXTENSO] (R$ [VALOR NUMÉRICO]), referente ao sinal do negócio de compra e venda do imóvel "${c.imovelNome}", situado em ${c.imovelEndereco}, ${c.imovelLocalizacao}, pelo valor total ajustado de ${c.valorOfertado || c.imovelValorVenda}, forma de pagamento do sinal: [PIX/transferência/dinheiro/cheque], recebido em [DATA].

O presente sinal tem natureza de arras confirmatórias, nos termos do art. 417 do Código Civil, integrando o valor total do negócio e vinculando as partes à conclusão do contrato de compra e venda (ou compromisso respectivo) no prazo de [PRAZO] dias, não se tratando de arras penitenciais, de modo que nenhuma das partes tem direito de arrependimento simples. Em caso de desistência ou inadimplemento injustificado do(a) pagador(a), o valor recebido ficará retido em favor do(a) recebedor(a), a título de indenização mínima, nos termos do art. 418 do Código Civil; em caso de desistência ou inadimplemento injustificado do(a) recebedor(a), este(a) devolverá o valor em dobro, atualizado monetariamente, conforme o mesmo dispositivo, sem prejuízo de a parte lesada exigir a execução específica do negócio.

Fica desde já reservado à ${c.empresaNome} o direito à comissão de corretagem pactuada pela intermediação deste negócio, nos termos do art. 725 do Código Civil, comissão essa devida independentemente da conclusão final da compra e venda, uma vez que decorre da efetiva aproximação das partes já consumada com a assinatura do presente recibo.

O saldo remanescente do preço e as demais condições do negócio serão formalizados em contrato de promessa de compra e venda ou de compra e venda definitiva específico, a ser celebrado entre as partes. Os dados pessoais aqui informados serão tratados pela ${c.empresaNome} exclusivamente para a formalização deste negócio, nos termos da Lei nº 13.709/2018 (LGPD).

${c.imovelLocalizacao}, ${c.hoje}.


_______________________________________
[NOME DO(A) PROPRIETÁRIO(A)/RECEBEDOR(A)] — CPF: [CPF]


_______________________________________
${c.clienteNome} (pagador do sinal) — CPF: ${c.clienteCpf}


_______________________________________
TESTEMUNHA (Nome/CPF)`;
    },
  },

  autorizacao_venda: {
    label: "Autorização para venda",
    description: "Proprietário autoriza a imobiliária a intermediar a venda (exclusividade opcional).",
    build: (ctx) => {
      const c = ctxFrom(ctx);
      return `AUTORIZAÇÃO PARA VENDA DE IMÓVEL

PROPRIETÁRIO(A): [NOME COMPLETO DO(A) PROPRIETÁRIO(A)], [nacionalidade], [estado civil], CPF nº [CPF], residente em [ENDEREÇO DO(A) PROPRIETÁRIO(A)], e-mail [E-MAIL], telefone [TELEFONE].

IMOBILIÁRIA AUTORIZADA: ${c.empresaNome}, CNPJ ${c.empresaCnpj}, CRECI ${c.empresaCreci}, com sede em ${c.empresaEndereco}.

As partes têm entre si justo e contratado o presente instrumento de autorização de venda com intermediação (corretagem), regido pelos arts. 722 a 729 do Código Civil e pelas Resoluções COFECI/CRECI aplicáveis à atividade de corretagem, mediante as cláusulas seguintes:

CLÁUSULA 1ª — DO OBJETO
O(A) PROPRIETÁRIO(A) autoriza a IMOBILIÁRIA a intermediar a venda do imóvel "${c.imovelNome}", situado em ${c.imovelEndereco}, ${c.imovelLocalizacao}, matrícula nº [MATRÍCULA NO CARTÓRIO], pelo valor de referência de ${c.imovelValorVenda}, podendo a IMOBILIÁRIA promover a divulgação do imóvel em portais, redes sociais, sinalização no local e demais meios usuais do mercado imobiliário, inclusive mediante captação e uso de imagens e vídeos do imóvel para fins de anúncio.

CLÁUSULA 2ª — DA EXCLUSIVIDADE E DO PRAZO
Esta autorização é concedida em caráter [EXCLUSIVO / NÃO EXCLUSIVO], pelo prazo de [PRAZO EM MESES] meses a contar desta data, renovável automaticamente por períodos iguais e sucessivos caso nenhuma das partes manifeste, por escrito, intenção de não renovação com antecedência mínima de 15 (quinze) dias do término do prazo vigente.

CLÁUSULA 3ª — DA COMISSÃO DE CORRETAGEM
Em caso de concretização do negócio durante a vigência desta autorização, será devida à IMOBILIÁRIA a comissão de [PERCENTUAL]% sobre o valor efetivo da venda, conforme praxe do mercado imobiliário local e tabela de honorários do CRECI regional, sendo tal comissão devida ainda que a venda se concretize por proposta apresentada por outra imobiliária ou diretamente pelo(a) PROPRIETÁRIO(A), desde que o(a) comprador(a) tenha sido, comprovadamente, apresentado(a) ao imóvel pela IMOBILIÁRIA, nos termos do art. 725 do Código Civil.

CLÁUSULA 4ª — DA CLÁUSULA DE VÊNIA
Encerrada esta autorização, por decurso de prazo ou distrato, permanecerá devida à IMOBILIÁRIA a comissão de corretagem caso o negócio se concretize, com qualquer comprador(a) por ela previamente apresentado(a) e cadastrado(a) em relatório de visitas ou propostas, dentro do prazo de 90 (noventa) dias contados do término da autorização, nos termos do art. 727 do Código Civil.

CLÁUSULA 5ª — DA VENDA DIRETA PELO PROPRIETÁRIO
Caso o(a) PROPRIETÁRIO(A), durante a vigência desta autorização, venda o imóvel diretamente a comprador(a) apresentado(a) pela IMOBILIÁRIA, com o propósito de eximir-se do pagamento da comissão, fica desde já pactuada, a título de cláusula penal, multa equivalente ao valor integral da comissão que seria devida nos termos da Cláusula 3ª, sem prejuízo do direito da IMOBILIÁRIA de exigir o cumprimento da obrigação e eventuais perdas e danos.

CLÁUSULA 6ª — DAS OBRIGAÇÕES DA IMOBILIÁRIA
Divulgar o imóvel de forma diligente, realizar e acompanhar visitas, qualificar e analisar propostas antes de submetê-las ao(à) PROPRIETÁRIO(A), e prestar contas periódicas sobre o andamento das negociações.

CLÁUSULA 7ª — DAS OBRIGAÇÕES DO PROPRIETÁRIO
Fornecer documentação atualizada e verídica do imóvel, manter o imóvel disponível para visitas previamente agendadas, informar imediatamente a IMOBILIÁRIA sobre qualquer proposta recebida por meios próprios e comunicar, por escrito, a eventual venda direta realizada fora da intermediação da IMOBILIÁRIA.

CLÁUSULA 8ª — DA ISENÇÃO DE RESPONSABILIDADE POR VÍCIOS OCULTOS
A IMOBILIÁRIA atua exclusivamente como intermediária do negócio, não respondendo por vícios ocultos, irregularidades registrais, débitos ou informações inexatas sobre o imóvel que não lhe tenham sido declarados pelo(a) PROPRIETÁRIO(A), o qual responde civil e criminalmente pela veracidade das informações e documentos fornecidos para fins de divulgação e venda.

CLÁUSULA 9ª — DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
Os dados pessoais do(a) PROPRIETÁRIO(A) e de eventuais interessados na compra, tratados no âmbito desta autorização, serão utilizados pela IMOBILIÁRIA exclusivamente para as finalidades de divulgação, intermediação e formalização do negócio, com fundamento no art. 7º, incisos V, IX e X, da Lei nº 13.709/2018, assegurados os direitos do art. 18 da mesma lei.

CLÁUSULA 10ª — DAS COMUNICAÇÕES E NOTIFICAÇÕES
As comunicações relativas a este contrato serão válidas quando dirigidas aos endereços físico e eletrônico indicados na qualificação das partes.

CLÁUSULA 11ª — DAS DISPOSIÇÕES GERAIS
Este instrumento representa a integralidade do acordo entre as partes quanto à intermediação da venda; a nulidade de qualquer cláusula não prejudica as demais; o contrato é firmado em 2 (duas) vias de igual teor.

CLÁUSULA 12ª — DO FORO
Fica eleito o foro da comarca de ${c.imovelLocalizacao}, local de situação do imóvel, com renúncia a qualquer outro, por mais privilegiado que seja.

${c.imovelLocalizacao}, ${c.hoje}.


_______________________________________          _______________________________________
PROPRIETÁRIO(A)                                   IMOBILIÁRIA: ${c.empresaNome}


_______________________________________          _______________________________________
TESTEMUNHA 1 (Nome/CPF)                           TESTEMUNHA 2 (Nome/CPF)`;
    },
  },

  autorizacao_locacao: {
    label: "Autorização para locação",
    description: "Proprietário autoriza a imobiliária a intermediar a locação.",
    build: (ctx) => {
      const c = ctxFrom(ctx);
      return `AUTORIZAÇÃO PARA LOCAÇÃO DE IMÓVEL

PROPRIETÁRIO(A): [NOME COMPLETO DO(A) PROPRIETÁRIO(A)], [nacionalidade], [estado civil], CPF nº [CPF], residente em [ENDEREÇO DO(A) PROPRIETÁRIO(A)], e-mail [E-MAIL], telefone [TELEFONE].

IMOBILIÁRIA AUTORIZADA: ${c.empresaNome}, CNPJ ${c.empresaCnpj}, CRECI ${c.empresaCreci}, com sede em ${c.empresaEndereco}.

As partes têm entre si justo e contratado o presente instrumento de autorização de locação com intermediação (corretagem), regido pelos arts. 722 a 729 do Código Civil, mediante as cláusulas seguintes:

CLÁUSULA 1ª — DO OBJETO
O(A) PROPRIETÁRIO(A) autoriza a IMOBILIÁRIA a intermediar a locação do imóvel "${c.imovelNome}", situado em ${c.imovelEndereco}, ${c.imovelLocalizacao}, pelo valor de referência de [VALOR DO ALUGUEL PRETENDIDO], podendo a IMOBILIÁRIA divulgar o imóvel em portais, redes sociais e demais meios usuais do mercado.

CLÁUSULA 2ª — DA EXCLUSIVIDADE E DO PRAZO
Autorização concedida em caráter [EXCLUSIVO / NÃO EXCLUSIVO], válida por [PRAZO EM MESES] meses a contar desta data, renovável automaticamente por períodos iguais salvo manifestação em contrário de qualquer das partes com antecedência mínima de 15 (quinze) dias do término do prazo vigente.

CLÁUSULA 3ª — DA COMISSÃO
Pela intermediação que resultar na celebração do contrato de locação, será devida à IMOBILIÁRIA comissão equivalente a [1 (um) aluguel / PERCENTUAL]%, devida integralmente na assinatura do respectivo contrato de locação, independentemente de o(a) locatário(a) vir a ocupar efetivamente o imóvel, além da taxa de administração mensal, se e quando pactuada em contrato específico de administração.

CLÁUSULA 4ª — DA CLÁUSULA DE VÊNIA
Encerrada esta autorização, permanecerá devida a comissão prevista na Cláusula 3ª caso a locação se concretize, dentro de 90 (noventa) dias do término desta autorização, com locatário(a) previamente apresentado(a) pela IMOBILIÁRIA, nos termos do art. 727 do Código Civil.

CLÁUSULA 5ª — DA QUALIFICAÇÃO DO PRETENDENTE E DAS GARANTIAS
A IMOBILIÁRIA se compromete a realizar análise cadastral e de idoneidade financeira do(a) pretendente à locação e de eventual fiador(a), incluindo consulta a órgãos de proteção ao crédito, antes de submeter a proposta ao(à) PROPRIETÁRIO(A), a quem cabe a decisão final sobre a aprovação do(a) candidato(a) e da modalidade de garantia locatícia oferecida.

CLÁUSULA 6ª — DAS OBRIGAÇÕES DA IMOBILIÁRIA
Divulgar o imóvel, realizar e acompanhar visitas, analisar a documentação e o cadastro dos interessados e prestar contas periódicas ao(à) PROPRIETÁRIO(A) sobre o andamento das tratativas.

CLÁUSULA 7ª — DAS OBRIGAÇÕES DO PROPRIETÁRIO
Fornecer documentação atualizada do imóvel, manter o imóvel disponível para visitas e informar a IMOBILIÁRIA sobre qualquer proposta ou locação realizada por meios próprios durante a vigência desta autorização.

CLÁUSULA 8ª — DA ISENÇÃO DE RESPONSABILIDADE
A IMOBILIÁRIA atua exclusivamente como intermediária da locação, não respondendo pela inadimplência de aluguéis ou encargos do(a) locatário(a) após a celebração do contrato de locação, salvo se e quando expressamente contratada, em instrumento próprio de administração, para prestar tal garantia mediante remuneração específica, nem por vícios ocultos do imóvel não declarados pelo(a) PROPRIETÁRIO(A).

CLÁUSULA 9ª — DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
Os dados pessoais do(a) PROPRIETÁRIO(A) e dos candidatos à locação, tratados no âmbito desta autorização, serão utilizados pela IMOBILIÁRIA exclusivamente para as finalidades de divulgação, análise cadastral e formalização do negócio, com fundamento no art. 7º, incisos V, IX e X, da Lei nº 13.709/2018, assegurados os direitos do art. 18 da mesma lei.

CLÁUSULA 10ª — DAS COMUNICAÇÕES E NOTIFICAÇÕES
As comunicações relativas a este contrato serão válidas quando dirigidas aos endereços físico e eletrônico indicados na qualificação das partes.

CLÁUSULA 11ª — DAS DISPOSIÇÕES GERAIS
Este instrumento representa a integralidade do acordo entre as partes quanto à intermediação da locação; a nulidade de qualquer cláusula não prejudica as demais; o contrato é firmado em 2 (duas) vias de igual teor.

CLÁUSULA 12ª — DO FORO
Fica eleito o foro da comarca de ${c.imovelLocalizacao}, local de situação do imóvel, com renúncia a qualquer outro, por mais privilegiado que seja.

${c.imovelLocalizacao}, ${c.hoje}.


_______________________________________          _______________________________________
PROPRIETÁRIO(A)                                   IMOBILIÁRIA: ${c.empresaNome}


_______________________________________          _______________________________________
TESTEMUNHA 1 (Nome/CPF)                           TESTEMUNHA 2 (Nome/CPF)`;
    },
  },

  prestacao_servico_corretagem: {
    label: "Prestação de serviço de corretagem",
    description: "Formaliza a comissão devida ao corretor/imobiliária pela intermediação.",
    build: (ctx) => {
      const c = ctxFrom(ctx);
      return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CORRETAGEM

CONTRATANTE: [NOME COMPLETO/RAZÃO SOCIAL DA PARTE QUE CONTRATA A CORRETAGEM], CPF/CNPJ nº [CPF/CNPJ], residente/com sede em [ENDEREÇO DO(A) CONTRATANTE], e-mail [E-MAIL], telefone [TELEFONE].

CONTRATADA: ${c.empresaNome}, CNPJ ${c.empresaCnpj}, CRECI ${c.empresaCreci}, com sede em ${c.empresaEndereco}, representada pelo(a) corretor(a) responsável [NOME DO(A) CORRETOR(A)], CRECI nº [CRECI-F].

CLIENTE APROXIMADO(A): ${c.clienteNome}, CPF ${c.clienteCpf}, e-mail ${c.clienteEmail}, telefone ${c.clienteTelefone}.

As partes têm entre si justo e contratado o presente contrato de prestação de serviços de corretagem, regido pelos arts. 722 a 729 do Código Civil, mediante as cláusulas seguintes:

CLÁUSULA 1ª — DO OBJETO
Prestação de serviços de intermediação imobiliária pela CONTRATADA em favor da CONTRATANTE, referente ao imóvel "${c.imovelNome}", situado em ${c.imovelEndereco}, ${c.imovelLocalizacao}, tendo a CONTRATADA aproximado a CONTRATANTE do(a) CLIENTE APROXIMADO(A) acima identificado(a), com vistas à conclusão de negócio de compra e venda ou locação.

CLÁUSULA 2ª — DA EFETIVA APROXIMAÇÃO
A obrigação da CONTRATADA é de resultado quanto à aproximação útil das partes interessadas no negócio, considerando-se cumprida a mediação a partir do momento em que a CONTRATANTE e o(a) CLIENTE APROXIMADO(A) sejam colocados em contato direto por intermédio da CONTRATADA, independentemente de a CONTRATADA participar de todas as tratativas subsequentes até a assinatura do contrato definitivo.

CLÁUSULA 3ª — DA COMISSÃO E DA BASE DE CÁLCULO
Pela efetiva aproximação das partes e conclusão do negócio, é devida à CONTRATADA comissão de corretagem no percentual de [PERCENTUAL]% sobre o valor de ${c.valorOfertado || c.imovelValorVenda}, nos termos do art. 725 do Código Civil e da tabela de honorários do CRECI regional, cabendo à CONTRATANTE seu pagamento, salvo pactuação expressa em sentido diverso.

CLÁUSULA 4ª — DA EXIGIBILIDADE E DA IRRETRATABILIDADE
A comissão é devida a partir da assinatura do contrato definitivo (compra e venda, promessa de compra e venda ou locação) ou do recebimento de sinal/arras pela CONTRATANTE, sendo irretratável e devida integralmente ainda que o negócio venha a ser desfeito, resilido ou rescindido por arrependimento de qualquer das partes após a conclusão da mediação, nos termos do art. 725 do Código Civil e da jurisprudência consolidada sobre a matéria.

CLÁUSULA 5ª — DO PAGAMENTO
O pagamento da comissão será efetuado em até [PRAZO] dias após sua exigibilidade, via [PIX/transferência bancária], diretamente à CONTRATADA, sujeitando-se o atraso a multa moratória de 2% (dois por cento), juros de 1% (um por cento) ao mês e correção monetária pelo IGP-M/FGV.

CLÁUSULA 6ª — DA RESPONSABILIDADE DA CONTRATADA
A CONTRATADA atua exclusivamente como intermediária do negócio, não respondendo por vícios ocultos, irregularidades registrais ou informações inexatas sobre o imóvel que não lhe tenham sido declaradas pela parte proprietária, nem pela solvência das partes envolvidas no negócio.

CLÁUSULA 7ª — DA EXCLUSIVIDADE
[Esta prestação de serviços é/não é exclusiva; caso exclusiva, detalhar prazo e condições de cláusula de vênia pós-contratual, na forma do instrumento de autorização específico eventualmente firmado entre as partes].

CLÁUSULA 8ª — DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
Os dados pessoais da CONTRATANTE e do(a) CLIENTE APROXIMADO(A), tratados no âmbito deste contrato, serão utilizados pela CONTRATADA exclusivamente para as finalidades de intermediação e formalização do negócio, com fundamento no art. 7º, incisos V e X, da Lei nº 13.709/2018, assegurados os direitos do art. 18 da mesma lei.

CLÁUSULA 9ª — DAS COMUNICAÇÕES E NOTIFICAÇÕES
As comunicações relativas a este contrato serão válidas quando dirigidas aos endereços físico e eletrônico indicados na qualificação das partes.

CLÁUSULA 10ª — DAS DISPOSIÇÕES GERAIS
Este instrumento representa a integralidade do acordo entre as partes quanto à prestação de serviços de corretagem; a nulidade de qualquer cláusula não prejudica as demais; o contrato é firmado em 2 (duas) vias de igual teor.

CLÁUSULA 11ª — DO FORO
Fica eleito o foro da comarca de ${c.imovelLocalizacao}, local de situação do imóvel, com renúncia a qualquer outro, por mais privilegiado que seja.

${c.imovelLocalizacao}, ${c.hoje}.


_______________________________________          _______________________________________
CONTRATANTE                                       CONTRATADA: ${c.empresaNome}


_______________________________________          _______________________________________
TESTEMUNHA 1 (Nome/CPF)                           TESTEMUNHA 2 (Nome/CPF)`;
    },
  },

  rescisao_contrato: {
    label: "Rescisão / distrato",
    description: "Encerra um contrato de locação ou compra e venda em vigor, por mútuo acordo.",
    build: (ctx) => {
      const c = ctxFrom(ctx);
      return `TERMO DE RESCISÃO CONTRATUAL (DISTRATO)

PARTE 1: [NOME COMPLETO/RAZÃO SOCIAL], CPF/CNPJ nº [CPF/CNPJ], residente/com sede em [ENDEREÇO].

PARTE 2: ${c.clienteNome}, CPF ${c.clienteCpf}, e-mail ${c.clienteEmail}, telefone ${c.clienteTelefone}.

INTERVENIENTE ANUENTE: ${c.empresaNome}, CNPJ ${c.empresaCnpj}, CRECI ${c.empresaCreci}, doravante denominada IMOBILIÁRIA.

CLÁUSULA 1ª — DO CONTRATO RESCINDIDO
As partes, de comum acordo, resolvem rescindir e dar por findo o contrato de [LOCAÇÃO / COMPRA E VENDA / PROMESSA DE COMPRA E VENDA / PRESTAÇÃO DE SERVIÇOS] firmado em [DATA DO CONTRATO ORIGINAL], referente ao imóvel "${c.imovelNome}", situado em ${c.imovelEndereco}, ${c.imovelLocalizacao}, nos termos e condições fixados neste instrumento.

CLÁUSULA 2ª — DOS EFEITOS DA RESCISÃO
A rescisão produz efeitos a partir de [DATA], ficando as partes desobrigadas das prestações futuras decorrentes do contrato original, ressalvadas as obrigações já vencidas e não adimplidas até esta data, que permanecem exigíveis.

CLÁUSULA 3ª — DA QUITAÇÃO
As partes se dão mútua, plena, geral e irrevogável quitação quanto às obrigações financeiras decorrentes do contrato original, para nada mais reclamarem uma da outra a esse título, [SALVO: pendência de VALOR/DESCRIÇÃO, a ser paga até DATA, hipótese em que a quitação plena somente se aperfeiçoará após a comprovação do respectivo pagamento].

CLÁUSULA 4ª — DA DEVOLUÇÃO DE VALORES E GARANTIAS
[Detalhar a devolução de caução em dinheiro, baixa de fiança ou seguro-fiança, e eventual restituição proporcional de aluguéis ou parcelas pagas antecipadamente, indicando valores, prazos e forma de pagamento].

CLÁUSULA 5ª — DA DEVOLUÇÃO DO IMÓVEL E DA VISTORIA DE SAÍDA
[Quando aplicável a contrato de locação: detalhar a data de desocupação, a realização de vistoria de saída em confronto com o termo de vistoria de entrada, e a responsabilidade por eventuais danos ou pendências identificadas].

CLÁUSULA 6ª — DA MULTA E DAS PENALIDADES PACTUADAS
[Detalhar, quando aplicável, a multa rescisória ajustada entre as partes para o encerramento antecipado do contrato original, seu valor e a forma de pagamento, observada a proporcionalidade legal].

CLÁUSULA 7ª — DA COMISSÃO DA IMOBILIÁRIA
A rescisão ora formalizada não afeta o direito da IMOBILIÁRIA a comissões de corretagem ou taxas de administração já devidas e vencidas em razão do contrato original, as quais permanecem integralmente exigíveis nos termos do art. 725 do Código Civil e do instrumento que as originou.

CLÁUSULA 8ª — DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
Os dados pessoais das partes, tratados no âmbito deste distrato, serão utilizados pela IMOBILIÁRIA exclusivamente para as finalidades de formalização do encerramento contratual e cumprimento de obrigações legais, com fundamento no art. 7º, incisos V e X, da Lei nº 13.709/2018, assegurados os direitos do art. 18 da mesma lei.

CLÁUSULA 9ª — DAS COMUNICAÇÕES E NOTIFICAÇÕES
As comunicações relativas a este termo serão válidas quando dirigidas aos endereços físico e eletrônico indicados na qualificação das partes.

CLÁUSULA 10ª — DAS DISPOSIÇÕES GERAIS
Este termo representa a integralidade do acordo de rescisão entre as partes, prevalecendo sobre disposições do contrato original que com ele conflitem; a nulidade de qualquer cláusula não prejudica as demais; o instrumento é firmado em 2 (duas) vias de igual teor.

CLÁUSULA 11ª — DO FORO
Fica eleito o foro da comarca de ${c.imovelLocalizacao}, local de situação do imóvel, com renúncia a qualquer outro, por mais privilegiado que seja.

${c.imovelLocalizacao}, ${c.hoje}.


_______________________________________          _______________________________________
PARTE 1                                           PARTE 2: ${c.clienteNome}


_______________________________________          _______________________________________
INTERVENIENTE: ${c.empresaNome}                  TESTEMUNHA 1 (Nome/CPF)


_______________________________________
TESTEMUNHA 2 (Nome/CPF)`;
    },
  },

};

export function generateContractText(typeKey, data) {
  const type = CONTRACT_TYPES[typeKey];
  if (!type) return "";
  return type.build(data || {});
}

const isSignatureRule = (line) => /^[_\s]+$/.test(line) && line.includes("_");

// Caminho inverso, usado ao salvar/baixar: extrai texto puro do HTML
// editado (preserva quebras de parágrafo, descarta marcação visual).
export function htmlToPlainText(html) {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  const blocks = div.querySelectorAll("h1, h3, p, div.contract-sig-row");
  return Array.from(blocks)
    .map((el) => el.textContent.trim())
    .filter(Boolean)
    .join("\n\n");
}

// Modelo estruturado do contrato — em vez de um blob de HTML único, quebra
// o texto em { title, parties[], clauses[], signature } para que a UI
// renderize CADA seção (cada parte, cada cláusula) como seu próprio bloco
// com estilo/cor distintos, cobrindo o documento inteiro, não só os
// títulos das cláusulas.
export function parseContractDocument(text) {
  const lines = (text || "").split("\n");
  const doc = { title: "", parties: [], clauses: [], signature: [] };
  let i = 0;

  while (i < lines.length && !lines[i].trim()) i++;
  doc.title = (lines[i] || "").trim();
  i++;

  let currentClause = null;

  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (isSignatureRule(line)) {
      const cols = line.split(/\s{2,}/).filter(Boolean);
      const next = (lines[i + 1] || "").trim();
      let captions = [];
      if (next && !isSignatureRule(next)) {
        const nextCols = next.split(/\s{2,}/).filter(Boolean);
        if (nextCols.length === cols.length) {
          captions = nextCols;
          i++;
        }
      }
      doc.signature.push(...cols.map((_, idx) => captions[idx] || ""));
      continue;
    }

    const clauseMatch = line.match(/^CLÁUSULA\s+(\d+)ª?\s*(?:—|-)?\s*(.*)$/i);
    if (clauseMatch) {
      currentClause = { number: clauseMatch[1], title: clauseMatch[2] || `Cláusula ${clauseMatch[1]}`, body: "" };
      doc.clauses.push(currentClause);
      continue;
    }

    if (currentClause) {
      currentClause.body = currentClause.body ? `${currentClause.body} ${line}` : line;
      continue;
    }

    const labelMatch = line.match(/^([A-ZÀ-Ü0-9()/ ]{3,45}?):\s*(.+)$/);
    if (labelMatch) {
      doc.parties.push({ label: labelMatch[1].trim(), detail: labelMatch[2].trim() });
      continue;
    }

    // Linha solta antes das cláusulas (ex.: data/local de fechamento) vira
    // uma "parte" sem label, só para não se perder.
    doc.parties.push({ label: "", detail: line });
  }

  return doc;
}
