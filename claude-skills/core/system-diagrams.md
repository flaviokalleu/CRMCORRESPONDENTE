# Skill: Diagramação de Sistema — Blueprint Antes de Codar

## Purpose
Antes de implementar qualquer tela ou funcionalidade, criar um diagrama/blueprint completo que mapeia cada elemento, interação e fluxo de navegação. Isso elimina erros, retrabalho e ambiguidade.

## Regra Principal
> NUNCA comece a codar uma tela sem antes gerar o diagrama dela. O diagrama é o contrato — o código apenas implementa o que o diagrama define.

---

## 1. Formato do Diagrama de Tela

Para cada tela, gerar um blueprint neste formato exato:

```
╔══════════════════════════════════════════════════╗
║  TELA: [Nome da Tela]                           ║
║  ROTA: /caminho-da-rota                         ║
║  ACESSO: [público | autenticado | admin | role]  ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  ┌─────────────────────────────────────────┐     ║
║  │         [Componente Visual]             │     ║
║  │                                         │     ║
║  │  Label: ___________________________     │     ║
║  │  [input-tipo] [validação]               │     ║
║  │                                         │     ║
║  │  Label: ___________________________     │     ║
║  │  [input-tipo] [validação]               │     ║
║  │                                         │     ║
║  │  [ Botão Primário ]  [ Botão Sec. ]     │     ║
║  │   -> ação/destino     -> ação/destino   │     ║
║  └─────────────────────────────────────────┘     ║
║                                                  ║
╚══════════════════════════════════════════════════╝
```

---

## 2. Exemplo Completo — Tela de Login

```
╔══════════════════════════════════════════════════════╗
║  TELA: Login                                         ║
║  ROTA: /login                                        ║
║  ACESSO: público (redireciona para /dashboard se já  ║
║          autenticado)                                ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  ┌────────────────────────────────────────────┐      ║
║  │              LOGO DO SISTEMA               │      ║
║  │           [REACT_APP_NOME_SISTEMA]         │      ║
║  │                                            │      ║
║  │  Email: _______________________________    │      ║
║  │  [input type=email] [obrigatório]          │      ║
║  │  erro: "Email é obrigatório"               │      ║
║  │                                            │      ║
║  │  Senha: _______________________________    │      ║
║  │  [input type=password] [obrigatório,       │      ║
║  │   min 6 chars, toggle mostrar/ocultar]     │      ║
║  │  erro: "Senha é obrigatória"               │      ║
║  │                                            │      ║
║  │  [ Esqueceu a senha? ]                     │      ║
║  │   -> abre modal de recuperação             │      ║
║  │                                            │      ║
║  │  [======= ENTRAR =======]                  │      ║
║  │   -> POST /api/auth/login                  │      ║
║  │   -> sucesso: salva token, vai /dashboard  │      ║
║  │   -> erro 401: "Email ou senha inválidos"  │      ║
║  │   -> erro 500: "Erro no servidor"          │      ║
║  │   -> loading: spinner no botão, desabilita │      ║
║  │                                            │      ║
║  │  Não tem conta? [ CADASTRE-SE ]            │      ║
║  │   -> navega para /registro                 │      ║
║  └────────────────────────────────────────────┘      ║
║                                                      ║
║  ESTADOS DA TELA:                                    ║
║  • idle: formulário vazio, botão habilitado          ║
║  • loading: spinner, inputs desabilitados            ║
║  • error: mensagem vermelha abaixo do form           ║
║  • success: redirect para /dashboard                 ║
║                                                      ║
║  RESPONSIVO:                                         ║
║  • mobile: card ocupa 100% largura, padding 16px     ║
║  • desktop: card max-w-md centralizado               ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

---

## 3. Diagrama de Fluxo de Navegação

Para cada grupo de telas relacionadas, mapear o fluxo:

```
[Landing Page /]
    │
    ├── [ Login /login ]
    │       │
    │       ├── sucesso ──► [ Dashboard /dashboard ]
    │       │                    │
    │       │                    ├── Admin ──► DashboardAdministrador
    │       │                    ├── Corretor ──► DashboardCorretor
    │       │                    └── Correspondente ──► DashboardCorrespondente
    │       │
    │       └── "Esqueceu senha?" ──► [ Recuperar Senha /recuperar ]
    │
    ├── [ Registro /registro ]
    │       │
    │       └── sucesso ──► [ Login /login ]
    │
    └── [ Imóveis Públicos /imoveis ]
```

---

## 4. Diagrama de Componente (para componentes complexos)

```
COMPONENTE: ClienteForm
ARQUIVO: components/ClientForm.jsx
PROPS: { clienteId?, onSave, onCancel }

