// routes/proveedores.js - VERSIÓN CORREGIDA
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const proveedoresController = require('../controllers/proveedoresController');
const auth = require('../middleware/auth');

// Todas las rutas de proveedores requieren autenticación
router.use(auth);

// ✅ AGREGADO: Middleware para manejar errores de validación globalmente
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

// ==========================================
// VALIDACIONES MEJORADAS
// ==========================================

// Validaciones para crear proveedor
const createProveedorValidation = [
    body('razon_social')
        .notEmpty()
        .withMessage('La razón social es obligatoria')
        .isLength({ min: 2, max: 255 })
        .withMessage('La razón social debe tener entre 2 y 255 caracteres')
        .trim(),

    body('cuit')
        .notEmpty()
        .withMessage('El CUIT es obligatorio')
        .matches(/^\d{2}-\d{8}-\d{1}$/)
        .withMessage('El CUIT debe tener el formato XX-XXXXXXXX-X'),

    body('tipo_proveedor')
        .optional()
        .isIn(['Laboratorio', 'Droguería', 'Ambos'])
        .withMessage('Tipo de proveedor debe ser: Laboratorio, Droguería o Ambos'),

    body('email_general')
        .optional({ nullable: true })
        .isEmail()
        .withMessage('Email debe tener formato válido')
        .normalizeEmail(),

    body('telefono_general')
        .optional({ nullable: true })
        .isLength({ max: 50 })
        .withMessage('Teléfono no puede exceder 50 caracteres')
        .trim(),

    body('direccion_calle')
        .optional({ nullable: true })
        .isLength({ max: 100 })
        .withMessage('Dirección no puede exceder 100 caracteres')
        .trim(),

    body('direccion_numero')
        .optional({ nullable: true })
        .isLength({ max: 10 })
        .withMessage('Número de dirección no puede exceder 10 caracteres')
        .trim(),

    body('barrio')
        .optional({ nullable: true })
        .isLength({ max: 100 })
        .withMessage('Barrio no puede exceder 100 caracteres')
        .trim(),

    body('localidad')
        .optional({ nullable: true })
        .isLength({ max: 100 })
        .withMessage('Localidad no puede exceder 100 caracteres')
        .trim(),

    body('provincia')
        .optional({ nullable: true })
        .isLength({ max: 100 })
        .withMessage('Provincia no puede exceder 100 caracteres')
        .trim(),

    // Validaciones para contactos anidados
    body('contactos')
        .optional()
        .isArray()
        .withMessage('Contactos debe ser un array'),

    body('contactos.*.nombre')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Nombre de contacto debe tener entre 1 y 100 caracteres')
        .trim(),

    body('contactos.*.apellido')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Apellido de contacto debe tener entre 1 y 100 caracteres')
        .trim(),

    body('contactos.*.email')
        .optional({ nullable: true })
        .isEmail()
        .withMessage('Email de contacto debe ser válido')
        .normalizeEmail(),

    body('contactos.*.principal')
        .optional()
        .isBoolean()
        .withMessage('Principal debe ser verdadero o falso'),

    handleValidationErrors
];

// Validaciones para actualizar proveedor
const updateProveedorValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID debe ser un número entero positivo'),

    body('razon_social')
        .optional()
        .isLength({ min: 2, max: 255 })
        .withMessage('Razón social debe tener entre 2 y 255 caracteres')
        .trim(),

    body('cuit')
        .optional()
        .matches(/^\d{2}-\d{8}-\d{1}$/)
        .withMessage('CUIT debe tener formato XX-XXXXXXXX-X'),

    body('tipo_proveedor')
        .optional()
        .isIn(['Laboratorio', 'Droguería', 'Ambos'])
        .withMessage('Tipo debe ser: Laboratorio, Droguería o Ambos'),

    body('email_general')
        .optional({ nullable: true })
        .isEmail()
        .withMessage('Email debe ser válido')
        .normalizeEmail(),

    body('activo')
        .optional()
        .isBoolean()
        .withMessage('Activo debe ser verdadero o falso'),

    handleValidationErrors
];

// Validaciones para crear contacto
const createContactoValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID de proveedor debe ser un número entero positivo'),

    body('nombre')
        .notEmpty()
        .withMessage('El nombre es obligatorio')
        .isLength({ min: 1, max: 100 })
        .withMessage('Nombre debe tener entre 1 y 100 caracteres')
        .trim(),

    body('apellido')
        .notEmpty()
        .withMessage('El apellido es obligatorio')
        .isLength({ min: 1, max: 100 })
        .withMessage('Apellido debe tener entre 1 y 100 caracteres')
        .trim(),

    body('cargo')
        .optional({ nullable: true })
        .isLength({ max: 100 })
        .withMessage('Cargo no puede exceder 100 caracteres')
        .trim(),

    body('email')
        .optional({ nullable: true })
        .isEmail()
        .withMessage('Email debe ser válido')
        .normalizeEmail(),

    body('telefono')
        .optional({ nullable: true })
        .isLength({ max: 50 })
        .withMessage('Teléfono no puede exceder 50 caracteres')
        .trim(),

    body('principal')
        .optional()
        .isBoolean()
        .withMessage('Principal debe ser verdadero o falso'),

    handleValidationErrors
];

