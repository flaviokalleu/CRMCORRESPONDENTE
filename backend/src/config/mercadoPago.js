const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

// Configurar credenciais do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN, // Token de acesso do Mercado Pago
  options: {
    timeout: 5000,
    idempotencyKey: 'abc'
  }
});

const preference = new Preference(client);
const payment = new Payment(client);

module.exports = {
  client,
  preference,
  payment
};