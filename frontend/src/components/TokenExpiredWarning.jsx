// src/components/TokenExpiredWarning.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';

const TokenExpiredWarning = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRedirect, setShouldRedirect] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkTokenExpiry = () => {
            const expiryTime = localStorage.getItem('tokenExpiry');
            if (expiryTime) {
                const now = new Date().getTime();
                const timeRemaining = expiryTime - now;
                if (timeRemaining <= 0) {
                    setIsVisible(true);
                } else {
                    setIsVisible(false);
                }
            }
        };

        checkTokenExpiry();
        const interval = setInterval(checkTokenExpiry, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (shouldRedirect) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('tokenExpiry');
            navigate('/login');
        }
    }, [shouldRedirect, navigate]);

    const handleLoginRedirect = () => {
        setShouldRedirect(true);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={handleLoginRedirect}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xs mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 px-5 pt-5">
                    <TriangleAlert className="text-red-600" size={22} />
                    <h3 className="text-lg font-semibold">Token Expirado</h3>
                </div>
                <div className="px-5 py-4 border-t border-b border-gray-200 mt-3">
                    <p>Seu token de autenticação expirou. Por favor, faça login novamente.</p>
                </div>
                <div className="p-3">
                    <button
                        onClick={handleLoginRedirect}
                        className="w-full px-4 py-2 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                        Fazer Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TokenExpiredWarning;
