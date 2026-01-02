import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// Usando as cores do sistema (tailwind.config.js)
const cores = [
  '#1B4F72', // caixa.primary
  '#5DADE2', // caixa.light
  '#FFC107', // caixa.warning
  '#DC3545', // caixa.error
  '#28A745', // caixa.success
  '#17A2B8', // caixa.info
];


const DashboardFinanceiro = ({ resumo }) => {
  // Espera-se que o backend envie todos os dados necessários em resumo
  // Exemplo de estrutura esperada:
  // resumo = {
  //   receitaMensal: [{ mes, valor }],
  //   margemMensal: [{ mes, valor }],
  //   percentualMensal: [{ mes, valor }],
  //   receitaPorLinha: [{ name, value }],
  //   margemPorFornecedor: [{ name, value }],
  //   equipeVendas: [{ nome, receita, margem, percentual }],
  //   totalReceitas, totalDespesas, lucro, pendencias
  // }

  return (
    <div className="w-full min-h-[80vh] bg-caixa-secondary grid grid-cols-1 md:grid-cols-2 gap-6 py-8 px-2 md:px-8 lg:px-16 xl:px-32">
      {/* Cards principais */}
      <div className="col-span-2 grid grid-cols-3 gap-4 mb-4">
        <div className="bg-caixa-primary text-white p-6 rounded-xl shadow flex flex-col items-center">
          <div className="text-3xl font-bold">R$ {resumo?.totalReceitas ? Number(resumo.totalReceitas).toLocaleString('pt-BR', {minimumFractionDigits:2}) : '--'}</div>
          <div className="mt-2 text-sm">Receita</div>
          {resumo?.receitaMensal && (
            <ResponsiveContainer width="100%" height={60}>
              <BarChart data={resumo.receitaMensal}>
                <Bar dataKey="valor" fill="#1B4F72" radius={[4,4,0,0]} />
                <XAxis dataKey="mes" hide />
                <YAxis hide />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-caixa-success text-white p-6 rounded-xl shadow flex flex-col items-center">
          <div className="text-3xl font-bold">{resumo?.lucro ? Number(resumo.lucro).toLocaleString('pt-BR', {minimumFractionDigits:2}) : '--'}</div>
          <div className="mt-2 text-sm">Margem Bruta</div>
          {resumo?.margemMensal && (
            <ResponsiveContainer width="100%" height={60}>
              <BarChart data={resumo.margemMensal}>
                <Bar dataKey="valor" fill="#28A745" radius={[4,4,0,0]} />
                <XAxis dataKey="mes" hide />
                <YAxis hide />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-caixa-warning text-white p-6 rounded-xl shadow flex flex-col items-center">
          <div className="text-3xl font-bold">{resumo?.percentualMensal && resumo.percentualMensal.length ? `${resumo.percentualMensal[resumo.percentualMensal.length-1].valor.toFixed(2)}%` : '--'}</div>
          <div className="mt-2 text-sm">Margem Percentual</div>
          {resumo?.percentualMensal && (
            <ResponsiveContainer width="100%" height={60}>
              <BarChart data={resumo.percentualMensal}>
                <Bar dataKey="valor" fill="#FFC107" radius={[4,4,0,0]} />
                <XAxis dataKey="mes" hide />
                <YAxis hide />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Receita por linha de produto (pizza) */}
      <div className="bg-caixa-secondary text-white p-6 rounded-xl shadow border border-caixa-light">
        <h3 className="font-bold mb-2">Receita por Linha Produto</h3>
        {resumo?.receitaPorLinha && (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={resumo.receitaPorLinha} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                {resumo.receitaPorLinha.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={cores[idx % cores.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Margem bruta por fornecedor (barras horizontais) */}
      <div className="bg-caixa-secondary text-white p-6 rounded-xl shadow border border-caixa-light">
        <h3 className="font-bold mb-2">Margem Bruta por Fornecedor</h3>
        <div className="space-y-2">
          {resumo?.margemPorFornecedor && resumo.margemPorFornecedor.map((item, idx) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-32 text-xs truncate">{item.name}</div>
              <div className="flex-1 h-4 bg-caixa-light rounded">
                <div style={{width: `${item.value/(resumo.margemPorFornecedor[0]?.value||1)*100}%`, background: cores[idx % cores.length]}} className="h-4 rounded"></div>
              </div>
              <div className="w-16 text-right text-xs">{(item.value/1000).toFixed(1)} Mi</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking equipe vendas */}
      <div className="bg-caixa-secondary text-white p-6 rounded-xl shadow col-span-2 border border-caixa-light">
        <h3 className="font-bold mb-2">Análise por equipe de vendas</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-caixa-light">
                <th className="py-1 px-2 text-left">Equipe Vendas</th>
                <th className="py-1 px-2 text-right">Receita</th>
                <th className="py-1 px-2 text-right">Margem Bruta</th>
                <th className="py-1 px-2 text-right">Percentual</th>
              </tr>
            </thead>
            <tbody>
              {resumo?.equipeVendas && resumo.equipeVendas.map((item, idx) => (
                <tr key={item.nome} className="border-b border-caixa-primary">
                  <td className="py-1 px-2">{item.nome}</td>
                  <td className="py-1 px-2 text-right text-caixa-primary font-mono">R$ {Number(item.receita).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                  <td className="py-1 px-2 text-right text-caixa-success font-mono">{Number(item.margem).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                  <td className="py-1 px-2 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="h-2 w-16 bg-caixa-light rounded">
                        <div className="h-2 rounded bg-caixa-error" style={{width: `${item.percentual}%`}}></div>
                      </div>
                      <span className="text-caixa-warning font-bold">{Number(item.percentual).toFixed(2)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardFinanceiro;
