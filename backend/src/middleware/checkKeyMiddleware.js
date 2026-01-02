const fs = require('fs');
const path = require('path');
const { database } = require('../config/firebase');
const { ref, get, set } = require('firebase/database');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Carrega as variáveis de ambiente do .env


// Função para verificar a chave
const checkKey = async (req) => {
    const uniqueKey = process.env.UNIQUE_KEY; // Obtém a chave do .env
    console.log('Verificando chave:', uniqueKey); // Log do valor da chave

    const keyRef = ref(database, `keys/${uniqueKey}`);

    try {
        const snapshot = await get(keyRef);
        if (!snapshot.exists()) {
            console.error('Chave não encontrada no banco de dados:', uniqueKey);
            return false; // Retorna false se a chave não for encontrada
        }

        const keyData = snapshot.val();
        
        // Verificação se a chave já está em uso
        if (keyData.inUse) {
            console.error('Chave já em uso em outro sistema:', uniqueKey);
            return false; // Retorna false se a chave já estiver em uso
        }

        const validityDate = keyData.validity;
        if (!validityDate) {
            console.error('Validade da chave não encontrada para:', uniqueKey);
            return false; // Retorna false se a validade não estiver disponível
        }

        const now = new Date();
        const expirationTime = new Date(validityDate).getTime();
        const timeLeft = expirationTime - now.getTime();
        
        // Verifica se a chave está expirada
        if (timeLeft <= 0) {
            console.error('Chave expirada:', uniqueKey);
            return false; // Retorna false se a chave estiver expirada
        }

        // Cálculo do tempo restante em dias, horas, e minutos
        const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        console.log(`Tempo restante para expirar a chave: ${daysLeft} dias, ${hoursLeft} horas e ${minutesLeft} minutos.`);

        // Marcar a chave como em uso
        await set(keyRef, { ...keyData, inUse: true, timestamp: new Date().toISOString() });

        return true; // Retorna true se a chave for válida
    } catch (error) {
        console.error('Erro ao verificar a chave:', error);
        return false; // Retorna false em caso de erro
    }
};

// Middleware para liberar a chave quando o sistema for fechado
const releaseKey = async () => {
    const uniqueKey = process.env.UNIQUE_KEY; // Obtém a chave do .env
    const keyRef = ref(database, `keys/${uniqueKey}`);

    try {
        // Marcar a chave como não utilizada, mantendo a validade
        const keySnapshot = await get(keyRef);
        const keyData = keySnapshot.val();
        if (keyData) {
            await set(keyRef, { ...keyData, inUse: false }); // Mantém validade e outras propriedades
        }
        console.log('Chave liberada com sucesso:', uniqueKey);
    } catch (error) {
        console.error('Erro ao liberar a chave:', error);
    }
};

module.exports = { checkKey, releaseKey };