// Validaciones para actualizar contacto
const updateContactoValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID de proveedor debe ser un número entero positivo'),

    param('contactoId')
        .isInt({ min: 1 })
        .withMessage('ID de contacto debe ser un número entero positivo'),

    body('nombre')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Nombre debe tener entre 1 y 100 caracteres')
        .trim(),

    body('apellido')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Apellido debe tener entre 1 y 100 caracteres')
        .trim(),

    body('cargo')
        .optional({ nullable: true })
        .isLength({ max: 100 })
        .withMessage('Cargo no puede exceder 100 caracteres')
        .trim(),

    body('email')
        .optional({ nullable: true })
        .isEmail()
        .withMessage('Email debe ser válido')
        .normalizeEmail(),

    body('telefono')
        .optional({ nullable: true })
        .isLength({ max: 50 })
        .withMessage('Teléfono no puede exceder 50 caracteres')
        .trim(),

    body('principal')
        .optional()
        .isBoolean()
        .withMessage('Principal debe ser verdadero o falso'),

    handleValidationErrors
];

// Validaciones para parámetros ID únicamente
const idValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID debe ser un número entero positivo'),

    handleValidationErrors
];

// Validaciones para query parameters de listado
const listProveedoresValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Página debe ser un número positivo')
        .toInt(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Límite debe ser entre 1 y 100')
        .toInt(),

    query('search')
        .optional()
        .isLength({ min: 0, max: 255 })
        .withMessage('Búsqueda no puede exceder 255 caracteres')
        .trim(),

    query('activo')
        .optional()
        .isIn(['true', 'false', ''])
        .withMessage('Activo debe ser true, false o vacío'),

    query('tipo')
        .optional()
        .isIn(['Laboratorio', 'Droguería', 'Ambos', 'todos', ''])
        .withMessage('Tipo debe ser: Laboratorio, Droguería, Ambos, todos o vacío'),

    handleValidationErrors
];

// Validaciones para búsqueda rápida
const buscarValidation = [
    query('q')
        .notEmpty()
        .withMessage('Parámetro de búsqueda es requerido')
        .isLength({ min: 2, max: 255 })
        .withMessage('Búsqueda debe tener entre 2 y 255 caracteres')
        .trim(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Límite debe ser entre 1 y 50')
        .toInt(),

    handleValidationErrors
];

// ==========================================
// RUTAS AUXILIARES (DEBEN IR PRIMERO)
// ==========================================

// GET /api/proveedores/tipos - Obtener tipos disponibles
router.get('/tipos', proveedoresController.getTiposProveedores);

// GET /api/proveedores/estadisticas - Obtener estadísticas
router.get('/estadisticas', proveedoresController.getEstadisticas);

// GET /api/proveedores/buscar - Búsqueda rápida
router.get('/buscar', buscarValidation, proveedoresController.buscarProveedores);

// ==========================================
// RUTAS PRINCIPALES DE PROVEEDORES
// ==========================================

// GET /api/proveedores - Listar proveedores con filtros y paginación
router.get('/', listProveedoresValidation, proveedoresController.getProveedores);

// POST /api/proveedores - Crear nuevo proveedor
router.post('/', createProveedorValidation, proveedoresController.createProveedor);

// GET /api/proveedores/:id - Obtener proveedor específico
router.get('/:id', idValidation, proveedoresController.getProveedorById);

// PUT /api/proveedores/:id - Actualizar proveedor
router.put('/:id', updateProveedorValidation, proveedoresController.updateProveedor);

// DELETE /api/proveedores/:id - Eliminar proveedor (soft delete)
router.delete('/:id', idValidation, proveedoresController.deleteProveedor);

// ==========================================
// RUTAS DE CONTACTOS
// ==========================================

// GET /api/proveedores/:id/contactos - Obtener contactos del proveedor
router.get('/:id/contactos', idValidation, proveedoresController.getContactosProveedor);

// POST /api/proveedores/:id/contactos - Agregar contacto al proveedor
router.post('/:id/contactos', createContactoValidation, proveedoresController.createContacto);

// PUT /api/proveedores/:id/contactos/:contactoId - Actualizar contacto
router.put('/:id/contactos/:contactoId', updateContactoValidation, proveedoresController.updateContacto);

// DELETE /api/proveedores/:id/contactos/:contactoId - Eliminar contacto
router.delete('/:id/contactos/:contactoId', [
    param('id').isInt({ min: 1 }).withMessage('ID de proveedor debe ser un número entero positivo'),
    param('contactoId').isInt({ min: 1 }).withMessage('ID de contacto debe ser un número entero positivo'),
    handleValidationErrors
], proveedoresController.deleteContacto);

module.exports = router;