├── SEÇÃO: Dados Pessoais
│   ├── input[text] nome ............. obrigatório
│   ├── input[text] cpf .............. obrigatório, máscara XXX.XXX.XXX-XX
│   ├── input[email] email ........... obrigatório, validar formato
│   ├── input[tel] telefone .......... máscara (XX) XXXXX-XXXX
│   └── input[date] data_nascimento
│
├── SEÇÃO: Dados Financeiros
│   ├── input[text] valor_renda ...... máscara R$ X.XXX,XX (salva como string)
│   ├── select tipo_financiamento .... [SBPE, MCMV, PRO-COTISTA]
│   └── input[text] fgts
│
├── SEÇÃO: Endereço
│   ├── input[text] cep .............. máscara XXXXX-XXX, busca automática
│   ├── input[text] rua .............. preenchido pela busca CEP
│   ├── input[text] numero
│   ├── input[text] complemento
│   ├── select estado ................ carrega de /api/estados
│   └── select cidade ................ carrega de /api/municipios?estado=XX
│
├── SEÇÃO: Documentos
│   ├── upload[file] rg .............. max 10MB, jpg/png/pdf
│   ├── upload[file] comprovante_renda
│   └── upload[file] comprovante_endereco
│
├── AÇÕES:
│   ├── [SALVAR] -> POST/PUT /api/clientes -> onSave(cliente)
│   └── [CANCELAR] -> onCancel()
│
└── ESTADOS:
    ├── loading: skeleton nos campos
    ├── editing: campos habilitados
    ├── submitting: spinner, campos desabilitados
    ├── error: toast vermelho + erros inline
    └── success: toast verde + callback onSave
```

---

## 5. Diagrama de API para Tela

Cada tela deve listar TODAS as chamadas de API que faz:

```
TELA: Clientes (/clientes)
API CALLS:
┌──────────┬──────────────────────────┬──────────────┬─────────────────────┐
│ Momento  │ Endpoint                 │ Método       │ Resposta esperada   │
├──────────┼──────────────────────────┼──────────────┼─────────────────────┤
│ onMount  │ /api/clientes?page=1     │ GET          │ { data, pagination }│
│ onMount  │ /api/corretor?all=true   │ GET          │ [{ id, nome }]      │
│ onSearch │ /api/clientes?search=X   │ GET          │ { data, pagination }│
│ onDelete │ /api/clientes/:id        │ DELETE       │ 204                 │
│ onStatus │ /api/clientes/:id/status │ PATCH        │ { data: cliente }   │
└──────────┴──────────────────────────┴──────────────┴─────────────────────┘
```

---

## 6. Checklist Obrigatório por Diagrama

Antes de considerar o diagrama completo, verificar:

- [ ] Todos os inputs têm: tipo, validação, mensagem de erro, máscara (se aplicável)
- [ ] Todos os botões têm: label, ação, destino/endpoint, estados (loading, disabled)
- [ ] Todos os estados da tela estão mapeados (idle, loading, error, success, empty)
- [ ] Fluxo de navegação: de onde vem, para onde vai
- [ ] Responsividade: como muda em mobile vs desktop
- [ ] Permissões: quem pode acessar (role)
- [ ] API calls: endpoint, método, payload, resposta esperada
- [ ] Casos de erro: o que acontece quando a API falha
- [ ] Estado vazio: o que mostrar quando não há dados

---

## 7. Quando Usar

| Situação | Ação |
|---|---|
| Criar tela nova | OBRIGATÓRIO — diagrama completo antes de codar |
| Modificar tela existente | Diagrama parcial — só dos elementos afetados |
| Criar componente reutilizável | Diagrama de componente com props e estados |
| Criar fluxo novo (ex: checkout) | Diagrama de navegação do fluxo inteiro |
| Corrigir bug visual | NÃO precisa — só fix direto |
| Adicionar campo em form | Diagrama parcial — campo + validação + API |

---

## 8. Diagramas do CRM IMOB — Telas Principais

### Mapa Geral de Navegação
```
                         ┌─────────────┐
                         │  Landing /  │
                         └──────┬──────┘
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
              ┌──────────┐ ┌────────┐ ┌──────────────┐
              │  Login   │ │Registro│ │Imóveis Público│
              │  /login  │ │/registro│ │/imoveis      │
              └────┬─────┘ └────────┘ └──────────────┘
                   ▼
            ┌──────────────┐
            │  Dashboard   │
            │  /dashboard  │
            └──────┬───────┘
     ┌─────────┬───┴────┬──────────┬──────────┐
     ▼         ▼        ▼          ▼          ▼
┌─────────┐┌───────┐┌────────┐┌─────────┐┌────────┐
│Clientes ││Imóveis││Aluguéis││Pagamentos││Config  │
│/clientes││/imoveis││/alugueis││/pagamentos││/config│
└─────────┘└───────┘└────────┘└─────────┘└────────┘
```

### Regra de Integração com Token Optimization
> O diagrama substitui explicações longas. Em vez de gastar 500 tokens descrevendo uma tela, o diagrama usa ~200 tokens e é mais preciso. SEMPRE prefira diagrama sobre prosa.
