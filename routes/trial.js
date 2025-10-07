import express from 'express';
import { body } from 'express-validator';
import * as trialController from '../controllers/trialController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

/**
 * Middleware para verificar que el usuario es administrador
 */
const isAdmin = (req, res, next) => {
    if (req.user && (req.user.rol === 'admin' || req.user.rol === 'administrador')) {
        next();
    } else {
        res.status(403).json({
            error: true,
            message: 'No tienes permisos para realizar esta acción'
        });
    }
};

// Rutas públicas (requieren autenticación pero no admin)
router.get('/my-info', authMiddleware, trialController.getMyTrialInfo);

// Rutas de administración (requieren admin)
router.get('/users', authMiddleware, isAdmin, trialController.listTrialUsers);

router.post('/set-trial', [
    authMiddleware,
    isAdmin,
    body('userId').notEmpty().withMessage('El ID de usuario es requerido'),
    body('diasPrueba').optional().isInt({ min: 1 }).withMessage('Los días de prueba deben ser un número positivo')
], trialController.setUserTrial);

router.post('/extend', [
    authMiddleware,
    isAdmin,
    body('userId').notEmpty().withMessage('El ID de usuario es requerido'),
    body('diasAdicionales').isInt({ min: 1 }).withMessage('Los días adicionales deben ser un número positivo')
], trialController.extendTrial);

router.post('/convert-permanent', [
    authMiddleware,
    isAdmin,
    body('userId').notEmpty().withMessage('El ID de usuario es requerido')
], trialController.convertToPermament);

router.post('/suspend', [
    authMiddleware,
    isAdmin,
    body('userId').notEmpty().withMessage('El ID de usuario es requerido')
], trialController.suspendUser);

router.post('/reactivate', [
    authMiddleware,
    isAdmin,
    body('userId').notEmpty().withMessage('El ID de usuario es requerido')
], trialController.reactivateUser);

export default router;
