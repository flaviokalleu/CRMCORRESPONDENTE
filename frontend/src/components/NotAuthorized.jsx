import React from 'react';
import { Link, Navigate } from 'react-router-dom'; // Importando Link e Navigate
import { AiOutlineWarning } from 'react-icons/ai';
import { useAuth } from '../context/AuthContext'; // Caminho corrigido

const NotAuthorized = () => {
    const { user } = useAuth();

    if (user) {
        return <Navigate to="/dashboard" />; // Substitua Redirect por Navigate
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-green-400 relative overflow-hidden">
            <div className="absolute inset-0 z-[-1]">
                <img
                    src="https://source.unsplash.com/1600x900/?matrix"
                    alt="Background"
                    className="w-full h-full object-cover opacity-60"
                />
            </div>
            <div className="p-8 bg-gray-800 bg-opacity-80 rounded-lg shadow-lg max-w-md w-full text-center">
                <AiOutlineWarning className="text-6xl mb-4 mx-auto" />
                <h1 className="text-4xl font-bold mb-4">Acesso Negado</h1>
                <p className="mb-6">
                    Você tentou acessar uma página restrita. Sua tentativa foi registrada e analisada por nossos sistemas de segurança.
                </p>
                <Link to="/login">
                    <button className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-400 transition duration-300">
                        Voltar ao Login
                    </button>
                </Link>
                <p className="mt-6 text-gray-400 text-sm">
                    Se você acredita que esta é uma falha, verifique a URL e tente novamente. Nossa equipe está sempre atenta.
                </p>
            </div>
        </div>
    );
};

export default NotAuthorized;
