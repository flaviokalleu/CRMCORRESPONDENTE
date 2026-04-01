/**
 * repasseService.js
 * Lógica de repasse automático ao proprietário via PIX (Asaas)
 * e cálculo de comissão do corretor após confirmação de pagamento.
 *
 * Fluxo:
 *  1. Asaas confirma pagamento → webhook chama processarRepasse()
 *  2. Calcula: valor_repasse = aluguel - taxa_admin
 *             comissao_corretor = aluguel * corretor_percentual / 100
 *  3. Registra RepasseProprietario com status PENDENTE
 *  4. Tenta transferência PIX ao proprietário via Asaas
 *  5. Atualiza RepasseProprietario: REALIZADO ou FALHOU
 *  6. (Opcional) Envia WhatsApp ao proprietário confirmando repasse
 */

const { RepasseProprietario } = require('../models');
const asaasService = require('./asaasService');

/**
 * Processa o repasse após pagamento confirmado.
 * @param {Object} cobranca  - instância de CobrancaAluguel
 * @param {Object} cliente   - instância de ClienteAluguel
 * @param {Function} [enviarWhatsAppFn] - função opcional para envio de WhatsApp
 * @returns {Object} repasse criado/atualizado
 */
async function processarRepasse(cobranca, cliente, enviarWhatsAppFn, apiKey) {
  // Verificar se já há repasse para essa cobrança
  const existente = await RepasseProprietario.findOne({
    where: { cobranca_aluguel_id: cobranca.id },
  });
  if (existente) {
    console.log(`Repasse já existe para cobrança ${cobranca.id} (ID: ${existente.id})`);
    return existente;
  }

  const valorAluguel = parseFloat(cobranca.valor || cliente.valor_aluguel);
  const taxa         = parseFloat(cliente.taxa_administracao || 10);
  const corretorPct  = parseFloat(cliente.corretor_percentual || 0);

  const valorTaxa          = round2(valorAluguel * (taxa / 100));
  const valorRepasse       = round2(valorAluguel - valorTaxa);
  const comissaoCorretor   = round2(valorAluguel * (corretorPct / 100));

  const mesReferencia = cobranca.data_vencimento
    ? cobranca.data_vencimento.substring(0, 7)          // "2026-03"
    : new Date().toISOString().substring(0, 7);

  // Criar registro de repasse
  const repasse = await RepasseProprietario.create({
    cliente_aluguel_id:           cliente.id,
    cobranca_aluguel_id:          cobranca.id,
    valor_aluguel:                valorAluguel,
    taxa_administracao_percentual: taxa,
    valor_taxa:                   valorTaxa,
    valor_repasse:                valorRepasse,
    corretor_percentual:          corretorPct,
    comissao_corretor:            comissaoCorretor,
    mes_referencia:               mesReferencia,
    status:                       'PENDENTE',
    transfer_status:              'PENDENTE',
  });

  console.log(`Repasse #${repasse.id} criado — proprietário: R$${valorRepasse} | corretor: R$${comissaoCorretor}`);

  // --- Transferência PIX ao proprietário ---
  const chavePix = cliente.proprietario_pix?.trim();
  if (!chavePix) {
    await repasse.update({
      transfer_status: 'SEM_PIX',
      status:          'PENDENTE',
      observacao:      'Proprietário sem chave PIX cadastrada',
    });
    console.warn(`Repasse #${repasse.id}: proprietário sem chave PIX. Aguardando repasse manual.`);
    return repasse;
  }

  try {
    await repasse.update({ transfer_status: 'PROCESSANDO' });

    const descricao = `Repasse aluguel ${mesReferencia} — ${cliente.nome}`;
    const transferencia = await asaasService.realizarTransferenciaPix({
      valor:    valorRepasse,
      chavePix,
      descricao,
    }, apiKey);

    await repasse.update({
      status:             'REALIZADO',
      transfer_status:    'REALIZADO',
      asaas_transfer_id:  transferencia.id,
      data_repasse:       new Date().toISOString().split('T')[0],
    });

    console.log(`Repasse #${repasse.id} PIX enviado — Asaas transfer ID: ${transferencia.id}`);

    // Notificar proprietário via WhatsApp
    if (enviarWhatsAppFn && cliente.proprietario_telefone) {
      const msg =
        `Olá ${cliente.proprietario_nome || 'Proprietário'}! ` +
        `O repasse referente ao aluguel de ${mesReferencia} ` +
        `no valor de R$ ${valorRepasse.toFixed(2)} foi enviado via PIX para sua chave ${chavePix}. 🏠`;
      await enviarWhatsAppFn(cliente.proprietario_telefone, msg);
    }
  } catch (err) {
    await repasse.update({
      transfer_status: 'FALHOU',
      transfer_error:  err.message,
    });
    console.error(`Repasse #${repasse.id}: falha na transferência PIX —`, err.message);
  }

  return repasse;
}

/**
 * Retenta a transferência PIX de um repasse FALHOU ou SEM_PIX após o PIX ser adicionado.
 * @param {number} repasseId
 * @param {Function} [enviarWhatsAppFn]
 */
async function reenviarRepasse(repasseId, enviarWhatsAppFn, apiKey) {
  const { ClienteAluguel } = require('../models');

  const repasse = await RepasseProprietario.findByPk(repasseId, {
    include: [{ model: ClienteAluguel, as: 'clienteAluguel' }],
  });
  if (!repasse) throw new Error('Repasse não encontrado');
  if (repasse.transfer_status === 'REALIZADO') throw new Error('Repasse já foi realizado');

  const cliente = repasse.clienteAluguel;
  const chavePix = cliente.proprietario_pix?.trim();
  if (!chavePix) throw new Error('Chave PIX do proprietário não cadastrada');

  await repasse.update({ transfer_status: 'PROCESSANDO', transfer_error: null });

  try {
    const descricao = `Repasse aluguel ${repasse.mes_referencia} — ${cliente.nome}`;
    const transferencia = await asaasService.realizarTransferenciaPix({
      valor:    parseFloat(repasse.valor_repasse),
      chavePix,
      descricao,
    }, apiKey);

    await repasse.update({
      status:            'REALIZADO',
      transfer_status:   'REALIZADO',
      asaas_transfer_id: transferencia.id,
      data_repasse:      new Date().toISOString().split('T')[0],
    });

    console.log(`Repasse #${repasse.id} reenviado — Asaas transfer ID: ${transferencia.id}`);

    if (enviarWhatsAppFn && cliente.proprietario_telefone) {
      const msg =
        `Olá ${cliente.proprietario_nome || 'Proprietário'}! ` +
        `O repasse de R$ ${parseFloat(repasse.valor_repasse).toFixed(2)} ` +
        `referente a ${repasse.mes_referencia} foi enviado via PIX (chave: ${chavePix}). 🏠`;
      await enviarWhatsAppFn(cliente.proprietario_telefone, msg);
    }

    return repasse;
  } catch (err) {
    await repasse.update({ transfer_status: 'FALHOU', transfer_error: err.message });
    throw err;
  }
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { processarRepasse, reenviarRepasse };
