const jwt = require('jsonwebtoken');

// Middleware para verificar JWT token
const authMiddleware = (req, res, next) => {
    try {
        // Obtener token del header Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: true,
                message: 'Token no proporcionado'
            });
        }

        // Extraer el token
        const token = authHeader.substring(7);

        // Verificar y decodificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Agregar datos del usuario al objeto request
        req.user = decoded;

        // Continuar con el siguiente middleware/controlador
        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: true,
                message: 'Token expirado'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: true,
                message: 'Token inválido'
            });
        } else {
            console.error('Error en auth middleware:', error);
            return res.status(500).json({
                error: true,
                message: 'Error interno del servidor'
            });
        }
    }
};

module.exports = authMiddleware;
