import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import * as proveedoresController from '../controllers/proveedoresController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Datos inválidos',
            errors: errors.array()
        });
    }
    next();
};

// ... (copia todas las validaciones tal cual están)

// Rutas auxiliares (primero)
router.get('/tipos', proveedoresController.getTiposProveedores);
router.get('/estadisticas', proveedoresController.getEstadisticas);
router.get('/buscar', buscarValidation, proveedoresController.buscarProveedores);

// Rutas principales
router.get('/', listProveedoresValidation, proveedoresController.getProveedores);
router.post('/', createProveedorValidation, proveedoresController.createProveedor);
router.get('/:id', idValidation, proveedoresController.getProveedorById);
router.put('/:id', updateProveedorValidation, proveedoresController.updateProveedor);
router.delete('/:id', idValidation, proveedoresController.deleteProveedor);

// Contactos
router.get('/:id/contactos', idValidation, proveedoresController.getContactosProveedor);
router.post('/:id/contactos', createContactoValidation, proveedoresController.createContacto);
router.put('/:id/contactos/:contactoId', updateContactoValidation, proveedoresController.updateContacto);
router.delete('/:id/contactos/:contactoId', [
    param('id').isInt({ min: 1 }),
    param('contactoId').isInt({ min: 1 }),
    handleValidationErrors
], proveedoresController.deleteContacto);

export default router;