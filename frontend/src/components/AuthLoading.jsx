import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Shield } from 'lucide-react';

const AuthLoading = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-black flex items-center justify-center">
      <motion.div
        className="flex flex-col items-center space-y-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo animado */}
        <motion.div
          className="relative"
          animate={{ 
            scale: [1, 1.1, 1],
            rotateY: [0, 180, 360]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
        </motion.div>

        {/* Texto e spinner */}
        <div className="text-center space-y-4">
          <motion.h2
            className="text-2xl font-bold text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Verificando autenticação...
          </motion.h2>
          
          <motion.div
            className="flex items-center justify-center space-x-2 text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-5 h-5" />
            </motion.div>
            <span>Aguarde um momento...</span>
          </motion.div>
        </div>

        {/* Indicadores de progresso */}
        <motion.div
          className="flex space-x-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-blue-500 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuthLoading;