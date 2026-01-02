import React, { useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { FileText, Download, Loader2, Eye, BarChart3 } from "lucide-react";

const RelatorioPage = () => {
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState(''); // 'html', 'pdf', 'dados'

  const handleVisualizarRelatorio = async () => {
    setLoading(true);
    setViewType('html');

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/report/relatorio`,
        {
          method: "GET",
          headers: {
            "Content-Type": "text/html",
          },
        }
      );

      if (response.ok) {
        const htmlContent = await response.text();
        
        // Abrir em nova janela
        const newWindow = window.open('', '_blank');
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        
      } else {
        throw new Error("Erro ao gerar o relatório");
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Ocorreu um erro ao gerar o relatório. Tente novamente.");
    } finally {
      setLoading(false);
      setViewType('');
    }
  };

  const handleBaixarPDF = async () => {
    setLoading(true);
    setViewType('pdf');

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/report/relatorio/download`,
        {
          method: "GET",
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Criar link para download
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-clientes-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpar URL
        window.URL.revokeObjectURL(url);
        
        alert("Relatório PDF baixado com sucesso!");
        
      } else {
        throw new Error("Erro ao gerar o PDF");
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Ocorreu um erro ao gerar o PDF. Tente novamente.");
    } finally {
      setLoading(false);
      setViewType('');
    }
  };

  const handleVisualizarDados = async () => {
    setLoading(true);
    setViewType('dados');

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/report/relatorio/dados`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Mostrar dados em formato JSON em nova janela
        const newWindow = window.open('', '_blank');
        newWindow.document.write(`
          <html>
            <head>
              <title>Dados do Relatório - JSON</title>
              <style>
                body { font-family: 'Courier New', monospace; padding: 20px; background: #f5f5f5; }
                pre { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: auto; }
                h1 { color: #333; }
              </style>
            </head>
            <body>
              <h1>📊 Dados do Relatório (JSON)</h1>
              <pre>${JSON.stringify(data, null, 2)}</pre>
            </body>
          </html>
        `);
        newWindow.document.close();
        
      } else {
        throw new Error("Erro ao obter dados do relatório");
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Ocorreu um erro ao obter os dados. Tente novamente.");
    } finally {
      setLoading(false);
      setViewType('');
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-black p-4">
        <div className="w-full max-w-4xl bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-caixa-orange/30">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-caixa-orange rounded-full p-4 mb-4 shadow-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-center text-white mb-2 tracking-tight drop-shadow-lg">
              Relatórios de Clientes
            </h1>
            <p className="text-base md:text-lg text-caixa-gray-200 text-center max-w-2xl">
              Gere relatórios completos com análises detalhadas dos clientes cadastrados no sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
            {/* Visualizar Relatório HTML */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-caixa-orange/20 hover:border-caixa-orange/40 transition-all">
              <div className="text-center mb-4">
                <Eye className="w-8 h-8 text-white mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-white">Visualizar Online</h3>
                <p className="text-sm text-caixa-gray-200 mt-2">
                  Abrir relatório interativo com gráficos em nova aba
                </p>
              </div>
              <button
                onClick={handleVisualizarRelatorio}
                disabled={loading}
                className={`w-full py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2
                  ${loading && viewType === 'html'
                    ? "bg-caixa-orange/60 opacity-60 cursor-not-allowed text-white"
                    : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"}
                `}
              >
                {loading && viewType === 'html' ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Visualizar
                  </>
                )}
              </button>
            </div>
            
            

            
          </div>

          {loading && (
            <div className="mt-8 flex flex-col items-center">
              <Loader2 className="animate-spin h-12 w-12 text-caixa-orange mb-4" />
              <p className="text-white text-lg font-medium">
                {viewType === 'pdf' && 'Gerando PDF, isso pode levar alguns segundos...'}
                {viewType === 'html' && 'Carregando relatório interativo...'}
                {viewType === 'dados' && 'Processando dados do relatório...'}
              </p>
            </div>
          )}

          <div className="mt-8 p-4 bg-white/5 rounded-lg border border-caixa-orange/20 max-w-2xl">
            <h4 className="text-white font-semibold mb-2">ℹ️ Informações:</h4>
            <ul className="text-sm text-caixa-gray-200 space-y-1">
              <li>• <strong>Visualizar Online:</strong> Relatório completo com gráficos interativos</li>
              
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default RelatorioPage;
