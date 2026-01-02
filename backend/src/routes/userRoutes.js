const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { User } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Diretório para uploads de fotos de usuário
const userPhotoDir = path.join(__dirname, '../../uploads/usuario');
fs.mkdir(userPhotoDir, { recursive: true });

// Configuração do Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, userPhotoDir),
    filename: (req, file, cb) => {
        // O nome será definido depois, após obter o ID do usuário
        cb(null, `temp_${Date.now()}_${file.originalname}`);
    }
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userEmail = req.user.email;

        const user = await User.findOne({ 
            where: { email: userEmail },
            attributes: { exclude: ['password'] } // Excluir senha
        });
        
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Determinar o tipo de usuário
        let type = 'User';
        let role = null;
        
        if (user.is_administrador) {
            type = 'Administrador';
            role = 'administrador';
        } else if (user.is_corretor) {
            type = 'Corretor';
            role = 'corretor';
        } else if (user.is_correspondente) {
            type = 'Correspondente';
            role = 'correspondente';
        }

        res.json({ 
            user: user.toJSON(), 
            type,
            role
        });
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ✅ NOVA ROTA PARA LISTAR TODOS OS USUÁRIOS
router.get('/', authenticateToken, async (req, res) => {
    try {
        // ✅ VERIFICAR PERMISSÕES DO USUÁRIO LOGADO
        const currentUserId = req.user.id;
        const currentUser = await User.findByPk(currentUserId);

        if (!currentUser) {
            return res.status(404).json({ 
                success: false, 
                error: 'Usuário não encontrado' 
            });
        }

        // ✅ APENAS ADMINISTRADORES E CORRESPONDENTES PODEM VER TODOS OS USUÁRIOS
        if (!currentUser.is_administrador && !currentUser.is_correspondente) {
            return res.status(403).json({ 
                success: false, 
                error: 'Acesso negado. Apenas administradores e correspondentes podem listar usuários.',
                userPermissions: {
                    is_administrador: currentUser.is_administrador,
                    is_correspondente: currentUser.is_correspondente,
                    is_corretor: currentUser.is_corretor
                }
            });
        }

        // ✅ BUSCAR TODOS OS USUÁRIOS
        const users = await User.findAll({
            attributes: { 
                exclude: ['password'] // ✅ NUNCA RETORNAR SENHAS
            },
            order: [
                ['is_administrador', 'DESC'], // Administradores primeiro
                ['is_correspondente', 'DESC'], // Correspondentes depois
                ['is_corretor', 'DESC'], // Corretores depois
                ['first_name', 'ASC'], // Ordenar por nome
                ['last_name', 'ASC']
            ]
        });

        // ✅ ADICIONAR INFORMAÇÕES DE TIPO E ROLE PARA CADA USUÁRIO
        const usersWithDetails = users.map(user => {
            const userData = user.toJSON();
            
            let type = 'Usuário';
            let role = 'user';
            let roles = [];
            
            if (userData.is_administrador) {
                type = 'Administrador';
                role = 'administrador';
                roles.push('administrador');
            }
            if (userData.is_correspondente) {
                if (type === 'Usuário') type = 'Correspondente';
                if (role === 'user') role = 'correspondente';
                roles.push('correspondente');
            }
            if (userData.is_corretor) {
                if (type === 'Usuário') type = 'Corretor';
                if (role === 'user') role = 'corretor';
                roles.push('corretor');
            }

            return {
                ...userData,
                type,
                role,
                roles,
                displayName: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username || userData.email
            };
        });

        console.log(`📋 ${usersWithDetails.length} usuários listados para: ${currentUser.username}`);

        res.json({
            success: true,
            users: usersWithDetails,
            total: usersWithDetails.length,
            requestedBy: {
                id: currentUser.id,
                username: currentUser.username,
                is_administrador: currentUser.is_administrador,
                is_correspondente: currentUser.is_correspondente
            }
        });

    } catch (error) {
        console.error('❌ Erro ao listar usuários:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno do servidor ao listar usuários',
            details: error.message 
        });
    }
});

