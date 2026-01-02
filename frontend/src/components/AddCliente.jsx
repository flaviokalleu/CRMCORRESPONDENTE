// src/pages/AddCliente.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaTimes } from 'react-icons/fa';
import ClientForm from './ClientForm';

const AddCliente = () => {
    const [openSnackbar, setOpenSnackbar] = useState(false);

    const handleSuccess = () => {
        setOpenSnackbar(true);
        setTimeout(() => setOpenSnackbar(false), 3000); // Auto hide after 3s
    };

    const handleCloseSnackbar = () => {
        setOpenSnackbar(false);
    };

    return (
        <div className="min-h-screen w-full bg-caixa-primary">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full h-full"
            >
                {/* Form Container - ClientForm já tem seu próprio design */}
                <div className="w-full h-full">
                    <ClientForm onSuccess={handleSuccess} />
                </div>
            </motion.div>

            {/* Success Notification */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: openSnackbar ? 1 : 0, y: openSnackbar ? 0 : 50 }}
                className={`fixed bottom-6 right-6 z-50 ${!openSnackbar && 'pointer-events-none'}`}
            >
                <div className="bg-white border-2 border-caixa-primary rounded-2xl shadow-2xl p-6 flex items-center gap-4 min-w-[320px]">
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-caixa-primary rounded-full flex items-center justify-center">
                            <FaCheckCircle className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-caixa-primary text-lg mb-1">
                            Sucesso!
                        </h4>
                        <p className="text-caixa-primary text-sm">
                            Cliente adicionado com sucesso!
                        </p>
                    </div>
                    <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleCloseSnackbar}
                        className="flex-shrink-0 p-2 text-caixa-orange hover:bg-caixa-orange/10 rounded-lg transition-all duration-200"
                    >
                        <FaTimes className="w-4 h-4" />
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};

export default AddCliente;
