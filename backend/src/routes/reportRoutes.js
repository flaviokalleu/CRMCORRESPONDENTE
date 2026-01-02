// src/routes/reportRoutes.js
const express = require('express');
const { Cliente } = require('../models');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const puppeteer = require('puppeteer'); // Adicione esta dependência
const path = require('path');

// Configuração das faixas do Minha Casa Minha Vida (MCMV)
const MCMV_CONFIG = {
    FAIXAS: {
        FAIXA_1: { nome: 'Faixa 1 (até R$ 2.640)', min: 0, max: 2640 },
        FAIXA_2: { nome: 'Faixa 2 (R$ 2.640,01 a R$ 4.400)', min: 2640.01, max: 4400 },
        FAIXA_3: { nome: 'Faixa 3 (R$ 4.400,01 a R$ 8.000)', min: 4400.01, max: 8000 }
    }
};

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyCwVs-Zf-Re2Nmzw-VG0dNnsJs6as7oxXE');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Rota para visualizar relatório em HTML
router.get('/relatorio', async (req, res) => {
    try {
        const clientes = await Cliente.findAll({
            attributes: [
                'id', 'nome', 'email', 'telefone', 'cpf', 'estado_civil', 
                'profissao', 'naturalidade', 'valor_renda', 'status', 
                'data_nascimento', 'data_admissao', 'renda_tipo',
                'possui_carteira_mais_tres_anos', 'numero_pis', 
                'possui_dependente', 'created_at', 'updated_at'
            ],
        });

        if (!clientes.length) {
            return res.status(404).send(`
                <div style="text-align: center; padding: 50px; font-family: Arial;">
                    <h2>📊 Nenhum cliente encontrado</h2>
                    <p>Cadastre alguns clientes para visualizar os relatórios.</p>
                </div>
            `);
        }

        const analytics = await generateAdvancedAnalytics(clientes);
        const htmlContent = await generateAdvancedReport(analytics);
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(htmlContent);
    } catch (error) {
        console.error('Erro ao gerar o relatório:', error);
        res.status(500).send(`
            <div style="text-align: center; padding: 50px; font-family: Arial; color: red;">
                <h2>❌ Erro ao gerar o relatório</h2>
                <p>Verifique os logs do servidor para mais detalhes.</p>
            </div>
        `);
    }
});

