import express from 'express';
import { body, param, query } from 'express-validator';
import * as proveedoresController from '../controllers/proveedoresController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// ========================================
// VALIDACIONES
// ========================================

// Validación para listar proveedores
const listProveedoresValidation = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page debe ser un número entero positivo'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit debe estar entre 1 y 100'),
    query('search').optional().isString().trim(),
    query('tipo').optional().isIn(['', 'todos', 'Laboratorio', 'Droguería', 'Ambos']).withMessage('Tipo inválido'),
    query('activo').optional().isIn(['', 'true', 'false', '0', '1']).withMessage('Activo debe ser true o false')
];

// Validación para crear proveedor
const createProveedorValidation = [
    body('razon_social')
        .notEmpty().withMessage('La razón social es requerida')
        .isLength({ min: 3, max: 255 }).withMessage('La razón social debe tener entre 3 y 255 caracteres'),
    body('cuit')
        .notEmpty().withMessage('El CUIT es requerido')
        .matches(/^\d{2}-\d{8}-\d{1}$/).withMessage('El CUIT debe tener el formato XX-XXXXXXXX-X'),
    body('tipo_proveedor')
        .optional()
        .isIn(['Laboratorio', 'Droguería', 'Ambos']).withMessage('Tipo de proveedor inválido'),
    body('email_general')
        .optional()
        .isEmail().withMessage('Email inválido'),
    body('telefono_general')
        .optional()
        .isString().trim(),
    body('direccion_calle').optional().isString().trim(),
    body('direccion_numero').optional().isString().trim(),
    body('barrio').optional().isString().trim(),
    body('localidad').optional().isString().trim(),
    body('provincia').optional().isString().trim(),
    body('contactos').optional().isArray().withMessage('Contactos debe ser un array'),
    body('contactos.*.nombre').optional().isString().trim().withMessage('Nombre del contacto inválido'),
    body('contactos.*.apellido').optional().isString().trim().withMessage('Apellido del contacto inválido'),
    body('contactos.*.cargo').optional().isString().trim(),
    body('contactos.*.email').optional().isEmail().withMessage('Email del contacto inválido'),
    body('contactos.*.telefono').optional().isString().trim(),
    body('contactos.*.principal').optional().isBoolean().withMessage('Principal debe ser booleano')
];

// Validación para actualizar proveedor
const updateProveedorValidation = [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    body('razon_social').optional().isLength({ min: 3, max: 255 }).withMessage('Razón social inválida'),
    body('cuit').optional().matches(/^\d{2}-\d{8}-\d{1}$/).withMessage('CUIT inválido'),
    body('tipo_proveedor').optional().isIn(['Laboratorio', 'Droguería', 'Ambos']).withMessage('Tipo inválido'),
    body('email_general').optional().isEmail().withMessage('Email inválido'),
    body('telefono_general').optional().isString().trim(),
    body('direccion_calle').optional().isString().trim(),
    body('direccion_numero').optional().isString().trim(),
    body('barrio').optional().isString().trim(),
    body('localidad').optional().isString().trim(),
    body('provincia').optional().isString().trim(),
    body('activo').optional().isBoolean().withMessage('Activo debe ser booleano')
];

// Validación de ID
const idValidation = [
    param('id').isInt({ min: 1 }).withMessage('ID inválido')
];

// Validación para crear contacto
const createContactoValidation = [
    param('id').isInt({ min: 1 }).withMessage('ID de proveedor inválido'),
    body('nombre').notEmpty().withMessage('El nombre es requerido').isString().trim(),
    body('apellido').notEmpty().withMessage('El apellido es requerido').isString().trim(),
    body('cargo').optional().isString().trim(),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('telefono').optional().isString().trim(),
    body('principal').optional().isBoolean().withMessage('Principal debe ser booleano')
];

// Validación para actualizar contacto
const updateContactoValidation = [
    param('id').isInt({ min: 1 }).withMessage('ID de proveedor inválido'),
    param('contactoId').isInt({ min: 1 }).withMessage('ID de contacto inválido'),
    body('nombre').optional().isString().trim().withMessage('Nombre inválido'),
    body('apellido').optional().isString().trim().withMessage('Apellido inválido'),
    body('cargo').optional().isString().trim(),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('telefono').optional().isString().trim(),
    body('principal').optional().isBoolean().withMessage('Principal debe ser booleano')
];

// Validación para búsqueda
const buscarValidation = [
    query('q')
        .notEmpty().withMessage('El parámetro de búsqueda es requerido')
        .isLength({ min: 2 }).withMessage('La búsqueda debe tener al menos 2 caracteres'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit debe estar entre 1 y 50')
];

// ========================================
// RUTAS
// ========================================

// Rutas auxiliares (deben ir primero para evitar conflictos con :id)
router.get('/tipos', proveedoresController.getTiposProveedores);
router.get('/estadisticas', proveedoresController.getEstadisticas);
router.get('/buscar', buscarValidation, proveedoresController.buscarProveedores);

// Rutas principales de proveedores
router.get('/', listProveedoresValidation, proveedoresController.getProveedores);
router.post('/', createProveedorValidation, proveedoresController.createProveedor);
router.get('/:id', idValidation, proveedoresController.getProveedorById);
router.put('/:id', updateProveedorValidation, proveedoresController.updateProveedor);
router.delete('/:id', idValidation, proveedoresController.deleteProveedor);

// Rutas de contactos
router.get('/:id/contactos', idValidation, proveedoresController.getContactosProveedor);
router.post('/:id/contactos', createContactoValidation, proveedoresController.createContacto);
router.put('/:id/contactos/:contactoId', updateContactoValidation, proveedoresController.updateContacto);
router.delete('/:id/contactos/:contactoId', [
    param('id').isInt({ min: 1 }).withMessage('ID de proveedor inválido'),
    param('contactoId').isInt({ min: 1 }).withMessage('ID de contacto inválido')
], proveedoresController.deleteContacto);

export default router;
