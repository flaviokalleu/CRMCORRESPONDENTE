import React from 'react';

/**
 * Error Boundary específico para capturar erros de DOM
 * Especialmente útil para erros causados por ferramentas de tradução
 */
class DOMErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Verifica se é um erro relacionado ao DOM
    const isDOMError = error?.message?.includes('removeChild') ||
                      error?.message?.includes('insertBefore') ||
                      error?.message?.includes('Node to be removed') ||
                      error?.name === 'NotFoundError';

    if (isDOMError) {
      console.warn('Erro de DOM capturado pelo ErrorBoundary:', error.message);
      // Não quebra a aplicação para erros de DOM
      return { hasError: false };
    }

    // Para outros erros, mantém o comportamento padrão
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const isDOMError = error?.message?.includes('removeChild') ||
                      error?.message?.includes('insertBefore') ||
                      error?.message?.includes('Node to be removed') ||
                      error?.name === 'NotFoundError';

    if (isDOMError) {
      console.warn('Erro de DOM interceptado e ignorado:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
      
      // Reset do estado após um breve delay
      setTimeout(() => {
        this.setState({ hasError: false, error: null });
      }, 100);
      
      return;
    }

    // Para outros erros, log normal
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // UI de fallback para erros que não são de DOM
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-medium text-gray-900">
                Algo deu errado
              </h3>
              <div className="mt-2 text-sm text-gray-500">
                Ocorreu um erro inesperado. Tente recarregar a página.
              </div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DOMErrorBoundary;