// Nova rota para download do PDF
router.get('/relatorio/download', async (req, res) => {
    try {
        console.log('Iniciando geração do PDF do relatório de clientes...');
        const clientes = await Cliente.findAll({
            attributes: [
                'id', 'nome', 'email', 'telefone', 'cpf', 'estado_civil', 
                'profissao', 'naturalidade', 'valor_renda', 'status', 
                'data_nascimento', 'data_admissao', 'renda_tipo',
                'possui_carteira_mais_tres_anos', 'numero_pis', 
                'possui_dependente', 'created_at', 'updated_at'
            ],
        });

        console.log(`Clientes encontrados: ${clientes.length}`);
        if (!clientes.length) {
            console.log('Nenhum cliente encontrado para o relatório PDF.');
            return res.status(404).json({ error: 'Nenhum cliente encontrado' });
        }

        const analytics = await generateAdvancedAnalytics(clientes);
        console.log('Analytics gerado:', JSON.stringify(analytics.geral));
        const htmlContent = await generateAdvancedReport(analytics, true); // true para PDF
        console.log('HTML do relatório gerado para PDF (primeiros 500 caracteres):', htmlContent.substring(0, 500));

        // Gerar PDF usando puppeteer
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            console.log('Puppeteer browser iniciado.');
            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 60000 });
            console.log('Conteúdo HTML carregado na página Puppeteer.');
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                }
            });
            console.log('PDF gerado com sucesso.');
            await browser.close();
            console.log('Puppeteer browser fechado.');

            // Configurar headers para download
            const filename = `relatorio-clientes-${new Date().toISOString().split('T')[0]}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);
            console.log('PDF enviado para o cliente.');
        } catch (puppeteerError) {
            console.error('Erro no Puppeteer ao gerar PDF:', puppeteerError);
            if (browser) {
                await browser.close();
            }
            res.status(500).json({ error: 'Erro ao gerar o relatório PDF (Puppeteer)' });
        }
    } catch (error) {
        console.error('Erro ao gerar PDF (etapa geral):', error);
        res.status(500).json({ error: 'Erro ao gerar o relatório PDF' });
    }
});

// Nova rota para dados JSON do relatório
router.get('/relatorio/dados', async (req, res) => {
    try {
        const clientes = await Cliente.findAll({
            attributes: [
                'id', 'nome', 'email', 'telefone', 'cpf', 'estado_civil', 
                'profissao', 'naturalidade', 'valor_renda', 'status', 
                'data_nascimento', 'data_admissao', 'renda_tipo',
                'possui_carteira_mais_tres_anos', 'numero_pis', 
                'possui_dependente', 'created_at', 'updated_at'
            ],
        });

        if (!clientes.length) {
            return res.status(404).json({ error: 'Nenhum cliente encontrado' });
        }

        const analytics = await generateAdvancedAnalytics(clientes);
        
        res.json({
            success: true,
            data: analytics,
            total: clientes.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Erro ao gerar dados do relatório:', error);
        res.status(500).json({ error: 'Erro ao gerar os dados do relatório' });
    }
});

// Função principal de análise avançada
async function generateAdvancedAnalytics(clientes) {
    const analytics = {
        geral: generateGeneralStats(clientes),
        mcmv: analyzeMCMVCompatibility(clientes),
        perfil: generateProfileAnalysis(clientes),
        tendencias: generateTrendAnalysis(clientes),
        documentos: analyzeDocumentStatus(clientes),
        fgts: analyzeFGTSData(clientes),
        recomendacoes: await generateRecommendations(clientes)
    };

    return analytics;
}

// Estatísticas gerais
function generateGeneralStats(clientes) {
    const aprovados = clientes.filter(c => c.status?.toLowerCase().includes('aprovado'));
    const reprovados = clientes.filter(c => c.status?.toLowerCase().includes('reprovado'));
    const pendentes = clientes.filter(c => 
        c.status?.toLowerCase().includes('pendente') || 
        c.status?.toLowerCase().includes('análise') ||
        c.status?.toLowerCase().includes('aguardando')
    );

    const clientesComRenda = clientes.filter(c => c.valor_renda && c.valor_renda > 0);
    const clientesComTelefone = clientes.filter(c => c.telefone);
    const clientesComEmail = clientes.filter(c => c.email);
    const clientesComCPF = clientes.filter(c => c.cpf);

    return {
        total: clientes.length,
        aprovados: aprovados.length,
        reprovados: reprovados.length,
        pendentes: pendentes.length,
        taxaAprovacao: clientes.length > 0 ? ((aprovados.length / clientes.length) * 100).toFixed(1) : 0,
        taxaReprovacao: clientes.length > 0 ? ((reprovados.length / clientes.length) * 100).toFixed(1) : 0,
        rendaMedia: calculateAverageIncome(clientesComRenda),
        dadosCompletos: {
            comRenda: clientesComRenda.length,
            comTelefone: clientesComTelefone.length,
            comEmail: clientesComEmail.length,
            comCPF: clientesComCPF.length,
            percentualCompleto: ((clientesComRenda.length / clientes.length) * 100).toFixed(1)
        }
    };
}

// Análise de compatibilidade MCMV
function analyzeMCMVCompatibility(clientes) {
    const faixas = {};
    const elegibilidade = { elegivel: 0, naoElegivel: 0, semRenda: 0 };

    Object.keys(MCMV_CONFIG.FAIXAS).forEach(key => {
        faixas[key] = { count: 0, aprovados: 0, reprovados: 0, pendentes: 0 };
    });

    clientes.forEach(cliente => {
        const renda = parseFloat(cliente.valor_renda) || 0;
        
        if (renda === 0) {
            elegibilidade.semRenda++;
            return;
        }

        const faixa = determineMCMVRange(renda);
        
        if (faixa) {
            faixas[faixa].count++;
            if (cliente.status?.toLowerCase().includes('aprovado')) {
                faixas[faixa].aprovados++;
            } else if (cliente.status?.toLowerCase().includes('reprovado')) {
                faixas[faixa].reprovados++;
            } else {
                faixas[faixa].pendentes++;
            }
        }

        // Elegibilidade básica
        if (renda <= MCMV_CONFIG.FAIXAS.FAIXA_3.max && renda > 0) {
            elegibilidade.elegivel++;
        } else if (renda > MCMV_CONFIG.FAIXAS.FAIXA_3.max) {
            elegibilidade.naoElegivel++;
        }
    });

    return { faixas, elegibilidade };
}

// Análise de perfil detalhada
function generateProfileAnalysis(clientes) {
    const estadoCivil = groupBy(clientes, 'estado_civil');
    const profissao = groupBy(clientes, 'profissao');
    const naturalidade = groupBy(clientes, 'naturalidade');
    const tipoRenda = groupBy(clientes, 'renda_tipo');
    const idadeDistribuicao = analyzeAgeDistribution(clientes);

    return {
        estadoCivil: addSuccessRates(estadoCivil, clientes, 'estado_civil'),
        profissao: addSuccessRates(profissao, clientes, 'profissao'),
        naturalidade: addSuccessRates(naturalidade, clientes, 'naturalidade'),
        tipoRenda: addSuccessRates(tipoRenda, clientes, 'renda_tipo'),
        idadeMedia: calculateAverageAge(clientes),
        idadeDistribuicao,
        tempoEmpregoAnalise: analyzeEmploymentTime(clientes)
    };
}

// Análise de distribuição de idade
function analyzeAgeDistribution(clientes) {
    const faixasIdade = {
        '18-25 anos': 0,
        '26-35 anos': 0,
        '36-45 anos': 0,
        '46-55 anos': 0,
        '56-65 anos': 0,
        'Acima de 65 anos': 0,
        'Não informado': 0
    };

    clientes.forEach(cliente => {
        if (!cliente.data_nascimento) {
            faixasIdade['Não informado']++;
            return;
        }

        const idade = calculateAge(cliente.data_nascimento);
        
        if (idade >= 18 && idade <= 25) faixasIdade['18-25 anos']++;
        else if (idade >= 26 && idade <= 35) faixasIdade['26-35 anos']++;
        else if (idade >= 36 && idade <= 45) faixasIdade['36-45 anos']++;
        else if (idade >= 46 && idade <= 55) faixasIdade['46-55 anos']++;
        else if (idade >= 56 && idade <= 65) faixasIdade['56-65 anos']++;
        else if (idade > 65) faixasIdade['Acima de 65 anos']++;
    });

    return faixasIdade;
}

// Análise de tempo de emprego
function analyzeEmploymentTime(clientes) {
    const clientesComAdmissao = clientes.filter(c => c.data_admissao);
    const tempos = clientesComAdmissao.map(c => {
        const admissao = new Date(c.data_admissao);
        const hoje = new Date();
        const meses = Math.floor((hoje - admissao) / (1000 * 60 * 60 * 24 * 30));
        return Math.max(0, meses);
    });

    const faixasTempo = {
        'Menos de 6 meses': 0,
        '6 meses a 1 ano': 0,
        '1 a 2 anos': 0,
        '2 a 5 anos': 0,
        'Mais de 5 anos': 0
    };

    tempos.forEach(tempo => {
        if (tempo < 6) faixasTempo['Menos de 6 meses']++;
        else if (tempo < 12) faixasTempo['6 meses a 1 ano']++;
        else if (tempo < 24) faixasTempo['1 a 2 anos']++;
        else if (tempo < 60) faixasTempo['2 a 5 anos']++;
        else faixasTempo['Mais de 5 anos']++;
    });

    return {
        faixas: faixasTempo,
        tempoMedio: tempos.length > 0 ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0,
        totalComDados: clientesComAdmissao.length
    };
}

// Análise de tendências temporais
function generateTrendAnalysis(clientes) {
    const porMes = {};
    const hoje = new Date();
    
    for (let i = 11; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        porMes[chave] = { total: 0, aprovados: 0, reprovados: 0, pendentes: 0 };
    }

    clientes.forEach(cliente => {
        const data = new Date(cliente.created_at);
        const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        
        if (porMes[chave]) {
            porMes[chave].total++;
            if (cliente.status?.toLowerCase().includes('aprovado')) {
                porMes[chave].aprovados++;
            } else if (cliente.status?.toLowerCase().includes('reprovado')) {
                porMes[chave].reprovados++;
            } else {
                porMes[chave].pendentes++;
            }
        }
    });

    return porMes;
}

// Análise de status de documentos
function analyzeDocumentStatus(clientes) {
    const documentos = {
        pessoais: clientes.filter(c => c.documentos_pessoais).length,
        bancarios: clientes.filter(c => c.extrato_bancario).length,
        dependente: clientes.filter(c => c.documentos_dependente).length,
        conjuge: clientes.filter(c => c.documentos_conjuge).length
    };

    const completos = clientes.filter(c => 
        c.documentos_pessoais && c.extrato_bancario
    ).length;

    return {
        documentos,
        completos,
        percentualCompleto: clientes.length > 0 ? ((completos / clientes.length) * 100).toFixed(1) : 0,
        total: clientes.length
    };
}

// Análise de dados FGTS
function analyzeFGTSData(clientes) {
    const comCarteira = clientes.filter(c => c.possui_carteira_mais_tres_anos === true).length;
    const semCarteira = clientes.filter(c => c.possui_carteira_mais_tres_anos === false).length;
    const naoInformado = clientes.filter(c => c.possui_carteira_mais_tres_anos === null).length;
    
    const comPIS = clientes.filter(c => c.numero_pis).length;
    const comDependente = clientes.filter(c => c.possui_dependente === true).length;

    return {
        carteiraTempo: {
            comCarteira,
            semCarteira,
            naoInformado,
            percentualCom: clientes.length > 0 ? ((comCarteira / clientes.length) * 100).toFixed(1) : 0
        },
        pis: {
            comPIS,
            percentual: clientes.length > 0 ? ((comPIS / clientes.length) * 100).toFixed(1) : 0
        },
        dependentes: {
            comDependente,
            percentual: clientes.length > 0 ? ((comDependente / clientes.length) * 100).toFixed(1) : 0
        }
    };
}

// Gerar recomendações com IA
async function generateRecommendations(clientes) {
    const stats = generateGeneralStats(clientes);
    const mcmv = analyzeMCMVCompatibility(clientes);
    const docs = analyzeDocumentStatus(clientes);
    
    const prompt = `
    Como especialista em crédito imobiliário da Caixa Econômica Federal, analise os dados e forneça recomendações estratégicas:
    
    Estatísticas Gerais:
    - Total de clientes: ${stats.total}
    - Taxa de aprovação: ${stats.taxaAprovacao}%
    - Renda média: R$ ${stats.rendaMedia}
    - Dados completos: ${stats.dadosCompletos.percentualCompleto}%
    
    Elegibilidade MCMV:
    - Elegíveis: ${mcmv.elegibilidade.elegivel}
    - Não elegíveis: ${mcmv.elegibilidade.naoElegivel}
    - Sem renda informada: ${mcmv.elegibilidade.semRenda}
    
    Documentação:
    - Documentação completa: ${docs.percentualCompleto}%
    
    Forneça 5 recomendações específicas e práticas para:
    1. Melhoria da taxa de aprovação
    2. Estratégias para completar dados dos clientes
    3. Otimização do processo de documentação
    4. Abordagem para cada faixa MCMV
    5. Ações imediatas para correspondentes
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text().replace(/\*\*/g, '').replace(/(?:\r\n|\r|\n)/g, '<br>');
    } catch (error) {
        console.error('Erro ao gerar recomendações:', error);
        return `
            <strong>Recomendações Baseadas em Análise:</strong><br><br>
            1. <strong>Completar Dados:</strong> ${100 - parseFloat(generateGeneralStats(clientes).dadosCompletos.percentualCompleto)}% dos clientes precisam de dados completos<br>
            2. <strong>Documentação:</strong> Priorizar coleta de documentos pessoais e extratos bancários<br>
            3. <strong>Foco MCMV:</strong> ${mcmv.elegibilidade.elegivel} clientes elegíveis precisam de atenção prioritária<br>
            4. <strong>Follow-up:</strong> Implementar processo de acompanhamento para ${generateGeneralStats(clientes).pendentes} clientes pendentes<br>
            5. <strong>Capacitação:</strong> Treinar equipe para melhorar taxa de aprovação atual de ${generateGeneralStats(clientes).taxaAprovacao}%
        `;
    }
}

// Gerar relatório HTML avançado
async function generateAdvancedReport(analytics, isPDF = false) {
    const pdfStyles = isPDF ? `
        @media print {
            .no-print { display: none !important; }
            .section { page-break-inside: avoid; margin-bottom: 20px; }
            .chart-container { display: none !important; }
        }
        body { -webkit-print-color-adjust: exact; }
    ` : '';

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório Avançado - Correspondentes Caixa</title>
        <style>
            ${getAdvancedCSS()}
            ${pdfStyles}
        </style>
    </head>
    <body>
        <div class="container">
            <header class="header">
                <div class="logo">🏦</div>
                <h1>Relatório Avançado para Correspondentes Caixa</h1>
                <p class="subtitle">Análise Completa do Programa Minha Casa Minha Vida</p>
                <div class="date">Gerado em: ${new Date().toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</div>
            </header>

            ${generateDashboard(analytics.geral)}
            ${generateMCMVSection(analytics.mcmv, true)}
            ${generateProfileSection(analytics.perfil, true)}
            ${generateDocumentSection(analytics.documentos)}
            ${generateFGTSSection(analytics.fgts)}
            ${generateTrendsSection(analytics.tendencias, true)}
            ${generateRecommendationsSection(analytics.recomendacoes)}
            ${generateActionPlan(analytics)}
        </div>
    </body>
    </html>
    `;
}

// CSS avançado melhorado
function getAdvancedCSS() {
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px 0;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .header { 
            background: rgba(255, 255, 255, 0.95); 
            color: #2c3e50; 
            padding: 40px; 
            border-radius: 20px; 
            margin-bottom: 30px; 
            text-align: center;
            backdrop-filter: blur(10px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .logo { font-size: 4em; margin-bottom: 10px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; background: linear-gradient(45deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { font-size: 1.2em; opacity: 0.8; margin-bottom: 20px; }
        .date { font-size: 0.9em; opacity: 0.7; font-style: italic; }
        .dashboard { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
            gap: 25px; 
            margin-bottom: 40px; 
        }
        .card { 
            background: rgba(255, 255, 255, 0.95); 
            padding: 30px; 
            border-radius: 20px; 
            box-shadow: 0 15px 35px rgba(0,0,0,0.1); 
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .card:hover { 
            transform: translateY(-10px); 
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
        }
        .card-title { 
            font-size: 1.1em; 
            color: #34495e; 
            margin-bottom: 15px; 
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .metric { 
            font-size: 3em; 
            font-weight: bold; 
            margin: 15px 0;
            text-align: center;
        }
        .metric.success { color: #27ae60; }
        .metric.warning { color: #f39c12; }
        .metric.danger { color: #e74c3c; }
        .metric.info { color: #3498db; }
        .section { 
            background: rgba(255, 255, 255, 0.95); 
            margin-bottom: 30px; 
            border-radius: 20px; 
            overflow: hidden; 
            box-shadow: 0 15px 35px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
        }
        .section-header { 
            background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); 
            color: white; 
            padding: 25px 30px; 
            font-size: 1.4em; 
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .section-content { padding: 30px; }
        .table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .table th, .table td { 
            padding: 15px; 
            text-align: left; 
            border-bottom: 1px solid #ecf0f1; 
        }
        .table th { 
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
            font-weight: 600; 
            color: #2c3e50;
            text-transform: uppercase;
            font-size: 0.9em;
            letter-spacing: 0.5px;
        }
        .table tr:hover { background: #f8f9fa; }
        .progress-bar { 
            background: #ecf0f1; 
            height: 12px; 
            border-radius: 6px; 
            overflow: hidden; 
            margin: 8px 0;
            position: relative;
        }
        .progress-fill { 
            height: 100%; 
            transition: width 0.5s ease;
            border-radius: 6px;
            position: relative;
        }
        .success-rate { background: linear-gradient(90deg, #27ae60, #2ecc71); }
        .warning-rate { background: linear-gradient(90deg, #f39c12, #f1c40f); }
        .danger-rate { background: linear-gradient(90deg, #e74c3c, #c0392b); }
        .chart-container { 
            margin: 30px 0; 
            height: 350px; 
            background: #f8f9fa;
            border-radius: 15px;
            padding: 20px;
        }
        .recommendations { 
            background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%); 
            border-left: 5px solid #27ae60; 
            padding: 25px; 
            margin: 25px 0; 
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(39, 174, 96, 0.1);
        }
        .action-plan { 
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); 
            border-left: 5px solid #ffc107; 
            padding: 25px; 
            margin: 25px 0; 
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(255, 193, 7, 0.1);
        }
        .tag { 
            display: inline-block; 
            padding: 6px 12px; 
            border-radius: 20px; 
            font-size: 0.85em; 
            margin: 3px;
            font-weight: 500;
        }
        .tag.high { background: linear-gradient(135deg, #ffebee, #ffcdd2); color: #c62828; }
        .tag.medium { background: linear-gradient(135deg, #fff8e1, #ffe0b2); color: #f57c00; }
        .tag.low { background: linear-gradient(135deg, #e8f5e8, #c8e6c9); color: #2e7d32; }
        .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 25px; }
        .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .highlight { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 15px; margin: 20px 0; }
        .stat-mini { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee; }
        .stat-mini:last-child { border-bottom: none; }
    `;
}

// Dashboard principal melhorado
function generateDashboard(stats) {
    return `
        <div class="dashboard">
            <div class="card">
                <div class="card-title">👥 Total de Clientes</div>
                <div class="metric info">${stats.total}</div>
                <div style="font-size: 0.9em; color: #7f8c8d;">Base de dados atual</div>
            </div>
            <div class="card">
                <div class="card-title">✅ Taxa de Aprovação</div>
                <div class="metric ${parseFloat(stats.taxaAprovacao) >= 70 ? 'success' : parseFloat(stats.taxaAprovacao) >= 50 ? 'warning' : 'danger'}">${stats.taxaAprovacao}%</div>
                <div style="font-size: 0.9em; color: #7f8c8d;">${stats.aprovados} aprovados de ${stats.total}</div>
            </div>
            <div class="card">
                <div class="card-title">💰 Renda Média</div>
                <div class="metric success">R$ ${stats.rendaMedia}</div>
                <div style="font-size: 0.9em; color: #7f8c8d;">${stats.dadosCompletos.comRenda} clientes com renda</div>
            </div>
            <div class="card">
                <div class="card-title">📋 Dados Completos</div>
                <div class="metric ${parseFloat(stats.dadosCompletos.percentualCompleto) >= 80 ? 'success' : parseFloat(stats.dadosCompletos.percentualCompleto) >= 60 ? 'warning' : 'danger'}">${stats.dadosCompletos.percentualCompleto}%</div>
                <div style="font-size: 0.9em; color: #7f8c8d;">Clientes com informações completas</div>
            </div>
        </div>
    `;
}

// Seção MCMV melhorada
function generateMCMVSection(mcmv, isPDF) {
    let faixasHTML = '';
    Object.entries(mcmv.faixas).forEach(([key, data]) => {
        const faixa = MCMV_CONFIG.FAIXAS[key];
        const taxaAprovacao = data.count > 0 ? ((data.aprovados / data.count) * 100).toFixed(1) : 0;
        faixasHTML += `
            <tr>
                <td><strong>${faixa.nome}</strong></td>
                <td>${data.count}</td>
                <td>${data.aprovados}</td>
                <td>${data.reprovados}</td>
                <td>${data.pendentes}</td>
                <td><span class="tag ${parseFloat(taxaAprovacao) >= 70 ? 'low' : parseFloat(taxaAprovacao) >= 50 ? 'medium' : 'high'}">${taxaAprovacao}%</span></td>
            </tr>
        `;
    });

    return `
        <div class="section">
            <div class="section-header">🏠 Análise MCMV por Faixas de Renda</div>
            <div class="section-content">
                <div class="grid-3" style="margin-bottom: 30px;">
                    <div class="card">
                        <h3 style="color: #27ae60;">✅ Elegíveis MCMV</h3>
                        <div class="metric success">${mcmv.elegibilidade.elegivel}</div>
                    </div>
                    <div class="card">
                        <h3 style="color: #e74c3c;">❌ Não Elegíveis</h3>
                        <div class="metric danger">${mcmv.elegibilidade.naoElegivel}</div>
                    </div>
                    <div class="card">
                        <h3 style="color: #f39c12;">⚠️ Sem Renda</h3>
                        <div class="metric warning">${mcmv.elegibilidade.semRenda}</div>
                    </div>
                </div>
                
                <table class="table">
                    <thead>
                        <tr>
                            <th>Faixa MCMV</th>
                            <th>Total</th>
                            <th>Aprovados</th>
                            <th>Reprovados</th>
                            <th>Pendentes</th>
                            <th>Taxa Aprovação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${faixasHTML}
                    </tbody>
                </table>
                ${!isPDF ? `<div class="chart-container">
                    <canvas id="mcmvChart"></canvas>
                </div>` : ''}
            </div>
        </div>
    `;
}

// Seção de Perfil melhorada
function generateProfileSection(perfil, isPDF) {
    return `
        <div class="section">
            <div class="section-header">👥 Análise de Perfil dos Clientes</div>
            <div class="section-content">
                <div class="grid-2">
                    ${generateProfileTable('Estado Civil', perfil.estadoCivil)}
                    ${generateProfileTable('Profissão', perfil.profissao)}
                    ${generateProfileTable('Naturalidade', perfil.naturalidade)}
                    ${generateProfileTable('Tipo de Renda', perfil.tipoRenda)}
                </div>
                
                <div class="grid-2" style="margin-top: 30px;">
                    <div class="card">
                        <h3>📊 Distribuição por Idade</h3>
                        <div class="chart-container" style="height: 250px;">
                            <canvas id="ageChart"></canvas>
                        </div>
                    </div>
                    <div class="card">
                        <h3>💼 Tempo de Emprego</h3>
                        <div class="stat-mini">
                            <span>Tempo Médio:</span>
                            <strong>${perfil.tempoEmpregoAnalise.tempoMedio} meses</strong>
                        </div>
                        <div class="stat-mini">
                            <span>Com Dados:</span>
                            <strong>${perfil.tempoEmpregoAnalise.totalComDados} clientes</strong>
                        </div>
                        <div class="stat-mini">
                            <span>Idade Média:</span>
                            <strong>${perfil.idadeMedia} anos</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Seção de Documentos
function generateDocumentSection(docs) {
    return `
        <div class="section">
            <div class="section-header">📄 Status da Documentação</div>
            <div class="section-content">
                <div class="highlight">
                    <h3>📊 Resumo Geral</h3>
                    <p><strong>${docs.completos}</strong> clientes com documentação completa (${docs.percentualCompleto}%)</p>
                </div>
                
                <div class="grid-2">
                    <div class="card">
                        <h3>📋 Tipos de Documentos</h3>
                        <div class="stat-mini">
                            <span>Documentos Pessoais:</span>
                            <strong>${docs.documentos.pessoais}</strong>
                        </div>
                        <div class="stat-mini">
                            <span>Extratos Bancários:</span>
                            <strong>${docs.documentos.bancarios}</strong>
                        </div>
                        <div class="stat-mini">
                            <span>Docs. Dependente:</span>
                            <strong>${docs.documentos.dependente}</strong>
                        </div>
                        <div class="stat-mini">
                            <span>Docs. Cônjuge:</span>
                            <strong>${docs.documentos.conjuge}</strong>
                        </div>
                    </div>
                    <div class="card">
                        <h3>📈 Progresso da Documentação</h3>
                        <div style="margin: 20px 0;">
                            <div>Documentação Completa</div>
                            <div class="progress-bar">
                                <div class="progress-fill ${parseFloat(docs.percentualCompleto) >= 80 ? 'success-rate' : parseFloat(docs.percentualCompleto) >= 60 ? 'warning-rate' : 'danger-rate'}" style="width: ${docs.percentualCompleto}%"></div>
                            </div>
                            <small>${docs.percentualCompleto}% (${docs.completos}/${docs.total})</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Seção FGTS
function generateFGTSSection(fgts) {
    return `
        <div class="section">
            <div class="section-header">💼 Análise FGTS e Vínculos Empregatícios</div>
            <div class="section-content">
                <div class="grid-3">
                    <div class="card">
                        <h3>📅 Carteira de Trabalho</h3>
                        <div class="stat-mini">
                            <span>Mais de 3 anos:</span>
                            <strong>${fgts.carteiraTempo.comCarteira}</strong>
                        </div>
                        <div class="stat-mini">
                            <span>Menos de 3 anos:</span>
                            <strong>${fgts.carteiraTempo.semCarteira}</strong>
                        </div>
                        <div class="stat-mini">
                            <span>Não informado:</span>
                            <strong>${fgts.carteiraTempo.naoInformado}</strong>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill success-rate" style="width: ${fgts.carteiraTempo.percentualCom}%"></div>
                        </div>
                        <small>${fgts.carteiraTempo.percentualCom}% com mais de 3 anos</small>
                    </div>
                    <div class="card">
                        <h3>🆔 Número PIS</h3>
                        <div class="metric success">${fgts.pis.comPIS}</div>
                        <div class="progress-bar">
                            <div class="progress-fill success-rate" style="width: ${fgts.pis.percentual}%"></div>
                        </div>
                        <small>${fgts.pis.percentual}% com PIS informado</small>
                    </div>
                    <div class="card">
                        <h3>👨‍👩‍👧‍👦 Dependentes</h3>
                        <div class="metric info">${fgts.dependentes.comDependente}</div>
                        <div class="progress-bar">
                            <div class="progress-fill warning-rate" style="width: ${fgts.dependentes.percentual}%"></div>
                        </div>
                        <small>${fgts.dependentes.percentual}% possuem dependentes</small>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Continuar com as outras funções...
function generateTrendsSection(tendencias, isPDF) {
    let trendsHTML = '';
    Object.entries(tendencias).forEach(([mes, data]) => {
        const taxa = data.total > 0 ? ((data.aprovados / data.total) * 100).toFixed(1) : 0;
        trendsHTML += `
            <tr>
                <td><strong>${mes}</strong></td>
                <td>${data.total}</td>
                <td>${data.aprovados}</td>
                <td>${data.reprovados}</td>
                <td>${data.pendentes}</td>
                <td><span class="tag ${parseFloat(taxa) >= 70 ? 'low' : parseFloat(taxa) >= 50 ? 'medium' : 'high'}">${taxa}%</span></td>
            </tr>
        `;
    });

    return `
        <div class="section">
            <div class="section-header">📈 Tendências dos Últimos 12 Meses</div>
            <div class="section-content">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Mês</th>
                            <th>Total</th>
                            <th>Aprovados</th>
                            <th>Reprovados</th>
                            <th>Pendentes</th>
                            <th>Taxa</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${trendsHTML}
                    </tbody>
                </table>
                ${!isPDF ? `<div class="chart-container">
                    <canvas id="trendsChart"></canvas>
                </div>` : ''}
            </div>
        </div>
    `;
}

function generateRecommendationsSection(recomendacoes) {
    return `
        <div class="section">
            <div class="section-header">💡 Recomendações Estratégicas</div>
            <div class="section-content">
                <div class="recommendations">
                    ${recomendacoes}
                </div>
            </div>
        </div>
    `;
}

function generateActionPlan(analytics) {
    const stats = analytics.geral;
    const mcmv = analytics.mcmv;
    const docs = analytics.documentos;
    
    return `
        <div class="section">
            <div class="section-header">🎯 Plano de Ação Personalizado</div>
            <div class="section-content">
                <div class="action-plan">
                    <h3>🚀 Ações Imediatas (Próximos 15 dias)</h3>
                    <ul>
                        <li><strong>Completar Dados:</strong> Focar nos ${stats.total - stats.dadosCompletos.comRenda} clientes sem renda informada</li>
                        <li><strong>Documentação:</strong> Priorizar coleta para ${docs.total - docs.completos} clientes com docs pendentes</li>
                        <li><strong>Follow-up:</strong> Contatar ${stats.pendentes} clientes com status pendente</li>
                        <li><strong>MCMV Focus:</strong> Dar atenção especial aos ${mcmv.elegibilidade.elegivel} clientes elegíveis</li>
                    </ul>
                    
                    <h3>📊 Metas de Médio Prazo (60 dias)</h3>
                    <ul>
                        <li>Aumentar taxa de aprovação para ${Math.min(parseFloat(stats.taxaAprovacao) + 15, 90)}%</li>
                        <li>Completar dados de ${Math.min(100, parseFloat(stats.dadosCompletos.percentualCompleto) + 20)}% dos clientes</li>
                        <li>Atingir ${Math.min(100, parseFloat(docs.percentualCompleto) + 25)}% de documentação completa</li>
                        <li>Reduzir clientes pendentes em 50%</li>
                    </ul>
                    
                    <h3>🎯 KPIs de Acompanhamento</h3>
                    <ul>
                        <li><strong>Taxa de Conversão:</strong> Meta ${Math.min(parseFloat(stats.taxaAprovacao) + 10, 85)}% (atual: ${stats.taxaAprovacao}%)</li>
                        <li><strong>Qualidade dos Dados:</strong> Meta 90% (atual: ${stats.dadosCompletos.percentualCompleto}%)</li>
                        <li><strong>Tempo de Processo:</strong> Reduzir em 30% o tempo médio de análise</li>
                        <li><strong>Satisfação do Cliente:</strong> Implementar pesquisa de satisfação</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

// Funções auxiliares
function groupBy(array, key) {
    return array.reduce((result, item) => {
        const group = item[key] || 'Não informado';
        result[group] = (result[group] || 0) + 1;
        return result;
    }, {});
}

function addSuccessRates(groupedData, allClients, field) {
    const result = {};
    Object.entries(groupedData).forEach(([key, count]) => {
        const clients = allClients.filter(c => (c[field] || 'Não informado') === key);
        const approved = clients.filter(c => c.status?.toLowerCase().includes('aprovado')).length;
        result[key] = {
            total: count,
            aprovados: approved,
            taxa: count > 0 ? ((approved / count) * 100).toFixed(1) : 0
        };
    });
    return result;
}

function calculateAverageIncome(clientes) {
    if (!clientes.length) return 0;
    const rendas = clientes.map(c => parseFloat(c.valor_renda)).filter(r => r > 0);
    return rendas.length > 0 ? (rendas.reduce((a, b) => a + b, 0) / rendas.length).toFixed(0) : 0;
}

function calculateAverageAge(clientes) {
    const idades = clientes.filter(c => c.data_nascimento).map(c => calculateAge(c.data_nascimento));
    return idades.length > 0 ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : 0;
}

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return Math.max(0, age);
}

function determineMCMVRange(renda) {
    for (const [key, faixa] of Object.entries(MCMV_CONFIG.FAIXAS)) {
        if (renda >= faixa.min && renda <= faixa.max) {
            return key;
        }
    }
    return null;
}

function generateProfileTable(title, data) {
    let rows = '';
    const sortedData = Object.entries(data)
        .sort(([,a], [,b]) => (typeof b === 'object' ? b.total : b) - (typeof a === 'object' ? a.total : a))
        .slice(0, 8);
    
    sortedData.forEach(([key, value]) => {
        const total = typeof value === 'object' ? value.total : value;
        const taxa = typeof value === 'object' ? value.taxa : 0;
        rows += `
            <tr>
                <td>${key}</td>
                <td>${total}</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill ${parseFloat(taxa) >= 70 ? 'success-rate' : parseFloat(taxa) >= 50 ? 'warning-rate' : 'danger-rate'}" style="width: ${taxa}%"></div>
                    </div>
                    ${taxa}%
                </td>
            </tr>
        `;
    });

    return `
        <div class="card">
            <h3>${title}</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>${title}</th>
                        <th>Total</th>
                        <th>Taxa Aprovação</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

function getChartScripts(analytics) {
    return `
        // Configuração global dos gráficos
        Chart.defaults.font.family = 'Segoe UI';
        Chart.defaults.font.size = 12;
        
        // Gráfico MCMV
        const ctx1 = document.getElementById('mcmvChart').getContext('2d');
        new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(Object.keys(analytics.mcmv.faixas).map(key => MCMV_CONFIG.FAIXAS[key].nome))},
                datasets: [{
                    label: 'Total',
                    data: ${JSON.stringify(Object.values(analytics.mcmv.faixas).map(f => f.count))},
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2,
                    borderRadius: 5
                }, {
                    label: 'Aprovados',
                    data: ${JSON.stringify(Object.values(analytics.mcmv.faixas).map(f => f.aprovados))},
                    backgroundColor: 'rgba(39, 174, 96, 0.8)',
                    borderColor: 'rgba(39, 174, 96, 1)',
                    borderWidth: 2,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribuição por Faixas MCMV',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
        // Gráfico de Idade
        const ctx2 = document.getElementById('ageChart').getContext('2d');
        new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ${JSON.stringify(Object.keys(analytics.perfil.idadeDistribuicao))},
                datasets: [{
                    data: ${JSON.stringify(Object.values(analytics.perfil.idadeDistribuicao))},
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 205, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 159, 64, 0.8)',
                        'rgba(199, 199, 199, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 205, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(199, 199, 199, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribuição por Faixa Etária',
                        font: { size: 14, weight: 'bold' }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            font: { size: 10 }
                        }
                    }
                }
            }
        });
        
        // Gráfico de Tendências
        const ctx3 = document.getElementById('trendsChart').getContext('2d');
        new Chart(ctx3, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(Object.keys(analytics.tendencias))},
                datasets: [{
                    label: 'Taxa de Aprovação (%)',
                    data: ${JSON.stringify(Object.values(analytics.tendencias).map(t => t.total > 0 ? ((t.aprovados / t.total) * 100).toFixed(1) : 0))},
                    borderColor: 'rgba(39, 174, 96, 1)',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(39, 174, 96, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }, {
                    label: 'Total de Clientes',
                    data: ${JSON.stringify(Object.values(analytics.tendencias).map(t => t.total))},
                    borderColor: 'rgba(102, 126, 234, 1)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Evolução Mensal - Taxa de Aprovação vs Volume',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Taxa de Aprovação (%)'
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de Clientes'
                        },
                        grid: {
                            drawOnChartArea: false,
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    `;
}

module.exports = router;
