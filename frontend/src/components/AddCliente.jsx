// src/pages/AddCliente.js
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaTimes } from 'react-icons/fa';
import { Home, Key, ArrowLeft } from 'lucide-react';
import ClientForm from './ClientForm';
import FormInquilino from './FormInquilino';

const AddCliente = () => {
    const [tipo, setTipo] = useState(null); // null | 'venda' | 'aluguel'
    const [openSnackbar, setOpenSnackbar] = useState(false);

    const handleSuccess = () => {
        setOpenSnackbar(true);
        setTimeout(() => setOpenSnackbar(false), 3000);
    };

    const handleCloseSnackbar = () => {
        setOpenSnackbar(false);
    };

    const handleEscolha = (escolha) => {
        setTipo(escolha);
    };

    return (
        <div className="min-h-screen w-full bg-caixa-primary">
            <AnimatePresence mode="wait">
                {tipo === null ? (
                    <motion.div
                        key="selecao"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center justify-center min-h-screen px-4"
                    >
                        <h1 className="text-3xl font-bold text-white mb-2 text-center">
                            Adicionar Cliente
                        </h1>
                        <p className="text-white/60 mb-10 text-center">
                            Qual é o tipo de atendimento para este cliente?
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
                            {/* Venda */}
                            <motion.button
                                whileHover={{ scale: 1.03, y: -4 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleEscolha('venda')}
                                className="flex flex-col items-center gap-5 p-10 rounded-2xl bg-white/5 border border-white/10 hover:border-caixa-orange/50 hover:bg-white/10 transition-all duration-200 cursor-pointer group"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-caixa-orange/20 flex items-center justify-center group-hover:bg-caixa-orange/30 transition-colors">
                                    <Home className="w-10 h-10 text-caixa-orange" />
                                </div>
                                <div className="text-center">
                                    <p className="text-white font-bold text-xl mb-1">Venda de Imóvel</p>
                                    <p className="text-white/50 text-sm">
                                        Cliente para financiamento ou compra de imóvel
                                    </p>
                                </div>
                            </motion.button>

                            {/* Aluguel */}
                            <motion.button
                                whileHover={{ scale: 1.03, y: -4 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleEscolha('aluguel')}
                                className="flex flex-col items-center gap-5 p-10 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all duration-200 cursor-pointer group"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                                    <Key className="w-10 h-10 text-blue-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-white font-bold text-xl mb-1">Aluguel</p>
                                    <p className="text-white/50 text-sm">
                                        Inquilino para contrato de locação
                                    </p>
                                </div>
                            </motion.button>
                        </div>
                    </motion.div>
                ) : tipo === 'aluguel' ? (
                    <motion.div
                        key="inquilino"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full h-full"
                    >
                        <FormInquilino
                            onSuccess={handleSuccess}
                            onBack={() => setTipo(null)}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="formulario"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full h-full"
                    >
                        <div className="px-4 pt-4">
                            <button
                                onClick={() => setTipo(null)}
                                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="text-sm">Voltar</span>
                            </button>
                        </div>
                        <ClientForm onSuccess={handleSuccess} />
                    </motion.div>
                )}
            </AnimatePresence>

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
