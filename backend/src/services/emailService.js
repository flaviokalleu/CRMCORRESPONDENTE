const nodemailer = require('nodemailer');

// ✅ CONFIGURAR TRANSPORTER DE EMAIL
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true para 465, false para outras portas
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

// ✅ FUNÇÃO PARA ENVIAR EMAIL DE PAGAMENTO
const enviarEmailPagamento = async (cliente, pagamento) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.log('⚠️ Configurações de email não definidas, simulando envio...');
      return {
        success: true,
        message: 'Email simulado (configurar SMTP no .env)',
        email: cliente.email
      };
    }

    const transporter = createTransporter();
    
    const tipoTexto = pagamento.tipo === 'pix' ? 'PIX' : 'BOLETO';
    const tipoEmoji = pagamento.tipo === 'pix' ? '⚡' : '🎫';
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${tipoTexto} - ${process.env.EMPRESA_NOME || 'Sistema CRM'}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { background: #27ae60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            .info { background: white; padding: 15px; border-left: 4px solid #3498db; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${tipoEmoji} ${tipoTexto} DISPONÍVEL</h1>
            </div>
            
            <div class="content">
                <h2>Olá, ${cliente.nome}!</h2>
                
                <p>Seu ${tipoTexto.toLowerCase()} está pronto para pagamento:</p>
                
                <div class="info">
                    <strong>Descrição:</strong> ${pagamento.titulo}<br>
                    ${pagamento.descricao ? `<strong>Detalhes:</strong> ${pagamento.descricao}<br>` : ''}
                    <strong>Valor:</strong> R$ ${pagamento.valor}<br>
                    ${pagamento.parcelas > 1 ? `<strong>Parcelas:</strong> ${pagamento.parcelas}x de R$ ${pagamento.valor_parcela}<br>` : ''}
                    <strong>Vencimento:</strong> ${new Date(pagamento.data_vencimento).toLocaleDateString('pt-BR')}<br>
                    <strong>ID:</strong> #${pagamento.id}
                </div>
                
                <div style="text-align: center;">
                    <a href="${pagamento.link_pagamento}" class="button">
                        PAGAR AGORA
                    </a>
                </div>
                
                ${pagamento.tipo === 'pix' ? 
                    '<p><strong>⚡ PIX - Pagamento instantâneo</strong><br>Aprovação imediata após pagamento</p>' :
                    '<p><strong>🎫 BOLETO BANCÁRIO</strong><br>Pode ser pago em qualquer banco ou pelo aplicativo do seu banco</p>'
                }
                
                <p>Em caso de dúvidas, entre em contato conosco.</p>
            </div>
            
            <div class="footer">
                <p>${process.env.EMPRESA_NOME || 'Sistema CRM CAIXA'}</p>
                <p>Este é um email automático, não responda.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Sistema CRM'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: cliente.email,
      subject: `${tipoTexto} Disponível - ${pagamento.titulo}`,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado com sucesso:', result.messageId);
    
    return {
      success: true,
      message: 'Email enviado com sucesso',
      messageId: result.messageId,
      email: cliente.email
    };

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  enviarEmailPagamento
};