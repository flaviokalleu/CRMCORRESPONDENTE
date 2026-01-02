const jwt = require('jsonwebtoken');
const { Token, User, Acesso } = require('../models');
const requestIp = require('request-ip');
const { getSocketIO } = require('../socket');

const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
    throw new Error('Environment variables ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be set');
}

// Helper function to calculate expiration date
const getExpirationDate = (minutes) => new Date(Date.now() + minutes * 60000);

// Function to create and store token
const createAndStoreToken = async (user) => {
    const payload = { 
        id: user.id, 
        email: user.email,
        role: user.role || 'user',
        is_corretor: user.is_corretor,
        is_correspondente: user.is_correspondente,
        is_administrador: user.is_administrador
    };
    
    const token = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

    await Token.upsert({
        token,
        refreshToken,
        user_id: user.id, // snake_case
        expiresAt: getExpirationDate(60),
        email: user.email,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    return { token, refreshToken };
};

// Input validation function
const validateInput = (email, password) => {
    if (!email || !password) {
        throw new Error('Email e senha são obrigatórios');
    }
};

// User authentication function
const authenticateUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        validateInput(email, password);

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Usuário não encontrado' });
        }

        // Compare password using bcrypt for hashed passwords or Base64 for legacy users
        let isPasswordValid = false;
        
        // Check if password is bcrypt hashed (starts with $2b$)
        if (user.password && user.password.startsWith('$2b$')) {
            const bcrypt = require('bcryptjs');
            isPasswordValid = await bcrypt.compare(password, user.password);
        } else {
            // Legacy Base64 comparison
            isPasswordValid = Buffer.from(password).toString('base64') === user.password;
        }
        
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Get client's IPv4 address
        const ip = requestIp.getClientIp(req);
        
        // Register access
        await Acesso.create({
            ip,
            referer: req.get('Referrer') || 'N/A',
            userAgent: req.get('User-Agent') || 'N/A',
            user_id: user.id // snake_case
        });

        // Create and store token
        const { token, refreshToken } = await createAndStoreToken(user);

        // Emitir evento socket para todos os clientes conectados (exemplo)
        try {
            getSocketIO().emit('usuario-logado', {
                userId: user.id,
                nome: user.first_name || user.email
            });
        } catch (e) {
            console.warn('Socket.IO não inicializado:', e.message);
        }

        // Return token and user information
        res.json({
            token,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role || 'user',
                is_corretor: user.is_corretor,
                is_correspondente: user.is_correspondente,
                is_administrador: user.is_administrador,
                first_name: user.first_name,
                last_name: user.last_name
            }
        });
    } catch (error) {
        console.error('Erro ao autenticar o usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
    }
};

// Token authentication middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    try {
        const tokenRecord = await Token.findOne({ where: { token } });
        if (!tokenRecord || new Date() > tokenRecord.expiresAt) {
            return res.sendStatus(401);
        }

        jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    } catch (error) {
        console.error('Erro ao verificar o token:', error);
        res.sendStatus(500);
    }
};

module.exports = { authenticateUser, authenticateToken };
