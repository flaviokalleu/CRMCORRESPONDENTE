// src/components/TokenExpiredWarning.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { Warning } from '@mui/icons-material';

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

    return (
        <Dialog
            open={isVisible}
            onClose={handleLoginRedirect}
            fullWidth
            maxWidth="xs"
        >
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Warning color="error" />
                <Typography variant="h6">Token Expirado</Typography>
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant="body1">
                    Seu token de autenticação expirou. Por favor, faça login novamente.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button 
                    onClick={handleLoginRedirect} 
                    variant="contained" 
                    color="primary"
                    fullWidth
                >
                    Fazer Login
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TokenExpiredWarning;
