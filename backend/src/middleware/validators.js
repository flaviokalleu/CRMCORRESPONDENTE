const { body, validationResult } = require('express-validator');

/**
 * Middleware que verifica os resultados de validação e retorna erros se existirem.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: 'Erro de validação',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─── Validação de CPF (algoritmo oficial) ───
const isValidCPF = (cpf) => {
  const cleaned = (cpf || '').replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false; // todos dígitos iguais

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
  let digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (parseInt(cleaned[9]) !== digit) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
  digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (parseInt(cleaned[10]) !== digit) return false;

  return true;
};

// ─── Validação de CNPJ ───
const isValidCNPJ = (cnpj) => {
  const cleaned = (cnpj || '').replace(/\D/g, '');
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleaned)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(cleaned[i]) * weights1[i];
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(cleaned[12]) !== digit) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(cleaned[i]) * weights2[i];
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(cleaned[13]) !== digit) return false;

  return true;
};

// ─── Regras de validação para Clientes ───
const validateCliente = [
  body('nome')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres'),

  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),

  body('cpf')
    .optional({ values: 'falsy' })
    .custom((value) => {
      if (value && !isValidCPF(value)) throw new Error('CPF inválido');
      return true;
    }),

  body('telefone')
    .optional({ values: 'falsy' })
    .custom((value) => {
      const cleaned = (value || '').replace(/\D/g, '');
      if (cleaned && (cleaned.length < 10 || cleaned.length > 11)) {
        throw new Error('Telefone deve ter 10 ou 11 dígitos');
      }
      return true;
    }),

  validate,
];

// ─── Regras de validação para Login ───
const validateLogin = [
  body('email')
    .notEmpty()
    .withMessage('Email é obrigatório')
    .trim(),

  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória')
    .isLength({ min: 4 })
    .withMessage('Senha deve ter no mínimo 4 caracteres'),

  validate,
];

// ─── Regras de validação para Registro ───
const validateRegister = [
  body('username')
    .notEmpty()
    .withMessage('Usuário é obrigatório')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Usuário deve ter entre 3 e 50 caracteres'),

  body('email')
    .notEmpty()
    .withMessage('Email é obrigatório')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres'),

  body('first_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Nome muito longo'),

  body('last_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Sobrenome muito longo'),

  validate,
];

// ─── Regras de validação para Pagamentos ───
const validatePagamento = [
  body('cliente_id')
    .notEmpty()
    .withMessage('Cliente é obrigatório')
    .isInt({ min: 1 })
    .withMessage('ID do cliente inválido'),

  body('valor')
    .notEmpty()
    .withMessage('Valor é obrigatório')
    .isFloat({ min: 0.01 })
    .withMessage('Valor deve ser maior que zero'),

  body('tipo')
    .optional()
    .isIn(['boleto', 'pix', 'cartao', 'universal'])
    .withMessage('Tipo de pagamento inválido'),

  validate,
];

// ─── Validação de Imóvel ───
const validateImovel = [
  body('nome_imovel')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Nome do imóvel muito longo'),

  body('valor_venda')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valor de venda inválido'),

  validate,
];

module.exports = {
  validate,
  validateCliente,
  validateLogin,
  validateRegister,
  validatePagamento,
  validateImovel,
  isValidCPF,
  isValidCNPJ,
};
