import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheck, FaTimes, FaExclamationTriangle, FaInfo } from 'react-icons/fa';

const Toast = ({ message, type = 'success', isVisible, onClose, duration = 4000 }) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: FaCheck,
          bgColor: 'bg-gradient-to-r from-green-500 to-emerald-600',
          iconColor: 'text-white',
          borderColor: 'border-green-400/50'
        };
      case 'error':
        return {
          icon: FaTimes,
          bgColor: 'bg-gradient-to-r from-red-500 to-red-600',
          iconColor: 'text-white',
          borderColor: 'border-red-400/50'
        };
      case 'warning':
        return {
          icon: FaExclamationTriangle,
          bgColor: 'bg-gradient-to-r from-yellow-500 to-orange-600',
          iconColor: 'text-white',
          borderColor: 'border-yellow-400/50'
        };
      case 'info':
        return {
          icon: FaInfo,
          bgColor: 'bg-gradient-to-r from-blue-500 to-blue-600',
          iconColor: 'text-white',
          borderColor: 'border-blue-400/50'
        };
      default:
        return {
          icon: FaInfo,
          bgColor: 'bg-gradient-to-r from-gray-500 to-gray-600',
          iconColor: 'text-white',
          borderColor: 'border-gray-400/50'
        };
    }
  };

  const config = getToastConfig();
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.3 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.3 }}
          className="fixed top-4 right-4 z-[9999]"
        >
          <div className={`${config.bgColor} ${config.borderColor} border backdrop-blur-sm rounded-2xl shadow-2xl min-w-80 max-w-md`}>
            <div className="flex items-center gap-4 p-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${config.iconColor}`} />
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-white font-medium leading-relaxed">
                  {message}
                </p>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FaTimes className="w-4 h-4 text-white/80" />
              </motion.button>
            </div>
            
            {/* Progress bar */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
              className="h-1 bg-white/30 rounded-b-2xl"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;