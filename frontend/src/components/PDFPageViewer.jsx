import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaChevronLeft, 
  FaChevronRight, 
  FaExpand, 
  FaTimes, 
  FaDownload,
  FaFileAlt,
  FaSpinner,
  FaExclamationTriangle
} from 'react-icons/fa';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const PDFPageViewer = ({ clienteId, tipo, isOpen, onClose, showToast }) => {
  const [pdfInfo, setPdfInfo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [error, setError] = useState(null);
  const [pageUrl, setPageUrl] = useState(null); // ✅ NOVO: URL da página com token

  // Carregar informações do PDF quando o modal é aberto
  useEffect(() => {
    if (isOpen && clienteId && tipo) {
      fetchPdfInfo();
    }
  }, [isOpen, clienteId, tipo]);

  const fetchPdfInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${apiUrl}/clientes/${clienteId}/documentos/${tipo}/info`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const info = await response.json();
        setPdfInfo(info);
        setCurrentPage(1);
        console.log(`📊 PDF Info carregado: ${info.totalPages} páginas`);
      } else {
        throw new Error('Erro ao carregar informações do documento');
      }
    } catch (err) {
      console.error('❌ Erro ao carregar PDF info:', err);
      setError(err.message);
      showToast('❌ Erro ao carregar informações do documento', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= pdfInfo?.totalPages) {
      setCurrentPage(pageNumber);
      updatePageUrl(pageNumber);
    }
  };

  // ✅ FUNÇÃO PARA ATUALIZAR URL DA PÁGINA COM TOKEN
  const updatePageUrl = (page) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      const url = `${apiUrl}/clientes/${clienteId}/documentos/${tipo}/pagina/${page}`;
      
      // Criar URL temporário com fetch para obter o blob
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => {
        if (response.ok) {
          return response.blob();
        }
        throw new Error('Erro ao carregar página');
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        setPageUrl(blobUrl);
        setLoadingPage(false);
      })
      .catch(err => {
        console.error('❌ Erro ao carregar página:', err);
        setError(err.message);
        setLoadingPage(false);
      });
    }
  };

  // ✅ ATUALIZAR URL QUANDO PÁGINA MUDAR
  useEffect(() => {
    if (pdfInfo && currentPage) {
      setLoadingPage(true);
      updatePageUrl(currentPage);
    }
  }, [currentPage, pdfInfo]);

  // ✅ LIMPEZA DOS BLOB URLs
  useEffect(() => {
    return () => {
      if (pageUrl && pageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pageUrl);
      }
    };
  }, [pageUrl]);

  const downloadCurrentPage = () => {
    if (!pdfInfo || !currentPage) return;
    
    const token = localStorage.getItem("authToken");
    const url = `${apiUrl}/clientes/${clienteId}/documentos/${tipo}/pagina/${currentPage}`;
    
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => {
      if (response.ok) {
        return response.blob();
      }
      throw new Error('Erro ao baixar página');
    })
    .then(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `documento_${tipo}_pagina_${currentPage}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      showToast(`📄 Página ${currentPage} baixada com sucesso!`, 'success');
    })
    .catch(err => {
      console.error('❌ Erro ao baixar página:', err);
      showToast('❌ Erro ao baixar página', 'error');
    });
  };

  const downloadFullDocument = () => {
    if (!pdfInfo) return;
    
    const token = localStorage.getItem("authToken");
    const url = `${apiUrl}/clientes/${clienteId}/documentos/${tipo}/verificar`;
    
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
      if (data.url) {
        window.open(data.url, '_blank');
        showToast('📄 Documento completo aberto!', 'success');
      } else {
        throw new Error('URL do documento não encontrada');
      }
    })
    .catch(err => {
      console.error('❌ Erro ao abrir documento completo:', err);
      showToast('❌ Erro ao abrir documento completo', 'error');
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-br from-caixa-primary via-caixa-secondary to-caixa-primary border border-caixa-orange/30 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-caixa-orange to-caixa-orange-light p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <FaFileAlt className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Visualizar por Páginas
                  </h3>
                  <p className="text-white/80 text-sm">
                    Documento: {tipo.replace(/_/g, ' ').toUpperCase()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {pdfInfo && (
                  <div className="text-white/90 text-sm mr-4">
                    {pdfInfo.totalPages} página{pdfInfo.totalPages !== 1 ? 's' : ''}
                  </div>
                )}
                
                <button
                  onClick={onClose}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col h-[calc(90vh-120px)]">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-white">
                  <FaSpinner className="w-8 h-8 animate-spin mx-auto mb-4 text-caixa-orange" />
                  <p>Carregando informações do documento...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-white">
                  <FaExclamationTriangle className="w-8 h-8 mx-auto mb-4 text-red-400" />
                  <p>Erro ao carregar documento</p>
                  <p className="text-sm text-white/70 mt-2">{error}</p>
                </div>
              </div>
            ) : pdfInfo ? (
              <>
                {/* PDF Viewer */}
                <div className="flex-1 bg-gray-900 relative">
                  {pageUrl ? (
                    <iframe
                      src={pageUrl}
                      className="w-full h-full border-none"
                      title={`Página ${currentPage}`}
                      onLoad={() => setLoadingPage(false)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-white">
                        <FaSpinner className="w-6 h-6 animate-spin mx-auto mb-2 text-caixa-orange" />
                        <p className="text-sm">Carregando página {currentPage}...</p>
                      </div>
                    </div>
                  )}
                  
                  {loadingPage && (
                    <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center">
                      <div className="text-center text-white">
                        <FaSpinner className="w-6 h-6 animate-spin mx-auto mb-2 text-caixa-orange" />
                        <p className="text-sm">Carregando página {currentPage}...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="bg-white/10 backdrop-blur-sm border-t border-white/20 p-4">
                  <div className="flex items-center justify-between">
                    {/* Navigation */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="p-2 bg-caixa-orange/20 hover:bg-caixa-orange/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white transition-colors"
                      >
                        <FaChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm">Página</span>
                        <select
                          value={currentPage}
                          onChange={(e) => handlePageChange(parseInt(e.target.value))}
                          className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:border-caixa-orange"
                        >
                          {Array.from({ length: pdfInfo.totalPages }, (_, i) => i + 1).map(page => (
                            <option key={page} value={page} className="bg-gray-800">
                              {page}
                            </option>
                          ))}
                        </select>
                        <span className="text-white/70 text-sm">de {pdfInfo.totalPages}</span>
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= pdfInfo.totalPages}
                        className="p-2 bg-caixa-orange/20 hover:bg-caixa-orange/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white transition-colors"
                      >
                        <FaChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={downloadCurrentPage}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm transition-colors"
                      >
                        <FaDownload className="w-3 h-3" />
                        Baixar Página
                      </button>
                      
                      <button
                        onClick={downloadFullDocument}
                        className="flex items-center gap-2 px-4 py-2 bg-caixa-orange hover:bg-caixa-orange-light rounded-xl text-white text-sm transition-colors"
                      >
                        <FaExpand className="w-3 h-3" />
                        Ver Completo
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PDFPageViewer;
