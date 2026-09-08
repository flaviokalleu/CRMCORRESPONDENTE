-- Avaliações do SIOPI. Cada proposta enviada à Caixa volta como uma tela com o
-- resultado da análise de risco; até aqui esses números só existiam como print
-- no WhatsApp do corretor.
--
-- É histórico, não estado: as capturas de referência mostram o mesmo CPF
-- reprovado em 03/09 e condicionado em 09/09. Uma avaliação nova não apaga a
-- anterior.
--
-- Os campos monetários são NUMERIC. A coluna clientes.valor_renda é VARCHAR com
-- o número formatado em pt-BR ("1.234,56"), herança da migração do backend Node
-- que obriga todo consumidor a fazer REPLACE/CAST em SQL — aqui isso não se
-- repete.
--
-- Os campos descritivos (produto, modalidade, origem_recurso, indexador,
-- sistema_amortizacao, sistema_originador) são texto livre de propósito: o
-- SIOPI muda a nomenclatura dos produtos sem aviso, e um CHECK obrigaria uma
-- migration a cada produto novo. Mesmo raciocínio da migration 0008 (origem).
CREATE TABLE IF NOT EXISTS cliente_avaliacoes (
    id                       BIGSERIAL PRIMARY KEY,
    cliente_id               BIGINT      NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tenant_id                BIGINT      NOT NULL,
    criado_por               BIGINT,
    resultado                VARCHAR(16) NOT NULL,

    -- comuns às três telas
    codigo_proposta          VARCHAR(40),
    codigo_avaliacao         VARCHAR(40),
    codigo_correspondente    VARCHAR(40),
    resposta_siric           TIMESTAMPTZ,

    -- tela "Reprovado"
    motivo_reprovacao        TEXT,

    -- tela "Condicionada"
    condicao_aprovacao       TEXT,
    valor_prestacao_possivel NUMERIC(12,2),

    -- tela "DADOS DA AVALIAÇÃO" (aprovada)
    protocolo_cadastro       VARCHAR(40),
    agencia_relacionamento   VARCHAR(20),
    validade_inicio          DATE,
    validade_fim             DATE,
    origem_recurso           VARCHAR(60),
    modalidade               VARCHAR(120),
    produto                  VARCHAR(160),
    valor_imovel             NUMERIC(12,2),
    valor_financiamento      NUMERIC(12,2),
    prestacao                NUMERIC(12,2),
    indexador                VARCHAR(20),
    sistema_amortizacao      VARCHAR(20),
    prazo_meses              INTEGER,
    sistema_originador       VARCHAR(40),

    -- cálculo do CRM, não vem do SIOPI
    renda_utilizada          NUMERIC(12,2),
    percentual_renda         NUMERIC(5,2),

    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exatamente como a página lê o histórico: as avaliações de um cliente, da mais
-- recente para a mais antiga, dentro do tenant.
CREATE INDEX IF NOT EXISTS idx_cliente_avaliacoes_cliente
    ON cliente_avaliacoes (tenant_id, cliente_id, created_at DESC);
