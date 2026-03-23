Erro no dashboard de alugueis: Error
    at Query.run (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\sequelize\lib\dialects\postgres\query.js:50:25)
    at D:\projetos\CRMCORRESPONDENTE\backend\node_modules\sequelize\lib\sequelize.js:315:28
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async PostgresQueryInterface.select (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\sequelize\lib\dialects\abstract\query-interface.js:407:12)
    at async ClienteAluguel.findAll (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\sequelize\lib\model.js:1140:21)
    at async Promise.all (index 0)
    at async D:\projetos\CRMCORRESPONDENTE\backend\src\routes\dashboardAluguel.js:17:47 {
  name: 'SequelizeDatabaseError',
  parent: error: coluna "asaas_customer_id" não existe
      at Parser.parseErrorMessage (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\parser.js:285:98)
      at Parser.handlePacket (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\parser.js:122:29)
      at Parser.parse (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\parser.js:35:38)
      at Socket.<anonymous> (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\index.js:11:42)
      at Socket.emit (node:events:508:28)
      at addChunk (node:internal/streams/readable:563:12)
      at readableAddChunkPushByteMode (node:internal/streams/readable:514:3)
      at Readable.push (node:internal/streams/readable:394:5)
      at TCP.onStreamRead (node:internal/stream_base_commons:189:23) {
    length: 114,
    severity: 'ERRO',
    code: '42703',
    detail: undefined,
    hint: undefined,
    position: '117',
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'parse_relation.c',
    line: '3827',
    routine: 'errorMissingColumn',
    sql: 'SELECT "id", "nome", "cpf", "email", "telefone", "valor_aluguel", "dia_vencimento", "pago", "historico_pagamentos", "asaas_customer_id", "asaas_subscription_id", "asaas_subscription_status", "aluguel_id", "data_inicio_contrato", "data_fim_contrato", "indice_reajuste", "percentual_multa", "percentual_juros_mora", "score_inquilino", "score_detalhes", "score_atualizado_em", "proprietario_nome", "proprietario_telefone", "proprietario_pix", "taxa_administracao", "created_at" AS "createdAt", "updated_at" AS "updatedAt" FROM "cliente_aluguels" AS "ClienteAluguel";',
    parameters: undefined
  },
  original: error: coluna "asaas_customer_id" não existe
      at Parser.parseErrorMessage (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\parser.js:285:98)
      at Parser.handlePacket (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\parser.js:122:29)
      at Parser.parse (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\parser.js:35:38)
      at Socket.<anonymous> (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\index.js:11:42)
      at Socket.emit (node:events:508:28)
      at addChunk (node:internal/streams/readable:563:12)
      at readableAddChunkPushByteMode (node:internal/streams/readable:514:3)
      at Readable.push (node:internal/streams/readable:394:5)
      at TCP.onStreamRead (node:internal/stream_base_commons:189:23) {
    length: 114,
    severity: 'ERRO',
    code: '42703',
    detail: undefined,
    hint: undefined,
    position: '117',
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'parse_relation.c',
    line: '3827',
    routine: 'errorMissingColumn',
    sql: 'SELECT "id", "nome", "cpf", "email", "telefone", "valor_aluguel", "dia_vencimento", "pago", "historico_pagamentos", "asaas_customer_id", "asaas_subscription_id", "asaas_subscription_status", "aluguel_id", "data_inicio_contrato", "data_fim_contrato", "indice_reajuste", "percentual_multa", "percentual_juros_mora", "score_inquilino", "score_detalhes", "score_atualizado_em", "proprietario_nome", "proprietario_telefone", "proprietario_pix", "taxa_administracao", "created_at" AS "createdAt", "updated_at" AS "updatedAt" FROM "cliente_aluguels" AS "ClienteAluguel";',
    parameters: undefined
  },
  sql: 'SELECT "id", "nome", "cpf", "email", "telefone", "valor_aluguel", "dia_vencimento", "pago", "historico_pagamentos", "asaas_customer_id", "asaas_subscription_id", "asaas_subscription_status", "aluguel_id", "data_inicio_contrato", "data_fim_contrato", "indice_reajuste", "percentual_multa", "percentual_juros_mora", "score_inquilino", "score_detalhes", "score_atualizado_em", "proprietario_nome", "proprietario_telefone", "proprietario_pix", "taxa_administracao", "created_at" AS "createdAt", "updated_at" AS "updatedAt" FROM "cliente_aluguels" AS "ClienteAluguel";',
  parameters: {}
}
Erro no dashboard de alugueis: Error
    at Query.run (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\sequelize\lib\dialects\postgres\query.js:50:25)
    at D:\projetos\CRMCORRESPONDENTE\backend\node_modules\sequelize\lib\sequelize.js:315:28
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async PostgresQueryInterface.select (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\sequelize\lib\dialects\abstract\query-interface.js:407:12)
    at async ClienteAluguel.findAll (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\sequelize\lib\model.js:1140:21)
    at async Promise.all (index 0)
    at async D:\projetos\CRMCORRESPONDENTE\backend\src\routes\dashboardAluguel.js:17:47 {
  name: 'SequelizeDatabaseError',
  parent: error: coluna "asaas_customer_id" não existe
      at Parser.parseErrorMessage (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\parser.js:285:98)
      at Parser.handlePacket (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\parser.js:122:29)
      at Parser.parse (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\parser.js:35:38)
      at Socket.<anonymous> (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\index.js:11:42)
      at Socket.emit (node:events:508:28)
      at addChunk (node:internal/streams/readable:563:12)
      at readableAddChunkPushByteMode (node:internal/streams/readable:514:3)
      at Readable.push (node:internal/streams/readable:394:5)
      at TCP.onStreamRead (node:internal/stream_base_commons:189:23) {
    length: 114,
    severity: 'ERRO',
    code: '42703',
    detail: undefined,
    hint: undefined,
    position: '117',
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'parse_relation.c',
    line: '3827',
    routine: 'errorMissingColumn',
    sql: 'SELECT "id", "nome", "cpf", "email", "telefone", "valor_aluguel", "dia_vencimento", "pago", "historico_pagamentos", "asaas_customer_id", "asaas_subscription_id", "asaas_subscription_status", "aluguel_id", "data_inicio_contrato", "data_fim_contrato", "indice_reajuste", "percentual_multa", "percentual_juros_mora", "score_inquilino", "score_detalhes", "score_atualizado_em", "proprietario_nome", "proprietario_telefone", "proprietario_pix", "taxa_administracao", "created_at" AS "createdAt", "updated_at" AS "updatedAt" FROM "cliente_aluguels" AS "ClienteAluguel";',
    parameters: undefined
  },
  original: error: coluna "asaas_customer_id" não existe
      at Parser.parseErrorMessage (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\parser.js:285:98)
      at Parser.handlePacket (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\parser.js:122:29)
      at Parser.parse (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\parser.js:35:38)
      at Socket.<anonymous> (D:\projetos\CRMCORRESPONDENTE\backend\node_modules\pg-protocol\dist\index.js:11:42)
      at Socket.emit (node:events:508:28)
      at addChunk (node:internal/streams/readable:563:12)
      at readableAddChunkPushByteMode (node:internal/streams/readable:514:3)
      at Readable.push (node:internal/streams/readable:394:5)
      at TCP.onStreamRead (node:internal/stream_base_commons:189:23) {
    length: 114,
    severity: 'ERRO',
    code: '42703',
    detail: undefined,
    hint: undefined,
    position: '117',
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'parse_relation.c',
    line: '3827',
    routine: 'errorMissingColumn',
    sql: 'SELECT "id", "nome", "cpf", "email", "telefone", "valor_aluguel", "dia_vencimento", "pago", "historico_pagamentos", "asaas_customer_id", "asaas_subscription_id", "asaas_subscription_status", "aluguel_id", "data_inicio_contrato", "data_fim_contrato", "indice_reajuste", "percentual_multa", "percentual_juros_mora", "score_inquilino", "score_detalhes", "score_atualizado_em", "proprietario_nome", "proprietario_telefone", "proprietario_pix", "taxa_administracao", "created_at" AS "createdAt", "updated_at" AS "updatedAt" FROM "cliente_aluguels" AS "ClienteAluguel";',
    parameters: undefined
  },
  sql: 'SELECT "id", "nome", "cpf", "email", "telefone", "valor_aluguel", "dia_vencimento", "pago", "historico_pagamentos", "asaas_customer_id", "asaas_subscription_id", "asaas_subscription_status", "aluguel_id", "data_inicio_contrato", "data_fim_contrato", "indice_reajuste", "percentual_multa", "percentual_juros_mora", "score_inquilino", "score_detalhes", "score_atualizado_em", "proprietario_nome", "proprietario_telefone", "proprietario_pix", "taxa_administracao", "created_at" AS "createdAt", "updated_at" AS "updatedAt" FROM "cliente_aluguels" AS "ClienteAluguel";',
  parameters: {}
}