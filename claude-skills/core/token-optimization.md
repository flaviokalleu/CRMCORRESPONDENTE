# Skill: Token Optimization — Economia Máxima

## Purpose
Reduzir consumo de tokens ao mínimo absoluto sem perder qualidade. Cada token conta.

## Rules

### 1. Resposta Enxuta — Zero Desperdício
- SEM frases de cortesia: "Claro!", "Boa pergunta!", "Vou te ajudar com isso"
- SEM repetir a pergunta do usuário
- SEM resumo final do que foi feito — o código/diff fala por si
- SEM explicações óbvias — só explique o que não é evidente no código
- Pergunta de 1 linha = resposta de 1 linha
- Use tabelas/bullets em vez de parágrafos

### 2. Código — Só o Necessário
- Gere APENAS o que foi pedido — zero features bônus
- NUNCA gere o arquivo inteiro — só o trecho alterado com contexto mínimo
- Use formato diff/Edit para mudanças em arquivos existentes
- NUNCA gere comentários óbvios (`// salvar no banco` acima de `await model.save()`)
- NUNCA gere docstrings/JSDoc em código que não tinha
- NUNCA adicione console.log, tratamento de erro, ou validação que não foi pedido
- Variáveis concisas mas descritivas: `idx` não `currentIndexPosition`
- Omita type annotations onde o TypeScript infere automaticamente
- Prefira one-liners quando legíveis: `const name = user?.name ?? 'Anônimo'`

### 3. Leitura de Arquivos — Mínimo de Contexto
- PRIMEIRO: grep/glob direcionado para localizar o trecho exato
- Leia APENAS o range de linhas relevante (offset + limit), NUNCA o arquivo inteiro
- NUNCA releia um arquivo que já está no contexto (a não ser que tenha sido editado)
- Antes de ler 5 arquivos, pergunte se o escopo está correto
- Batch tool calls paralelas sempre que possível

### 4. Geração de Múltiplos Arquivos
- Agrupe criações em blocos paralelos de Write/Edit
- Reutilize padrões já existentes no projeto — copie a estrutura, mude o conteúdo
- Se dois componentes são 80% iguais, gere um e diga "mesmo padrão de X com estas diferenças: ..."
- NUNCA gere arquivo de teste/doc/readme que não foi pedido

### 5. Conversação — Protocolo de Economia
- Se a tarefa é ambígua, faça UMA pergunta objetiva antes de gerar código
- Se precisa de decisão do usuário, apresente opções em lista numerada
- Referências a código anterior: cite `arquivo:linha`, não copie o bloco
- Se o resultado de uma tool call é longo, extraia só os dados relevantes

### 6. Métricas de Referência
| Ação | Custo Estimado | Alternativa Econômica |
|---|---|---|
| Ler arquivo inteiro (500 linhas) | ~2K tokens | Ler range de 30 linhas: ~200 tokens |
| Gerar arquivo completo | ~3K tokens | Edit com diff: ~300 tokens |
| Explicar + código | ~1.5K tokens | Só código com 1 linha de contexto: ~500 tokens |
| Resumo final | ~200 tokens | Omitir: 0 tokens |
| Reler arquivo já lido | ~2K tokens | Referenciar do contexto: 0 tokens |

### 7. Regra de Ouro
> Antes de gerar qualquer output, pergunte-se: "Posso transmitir a mesma informação com menos palavras?" Se sim, reescreva mais curto.
