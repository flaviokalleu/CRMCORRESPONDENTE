import React, { useState } from "react";
import MainLayout from "../layouts/MainLayout";
import {
  FileText,
  Download,
  Loader2,
  Eye,
  BarChart3,
  Info,
  CheckCircle,
} from "lucide-react";

const RelatorioPage = () => {
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleVisualizarRelatorio = async () => {
    setLoading(true);
    setViewType("html");

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

        const newWindow = window.open("", "_blank");
        newWindow.document.write(htmlContent);
        newWindow.document.close();

        showSuccess("Relatorio aberto em nova aba!");
      } else {
        throw new Error("Erro ao gerar o relatorio");
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Ocorreu um erro ao gerar o relatorio. Tente novamente.");
    } finally {
      setLoading(false);
      setViewType("");
    }
  };

  const handleBaixarPDF = async () => {
    setLoading(true);
    setViewType("pdf");

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

        const link = document.createElement("a");
        link.href = url;
        link.download = `relatorio-clientes-${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(url);

        showSuccess("PDF baixado com sucesso!");
      } else {
        throw new Error("Erro ao gerar o PDF");
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Ocorreu um erro ao gerar o PDF. Tente novamente.");
    } finally {
      setLoading(false);
      setViewType("");
    }
  };

  const handleVisualizarDados = async () => {
    setLoading(true);
    setViewType("dados");

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

        const newWindow = window.open("", "_blank");
        newWindow.document.write(`
          <html>
            <head>
              <title>Dados do Relatorio - JSON</title>
              <style>
                body { font-family: 'Courier New', monospace; padding: 20px; background: #f5f5f5; }
                pre { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: auto; }
                h1 { color: #333; }
              </style>
            </head>
            <body>
              <h1>Dados do Relatorio (JSON)</h1>
              <pre>${JSON.stringify(data, null, 2)}</pre>
            </body>
          </html>
        `);
        newWindow.document.close();

        showSuccess("Dados abertos em nova aba!");
      } else {
        throw new Error("Erro ao obter dados do relatorio");
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Ocorreu um erro ao obter os dados. Tente novamente.");
    } finally {
      setLoading(false);
      setViewType("");
    }
  };

  const actions = [
    {
      id: "html",
      title: "Visualizar Online",
      description:
        "Abre o relatorio completo com graficos interativos em uma nova aba do navegador.",
      icon: Eye,
      handler: handleVisualizarRelatorio,
      loadingText: "Carregando relatorio...",
      buttonText: "Visualizar Relatorio",
    },
    {
      id: "pdf",
      title: "Baixar em PDF",
      description:
        "Gera e baixa o relatorio em formato PDF para salvar no seu computador.",
      icon: Download,
      handler: handleBaixarPDF,
      loadingText: "Gerando PDF...",
      buttonText: "Baixar PDF",
    },
    {
      id: "dados",
      title: "Ver Dados Brutos",
      description:
        "Exibe os dados do relatorio em formato JSON para analise tecnica.",
      icon: BarChart3,
      handler: handleVisualizarDados,
      loadingText: "Processando dados...",
      buttonText: "Ver Dados",
    },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-caixa-gradient p-4">
        <div className="max-w-5xl mx-auto pt-8 pb-16">
          {/* Header */}
          <div className="flex flex-col items-center mb-10">
            <div className="bg-caixa-orange rounded-2xl p-4 mb-5 shadow-lg shadow-caixa-orange/20">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white text-center tracking-tight mb-3">
              Relatorios de Clientes
            </h1>
            <p className="text-base md:text-lg text-white/60 text-center max-w-2xl">
              Gere relatorios completos com analises detalhadas dos clientes
              cadastrados no sistema.
            </p>
          </div>

          {/* Success toast */}
          {successMsg && (
            <div className="flex items-center gap-3 bg-green-500/20 border border-green-400/30 rounded-xl px-5 py-3 mb-6 max-w-md mx-auto animate-pulse">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-green-300 font-medium">{successMsg}</span>
            </div>
          )}

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {actions.map((action) => {
              const Icon = action.icon;
              const isCurrentLoading = loading && viewType === action.id;
              const isDisabled = loading;

              return (
                <div
                  key={action.id}
                  className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/10 flex flex-col justify-between transition-all duration-300 hover:bg-white/15 hover:border-white/20"
                >
                  <div className="mb-6">
                    <div className="bg-white/10 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-caixa-orange" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {action.title}
                    </h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      {action.description}
                    </p>
                  </div>

                  <button
                    onClick={action.handler}
                    disabled={isDisabled}
                    className={`w-full rounded-xl px-6 py-3 font-semibold transition-all duration-200 flex items-center justify-center gap-2.5 ${
                      isDisabled
                        ? "bg-white/10 text-white/40 cursor-not-allowed"
                        : "bg-caixa-orange hover:bg-caixa-orange-dark text-white shadow-lg shadow-caixa-orange/20 hover:shadow-caixa-orange/30"
                    }`}
                  >
                    {isCurrentLoading ? (
                      <>
                        <Loader2 className="animate-spin w-5 h-5" />
                        <span>{action.loadingText}</span>
                      </>
                    ) : (
                      <>
                        <Icon className="w-5 h-5" />
                        <span>{action.buttonText}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Loading Feedback Banner */}
          {loading && (
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/10 flex items-center gap-5 mb-8 max-w-lg mx-auto">
              <Loader2 className="animate-spin w-10 h-10 text-caixa-orange flex-shrink-0" />
              <div>
                <p className="text-white font-semibold text-lg">
                  Aguarde um momento...
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {viewType === "pdf" &&
                    "Gerando o PDF, isso pode levar alguns segundos."}
                  {viewType === "html" &&
                    "Carregando o relatorio interativo."}
                  {viewType === "dados" &&
                    "Processando os dados do relatorio."}
                </p>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/10 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Info className="w-5 h-5 text-caixa-orange flex-shrink-0" />
              <h4 className="text-white font-semibold text-lg">
                Sobre os relatorios
              </h4>
            </div>
            <ul className="space-y-3 text-sm text-white/60">
              <li className="flex items-start gap-2">
                <Eye className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="text-white/80">Visualizar Online:</strong>{" "}
                  Relatorio completo com graficos interativos, abre direto no
                  navegador.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Download className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="text-white/80">Baixar PDF:</strong> Salva o
                  relatorio no seu computador para imprimir ou enviar por
                  e-mail.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="text-white/80">Dados Brutos:</strong>{" "}
                  Mostra os dados em formato JSON, util para integracao com
                  outros sistemas.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default RelatorioPage;