// ✅ ROTA PARA BUSCAR USUÁRIO ESPECÍFICO POR ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user.id;
        const currentUser = await User.findByPk(currentUserId);

        // ✅ VERIFICAR PERMISSÕES
        if (!currentUser.is_administrador && !currentUser.is_correspondente && currentUserId != id) {
            return res.status(403).json({ 
                success: false, 
                error: 'Acesso negado. Você só pode ver seu próprio perfil.' 
            });
        }

        const user = await User.findByPk(id, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Usuário não encontrado' 
            });
        }

        // ✅ ADICIONAR INFORMAÇÕES DE TIPO E ROLE
        const userData = user.toJSON();
        let type = 'Usuário';
        let role = 'user';
        let roles = [];
        
        if (userData.is_administrador) {
            type = 'Administrador';
            role = 'administrador';
            roles.push('administrador');
        }
        if (userData.is_correspondente) {
            if (type === 'Usuário') type = 'Correspondente';
            if (role === 'user') role = 'correspondente';
            roles.push('correspondente');
        }
        if (userData.is_corretor) {
            if (type === 'Usuário') type = 'Corretor';
            if (role === 'user') role = 'corretor';
            roles.push('corretor');
        }

        res.json({
            success: true,
            user: {
                ...userData,
                type,
                role,
                roles,
                displayName: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username || userData.email
            }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar usuário:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno do servidor',
            details: error.message 
        });
    }
});

// Atualizar usuário (com foto)
router.put('/:id', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validar se o ID é um número válido
        if (isNaN(Number(id))) {
            if (req.file) await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ 
                success: false, 
                error: 'ID de usuário inválido. Use um número válido.' 
            });
        }

        const currentUserId = req.user.id;
        const currentUser = await User.findByPk(currentUserId);

        // Permitir apenas o próprio usuário, admin ou correspondente
        if (!currentUser.is_administrador && !currentUser.is_correspondente && currentUserId != id) {
            return res.status(403).json({ 
                success: false, 
                error: 'Acesso negado. Você só pode atualizar seu próprio perfil.' 
            });
        }

        const user = await User.findByPk(id);
        if (!user) {
            // Remove arquivo enviado se usuário não existe
            if (req.file) await fs.unlink(req.file.path).catch(() => {});
            return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        }

        // Atualizar campos permitidos
        const allowedFields = [
            'first_name', 'last_name', 'username', 'email', 'telefone', 'address', 'pix_account'
        ];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        });

        // Se veio foto, renomeia e atualiza
        if (req.file) {
            const ext = path.extname(req.file.originalname);
            const newPhotoName = `usuario_${id}${ext}`;
            const newPhotoPath = path.join(userPhotoDir, newPhotoName);

            // Remove foto antiga se existir e for diferente
            if (user.photo && user.photo !== newPhotoName) {
                const oldPhotoPath = path.join(userPhotoDir, user.photo);
                await fs.unlink(oldPhotoPath).catch(() => {});
            }

            await fs.rename(req.file.path, newPhotoPath);
            user.photo = newPhotoName;
        }

        await user.save();

        res.json({
            success: true,
            message: 'Usuário atualizado com sucesso',
            user: user.toJSON()
        });

        // Emitir evento socket para atualização de usuário
        try {
            const { getSocketIO } = require('../socket');
            getSocketIO().emit('usuario-atualizado', {
                userId: user.id,
                alteradoPor: req.user ? req.user.username : 'sistema'
            });
        } catch (e) {
            console.warn('Socket.IO não inicializado:', e.message);
        }

    } catch (error) {
        console.error('❌ Erro ao atualizar usuário:', error);
        // Remove arquivo enviado em caso de erro
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno do servidor',
            details: error.message 
        });
    }
});

module.exports = router;
