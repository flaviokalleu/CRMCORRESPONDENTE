import React from 'react';
import { Eye, Download, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = process.env.REACT_APP_API_URL;

const ClienteDocumentViewer = ({ cliente }) => {
  const documentFields = [
    { key: 'documentos_pessoais', label: 'Documentos Pessoais' },
    { key: 'extrato_bancario', label: 'Extrato Bancário' },
    { key: 'documentos_dependente', label: 'Documentos do Dependente' },
    { key: 'documentos_conjuge', label: 'Documentos do Cônjuge' }
  ];

  const openDocument = (documentPath) => {
    if (documentPath) {
      const url = `${API_URL}/uploads/${documentPath}`;
      window.open(url, '_blank');
    }
  };

  const downloadDocument = (documentPath, fileName) => {
    if (documentPath) {
      const url = `${API_URL}/uploads/${documentPath}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'documento.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Documentos
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {documentFields.map(({ key, label }) => {
          const documentPath = cliente[key];
          
          return (
            <div key={key} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg">
              <span className="text-xs text-slate-400">{label}</span>
              
              {documentPath ? (
                <div className="flex items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openDocument(documentPath)}
                    className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded"
                    title="Visualizar documento"
                  >
                    <Eye className="w-3 h-3" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => downloadDocument(documentPath, `${label.toLowerCase().replace(/\s+/g, '_')}.pdf`)}
                    className="p-1 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded"
                    title="Baixar documento"
                  >
                    <Download className="w-3 h-3" />
                  </motion.button>
                </div>
              ) : (
                <span className="text-xs text-slate-600">Não enviado</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClienteDocumentViewer;