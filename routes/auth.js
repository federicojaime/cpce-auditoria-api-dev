const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Validaciones para el login
const loginValidation = [
    body('username')
        .notEmpty()
        .withMessage('El usuario es requerido')
        .isLength({ min: 3 })
        .withMessage('El usuario debe tener al menos 3 caracteres'),
    body('password')
        .notEmpty()
        .withMessage('La contraseña es requerida')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres')
];

// Rutas públicas
router.post('/login', loginValidation, authController.login);

// Rutas protegidas
router.post('/logout', authMiddleware, authController.logout);
router.get('/profile', authMiddleware, authController.getProfile);

// Cambio de contraseña (pública - usa usuario + DNI)
router.put('/change-password', [
    body('username').notEmpty().withMessage('El usuario es requerido'),
    body('dni').notEmpty().withMessage('El DNI es requerido'),
    body('password_nuevo').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('password_nuevo_repetir').isLength({ min: 6 }).withMessage('Debe repetir la contraseña')
], authController.changePassword);

// Verificar token
router.get('/verify', authMiddleware, (req, res) => {
    res.json({
        valid: true,
        user: req.user
    });
});

module.exports = router;
