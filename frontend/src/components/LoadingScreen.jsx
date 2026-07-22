// src/components/LoadingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Building2, Loader2, CheckCircle } from 'lucide-react';

const LoadingScreen = ({ onComplete }) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Simulação de carregamento com progresso
    const interval = setInterval(() => {
      setProgress(prev => {
        const nextProgress = prev + Math.random() * 2 + 0.5; // Progresso mais controlado

        if (nextProgress >= 100) {
          clearInterval(interval);
          setIsComplete(true);

          // Aguarda um pouco para mostrar o 100% antes de chamar onComplete
          timeoutRef.current = setTimeout(() => {
            setLoading(false);
            if (onComplete) {
              onComplete();
            }
          }, 1500); // Aguarda 1.5 segundos após chegar aos 100%

          return 100;
        }

        return nextProgress;
      });
    }, 150); // Mais lento para dar tempo de ver o progresso

    return () => {
      clearInterval(interval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onComplete]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.5
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6
      }
    }
  };

  const logoVariants = {
    hidden: { opacity: 0, scale: 0.5, rotate: -180 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      rotate: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  // Função para determinar a mensagem baseada no progresso
  const getStatusMessage = () => {
    if (isComplete) return "Sistema carregado com sucesso!";
    if (progress < 25) return "Inicializando sistema...";
    if (progress < 50) return "Carregando módulos...";
    if (progress < 75) return "Configurando interface...";
    if (progress < 95) return "Finalizando carregamento...";
    return "Quase pronto...";
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-black flex items-center justify-center relative overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: loading ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Efeitos de fundo usando cores CAIXA */}
      <div className="absolute inset-0 bg-gradient-to-br from-caixa-primary/20 via-caixa-secondary/10 to-transparent"></div>
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute top-0 -left-4 w-96 h-96 bg-caixa-light rounded-full mix-blend-multiply filter blur-3xl opacity-10"
          animate={{ 
            x: [0, 100, 0],
            y: [0, 50, 0]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        <motion.div 
          className="absolute top-0 -right-4 w-96 h-96 bg-caixa-orange rounded-full mix-blend-multiply filter blur-3xl opacity-10"
          animate={{ 
            x: [0, -100, 0],
            y: [0, 100, 0]
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div 
          className="absolute -bottom-8 left-20 w-96 h-96 bg-caixa-secondary rounded-full mix-blend-multiply filter blur-3xl opacity-10"
          animate={{ 
            x: [0, 50, 0],
            y: [0, -50, 0]
          }}
          transition={{ 
            duration: 12, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center justify-center space-y-8 px-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Logo animado */}
        <motion.div
          variants={logoVariants}
          className="relative"
        >
          <div className={`w-32 h-32 bg-gradient-to-br rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-500 ${
            isComplete 
              ? 'from-green-500 to-green-600' 
              : 'from-caixa-light to-caixa-secondary'
          }`}>
            {isComplete ? (
              <CheckCircle className="w-16 h-16 text-white" />
            ) : (
              <Building2 className="w-16 h-16 text-white" />
            )}
          </div>
          
          {/* Pulso ao redor do logo */}
          <motion.div
            className={`absolute inset-0 w-32 h-32 bg-gradient-to-br rounded-3xl opacity-20 ${
              isComplete 
                ? 'from-green-500 to-green-600' 
                : 'from-caixa-light to-caixa-secondary'
            }`}
            animate={{
              scale: isComplete ? [1, 1.3, 1] : [1, 1.2, 1],
              opacity: isComplete ? [0.3, 0.1, 0.3] : [0.2, 0.1, 0.2]
            }}
            transition={{
              duration: isComplete ? 1 : 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>

        {/* Título e subtítulo */}
        <motion.div
          variants={itemVariants}
          className="text-center space-y-2"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            CRM 
          </h1>
          <p className="text-caixa-extra-light text-lg md:text-xl font-medium">
            Gestão Empresarial Inteligente
          </p>
        </motion.div>

        {/* Barra de progresso */}
        <motion.div
          variants={itemVariants}
          className="w-full max-w-md space-y-4"
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-full h-4 w-full overflow-hidden border border-white/20">
            <motion.div
              className={`h-full rounded-full shadow-lg transition-all duration-300 ${
                isComplete 
                  ? 'bg-gradient-to-r from-green-500 to-green-400'
                  : 'bg-gradient-to-r from-caixa-orange to-caixa-orange-light'
              }`}
              initial={{ width: '0%' }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          
          {/* Porcentagem e status */}
          <div className="flex items-center justify-between text-sm">
            <span className={`transition-all duration-300 ${
              isComplete ? 'text-green-400' : 'text-caixa-extra-light'
            }`}>
              {getStatusMessage()}
            </span>
            <span className={`font-semibold transition-all duration-300 ${
              isComplete ? 'text-green-400' : 'text-caixa-orange'
            }`}>
              {Math.round(Math.min(progress, 100))}%
            </span>
          </div>
        </motion.div>

        {/* Spinner ou check */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-3"
        >
          {!isComplete ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
              >
                <Loader2 className="w-6 h-6 text-caixa-light" />
              </motion.div>
              <span className="text-white/80 text-sm">
                Preparando ambiente de trabalho
              </span>
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, ease: "backOut" }}
              >
                <CheckCircle className="w-6 h-6 text-green-400" />
              </motion.div>
              <span className="text-green-400 text-sm font-medium">
                Pronto para usar!
              </span>
            </>
          )}
        </motion.div>

        {/* Indicadores de status */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-4 mt-8"
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              progress > 25 ? 'bg-green-400' : 'bg-caixa-light animate-pulse'
            }`} />
            <span className={`text-xs transition-all duration-300 ${
              progress > 25 ? 'text-green-400' : 'text-white/60'
            }`}>
              Conectando
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              progress > 50 ? 'bg-green-400' : progress > 25 ? 'bg-caixa-orange animate-pulse' : 'bg-white/20'
            }`} />
            <span className={`text-xs transition-all duration-300 ${
              progress > 50 ? 'text-green-400' : progress > 25 ? 'text-white/60' : 'text-white/40'
            }`}>
              Autenticando
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              progress > 75 ? 'bg-green-400' : progress > 50 ? 'bg-caixa-secondary animate-pulse' : 'bg-white/20'
            }`} />
            <span className={`text-xs transition-all duration-300 ${
              progress > 75 ? 'text-green-400' : progress > 50 ? 'text-white/60' : 'text-white/40'
            }`}>
              Carregando
            </span>
          </div>
        </motion.div>

        {/* Texto de aguarde mais elegante */}
        <motion.p
          variants={itemVariants}
          className="text-center text-white/70 text-sm max-w-md leading-relaxed"
        >
          {!isComplete ? (
            <>
              Estamos preparando tudo para você. 
              <br />
              <span className="text-caixa-light">Aguarde alguns instantes...</span>
            </>
          ) : (
            <>
              Sistema carregado com sucesso!
              <br />
              <span className="text-green-400">Redirecionando...</span>
            </>
          )}
        </motion.p>

        {/* Indicador de que só entra aos 100% */}
        {!isComplete && (
          <motion.div
            variants={itemVariants}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 max-w-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-caixa-orange rounded-full animate-pulse" />
              <span className="text-xs text-white/60">
                Aguarde o carregamento completo para acessar o sistema
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Versão no canto */}
      <motion.div
        className="absolute bottom-6 right-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <span className="text-xs text-white/40">v2.0.0</span>
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen;
