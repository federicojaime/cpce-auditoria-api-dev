import { executeQuery, getConnection } from '../config/database.js';
import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';
import PDFUtils from '../utils/pdfUtils.js';
import QRCode from 'qrcode';



// Función auxiliar para calcular edad
export function calculateAge(fechaNacimiento) {
    const today = new Date();
    const birthDate = new Date(fechaNacimiento);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

// AUDITORÍAS PENDIENTES - Reemplaza auditar.php
export const getPendientes = async (req, res) => {
    try {
        const { rol } = req.user; // Del JWT token
        const { search = '', page = 1, limit = 10 } = req.query;

        // Construir consulta base con normalización
        let sql = `SELECT a.id, 
               CONCAT(UPPER(SUBSTRING(b.apellido, 1, 1)), LOWER(SUBSTRING(b.apellido, 2))) AS apellido,
               CONCAT(UPPER(SUBSTRING(b.nombre, 1, 1)), LOWER(SUBSTRING(b.nombre, 2))) AS nombre,
               b.dni, 
               DATE_FORMAT(a.fecha_origen, '%d-%m-%Y') AS fecha, 
               CONCAT(
                   CONCAT(UPPER(SUBSTRING(c.nombre, 1, 1)), LOWER(SUBSTRING(c.nombre, 2))), ' ',
                   CONCAT(UPPER(SUBSTRING(c.apellido, 1, 1)), LOWER(SUBSTRING(c.apellido, 2))), ' MP-', c.matricula
               ) AS medico, 
               a.renglones, a.cantmeses AS meses, a.auditado 
               FROM rec_auditoria a 
               INNER JOIN rec_paciente b ON a.idpaciente=b.id 
               INNER JOIN tmp_person c ON a.idprescriptor=c.matricula 
               INNER JOIN rec_receta d ON a.idreceta1=d.idreceta 
               WHERE a.renglones>0 AND a.auditado IS NULL AND idobrasoc = 20 AND (a.estado IS NULL OR a.estado != 1)`;

        // Si el rol es 9 (médico auditor), solo ver las bloqueadas
        if (rol == 9) {
            sql += " AND a.bloqueadaxauditor IS NOT NULL";
        }

        // Agregar búsqueda si existe
        let params = [];
        if (search && search.trim()) {
            sql += " AND (b.apellido LIKE ? OR b.nombre LIKE ? OR b.dni LIKE ? OR CONCAT(c.nombre, ' ', c.apellido) LIKE ?)";
            const searchParam = `%${search.trim()}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
        }

        // 1. PRIMERO: Consulta para contar total de registros
        let countSql = `SELECT COUNT(*) as total 
                    FROM rec_auditoria a 
                    INNER JOIN rec_paciente b ON a.idpaciente=b.id 
                    INNER JOIN tmp_person c ON a.idprescriptor=c.matricula 
                    INNER JOIN rec_receta d ON a.idreceta1=d.idreceta 
                    WHERE a.renglones>0 AND a.auditado IS NULL AND idobrasoc = 20 AND (a.estado IS NULL OR a.estado != 1)`;

        // Si el rol es 9 (médico auditor), agregar también a count
        if (rol == 9) {
            countSql += " AND a.bloqueadaxauditor IS NOT NULL";
        }

        // Agregar búsqueda al count también
        if (search && search.trim()) {
            countSql += " AND (b.apellido LIKE ? OR b.nombre LIKE ? OR b.dni LIKE ? OR CONCAT(c.nombre, ' ', c.apellido) LIKE ?)";
        }

        console.log('Count SQL:', countSql);
        console.log('Params:', params);

        const countResult = await executeQuery(countSql, params);
        const total = countResult[0]?.total || 0;
        const totalPages = Math.ceil(total / limit);

        console.log('Count result:', countResult);
        console.log('Total encontrado:', total);
        console.log('Total páginas:', totalPages);

        // 2. SEGUNDO: Agregar ordenamiento y paginación a la consulta principal
        sql += " ORDER BY d.fechaemision ASC";

        const offset = (page - 1) * limit;
        sql += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        console.log('Data SQL:', sql);

        const resultados = await executeQuery(sql, params);

        console.log('Resultados encontrados:', resultados.length);

        res.json({
            success: true,
            data: resultados,
            total: total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: totalPages
        });

    } catch (error) {
        console.error('Error obteniendo auditorías pendientes:', error);
        res.status(500).json({
            error: true,
            message: 'Error interno del servidor'
        });
    }
};

// AUDITORÍAS HISTÓRICAS - Reemplaza historico_s.php
export const getHistoricas = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;

        // Convertir a números para evitar problemas
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        console.log('Parámetros recibidos:', { search, page: pageNum, limit: limitNum, offset });

        // Construir consulta base para contar
        let countSql = `SELECT COUNT(DISTINCT a.id) as total 
                        FROM rec_auditoria a 
                        INNER JOIN rec_paciente b ON a.idpaciente=b.id 
                        INNER JOIN tmp_person c ON a.idprescriptor=c.matricula 
                        INNER JOIN rec_receta d ON a.idreceta1=d.idreceta 
                        INNER JOIN rec_prescrmedicamento e ON a.idreceta1 = e.idreceta
                        LEFT JOIN user_au au ON a.auditadopor = au.id
                        WHERE a.renglones>0 AND a.auditado IS NOT NULL AND a.idobrasoc = 20 AND (a.estado IS NULL OR a.estado != 1)`;

        // Construir consulta principal con normalización de mayúsculas
        let sql = `SELECT DISTINCT a.id, 
                   CONCAT(UPPER(SUBSTRING(b.apellido, 1, 1)), LOWER(SUBSTRING(b.apellido, 2))) AS apellido,
                   CONCAT(UPPER(SUBSTRING(b.nombre, 1, 1)), LOWER(SUBSTRING(b.nombre, 2))) AS nombre,
                   b.dni,
                   DATE_FORMAT(a.fecha_origen, '%d-%m-%Y') AS fecha,
                   CONCAT(
                       CONCAT(UPPER(SUBSTRING(c.nombre, 1, 1)), LOWER(SUBSTRING(c.nombre, 2))), ' ',
                       CONCAT(UPPER(SUBSTRING(c.apellido, 1, 1)), LOWER(SUBSTRING(c.apellido, 2))), ' MP-', c.matricula
                   ) AS medico,
                   a.renglones, 
                   a.cantmeses AS meses, 
                   a.auditado,
                   a.auditadopor,
                   DATE_FORMAT(MAX(e.fecha_auditoria), '%d-%m-%Y') AS fechaAuditoria,
                   CONCAT(
                       CONCAT(UPPER(SUBSTRING(au.nombre, 1, 1)), LOWER(SUBSTRING(au.nombre, 2))), ' ',
                       CONCAT(UPPER(SUBSTRING(au.apellido, 1, 1)), LOWER(SUBSTRING(au.apellido, 2)))
                   ) AS auditor
                   FROM rec_auditoria a 
                   INNER JOIN rec_paciente b ON a.idpaciente = b.id 
                   INNER JOIN tmp_person c ON a.idprescriptor = c.matricula 
                   INNER JOIN rec_receta d ON a.idreceta1 = d.idreceta 
                   INNER JOIN rec_prescrmedicamento e ON a.idreceta1 = e.idreceta
                   LEFT JOIN user_au au ON a.auditadopor = au.id
                   WHERE a.renglones>0 AND a.auditado IS NOT NULL AND a.idobrasoc = 20 AND (a.estado IS NULL OR a.estado != 1)`;

        // Agregar búsqueda si existe
        let params = [];
        if (search && search.trim()) {
            const searchCondition = ` AND (b.apellido LIKE ? OR b.nombre LIKE ? OR b.dni LIKE ? OR 
                                    CONCAT(c.nombre, ' ', c.apellido) LIKE ? OR 
                                    CONCAT(au.nombre, ' ', au.apellido) LIKE ?)`;
            countSql += searchCondition;
            sql += searchCondition;
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Agregar GROUP BY antes del ORDER BY
        sql += ` GROUP BY a.id, b.apellido, b.nombre, b.dni, a.fecha_origen, 
                 c.nombre, c.apellido, c.matricula, a.renglones, a.cantmeses, 
                 a.auditado, a.auditadopor, au.nombre, au.apellido`;

        // Primero obtener el total
        console.log('Count SQL:', countSql);
        const countResult = await executeQuery(countSql, params);
        const total = countResult[0]?.total || 0;
        const totalPages = Math.ceil(total / limitNum);

        console.log('Total registros:', total, 'Total páginas:', totalPages);

        // Agregar ordenamiento y LIMIT/OFFSET con concatenación directa
        sql += ` ORDER BY MAX(e.fecha_auditoria) DESC LIMIT ${limitNum} OFFSET ${offset}`;

        console.log('Data SQL:', sql);
        console.log('Data params:', params);

        const resultados = await executeQuery(sql, params);

        console.log('Registros obtenidos:', resultados.length);

        res.json({
            success: true,
            data: resultados,
            total: total,
            page: pageNum,
            limit: limitNum,
            totalPages: totalPages
        });

    } catch (error) {
        console.error('Error obteniendo auditorías históricas:', error);
        res.status(500).json({
            success: false,
            error: true,
            message: 'Error interno del servidor',
            details: error.message
        });
    }
};

// LISTADO COMPLETO CON FILTROS - Reemplaza todoenuno_s.php
export const getListado = async (req, res) => {
    try {
        const { dni, fechaDesde, fechaHasta } = req.body;

        let sql = `SELECT DISTINCT a.id, 
                   CONCAT(UPPER(SUBSTRING(b.apellido, 1, 1)), LOWER(SUBSTRING(b.apellido, 2))) AS apellido,
                   CONCAT(UPPER(SUBSTRING(b.nombre, 1, 1)), LOWER(SUBSTRING(b.nombre, 2))) AS nombre,
                   b.dni, 
                   DATE_FORMAT(a.fecha_origen, '%d-%m-%Y') AS fecha, 
                   CONCAT(
                       CONCAT(UPPER(SUBSTRING(c.nombre, 1, 1)), LOWER(SUBSTRING(c.nombre, 2))), ' ',
                       CONCAT(UPPER(SUBSTRING(c.apellido, 1, 1)), LOWER(SUBSTRING(c.apellido, 2))), ' MP-', c.matricula
                   ) AS medico, 
                   a.renglones, a.cantmeses as meses, a.auditado, 
                   CONCAT(
                       CONCAT(UPPER(SUBSTRING(f.nombre, 1, 1)), LOWER(SUBSTRING(f.nombre, 2))), ' ',
                       CONCAT(UPPER(SUBSTRING(f.apellido, 1, 1)), LOWER(SUBSTRING(f.apellido, 2)))
                   ) AS auditadoX, 
                   DATE_FORMAT(e.fecha_auditoria, '%d-%m-%Y') AS fecha_auditoria 
                   FROM rec_auditoria a 
                   INNER JOIN rec_paciente b ON a.idpaciente = b.id 
                   INNER JOIN tmp_person c ON a.idprescriptor = c.matricula 
                   INNER JOIN rec_receta d ON a.idreceta1 = d.idreceta 
                   INNER JOIN rec_prescrmedicamento e ON a.idreceta1 = e.idreceta 
                   LEFT JOIN user_au f ON a.auditadopor=f.id 
                   WHERE a.renglones > 0 AND idobrasoc = 20 AND (a.estado IS NULL OR a.estado != 1)`;

        const params = [];

        // Filtros opcionales
        if (dni) {
            sql += " AND b.dni = ?";
            params.push(dni);
        }

        if (fechaDesde && fechaHasta) {
            sql += " AND a.fecha_origen BETWEEN ? AND ?";
            params.push(fechaDesde, fechaHasta);
        }

        sql += " ORDER BY fecha DESC";

        const resultados = await executeQuery(sql, params);

        res.json({
            success: true,
            data: resultados
        });

    } catch (error) {
        console.error('Error obteniendo listado:', error);
        res.status(500).json({
            error: true,
            message: 'Error interno del servidor'
        });
    }
};

// HISTORIAL DE PACIENTE - GET
// HISTORIAL DE PACIENTE - GET - CORREGIDO CON TABLAS REALES
export const getHistorialPaciente = async (req, res) => {
    try {
        const { dni, page = 1, limit = 10, fechaDesde, fechaHasta, search } = req.query;

        // Validar DNI
        if (!dni || dni.length < 7) {
            return res.status(400).json({
                success: false,
                message: 'DNI es requerido y debe tener al menos 7 dígitos'
            });
        }

        // Convertir a números para evitar problemas
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        // Query base para contar - CON TABLAS CORRECTAS BASADAS EN PHP
        let countQuery = `
            SELECT COUNT(DISTINCT pm.idrecetamedic) as total
            FROM rec_auditoria a
            INNER JOIN rec_paciente p ON a.idpaciente = p.id
            INNER JOIN rec_prescrmedicamento pm ON (a.idreceta1 = pm.idreceta OR a.idreceta2 = pm.idreceta OR a.idreceta3 = pm.idreceta)
            INNER JOIN tmp_person c ON a.idprescriptor = c.matricula
            LEFT JOIN user_au au ON a.auditadopor = au.id
            LEFT JOIN vad_manual vm ON pm.codigo = vm.troquel
            LEFT JOIN vad_manextra me ON vm.nro_registro = me.nro_registro
            LEFT JOIN vad_monodro md ON me.cod_droga = md.codigo
            WHERE p.dni = ?
            AND a.auditado IS NOT NULL
            AND pm.estado_auditoria IS NOT NULL
        `;

        // Query principal - CON DATOS REALES DE MEDICAMENTOS USANDO TABLAS VAD_*
        let dataQuery = `
            SELECT DISTINCT
                a.id as idauditoria,
                DATE_FORMAT(a.fecha_origen, '%d/%m/%Y') as fecha_auditoria,
                CONCAT(
                    CONCAT(UPPER(SUBSTRING(au.nombre, 1, 1)), LOWER(SUBSTRING(au.nombre, 2))), ' ',
                    CONCAT(UPPER(SUBSTRING(au.apellido, 1, 1)), LOWER(SUBSTRING(au.apellido, 2)))
                ) as auditor,
                CASE 
                    WHEN a.auditado = 1 THEN 'APROBADO'
                    WHEN a.auditado = 2 THEN 'RECHAZADO'
                    WHEN a.auditado = 3 THEN 'OBSERVADO'
                    ELSE 'PENDIENTE'
                END as estado_auditoria,
                pm.idrecetamedic as idmedicamento,
                CONCAT(
                    CONCAT(UPPER(SUBSTRING(c.nombre, 1, 1)), LOWER(SUBSTRING(c.nombre, 2))), ' ',
                    CONCAT(UPPER(SUBSTRING(c.apellido, 1, 1)), LOWER(SUBSTRING(c.apellido, 2))), ' MP-', c.matricula
                ) as medico,
                -- 🔥 NOMBRE COMERCIAL REAL DESDE vad_manual
                COALESCE(vm.nombre, CONCAT('Medicamento ID: ', pm.idmedicamento)) as nombre_comercial,
                -- 🔥 MONODROGA REAL DESDE vad_monodro
                COALESCE(md.descripcion, 'No especificado') as monodroga,
                -- 🔥 PRESENTACIÓN REAL DESDE vad_manual
                COALESCE(vm.presentacion, 'No especificado') as presentacion,
                pm.cantprescripta,
                COALESCE(pm.posologia, '-') as posologia,
                CONCAT(COALESCE(pm.porcentajecobertura, '0'), '%') as cobertura,
                CASE 
                    WHEN pm.estado_auditoria = 1 THEN 'APROBADO'
                    WHEN pm.estado_auditoria = 2 THEN 'RECHAZADO'
                    WHEN pm.estado_auditoria = 3 THEN 'OBSERVADO'
                    WHEN pm.estado_auditoria = 4 THEN 'PEND. MEDICO'
                    ELSE 'PENDIENTE'
                END as estado_medicamento,
                pm.observacion as observaciones
            FROM rec_auditoria a
            INNER JOIN rec_paciente p ON a.idpaciente = p.id
            INNER JOIN rec_prescrmedicamento pm ON (a.idreceta1 = pm.idreceta OR a.idreceta2 = pm.idreceta OR a.idreceta3 = pm.idreceta)
            INNER JOIN tmp_person c ON a.idprescriptor = c.matricula
            LEFT JOIN user_au au ON a.auditadopor = au.id
            -- 🔥 JOINS CON LAS TABLAS CORRECTAS BASADAS EN EL PHP
            LEFT JOIN vad_manual vm ON pm.codigo = vm.troquel
            LEFT JOIN vad_manextra me ON vm.nro_registro = me.nro_registro
            LEFT JOIN vad_monodro md ON me.cod_droga = md.codigo
            WHERE p.dni = ?
            AND a.auditado IS NOT NULL
            AND pm.estado_auditoria IS NOT NULL
        `;

        // Parámetros base
        const countParams = [dni];
        const dataParams = [dni];

        // Filtro de fecha desde
        if (fechaDesde) {
            const dateFilter = ' AND DATE(a.fecha_origen) >= ?';
            countQuery += dateFilter;
            dataQuery += dateFilter;
            countParams.push(fechaDesde);
            dataParams.push(fechaDesde);
        }

        // Filtro de fecha hasta
        if (fechaHasta) {
            const dateFilter = ' AND DATE(a.fecha_origen) <= ?';
            countQuery += dateFilter;
            dataQuery += dateFilter;
            countParams.push(fechaHasta);
            dataParams.push(fechaHasta);
        }

        // Búsqueda en campos de texto - INCLUYENDO CAMPOS DE MEDICAMENTOS
        if (search && search.trim()) {
            const searchFilter = ` AND (
                c.nombre LIKE ? OR 
                c.apellido LIKE ? OR
                pm.observacion LIKE ? OR
                vm.nombre LIKE ? OR
                md.descripcion LIKE ? OR
                vm.presentacion LIKE ?
            )`;
            countQuery += searchFilter;
            dataQuery += searchFilter;

            const searchPattern = `%${search.trim()}%`;
            countParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
            dataParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Primero contar total de registros
        console.log('Count Query:', countQuery);
        console.log('Count Params:', countParams);

        const countResult = await executeQuery(countQuery, countParams);
        const total = countResult[0]?.total || 0;

        // Agregar ORDER BY y LIMIT/OFFSET a la consulta de datos
        dataQuery += ` ORDER BY a.fecha_origen DESC, pm.idrecetamedic DESC`;
        dataQuery += ` LIMIT ${limitNum} OFFSET ${offset}`;

        console.log('Data Query:', dataQuery);
        console.log('Data Params:', dataParams);

        // Ejecutar consulta principal
        const medicamentos = await executeQuery(dataQuery, dataParams);

        // Obtener datos del paciente
        const pacienteQuery = `
            SELECT 
                dni,
                CONCAT(apellido, ' ', nombre) as apellidoNombre,
                sexo,
                TIMESTAMPDIFF(YEAR, fecnac, CURDATE()) as edad,
                telefono,
                email,
                talla,
                peso
            FROM rec_paciente 
            WHERE dni = ? 
            LIMIT 1
        `;
        const pacienteData = await executeQuery(pacienteQuery, [dni]);

        const totalPages = Math.ceil(total / limitNum);

        // Si no hay datos, verificar si el paciente existe
        if (medicamentos.length === 0 && !pacienteData[0]) {
            // Buscar solo por DNI para ver si existe el paciente
            const checkPaciente = await executeQuery(
                'SELECT COUNT(*) as existe FROM rec_paciente WHERE dni = ?',
                [dni]
            );

            if (checkPaciente[0]?.existe === 0) {
                return res.json({
                    success: false,
                    message: 'No se encontró un paciente con ese DNI',
                    data: [],
                    paciente: null,
                    total: 0,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: 0
                });
            }
        }

        res.json({
            success: true,
            data: medicamentos || [],
            paciente: pacienteData[0] || null,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages,
            message: medicamentos.length === 0 ? 'No se encontraron registros de auditorías para este paciente' : null
        });

    } catch (error) {
        console.error('Error en getHistorialPaciente:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener historial del paciente',
            error: error.message
        });
    }
};
// AUDITORÍAS MÉDICAS PENDIENTES - Para médicos auditores (rol 9)
export const getAuditoriasMedicas = async (req, res) => {
    try {
        const { rol } = req.user;

        // Solo médicos auditores pueden acceder
        if (rol != 9) {
            return res.status(403).json({
                error: true,
                message: 'Acceso denegado. Solo médicos auditores pueden ver esta información.'
            });
        }

        const sql = `SELECT a.id, 
                    CONCAT(UPPER(SUBSTRING(b.apellido, 1, 1)), LOWER(SUBSTRING(b.apellido, 2))) AS apellido,
                    CONCAT(UPPER(SUBSTRING(b.nombre, 1, 1)), LOWER(SUBSTRING(b.nombre, 2))) AS nombre,
                    b.dni, 
                    DATE_FORMAT(a.fecha_origen, '%d-%m-%Y') AS fecha, 
                    CONCAT(
                        CONCAT(UPPER(SUBSTRING(c.nombre, 1, 1)), LOWER(SUBSTRING(c.nombre, 2))), ' ',
                        CONCAT(UPPER(SUBSTRING(c.apellido, 1, 1)), LOWER(SUBSTRING(c.apellido, 2))), ' MP-', c.matricula
                    ) AS medico, 
                    a.renglones, a.cantmeses AS meses, a.auditado,
                    DATE_FORMAT(a.bloqueadaxauditor, '%d-%m-%Y %H:%i') AS fecha_bloqueo
                    FROM rec_auditoria a 
                    INNER JOIN rec_paciente b ON a.idpaciente=b.id 
                    INNER JOIN tmp_person c ON a.idprescriptor=c.matricula 
                    INNER JOIN rec_receta d ON a.idreceta1=d.idreceta 
                    WHERE a.renglones>0 AND a.auditado IS NULL AND a.idobrasoc = 20
                    AND a.bloqueadaxauditor IS NOT NULL AND (a.estado IS NULL OR a.estado != 1)
                    ORDER BY a.bloqueadaxauditor DESC`;

        const resultados = await executeQuery(sql);

        res.json({
            success: true,
            data: resultados,
            message: `Encontradas ${resultados.length} auditorías médicas pendientes`
        });

    } catch (error) {
        console.error('Error obteniendo auditorías médicas:', error);
        res.status(500).json({
            error: true,
            message: 'Error interno del servidor'
        });
    }
};

// DESCARGAR EXCEL - Reemplaza descargar_excel.php
export const generarExcel = async (req, res) => {
    try {
        const { fecha } = req.body; // formato: YYYY-MM

        // Validar formato de fecha
        if (!/^\d{4}-\d{2}$/.test(fecha)) {
            return res.status(400).json({
                error: true,
                message: 'Formato de fecha inválido. Use YYYY-MM'
            });
        }

        const [año, mes] = fecha.split('-');
        const fechaInicio = `${año}-${mes}-01`;
        const fechaFin = new Date(año, mes, 0).toISOString().split('T')[0];

        const sql = `SELECT 
                     CONCAT(UPPER(SUBSTRING(b.apellido, 1, 1)), LOWER(SUBSTRING(b.apellido, 2))) AS apellido,
                     CONCAT(UPPER(SUBSTRING(b.nombre, 1, 1)), LOWER(SUBSTRING(b.nombre, 2))) AS nombre,
                     b.dni, b.sexo, 
                     DATE_FORMAT(b.fecnac, '%d-%m-%Y') AS fecha_nacimiento,
                     CONCAT(
                         CONCAT(UPPER(SUBSTRING(c.nombre, 1, 1)), LOWER(SUBSTRING(c.nombre, 2))), ' ',
                         CONCAT(UPPER(SUBSTRING(c.apellido, 1, 1)), LOWER(SUBSTRING(c.apellido, 2)))
                     ) AS medico, c.matricula,
                     e.estado_auditoria,
                     DATE_FORMAT(a.fecha_origen, '%d-%m-%Y') AS fecha_receta,
                     DATE_FORMAT(e.fecha_auditoria, '%d-%m-%Y') AS fecha_auditoria,
                     CONCAT(
                         CONCAT(UPPER(SUBSTRING(f.nombre, 1, 1)), LOWER(SUBSTRING(f.nombre, 2))), ' ',
                         CONCAT(UPPER(SUBSTRING(f.apellido, 1, 1)), LOWER(SUBSTRING(f.apellido, 2)))
                     ) AS auditor
                     FROM rec_auditoria a 
                     INNER JOIN rec_paciente b ON a.idpaciente = b.id 
                     INNER JOIN tmp_person c ON a.idprescriptor = c.matricula 
                     INNER JOIN rec_prescrmedicamento e ON a.idreceta1 = e.idreceta
                     LEFT JOIN user_au f ON a.auditadopor = f.id 
                     WHERE a.fecha_origen BETWEEN ? AND ? 
                     AND a.auditado IS NOT NULL 
                     AND idobrasoc = 20 
                     ORDER BY b.apellido, b.nombre, a.fecha_origen`;

        const resultados = await executeQuery(sql, [fechaInicio, fechaFin]);

        // Validar que hay datos
        if (!resultados || resultados.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron auditorías para el período seleccionado'
            });
        }

        // Crear libro de Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Auditorías');

        // Configurar propiedades del libro
        workbook.creator = 'Sistema CPCE';
        workbook.created = new Date();
        workbook.modified = new Date();

        // Agregar título y encabezado
        worksheet.addRow(['REPORTE DE AUDITORÍAS']);
        worksheet.addRow(['Período:', `${mes}/${año}`]);
        worksheet.addRow(['Total de registros:', resultados.length]);
        worksheet.addRow(['Fecha de generación:', new Date().toLocaleString('es-AR')]);
        worksheet.addRow([]);

        // Definir encabezados de columnas
        const headerRow = worksheet.addRow([
            'Apellido',
            'Nombre',
            'DNI',
            'Sexo',
            'Fecha Nacimiento',
            'Médico',
            'Matrícula',
            'Estado Auditoría',
            'Fecha Receta',
            'Fecha Auditoría',
            'Auditor'
        ]);

        // Estilo del encabezado
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0066CC' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // Agregar datos
        resultados.forEach(row => {
            worksheet.addRow([
                row.apellido,
                row.nombre,
                row.dni,
                row.sexo,
                row.fecha_nacimiento,
                row.medico,
                row.matricula,
                row.estado_auditoria,
                row.fecha_receta,
                row.fecha_auditoria,
                row.auditor
            ]);
        });

        // Ajustar ancho de columnas
        worksheet.columns = [
            { width: 20 }, // Apellido
            { width: 20 }, // Nombre
            { width: 12 }, // DNI
            { width: 8 },  // Sexo
            { width: 15 }, // Fecha Nacimiento
            { width: 25 }, // Médico
            { width: 12 }, // Matrícula
            { width: 20 }, // Estado
            { width: 15 }, // Fecha Receta
            { width: 15 }, // Fecha Auditoría
            { width: 25 }  // Auditor
        ];

        // Aplicar bordes a todas las celdas con datos
        const dataStartRow = 6;
        const dataEndRow = dataStartRow + resultados.length;
        for (let row = dataStartRow; row <= dataEndRow; row++) {
            for (let col = 1; col <= 11; col++) {
                const cell = worksheet.getCell(row, col);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        }

        // Generar el archivo en buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Configurar headers para descarga
        const filename = `auditorias_${año}_${mes}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);

        // Enviar el archivo
        res.send(buffer);

    } catch (error) {
        console.error('Error generando Excel:', error);
        res.status(500).json({
            error: true,
            message: 'Error al generar el archivo Excel',
            details: error.message
        });
    }
};

// EXPORTAR EXCEL CON FILTROS (GET) - Maneja ?tipo=alto-costo
export const exportarExcelFiltrado = async (req, res) => {
    try {
        const { tipo, fechaDesde, fechaHasta, estado } = req.query;

        console.log('Exportando Excel con filtros:', { tipo, fechaDesde, fechaHasta, estado });

        // Construir consulta SQL base
        let sql = `SELECT DISTINCT
                    a.id,
                    CONCAT(UPPER(SUBSTRING(b.apellido, 1, 1)), LOWER(SUBSTRING(b.apellido, 2))) AS apellido,
                    CONCAT(UPPER(SUBSTRING(b.nombre, 1, 1)), LOWER(SUBSTRING(b.nombre, 2))) AS nombre,
                    b.dni,
                    DATE_FORMAT(a.fecha_origen, '%d-%m-%Y') AS fecha,
                    CONCAT(
                        CONCAT(UPPER(SUBSTRING(c.nombre, 1, 1)), LOWER(SUBSTRING(c.nombre, 2))), ' ',
                        CONCAT(UPPER(SUBSTRING(c.apellido, 1, 1)), LOWER(SUBSTRING(c.apellido, 2)))
                    ) AS medico,
                    c.matricula,
                    a.renglones,
                    a.cantmeses AS meses,
                    CASE
                        WHEN a.auditado IS NULL THEN 'Pendiente'
                        WHEN a.auditado = 1 THEN 'Aprobada'
                        WHEN a.auditado = 0 THEN 'Rechazada'
                        ELSE 'Desconocido'
                    END AS estado,
                    CONCAT(
                        IFNULL(CONCAT(UPPER(SUBSTRING(f.nombre, 1, 1)), LOWER(SUBSTRING(f.nombre, 2))), ''), ' ',
                        IFNULL(CONCAT(UPPER(SUBSTRING(f.apellido, 1, 1)), LOWER(SUBSTRING(f.apellido, 2))), '')
                    ) AS auditor,
                    IFNULL(DATE_FORMAT(MAX(e.fecha_auditoria), '%d-%m-%Y'), '-') AS fecha_auditoria
                FROM rec_auditoria a
                INNER JOIN rec_paciente b ON a.idpaciente = b.id
                INNER JOIN tmp_person c ON a.idprescriptor = c.matricula
                LEFT JOIN rec_prescrmedicamento e ON a.idreceta1 = e.idreceta
                LEFT JOIN user_au f ON a.auditadopor = f.id
                WHERE a.idobrasoc = 20 AND a.renglones > 0`;

        const params = [];

        // Filtro por tipo
        if (tipo === 'alto-costo') {
            sql += ` AND a.auditado IS NULL`;
        } else if (tipo === 'historicas') {
            sql += ` AND a.auditado IS NOT NULL`;
        }

        // Filtro por fechas
        if (fechaDesde) {
            sql += ` AND a.fecha_origen >= ?`;
            params.push(fechaDesde);
        }
        if (fechaHasta) {
            sql += ` AND a.fecha_origen <= ?`;
            params.push(fechaHasta);
        }

        // Filtro por estado
        if (estado === 'pendiente') {
            sql += ` AND a.auditado IS NULL`;
        } else if (estado === 'aprobada') {
            sql += ` AND a.auditado = 1`;
        } else if (estado === 'rechazada') {
            sql += ` AND a.auditado = 0`;
        }

        // Agregar GROUP BY para MAX()
        sql += ` GROUP BY a.id, b.apellido, b.nombre, b.dni, a.fecha_origen,
                 c.nombre, c.apellido, c.matricula, a.renglones, a.cantmeses,
                 a.auditado, f.nombre, f.apellido`;

        sql += ` ORDER BY a.fecha_origen DESC, b.apellido, b.nombre`;

        const resultados = await executeQuery(sql, params);

        // Validar que hay datos
        if (!resultados || resultados.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron auditorías con los filtros seleccionados'
            });
        }

        // Crear libro de Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Auditorías');

        // Configurar propiedades
        workbook.creator = 'Sistema CPCE';
        workbook.created = new Date();

        // Título
        const tipoTexto = tipo === 'alto-costo' ? 'AUDITORÍAS PENDIENTES - ALTO COSTO' :
                          tipo === 'historicas' ? 'AUDITORÍAS HISTÓRICAS' :
                          'REPORTE DE AUDITORÍAS';

        worksheet.addRow([tipoTexto]);
        worksheet.mergeCells('A1:L1');
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        worksheet.addRow([]);
        worksheet.addRow(['Filtros aplicados:']);
        if (tipo) worksheet.addRow(['Tipo:', tipo]);
        if (fechaDesde) worksheet.addRow(['Desde:', fechaDesde]);
        if (fechaHasta) worksheet.addRow(['Hasta:', fechaHasta]);
        worksheet.addRow(['Fecha de generación:', new Date().toLocaleString('es-AR')]);
        worksheet.addRow(['Total de registros:', resultados.length]);
        worksheet.addRow([]);

        // Encabezados
        const headerRow = worksheet.addRow([
            'ID',
            'Apellido',
            'Nombre',
            'DNI',
            'Fecha Receta',
            'Médico',
            'Matrícula',
            'Renglones',
            'Meses',
            'Estado',
            'Auditor',
            'Fecha Auditoría'
        ]);

        // Estilo del encabezado
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0066CC' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // Agregar datos
        resultados.forEach(row => {
            worksheet.addRow([
                row.id,
                row.apellido,
                row.nombre,
                row.dni,
                row.fecha,
                row.medico,
                row.matricula,
                row.renglones,
                row.meses,
                row.estado,
                row.auditor,
                row.fecha_auditoria || '-'
            ]);
        });

        // Ajustar anchos
        worksheet.columns = [
            { width: 8 },  // ID
            { width: 20 }, // Apellido
            { width: 20 }, // Nombre
            { width: 12 }, // DNI
            { width: 15 }, // Fecha Receta
            { width: 25 }, // Médico
            { width: 12 }, // Matrícula
            { width: 12 }, // Renglones
            { width: 10 }, // Meses
            { width: 15 }, // Estado
            { width: 25 }, // Auditor
            { width: 15 }  // Fecha Auditoría
        ];

        // Aplicar bordes
        const dataStartRow = 8;
        const dataEndRow = dataStartRow + resultados.length;
        for (let row = dataStartRow; row <= dataEndRow; row++) {
            for (let col = 1; col <= 12; col++) {
                const cell = worksheet.getCell(row, col);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        }

        // Generar archivo
        const buffer = await workbook.xlsx.writeBuffer();

        // Nombre del archivo
        const timestamp = new Date().toISOString().split('T')[0];
        const tipoArchivo = tipo ? `_${tipo}` : '';
        const filename = `auditorias${tipoArchivo}_${timestamp}.xlsx`;

        // Headers para descarga
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);

        // Enviar archivo
        res.send(buffer);

    } catch (error) {
        console.error('Error exportando Excel:', error);
        res.status(500).json({
            error: true,
            message: 'Error al generar el archivo Excel',
            details: error.message
        });
    }
};

// VADEMECUM - Reemplaza vademecum_s.php
export const getVademecum = async (req, res) => {
    try {
        const { search = '' } = req.query;

        let sql = `SELECT id, nombrecomercial, nombregenerico, presentacion, laboratorio 
                   FROM rec_medicamento 
                   WHERE estado = 1`;

        const params = [];

        if (search && search.trim()) {
            sql += " AND (nombrecomercial LIKE ? OR nombregenerico LIKE ? OR laboratorio LIKE ?)";
            const searchParam = `%${search.trim()}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        sql += " ORDER BY nombrecomercial ASC";

        const resultados = await executeQuery(sql, params);

        res.json({
            success: true,
            data: resultados
        });

    } catch (error) {
        console.error('Error obteniendo vademécum:', error);
        res.status(500).json({
            error: true,
            message: 'Error interno del servidor'
        });
    }
};

// OBTENER AUDITORÍA COMPLETA - Para ver detalles y procesar
export const getAuditoriaCompleta = async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo } = req.query;

        console.log('=== DEBUG AUDITORÍA ===');
        console.log('ID recibido:', id, 'Tipo:', typeof id);
        console.log('Tipo de auditoría:', tipo);
        console.log('URL completa:', req.originalUrl);
        console.log('Params completos:', req.params);

        // Verificar que el ID sea válido
        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: `ID inválido: ${id}. Debe ser un número.`
            });
        }

        // 1. PRIMERA CONSULTA: Verificar si existe la auditoría
        const sqlVerificar = `SELECT COUNT(*) as existe FROM rec_auditoria WHERE id = ?`;
        console.log('SQL Verificación:', sqlVerificar);
        console.log('Parámetro:', [id]);

        const existeResult = await executeQuery(sqlVerificar, [id]);
        console.log('Resultado verificación:', existeResult);

        if (existeResult[0].existe === 0) {
            return res.status(404).json({
                success: false,
                message: `No existe una auditoría con ID: ${id}`,
                debug: {
                    consulta_ejecutada: sqlVerificar,
                    parametro_enviado: id,
                    tipo_parametro: typeof id
                }
            });
        }

        // 2. OBTENER DATOS BÁSICOS DE LA AUDITORÍA
        const sqlAuditoria = `
            SELECT 
                a.id,
                a.idpaciente,
                a.idprescriptor,
                a.fecha_origen,
                a.renglones,
                a.cantmeses,
                a.auditado,
                a.bloqueadaxauditor,
                a.nota,
                a.idreceta1,
                a.idreceta2,
                a.idreceta3,
                a.idobrasoc
            FROM rec_auditoria a
            WHERE a.id = ?
        `;

        console.log('SQL Auditoría:', sqlAuditoria);
        console.log('Parámetro:', [id]);

        const auditoriaResult = await executeQuery(sqlAuditoria, [id]);
        console.log('Resultado auditoría:', auditoriaResult);

        if (!auditoriaResult || auditoriaResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Auditoría no encontrada en consulta detallada',
                debug: {
                    existe_registro: true,
                    consulta_detallada: sqlAuditoria,
                    resultado: auditoriaResult
                }
            });
        }

        const auditoria = auditoriaResult[0];
        console.log('Auditoría encontrada:', auditoria);

        // 3. OBTENER DATOS DEL PACIENTE
        const sqlPaciente = `
            SELECT 
                p.id,
                p.apellido,
                p.nombre,
                p.dni,
                p.sexo,
                p.fecnac,
                p.telefono,
                p.email,
                p.talla,
                p.peso,
                TIMESTAMPDIFF(YEAR, p.fecnac, CURDATE()) as edad
            FROM rec_paciente p
            WHERE p.id = ?
        `;

        console.log('SQL Paciente:', sqlPaciente);
        console.log('ID Paciente:', auditoria.idpaciente);

        const pacienteResult = await executeQuery(sqlPaciente, [auditoria.idpaciente]);
        console.log('Resultado paciente:', pacienteResult);

        const paciente = pacienteResult[0] || {};

        // 4. OBTENER DATOS DEL MÉDICO Y RECETA PRINCIPAL
        console.log('ID Receta1:', auditoria.idreceta1);

        const sqlMedicoReceta = `
          SELECT 
                t.matricula,
                CONCAT(
                    CONCAT(UPPER(SUBSTRING(t.nombre, 1, 1)), LOWER(SUBSTRING(t.nombre, 2))), ' ',
                    CONCAT(UPPER(SUBSTRING(t.apellido, 1, 1)), LOWER(SUBSTRING(t.apellido, 2)))
                ) as nombre_completo,
                e.especialidad,
                r.fechaemision,
                r.diagnostico,
                r.diagnostico2,
                r.matricprescr,
                r.matricespec_prescr,
                o.sigla as obra_social,
                p.nromatriculadoc as nro_afiliado
            FROM rec_receta r
            INNER JOIN tmp_person t ON r.matricprescr = t.matricula
            LEFT JOIN tmp_especialistas e ON t.matricula = e.matricula
            INNER JOIN rec_obrasoc o ON r.idobrasocafiliado = o.id
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            WHERE r.idreceta = ?

        `;

        const medicoRecetaResult = await executeQuery(sqlMedicoReceta, [auditoria.idreceta1]);
        console.log('Resultado médico/receta:', medicoRecetaResult);

        const medicoReceta = medicoRecetaResult[0] || {};

        // 5. DETERMINAR TABLA DE VADEMÉCUM
        let tablaVademecum = 'vademecum';
        switch (parseInt(auditoria.idobrasoc)) {
            case 156:
                tablaVademecum = 'vad_muni';
                break;
            case 20:
                tablaVademecum = 'vad_020';
                break;
            default:
                tablaVademecum = 'vademecum';
        }

        console.log('Obra Social ID:', auditoria.idobrasoc);
        console.log('Tabla vademécum:', tablaVademecum);

        // 6. OBTENER MEDICAMENTOS
        let medicamentos = [];
        const recetas = [auditoria.idreceta1, auditoria.idreceta2, auditoria.idreceta3].filter(r => r);

        console.log('Recetas a procesar:', recetas);

        for (let idReceta of recetas) {
            console.log(`Procesando receta: ${idReceta}`);

            const sqlMedicamentos = `
                SELECT 
                    pm.idreceta,
                    pm.nro_orden,
                    pm.cantprescripta,
                    pm.posologia,
                    pm.porcentajecobertura as cobertura,
                    pm.cobertura2,
                    pm.estado_auditoria,
                    pm.observacion,
                    pm.fecha_auditoria,
                    pm.id_auditor,
                    pm.codigo,
                    pm.bono_nombre,
                    pm.bono_autoriza,
                    pm.autorizacion_especial,
                    v.monodroga,
                    v.nombre_comercial,
                    v.presentacion,
                    v.tipod,
                    v.tipo_venta,
                    v.condicion,
                    v.nro_alfabeta,
                    v.cod_monodroga
                FROM rec_prescrmedicamento pm
                INNER JOIN ${tablaVademecum} v ON pm.codigo = v.codigo
                WHERE pm.idreceta = ?
                ORDER BY pm.nro_orden
            `;

            console.log('SQL Medicamentos:', sqlMedicamentos);

            try {
                const medsResult = await executeQuery(sqlMedicamentos, [idReceta]);
                console.log(`Medicamentos encontrados para receta ${idReceta}:`, medsResult.length);

                const medicamentosConReceta = medsResult.map(med => ({
                    ...med,
                    receta_origen: idReceta
                }));

                medicamentos = medicamentos.concat(medicamentosConReceta);
            } catch (error) {
                console.error(`Error en medicamentos para receta ${idReceta}:`, error.message);
                // Continuar con las otras recetas
            }
        }

        console.log('Total medicamentos encontrados:', medicamentos.length);

        const medicamentosUnicos = [];
        const seenKeys = new Set();

        for (const med of medicamentos) {
            const key = `${med.codigo}-${med.nro_orden}`;
            if (!seenKeys.has(key)) {
                medicamentosUnicos.push(med);
                seenKeys.add(key);
            }
        }

        // Reemplazar los medicamentos por los únicos
        medicamentos = medicamentosUnicos;

        // 7. ESTRUCTURAR RESPUESTA
        const responseData = {
            id: auditoria.id,
            fecha_origen: auditoria.fecha_origen,
            renglones: auditoria.renglones,
            cantmeses: auditoria.cantmeses,
            auditado: auditoria.auditado,
            bloqueadaxauditor: auditoria.bloqueadaxauditor,
            botonesDeshabilitados: auditoria.bloqueadaxauditor !== null,
            nota: auditoria.nota || '',

            paciente: {
                id: paciente.id || '',
                apellido: paciente.apellido || '',
                nombre: paciente.nombre || '',
                dni: paciente.dni || '',
                sexo: paciente.sexo || '',
                edad: paciente.edad || 0,
                telefono: paciente.telefono || '',
                email: paciente.email || '',
                talla: paciente.talla || 0,
                peso: paciente.peso || 0,
                fecnac: paciente.fecnac || ''
            },

            medico: {
                matricula: medicoReceta.matricula || '',
                nombre: medicoReceta.nombre_completo || '',
                especialidad: medicoReceta.especialidad || '',
                matricprescr: medicoReceta.matricprescr || '',
                matricespec_prescr: medicoReceta.matricespec_prescr || ''
            },

            obraSocial: {
                sigla: medicoReceta.obra_social || '',
                nroAfiliado: medicoReceta.nro_afiliado || '',
                id: auditoria.idobrasoc
            },

            diagnostico: {
                diagnostico: medicoReceta.diagnostico || '',
                diagnostico2: medicoReceta.diagnostico2 || '',
                fechaemision: medicoReceta.fechaemision || ''
            },

            medicamentos: medicamentos.map(med => ({
                idreceta: med.idreceta,
                receta_origen: med.receta_origen,
                nro_orden: med.nro_orden,
                codigo: med.codigo,
                nombre_comercial: med.nombre_comercial || '',
                monodroga: med.monodroga || '',
                presentacion: med.presentacion || '',
                cantprescripta: med.cantprescripta || 0,
                posologia: med.posologia || '',
                cobertura: med.cobertura || 50,
                cobertura2: med.cobertura2 || 'CE',
                estado_auditoria: med.estado_auditoria,
                observacion: med.observacion || '',
                fecha_auditoria: med.fecha_auditoria,
                auditadopor: med.auditadopor,
                tipod: med.tipod || '',
                tipo_venta: med.tipo_venta || '',
                condicion: med.condicion || '',
                bono_nombre: med.bono_nombre || '',
                bono_autoriza: med.bono_autoriza || '',
                autorizacion_especial: med.autorizacion_especial || '',
                nro_alfabeta: med.nro_alfabeta || '',
                cod_monodroga: med.cod_monodroga || '',
                medicamento_key: `${med.idreceta}-${med.nro_orden}`
            })),

            metadata: {
                total_medicamentos: medicamentos.length,
                medicamentos_aprobados: medicamentos.filter(m => m.estado_auditoria === 1).length,
                medicamentos_rechazados: medicamentos.filter(m => m.estado_auditoria === 2).length,
                medicamentos_pendientes: medicamentos.filter(m => m.estado_auditoria === null).length,
                tabla_vademecum: tablaVademecum
            }
        };

        console.log('=== RESPUESTA FINAL ===');
        console.log('ID:', responseData.id);
        console.log('Paciente DNI:', responseData.paciente.dni);
        console.log('Médico:', responseData.medico.nombre);
        console.log('Medicamentos:', responseData.medicamentos.length);

        res.json({
            success: true,
            auditoria: responseData
        });

    } catch (error) {
        console.error('=== ERROR COMPLETO ===');
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);

        res.status(500).json({
            success: false,
            message: 'Error al obtener datos de la auditoría',
            error: error.message,
            debug: {
                id_recibido: req.params.id,
                tipo_id: typeof req.params.id,
                url: req.originalUrl
            }
        });
    }
};

export const procesarAuditoria = async (req, res) => {
    let connection = null;

    try {
        const { id } = req.params;
        const {
            chequedos = '',
            nochequeados = '',
            cobert1 = '50',
            cobert2 = '50',
            cobert3 = '50',
            cobert4 = '50',
            cobert2_1 = 'CE',
            cobert2_2 = 'CE',
            cobert2_3 = 'CE',
            cobert2_4 = 'CE',
            nota = '',
            estadoIdentidad = 0,
            enviarMedico = false
        } = req.body;

        const { id: userId, rol } = req.user;

        console.log('Procesando auditoría ID:', id);
        console.log('Body recibido:', req.body);
        console.log('Usuario:', { userId, rol });

        connection = await getConnection();
        await connection.beginTransaction();

        // 1. VERIFICAR AUDITORÍA
        const sqlVerificar = `
            SELECT id, idpaciente, auditado, bloqueadaxauditor 
            FROM rec_auditoria 
            WHERE id = ?
        `;
        const [auditoriaResult] = await connection.execute(sqlVerificar, [id]);

        if (!auditoriaResult || auditoriaResult.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Auditoría no encontrada' });
        }

        const auditoria = auditoriaResult[0];

        if (rol != 9 && auditoria.bloqueadaxauditor != null) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: 'Auditoría bloqueada por médico auditor' });
        }

        if (auditoria.auditado != null) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Esta auditoría ya fue procesada' });
        }

        // 2. ENVIAR A MÉDICO AUDITOR (ROL 10)
        if (enviarMedico && rol == 10) {
            const sqlBloquear = `UPDATE rec_auditoria SET bloqueadaxauditor = NOW() WHERE id = ?`;
            await connection.execute(sqlBloquear, [id]);
            await connection.commit();
            return res.json({ success: true, message: 'Auditoría enviada a médico auditor correctamente' });
        }

        // 🔥 CORRECCIÓN: Parsear medicamentos con underscore
        const medicamentosAprobados = (chequedos || '').split(',').filter(Boolean).map(item => {
            const [idReceta, nroOrden] = item.split('_'); // 🔥 Cambio de '-' a '_'
            return { idReceta: parseInt(idReceta), nroOrden: parseInt(nroOrden), original: item };
        });

        const medicamentosRechazados = (nochequeados || '').split(',').filter(Boolean).map(item => {
            const [idReceta, nroOrden] = item.split('_'); // 🔥 Cambio de '-' a '_'
            return { idReceta: parseInt(idReceta), nroOrden: parseInt(nroOrden), original: item };
        });

        console.log('🔄 Medicamentos aprobados procesados:', medicamentosAprobados);
        console.log('🔄 Medicamentos rechazados procesados:', medicamentosRechazados);

        let medicamentosActualizados = 0;

        // 4. PROCESAR MEDICAMENTOS APROBADOS → MARCAR PARA FARMALINK
        for (let i = 0; i < medicamentosAprobados.length; i++) {
            const med = medicamentosAprobados[i];

            // Validar datos del medicamento antes de procesar
            if (isNaN(med.idReceta) || isNaN(med.nroOrden)) {
                console.log(`❌ Datos inválidos para medicamento: ${med.original} → idReceta: ${med.idReceta}, nroOrden: ${med.nroOrden}`);
                continue;
            }

            const sqlVerificarMed = `
                SELECT idrecetamedic, idreceta, nro_orden, estado_auditoria
                FROM rec_prescrmedicamento 
                WHERE idreceta = ? AND nro_orden = ?
            `;
            const [medResult] = await connection.execute(sqlVerificarMed, [med.idReceta, med.nroOrden]);

            if (medResult.length === 0) {
                console.log(`❌ Medicamento no encontrado: idreceta=${med.idReceta}, nro_orden=${med.nroOrden}`);
                continue;
            }

            const coberturaKey = ['cobert1', 'cobert2', 'cobert3', 'cobert4'][i] || 'cobert1';
            const tipoCoberturaKey = ['cobert2_1', 'cobert2_2', 'cobert2_3', 'cobert2_4'][i] || 'cobert2_1';

            const cobertura = req.body[coberturaKey] || '50';
            const tipoCobertura = req.body[tipoCoberturaKey] || 'CE';

            // 🔥 MARCAR COMO APROBADO Y PENDIENTE PARA FARMALINK
            const sql = `
                UPDATE rec_prescrmedicamento 
                SET estado_auditoria = 1,
                    porcentajecobertura = ?,
                    cobertura2 = ?,
                    fecha_auditoria = NOW(),
                    id_auditor = ?,
                    observacion = COALESCE(?, observacion)
                    /* 🔥 COMENTADO: , pendiente_farmalink = 1 */
                WHERE idreceta = ? AND nro_orden = ?
            `;

            const params = [
                parseInt(cobertura) || 50,
                tipoCobertura,
                userId,
                nota || null,
                med.idReceta,
                med.nroOrden
            ];

            const [updateResult] = await connection.execute(sql, params);

            if (updateResult.affectedRows > 0) {
                medicamentosActualizados++;
                console.log(`✅ Medicamento aprobado: ${med.original} → ${med.idReceta}-${med.nroOrden}`);
            }
        }

        // 5. PROCESAR MEDICAMENTOS RECHAZADOS → NO VAN A FARMALINK
        for (let i = 0; i < medicamentosRechazados.length; i++) {
            const med = medicamentosRechazados[i];

            // Validar datos del medicamento antes de procesar
            if (isNaN(med.idReceta) || isNaN(med.nroOrden)) {
                console.log(`❌ Datos inválidos para medicamento rechazado: ${med.original}`);
                continue;
            }

            const sql = `
                UPDATE rec_prescrmedicamento 
                SET estado_auditoria = 2,
                    fecha_auditoria = NOW(),
                    id_auditor = ?,
                    observacion = COALESCE(?, observacion),
                    pendiente_farmalink = 0
                WHERE idreceta = ? AND nro_orden = ?
            `;

            const params = [
                userId,
                nota || 'Medicamento rechazado en auditoría',
                med.idReceta,
                med.nroOrden
            ];

            const [updateResult] = await connection.execute(sql, params);

            if (updateResult.affectedRows > 0) {
                medicamentosActualizados++;
                console.log(`✅ Medicamento rechazado: ${med.original} → ${med.idReceta}-${med.nroOrden}`);
            }
        }

        // 6. ACTUALIZAR AUDITORÍA
        let estadoAuditoria = 1; // Aprobado
        if (medicamentosRechazados.length > 0 && medicamentosAprobados.length === 0) {
            estadoAuditoria = 2; // Rechazado
        } else if (medicamentosRechazados.length > 0) {
            estadoAuditoria = 3; // Observado
        }

        // 🔥 MARCAR SI NECESITA PROCESAMIENTO FARMALINK
        const necesitaFarmalink = 0; // 🔥 CAMBIO: antes era: medicamentosAprobados.length > 0 ? 1 : 0;

        const sqlAuditoria = `
            UPDATE rec_auditoria 
            SET auditado = ?,
                auditadopor = ?,
                fecha_origen = NOW(),
                nota = ?,
                necesita_farmalink = ?, /* 🔥 Siempre será 0 */
                bloqueadaxauditor = NULL
            WHERE id = ?
        `;

        const auditoriaParams = [
            estadoAuditoria,
            userId,
            nota || null,
            necesitaFarmalink,
            id
        ];

        await connection.execute(sqlAuditoria, auditoriaParams);

        // 7. ACTUALIZAR IDENTIDAD DEL PACIENTE SI ES NECESARIO
        if (estadoIdentidad !== null && estadoIdentidad !== undefined) {
            const sqlIdentidad = `
                UPDATE rec_receta 
                SET identidadreserv = ? 
                WHERE idpaciente = ?
            `;
            await connection.execute(sqlIdentidad, [estadoIdentidad, auditoria.idpaciente]);
        }

        await connection.commit();

        const estadoTexto = {
            1: 'APROBADO',
            2: 'RECHAZADO',
            3: 'OBSERVADO'
        };

        console.log(`✅ Auditoría procesada: Estado ${estadoTexto[estadoAuditoria]}, Necesita Farmalink: ${necesitaFarmalink}`);

        // 8. 🔥 RESPUESTA CON INFORMACIÓN PARA FARMALINK
        res.json({
            success: true,
            message: `Auditoría procesada correctamente - Estado: ${estadoTexto[estadoAuditoria]} (Farmalink deshabilitado)`,
            data: {
                id: id,
                estado: estadoAuditoria,
                estadoTexto: estadoTexto[estadoAuditoria],
                medicamentosAprobados: medicamentosAprobados.length,
                medicamentosRechazados: medicamentosRechazados.length,
                medicamentosActualizados: medicamentosActualizados,
                nota: nota,
                necesita_farmalink: necesitaFarmalink,
                // 🔥 DATOS PARA EL FRONTEND
                farmalink_data: {
                    chequedos: chequedos,
                    cobert1, cobert2, cobert3, cobert4,
                    cobert2_1, cobert2_2, cobert2_3, cobert2_4,
                    idaudi: id,
                    estadoIdentidad: estadoIdentidad
                }
            }
        });

    } catch (error) {
        console.error('❌ Error procesando auditoría:', error);
        if (connection) {
            await connection.rollback();
        }
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// ENVIAR A MÉDICO AUDITOR
export const enviarMedicoAuditor = async (req, res) => {
    let connection = null;

    try {
        const { id } = req.params;
        const { id: userId, rol } = req.user;

        if (rol != 10) {
            return res.status(403).json({ success: false, message: 'Solo los auditores pueden enviar al médico auditor' });
        }

        connection = await getConnection();
        await connection.execute(
            `UPDATE rec_auditoria SET bloqueadaxauditor = NOW() WHERE id = ?`,
            [id]
        );

        res.json({ success: true, message: 'Auditoría enviada a médico auditor correctamente' });

    } catch (error) {
        console.error('Error enviando auditoría:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// REVERTIR AUDITORÍA - Revierte el estado de las recetas auditadas
export const revertirAuditoria = async (req, res) => {
    let connection = null;

    try {
        const { id } = req.params;
        const { nota } = req.body;

        console.log('Revirtiendo auditoría ID:', id);
        console.log('Nota:', nota);

        // Buscar la auditoría
        const auditoria = await executeQuery(
            'SELECT * FROM rec_auditoria WHERE id = ?',
            [id]
        );

        if (!auditoria || auditoria.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se pudo encontrar la auditoría'
            });
        }

        const auditoriaData = auditoria[0];
        console.log('Auditoría encontrada:', auditoriaData);

        // Extraer los números de recetas (idreceta1 a idreceta6)
        const recetasIds = [];
        for (let i = 1; i <= 6; i++) {
            const idReceta = auditoriaData[`idreceta${i}`];
            if (idReceta && idReceta !== null && idReceta !== '') {
                recetasIds.push(idReceta);
            }
        }

        console.log('Recetas encontradas:', recetasIds);

        // Verificar que hay recetas para procesar
        if (recetasIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No hay recetas asociadas para revertir'
            });
        }

        // Obtener conexión y iniciar transacción
        connection = await getConnection();
        await connection.beginTransaction();

        try {
            // 1. Actualizar rec_prescrmedicamento: revertir estado_auditoria a 0 y porcentajecobertura a NULL
            const placeholders = recetasIds.map(() => '?').join(',');
            const [updateRecetas] = await connection.execute(
                `UPDATE rec_prescrmedicamento 
                 SET estado_auditoria = 0, porcentajecobertura = NULL 
                 WHERE idreceta IN (${placeholders})`,
                recetasIds
            );

            console.log('Recetas actualizadas:', updateRecetas.affectedRows);

            if (updateRecetas.affectedRows === 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'No se pudo revertir las recetas (Pro1)'
                });
            }

            // 2. Actualizar rec_auditoria: establecer auditado a NULL
            const [updateAuditoria] = await connection.execute(
                'UPDATE rec_auditoria SET auditado = NULL WHERE id = ?',
                [id]
            );

            console.log('Auditoría actualizada:', updateAuditoria.affectedRows);

            if (updateAuditoria.affectedRows === 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'No se pudo revertir la auditoría (Pro2)'
                });
            }

            // Confirmar transacción
            await connection.commit();

            // Respuesta exitosa
            res.json({
                success: true,
                idauditoria: id,
                mensaje: 'Revertido con éxito',
                action: 'revert'
            });

        } catch (transactionError) {
            // Rollback en caso de error
            await connection.rollback();
            console.error('Error en transacción de reversión:', transactionError);

            res.status(500).json({
                success: false,
                message: 'Error al procesar la reversión'
            });
        }

    } catch (error) {
        console.error('Error en revertir auditoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// BORRAR AUDITORÍA - Marca la auditoría como borrada (soft delete) CON VERIFICACIÓN
export const borrarAuditoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nota } = req.body;
        const { rol } = req.user;

        console.log('Borrando auditoría ID:', id);
        console.log('Nota:', nota);
        console.log('Rol usuario:', rol);

        // Verificar permisos
        if (rol && rol === 9) {
            return res.status(403).json({
                success: false,
                message: 'No tiene permisos para realizar esta acción'
            });
        }

        // Verificar que se proporcione una nota
        if (!nota || nota.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'La nota es requerida para el borrado'
            });
        }

        // 1. PRIMERO: Verificar si la auditoría existe y su estado actual
        const auditoriaActual = await executeQuery(
            'SELECT id, estado, nota FROM rec_auditoria WHERE id = ?',
            [id]
        );

        if (!auditoriaActual || auditoriaActual.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró la auditoría con ese ID'
            });
        }

        const auditoria = auditoriaActual[0];
        console.log('Estado actual de la auditoría:', auditoria);

        // 2. Verificar si ya está borrada
        if (auditoria.estado === 1) {
            return res.status(400).json({
                success: false,
                message: 'Esta auditoría ya está marcada como borrada',
                data: {
                    estado_actual: auditoria.estado,
                    nota_actual: auditoria.nota
                }
            });
        }

        // 3. Proceder con el borrado (cambiar estado a 1)
        const updateResult = await executeQuery(
            'UPDATE rec_auditoria SET estado = ?, nota = ? WHERE id = ?',
            [1, nota.trim(), id]
        );

        console.log('Resultado actualización:', updateResult);

        // 4. Verificar que realmente se cambió algo
        if (updateResult.changedRows === 0) {
            // Si no hubo cambios, podría ser que ya tenía esos valores
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar la auditoría. Posiblemente ya tiene esos valores.',
                debug: {
                    affectedRows: updateResult.affectedRows,
                    changedRows: updateResult.changedRows,
                    estado_previo: auditoria.estado
                }
            });
        }

        // 5. VERIFICAR el cambio consultando nuevamente
        const auditoriaActualizada = await executeQuery(
            'SELECT id, estado, nota FROM rec_auditoria WHERE id = ?',
            [id]
        );

        console.log('Estado después del update:', auditoriaActualizada[0]);

        // Respuesta exitosa con confirmación
        res.json({
            success: true,
            idauditoria: id,
            mensaje: 'Borrado con éxito',
            action: 'delete',
            data: {
                estado_anterior: auditoria.estado,
                estado_nuevo: auditoriaActualizada[0].estado,
                nota_anterior: auditoria.nota,
                nota_nueva: auditoriaActualizada[0].nota,
                cambios_realizados: updateResult.changedRows
            }
        });

    } catch (error) {
        console.error('Error en borrar auditoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// FUNCIÓN AUXILIAR - Para obtener información de la auditoría antes de revertir/borrar
export const obtenerDetalleAuditoria = async (req, res) => {
    try {
        const { id } = req.params;

        const auditoria = await executeQuery(
            `SELECT a.*, 
                    COUNT(CASE WHEN p.estado_auditoria = 1 THEN 1 END) as recetas_auditadas,
                    COUNT(p.idreceta) as total_recetas
             FROM rec_auditoria a
             LEFT JOIN rec_prescrmedicamento p ON (
                 p.idreceta = a.idreceta1 OR 
                 p.idreceta = a.idreceta2 OR 
                 p.idreceta = a.idreceta3 OR 
                 p.idreceta = a.idreceta4 OR 
                 p.idreceta = a.idreceta5 OR 
                 p.idreceta = a.idreceta6
             )
             WHERE a.id = ?
             GROUP BY a.id`,
            [id]
        );

        if (!auditoria || auditoria.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Auditoría no encontrada'
            });
        }

        res.json({
            success: true,
            auditoria: auditoria[0]
        });

    } catch (error) {
        console.error('Error al obtener detalle de auditoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Agregar en auditoriasController.js

// NUEVA FUNCIÓN: Generar Excel con datos específicos
export const generarExcelConDatos = async (req, res) => {
    try {
        const { datos, filtros, timestamp } = req.body;

        console.log('Generando Excel con datos:', {
            cantidad_registros: datos?.length || 0,
            filtros: filtros
        });

        // Validar que hay datos para exportar
        if (!datos || datos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No hay datos para exportar'
            });
        }

        // Crear libro de Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Auditorías');

        // Configurar propiedades del libro
        workbook.creator = 'Sistema de Auditorías';
        workbook.created = new Date();
        workbook.modified = new Date();

        // Agregar información de filtros aplicados
        worksheet.addRow(['REPORTE DE AUDITORÍAS']);
        worksheet.addRow(['']);
        worksheet.addRow(['Filtros aplicados:']);
        if (filtros.dni) worksheet.addRow(['DNI:', filtros.dni]);
        if (filtros.fechaDesde) worksheet.addRow(['Fecha desde:', filtros.fechaDesde]);
        if (filtros.fechaHasta) worksheet.addRow(['Fecha hasta:', filtros.fechaHasta]);
        worksheet.addRow(['Fecha de generación:', new Date().toLocaleString('es-ES')]);
        worksheet.addRow(['Total de registros:', datos.length]);
        worksheet.addRow(['']);

        // Definir encabezados de las columnas
        const headers = [
            'ID',
            'Apellido',
            'Nombre',
            'DNI',
            'Fecha',
            'Médico',
            'Renglones',
            'Meses',
            'Estado',
            'Auditor',
            'Fecha Auditoría'
        ];

        // Agregar encabezados
        const headerRow = worksheet.addRow(headers);

        // Estilizar encabezados
        headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '366092' }
        };

        // Agregar bordes a los encabezados
        headerRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Agregar datos
        datos.forEach((auditoria, index) => {
            const estadoTexto = auditoria.auditado === 1 ? 'APROBADO' :
                auditoria.auditado === 2 ? 'RECHAZADO' :
                    auditoria.auditado === 3 ? 'OBSERVADO' :
                        auditoria.auditado === null ? 'PENDIENTE' : 'DESCONOCIDO';

            const row = worksheet.addRow([
                auditoria.id || '',
                auditoria.apellido || '',
                auditoria.nombre || '',
                auditoria.dni || '',
                auditoria.fecha || '',
                auditoria.medico || '',
                auditoria.renglones || 0,
                auditoria.meses || 0,
                estadoTexto,
                auditoria.auditadoX || 'Sin asignar',
                auditoria.fecha_auditoria || 'N/A'
            ]);

            // Alternar colores de filas para mejor legibilidad
            if (index % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'F8F9FA' }
                };
            }

            // Agregar bordes a cada celda
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // Colorear según estado
            const estadoCell = row.getCell(9); // Columna Estado
            switch (auditoria.auditado) {
                case 1: // Aprobado
                    estadoCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'D4EDDA' }
                    };
                    estadoCell.font = { color: { argb: '155724' } };
                    break;
                case 2: // Rechazado
                    estadoCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'F8D7DA' }
                    };
                    estadoCell.font = { color: { argb: '721C24' } };
                    break;
                case 3: // Observado
                    estadoCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF3CD' }
                    };
                    estadoCell.font = { color: { argb: '856404' } };
                    break;
                default: // Pendiente
                    estadoCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'D1ECF1' }
                    };
                    estadoCell.font = { color: { argb: '0C5460' } };
                    break;
            }
        });

        // Ajustar ancho de columnas automáticamente
        worksheet.columns = [
            { width: 8 },   // ID
            { width: 20 },  // Apellido
            { width: 20 },  // Nombre
            { width: 12 },  // DNI
            { width: 12 },  // Fecha
            { width: 35 },  // Médico
            { width: 10 },  // Renglones
            { width: 8 },   // Meses
            { width: 12 },  // Estado
            { width: 25 },  // Auditor
            { width: 15 }   // Fecha Auditoría
        ];

        // Configurar headers de respuesta para descarga
        const nombreArchivo = `auditorias_${new Date().toISOString().slice(0, 10)}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

        // Generar y enviar el archivo Excel
        await workbook.xlsx.write(res);

        console.log(`Excel generado exitosamente: ${nombreArchivo} con ${datos.length} registros`);

    } catch (error) {
        console.error('Error generando Excel con datos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno al generar el archivo Excel',
            error: error.message
        });
    }
};


// OBTENER AUDITORÍA PARA HISTORIAL (SOLO LECTURA) - Nueva función específica
// OBTENER AUDITORÍA PARA HISTORIAL (SOLO LECTURA) - CORREGIDO CON DATOS DE 6 MESES
export const getAuditoriaHistorial = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('=== OBTENIENDO AUDITORÍA DESDE HISTORIAL PACIENTE ===');
        console.log('ID auditoría:', id);

        // Verificar que el ID sea válido
        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: `ID inválido: ${id}. Debe ser un número.`
            });
        }

        // 1. OBTENER DATOS BÁSICOS DE LA AUDITORÍA
        const sqlAuditoria = `
            SELECT 
                a.id,
                a.idpaciente,
                a.idprescriptor,
                DATE_FORMAT(a.fecha_origen, '%d/%m/%Y') as fecha_origen,
                a.renglones,
                a.cantmeses,
                a.auditado,
                a.auditadopor,
                a.nota,
                a.idreceta1,
                a.idreceta2,
                a.idreceta3,
                a.idobrasoc,
                CASE 
                    WHEN a.auditado = 1 THEN 'APROBADO'
                    WHEN a.auditado = 2 THEN 'RECHAZADO'
                    WHEN a.auditado = 3 THEN 'OBSERVADO'
                    ELSE 'PENDIENTE'
                END as estado_texto
            FROM rec_auditoria a
            WHERE a.id = ?
        `;

        const auditoriaResult = await executeQuery(sqlAuditoria, [id]);

        if (!auditoriaResult || auditoriaResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Auditoría no encontrada'
            });
        }

        const auditoria = auditoriaResult[0];

        // 2. OBTENER DATOS DEL PACIENTE
        const sqlPaciente = `
            SELECT 
                p.id,
                CONCAT(UPPER(SUBSTRING(p.apellido, 1, 1)), LOWER(SUBSTRING(p.apellido, 2))) as apellido,
                CONCAT(UPPER(SUBSTRING(p.nombre, 1, 1)), LOWER(SUBSTRING(p.nombre, 2))) as nombre,
                p.dni,
                p.sexo,
                DATE_FORMAT(p.fecnac, '%d/%m/%Y') as fecha_nacimiento,
                TIMESTAMPDIFF(YEAR, p.fecnac, CURDATE()) as edad,
                p.telefono,
                p.email,
                p.talla,
                p.peso,
                p.fecnac
            FROM rec_paciente p
            WHERE p.id = ?
        `;

        const pacienteResult = await executeQuery(sqlPaciente, [auditoria.idpaciente]);
        const paciente = pacienteResult[0] || {};

        // 3. OBTENER DATOS DEL MÉDICO PRESCRIPTOR
        const sqlMedico = `
            SELECT 
                t.matricula,
                CONCAT(
                    CONCAT(UPPER(SUBSTRING(t.nombre, 1, 1)), LOWER(SUBSTRING(t.nombre, 2))), ' ',
                    CONCAT(UPPER(SUBSTRING(t.apellido, 1, 1)), LOWER(SUBSTRING(t.apellido, 2)))
                ) as nombre_completo,
                e.especialidad
            FROM tmp_person t
            LEFT JOIN tmp_especialistas e ON t.matricula = e.matricula
            WHERE t.matricula = ?
        `;

        const medicoResult = await executeQuery(sqlMedico, [auditoria.idprescriptor]);
        const medico = medicoResult[0] || {};

        // 4. OBTENER OBRA SOCIAL Y DATOS DE RECETA
        const sqlObraSocial = `
            SELECT 
                DATE_FORMAT(r.fechaemision, '%d/%m/%Y') as fechaemision,
                r.diagnostico,
                r.diagnostico2,
                o.sigla as obra_social,
                p.nromatriculadoc as nro_afiliado
            FROM rec_receta r
            INNER JOIN rec_obrasoc o ON r.idobrasocafiliado = o.id
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            WHERE r.idreceta = ?
        `;

        const obraSocialResult = await executeQuery(sqlObraSocial, [auditoria.idreceta1]);
        const obraSocialData = obraSocialResult[0] || {};

        // 5. OBTENER INFORMACIÓN DEL AUDITOR
        const sqlAuditor = `
            SELECT 
                CONCAT(
                    CONCAT(UPPER(SUBSTRING(au.nombre, 1, 1)), LOWER(SUBSTRING(au.nombre, 2))), ' ',
                    CONCAT(UPPER(SUBSTRING(au.apellido, 1, 1)), LOWER(SUBSTRING(au.apellido, 2)))
                ) as auditor_nombre,
                DATE_FORMAT(NOW(), '%d/%m/%Y %H:%i') as fecha_auditoria
            FROM user_au au
            WHERE au.id = ?
        `;

        const auditorResult = await executeQuery(sqlAuditor, [auditoria.auditadopor]);
        const auditorData = auditorResult[0] || {};

        // 6. DETERMINAR TABLA DE VADEMÉCUM
        let tablaVademecum = 'vademecum';
        switch (parseInt(auditoria.idobrasoc)) {
            case 156:
                tablaVademecum = 'vad_muni';
                break;
            case 20:
                tablaVademecum = 'vad_020';
                break;
            default:
                tablaVademecum = 'vademecum';
        }

        // 7. 🔥 OBTENER MEDICAMENTOS CON ESTADOS DE LOS 6 MESES (CORREGIDO)
        let medicamentos = [];

        // Solo hay 3 recetas, pero cada una puede cubrir hasta 6 meses
        const recetas = [auditoria.idreceta1, auditoria.idreceta2, auditoria.idreceta3].filter(r => r);

        for (let idReceta of recetas) {
            // 🔥 CONSULTA CORREGIDA - Solo usar las 3 recetas que existen
            const sqlMedicamentos = `
                SELECT DISTINCT
                    pm1.idreceta,
                    pm1.nro_orden,
                    pm1.cantprescripta,
                    pm1.posologia,
                    pm1.porcentajecobertura as cobertura,
                    pm1.cobertura2,
                    pm1.codigo,
                    pm1.bono_nombre,
                    pm1.bono_autoriza,
                    pm1.autorizacion_especial,
                    pm1.observacion,
                    DATE_FORMAT(pm1.fecha_auditoria, '%d/%m/%Y %H:%i') as fecha_auditoria,
                    vm.monodroga,
                    vm.nombre_comercial,
                    vm.presentacion,
                    vm.tipod,
                    vm.tipo_venta,
                    vm.condicion,
                    vm.nro_alfabeta,
                    vm.cod_monodroga,
                    
                    -- 🔥 ESTADOS DE LOS 6 MESES - USANDO SOLO LAS 3 RECETAS DISPONIBLES
                    pm1.estado_auditoria as estado_auditoria1,
                    pm2.estado_auditoria as estado_auditoria2,
                    pm3.estado_auditoria as estado_auditoria3,
                    
                    -- 🔥 PARA MESES 4-6, USAR LÓGICA BASADA EN CANTMESES
                    CASE 
                        WHEN ${auditoria.cantmeses} >= 4 THEN pm1.estado_auditoria
                        ELSE NULL
                    END as estado_auditoria4,
                    CASE 
                        WHEN ${auditoria.cantmeses} >= 5 THEN pm1.estado_auditoria
                        ELSE NULL
                    END as estado_auditoria5,
                    CASE 
                        WHEN ${auditoria.cantmeses} >= 6 THEN pm1.estado_auditoria
                        ELSE NULL
                    END as estado_auditoria6,
                    
                    -- 🔥 PORCENTAJES DE COBERTURA
                    pm1.porcentajecobertura as porc1,
                    pm2.porcentajecobertura as porc2,
                    pm3.porcentajecobertura as porc3,
                    pm1.porcentajecobertura as porc4,
                    pm1.porcentajecobertura as porc5,
                    pm1.porcentajecobertura as porc6,
                    
                    -- Estado principal del medicamento
                    CASE 
                        WHEN pm1.estado_auditoria = 1 THEN 'APROBADO'
                        WHEN pm1.estado_auditoria = 2 THEN 'RECHAZADO'
                        WHEN pm1.estado_auditoria = 3 THEN 'OBSERVADO'
                        WHEN pm1.estado_auditoria = 4 THEN 'PEND. MEDICO'
                        ELSE 'PENDIENTE'
                    END as estado_texto
                FROM rec_prescrmedicamento pm1
                INNER JOIN ${tablaVademecum} vm ON pm1.codigo = vm.codigo
                
                -- 🔥 LEFT JOINS SOLO PARA LAS RECETAS QUE EXISTEN
                LEFT JOIN rec_prescrmedicamento pm2 ON ${auditoria.idreceta2 ? `${auditoria.idreceta2} = pm2.idreceta AND pm1.nro_orden = pm2.nro_orden` : 'FALSE'}
                LEFT JOIN rec_prescrmedicamento pm3 ON ${auditoria.idreceta3 ? `${auditoria.idreceta3} = pm3.idreceta AND pm1.nro_orden = pm3.nro_orden` : 'FALSE'}
                
                WHERE pm1.idreceta = ?
                ORDER BY pm1.nro_orden
            `;

            try {
                const medsResult = await executeQuery(sqlMedicamentos, [idReceta]);
                const medicamentosConReceta = medsResult.map(med => ({
                    ...med,
                    receta_origen: idReceta,
                    medicamento_key: `${med.idreceta}-${med.nro_orden}`,

                    // 🔥 AGREGAR ESTADOS DE MESES INDIVIDUALES
                    estado_mes_1: med.estado_auditoria1,
                    estado_mes_2: med.estado_auditoria2,
                    estado_mes_3: med.estado_auditoria3,
                    estado_mes_4: med.estado_auditoria4,
                    estado_mes_5: med.estado_auditoria5,
                    estado_mes_6: med.estado_auditoria6,

                    // Estado principal del medicamento (primer mes)
                    estado_auditoria: med.estado_auditoria1
                }));

                medicamentos = medicamentos.concat(medicamentosConReceta);
            } catch (error) {
                console.error(`Error en medicamentos para receta ${idReceta}:`, error.message);

                // 🔥 FALLBACK MEJORADO - Usar consulta simple con lógica de meses
                const sqlSimple = `
                    SELECT 
                        pm.idreceta,
                        pm.nro_orden,
                        pm.cantprescripta,
                        pm.posologia,
                        pm.porcentajecobertura as cobertura,
                        pm.cobertura2,
                        pm.estado_auditoria,
                        pm.observacion,
                        DATE_FORMAT(pm.fecha_auditoria, '%d/%m/%Y %H:%i') as fecha_auditoria,
                        pm.codigo,
                        pm.bono_nombre,
                        pm.bono_autoriza,
                        pm.autorizacion_especial,
                        vm.monodroga,
                        vm.nombre_comercial,
                        vm.presentacion,
                        CASE 
                            WHEN pm.estado_auditoria = 1 THEN 'APROBADO'
                            WHEN pm.estado_auditoria = 2 THEN 'RECHAZADO'
                            WHEN pm.estado_auditoria = 3 THEN 'OBSERVADO'
                            WHEN pm.estado_auditoria = 4 THEN 'PEND. MEDICO'
                            ELSE 'PENDIENTE'
                        END as estado_texto
                    FROM rec_prescrmedicamento pm
                    INNER JOIN ${tablaVademecum} vm ON pm.codigo = vm.codigo
                    WHERE pm.idreceta = ?
                    ORDER BY pm.nro_orden
                `;

                const medsSimpleResult = await executeQuery(sqlSimple, [idReceta]);
                const medicamentosSimples = medsSimpleResult.map(med => ({
                    ...med,
                    receta_origen: idReceta,
                    medicamento_key: `${med.idreceta}-${med.nro_orden}`,

                    // 🔥 DISTRIBUIR ESTADO SEGÚN cantmeses DE LA AUDITORÍA
                    estado_mes_1: med.estado_auditoria,
                    estado_mes_2: auditoria.cantmeses >= 2 ? med.estado_auditoria : null,
                    estado_mes_3: auditoria.cantmeses >= 3 ? med.estado_auditoria : null,
                    estado_mes_4: auditoria.cantmeses >= 4 ? med.estado_auditoria : null,
                    estado_mes_5: auditoria.cantmeses >= 5 ? med.estado_auditoria : null,
                    estado_mes_6: auditoria.cantmeses >= 6 ? med.estado_auditoria : null
                }));

                medicamentos = medicamentos.concat(medicamentosSimples);
            }
        }

        // 8. ESTRUCTURAR RESPUESTA ESPECÍFICA PARA HISTORIAL (SOLO LECTURA)
        const responseData = {
            id: auditoria.id,
            fecha_origen: auditoria.fecha_origen,
            renglones: auditoria.renglones,
            cantmeses: auditoria.cantmeses,
            auditado: auditoria.auditado,
            estado_texto: auditoria.estado_texto,
            nota: auditoria.nota || '',

            // Indicador de que es solo lectura desde historial
            readonly: true,
            fromHistorial: true,

            paciente: {
                id: paciente.id || '',
                apellido: paciente.apellido || '',
                nombre: paciente.nombre || '',
                dni: paciente.dni || '',
                sexo: paciente.sexo || '',
                edad: paciente.edad || 0,
                telefono: paciente.telefono || '',
                email: paciente.email || '',
                talla: paciente.talla || 0,
                peso: paciente.peso || 0,
                fecnac: paciente.fecnac || '',
                fecha_nacimiento: paciente.fecha_nacimiento || ''
            },

            medico: {
                matricula: medico.matricula || '',
                nombre: medico.nombre_completo || '',
                especialidad: medico.especialidad || ''
            },

            obraSocial: {
                sigla: obraSocialData.obra_social || '',
                nroAfiliado: obraSocialData.nro_afiliado || ''
            },

            diagnostico: {
                diagnostico: obraSocialData.diagnostico || '',
                diagnostico2: obraSocialData.diagnostico2 || '',
                fechaemision: obraSocialData.fechaemision || ''
            },

            auditor: {
                nombre: auditorData.auditor_nombre || 'No especificado',
                fecha_auditoria: auditorData.fecha_auditoria || auditoria.fecha_origen
            },

            medicamentos: medicamentos,

            metadata: {
                total_medicamentos: medicamentos.length,
                medicamentos_aprobados: medicamentos.filter(m => m.estado_auditoria === 1).length,
                medicamentos_rechazados: medicamentos.filter(m => m.estado_auditoria === 2).length,
                medicamentos_observados: medicamentos.filter(m => m.estado_auditoria === 3).length,
                medicamentos_pendientes: medicamentos.filter(m => m.estado_auditoria === null).length,
                tabla_vademecum: tablaVademecum,
                vista_historial: true
            }
        };

        console.log('=== RESPUESTA AUDITORÍA HISTORIAL ===');
        console.log('ID:', responseData.id);
        console.log('Paciente DNI:', responseData.paciente.dni);
        console.log('Estado:', responseData.estado_texto);
        console.log('Medicamentos:', responseData.medicamentos.length);
        console.log('Solo lectura:', responseData.readonly);

        res.json({
            success: true,
            auditoria: responseData
        });

    } catch (error) {
        console.error('=== ERROR EN AUDITORÍA HISTORIAL ===');
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);

        res.status(500).json({
            success: false,
            message: 'Error al obtener datos de la auditoría desde historial',
            error: error.message
        });
    }
};

// listado autorias  historicos y pendientes
export const getHistoricosPendientes = async (req, res) => {
    try {
        const { dni, fechaDesde, fechaHasta } = req.body;

        console.log('Parámetros recibidos:', { dni, fechaDesde, fechaHasta });

        // Construir consulta SQL base (idéntica a la original)
        let consultaSQL = `SELECT DISTINCT 
            a.id, 
            b.apellido, 
            b.nombre, 
            b.dni, 
            DATE_FORMAT(a.fecha_origen, '%d-%m-%Y') AS fecha, 
            CONCAT(c.nombre, ' ', c.apellido, ' MP-', c.matricula) AS medico, 
            a.renglones, 
            a.cantmeses as meses, 
            a.auditado, 
            CONCAT(f.nombre, ' ', f.apellido) AS auditadoX, 
            DATE_FORMAT(e.fecha_auditoria, '%d-%m-%Y') AS fecha_auditoria
        FROM rec_auditoria a 
        INNER JOIN rec_paciente b ON a.idpaciente = b.id 
        INNER JOIN tmp_person c ON a.idprescriptor = c.matricula 
        INNER JOIN rec_receta d ON a.idreceta1 = d.idreceta 
        INNER JOIN rec_prescrmedicamento e ON a.idreceta1 = e.idreceta 
        LEFT JOIN user_au f ON a.auditadopor = f.id 
        WHERE a.renglones > 0 AND idobrasoc = 20 AND (a.estado IS NULL OR a.estado != 1)`;

        // Array para los parámetros
        const params = [];

        // Agregar filtro por DNI si existe
        if (dni && dni.trim() !== '') {
            consultaSQL += " AND b.dni = ?";
            params.push(dni.trim());
        }

        // Agregar filtro por rango de fechas si ambas existen
        if (fechaDesde && fechaHasta && fechaDesde.trim() !== '' && fechaHasta.trim() !== '') {
            consultaSQL += " AND a.fecha_origen BETWEEN ? AND ?";
            params.push(fechaDesde.trim(), fechaHasta.trim());
        }

        // Ordenamiento (igual que el original)
        consultaSQL += " ORDER BY fecha DESC";

        console.log('SQL generado:', consultaSQL);
        console.log('Parámetros:', params);

        // Ejecutar la consulta usando tu función de base de datos
        const lista = await executeQuery(consultaSQL, params);

        console.log(`Registros encontrados: ${lista.length}`);

        // Respuesta en formato JSON compatible con DataTables
        res.json({
            success: true,
            data: lista,
            total: lista.length,
            recordsTotal: lista.length,
            recordsFiltered: lista.length
        });

    } catch (error) {
        console.error('Error en getHistoricosPendientes:', error);
        res.status(500).json({
            success: false,
            error: true,
            message: 'Error interno del servidor',
            details: error.message,
            data: []
        });
    }
};

// EXPORTAR HISTORIAL A EXCEL
export const exportarHistorialPaciente = async (req, res) => {
    try {
        const { dni, fechaDesde, fechaHasta } = req.body;

        if (!dni) {
            return res.status(400).json({
                success: false,
                message: 'DNI es requerido'
            });
        }

        // Consulta para obtener todos los datos sin paginación
        let query = `
            SELECT 
                a.id as idauditoria,
                DATE_FORMAT(a.fecha_origen, '%d/%m/%Y') as fecha_auditoria,
                CONCAT(
                    CONCAT(UPPER(SUBSTRING(au.nombre, 1, 1)), LOWER(SUBSTRING(au.nombre, 2))), ' ',
                    CONCAT(UPPER(SUBSTRING(au.apellido, 1, 1)), LOWER(SUBSTRING(au.apellido, 2)))
                ) as auditor,
                a.auditado as estado_auditoria,
                CONCAT(
                    CONCAT(UPPER(SUBSTRING(c.nombre, 1, 1)), LOWER(SUBSTRING(c.nombre, 2))), ' ',
                    CONCAT(UPPER(SUBSTRING(c.apellido, 1, 1)), LOWER(SUBSTRING(c.apellido, 2))), ' MP-', c.matricula
                ) as medico,
                'Medicamento' as nombre_comercial,
                'Monodroga' as monodroga,
                'Presentación' as presentacion,
                pm.cantprescripta,
                '-' as posologia,
                '-' as cobertura,
                pm.estado_auditoria as estado_medicamento
            FROM rec_auditoria a
            INNER JOIN rec_paciente p ON a.idpaciente = p.id
            INNER JOIN rec_prescrmedicamento pm ON (a.idreceta1 = pm.idreceta OR a.idreceta2 = pm.idreceta OR a.idreceta3 = pm.idreceta)
            INNER JOIN tmp_person c ON a.idprescriptor = c.matricula
            LEFT JOIN user_au au ON a.auditadopor = au.id
            WHERE p.dni = ?
            AND a.auditado IS NOT NULL
        `;

        const params = [dni];

        if (fechaDesde) {
            query += ' AND DATE(a.fecha_origen) >= ?';
            params.push(fechaDesde);
        }

        if (fechaHasta) {
            query += ' AND DATE(a.fecha_origen) <= ?';
            params.push(fechaHasta);
        }

        query += ' ORDER BY a.fecha_origen DESC, pm.idrecetamedic DESC';

        const medicamentos = await executeQuery(query, params);

        // Obtener datos del paciente
        const [pacienteData] = await executeQuery(
            'SELECT * FROM rec_paciente WHERE dni = ? LIMIT 1',
            [dni]
        );

        // Crear Excel con los datos
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Historial Paciente');

        // Información del paciente
        const paciente = pacienteData;
        worksheet.addRow(['HISTORIAL DE PACIENTE']);
        worksheet.addRow(['']);
        worksheet.addRow(['DNI:', paciente?.dni || dni]);
        worksheet.addRow(['Paciente:', paciente ? `${paciente.apellido} ${paciente.nombre}` : 'N/A']);
        worksheet.addRow(['Edad:', paciente ? `${calculateAge(paciente.fecnac)} años` : 'N/A']);
        worksheet.addRow(['']);

        // Encabezados de la tabla
        const headers = [
            'Fecha',
            'Auditor',
            'Médico',
            'Medicamento',
            'Monodroga',
            'Presentación',
            'Cantidad',
            'Posología',
            'Cobertura',
            'Estado'
        ];

        worksheet.addRow(headers);

        // Agregar datos
        medicamentos.forEach(med => {
            worksheet.addRow([
                med.fecha_auditoria,
                med.auditor,
                med.medico,
                med.nombre_comercial,
                med.monodroga,
                med.presentacion,
                med.cantprescripta,
                med.posologia,
                med.cobertura,
                med.estado_medicamento
            ]);
        });

        // Estilizar encabezados
        worksheet.getRow(7).font = { bold: true };
        worksheet.getRow(7).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Ajustar anchos de columna
        worksheet.columns = [
            { width: 12 }, { width: 20 }, { width: 30 },
            { width: 30 }, { width: 25 }, { width: 30 },
            { width: 10 }, { width: 15 }, { width: 10 },
            { width: 15 }
        ];

        // Generar archivo
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=historial_paciente_${dni}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exportando historial:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar el archivo Excel'
        });
    }
};

// Compatibilidad con POST
export const getHistorialPacientePOST = async (req, res) => {
    // Convertir body a query params y llamar a getHistorialPaciente
    req.query = { ...req.query, ...req.body };
    return getHistorialPaciente(req, res);
};

export async function guardarArchivo(ruta, buffer) {
    // Crear directorio si no existe
    const dir = path.dirname(ruta);
    await fs.mkdir(dir, { recursive: true });

    // Guardar archivo
    await fs.writeFile(ruta, buffer);
}

export function generarHTMLReceta(datos) {
    return `
        <table width="100%">
            <thead>
                <tr>
                    <th colspan="2" width="50%" align="left"><font size="2">Receta Electrónica</font></th>
                    <th colspan="4" width="50%" align="right"><font size="1.5">ORIGINAL</font></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td colspan="6" width="100%"><hr style="border: 1px solid #000;" /></td>
                </tr>
                <tr>
                    <td colspan="2" width="25%" style="background-color: #f5f5f5; padding: 10px;">
                        <img src="https://test1.recetasalud.ar/assets/images/logocmpc-blanci.png" width="120px" style="filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));">
                    </td>
                    <td colspan="2" width="50%"><h2 style="font-size: 16px; margin: 5px 0;">Nro: ${datos.numeroDisplay}</h2>${datos.autorizacionEspecialInfo}</td>
                    <td colspan="2" width="25%" align="right"><h2 style="font-size: 14px; margin: 5px 0;">Fecha: ${datos.fecha}</h2></td>
                </tr>
                <tr>
                    <td colspan="6" width="100%"><hr style="border: 1px solid #CCC;" /></td>
                </tr> 
                <tr>
                    <td colspan="3" width="40%"><font size="1.2em">Paciente</font></td>
                    <td colspan="3" width="60%"><font size="1.2em">Obra Social</font></td>
                </tr>  
                <tr>
                    <td colspan="3" width="40%"><font size="1em">${datos.identidadPaciente}</font></td>
                    <td colspan="3" width="60%"><font size="1em">${datos.obraSocial} - Nro: ${datos.nroMatricula}</font></td>
                </tr>
                <tr>
                    <td colspan="6" width="100%"><hr style="border: 1px solid #CCC;" /></td>
                </tr> 
                <tr>
                    <td colspan="6" width="100%"><font size="1.2em">Prescripción</font></td>
                </tr>
            </tbody>
        </table>
        <table width="100%" border="1" cellspacing="0" bordercolor="#cccccc" cellpadding="4" style="font-size: 11px;">
            <tr style="background-color: #f0f0f0;">
                <td width="5%" align="center"><b>Cant</b></td>
                <td width="23%"><b>Monodroga</b></td>
                <td width="23%"><b>Sugerida</b></td>
                <td width="20%"><b>Presentación</b></td>
                <td width="15%"><b>Dosis x día</b></td>
                <td width="7%" align="center"><b>Cobertura</b></td>
                <td width="7%" align="center"><b>Cobertura 2</b></td>
            </tr>
            <tr>
                <td width="5%" align="center">${datos.medicamento.cantprescripta}</td>
                <td width="23%">${datos.medicamento.monodroga.toUpperCase()}</td>
                <td width="23%">${datos.medicamento.nombre_comercial}</td>
                <td width="20%">${datos.medicamento.presentacion}</td>
                <td width="15%">${datos.medicamento.posologia}</td>
                <td width="7%" align="center">${datos.medicamento.cobertura}%</td>
                <td width="7%" align="center">${datos.medicamento.cobertura2}</td>
            </tr>
        </table>
        <table width="100%" cellpadding="4" style="font-size: 11px;">
            <tr>
                <td colspan="6" width="100%"><font size="1.2em"><b>Diagnóstico</b></font></td>
            </tr>
            <tr>
                <td colspan="2" width="70%" valign="top" style="border: 1px solid #ccc; padding: 8px; min-height: 80px;">${datos.diagnostico}</td>
                <td colspan="2" width="15%" align="center" valign="middle">
                    <img src="${datos.qrCode}" width="90px" style="margin: 5px;"/>
                </td>
                <td colspan="2" width="15%" align="center" valign="middle" style="font-size: 10px;">
                    ${datos.firma}<br>
                    <b>Médico:</b> ${datos.medico}<br>
                    <b>MP.</b> ${datos.matricula}<br>
                    ${datos.especialidad}
                </td>
            </tr>
        </table>
        <table width="100%">
            <tr>
                <td colspan="6" width="100%"><hr style="border: 1px solid #CCC;" /></td>
            </tr>
            <tr>
                <td align="center" width="100%"><font size="0.7em">Esta receta debe validarse on-line ingresando el número de receta</font></td>
                <td align="center" width="100%">
                    <table width="100%">
                        <tr>
                            <td align="left" width="100%"><font size="0.7em">Número de Receta</font></td>
                        </tr>
                        <tr>
                            <td align="center" width="100%">${datos.codigoBarras}</td>
                        </tr>
                        <tr>
                            <td align="center" width="100%"><font size="0.7em">${datos.numeroDisplay}</font></td>
                        </tr>
                    </table>
                </td>
                <td align="center" width="100%">
                    <table width="100%">
                        <tr>
                            <td align="left" width="100%"><font size="0.7em">Número de Afiliado</font></td>
                        </tr>
                        <tr>
                            <td align="center" width="100%">${datos.codigoBarrasAfiliado}</td>
                        </tr>
                        <tr>
                            <td align="center" width="100%"><font size="0.7em">${datos.nroMatricula}</font></td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <table width="100%" style="font-size: 9px;">
            <tr>
                <td width="15%" valign="top"><font size="2"><b>Vence el día:</b><br>${datos.fechaVence}</font></td>
                <td width="70%" align="left" valign="top">
                    <font size="1.5">
                        <b>Ley 27553</b> Recetas electrónicas o digitales. Ley de prescripción y venta de medicamentos utilizando recetas electrónicas, modificación de las leyes 17132, 17565, 17818 Y 1930.<br/>
                        <b>Ley 27680</b> de Prevención y Control de la Resistencia a los Antimicrobianos.<br/>
                        <b>Esta receta fue creada por un emisor inscripto y validado en el Registro de Recetarios Electrónicos del Ministerio de Salud de la Nación -RL 49</b>
                    </font>
                    <br/><br/>
                    <font size="2.5"><b>MEDICACIÓN DE USO CRÓNICO - TRATAMIENTO PROLONGADO</b></font>
                </td>
                <td width="15%" align="center" valign="middle">
                    <img src="https://test1.recetasalud.ar/receta/imglogos/desarrolladoporpara.jpg" width="100px" style="max-width: 100%;">
                </td>
            </tr>
        </table>
        <div style="page-break-after:always;"></div>
    `;
}

export function generarHTMLRecetaDuplicado(datos) {
    // Similar al anterior pero con "DUPLICADO" en lugar de "ORIGINAL"
    let html = generarHTMLReceta(datos);
    return html.replace('ORIGINAL', 'DUPLICADO');
}

export function generarHTMLRecetaRechazada(datos) {
    return `
        <table width="100%">
            <thead>
                <tr>
                    <th colspan="2" width="50%" align="left"><font size="2">Receta Electrónica</font></th>
                    <th colspan="4" width="50%" align="right"><font size="1.5" color="#dc3545"><b>RECHAZADO</b></font></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td colspan="6" width="100%"><hr style="border: 1px solid #000;" /></td>
                </tr>
                <tr>
                    <td colspan="2" width="25%" style="background-color: #f5f5f5; padding: 10px;">
                        <img src="https://test1.recetasalud.ar/assets/images/logocmpc-blanci.png" width="120px" style="filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));">
                    </td>
                    <td colspan="2" width="50%"></td>
                    <td colspan="2" width="40%" align="right"></td>
                </tr>
                <tr>
                    <td colspan="6" width="100%"><hr style="border: 1px solid #CCC;" /></td>
                </tr> 
                <tr>
                    <td colspan="3" width="50%"><font size="1.2em">Paciente</font></td>
                    <td colspan="3" width="50%"><font size="1.2em">Obra Social</font></td>
                </tr>  
                <tr>
                    <td colspan="3" width="50%"><font size="1em">${datos.identidadPaciente}</font></td>
                    <td colspan="3" width="50%"><font size="1em">${datos.obraSocial} - Nro: ${datos.nroMatricula}</font></td>
                </tr>
                <tr>
                    <td colspan="6" width="100%"><hr style="border: 1px solid #CCC;" /></td>
                </tr> 
                <tr>
                    <td colspan="6" width="100%"><font size="1.2em">Prescripción</font></td>
                </tr> 
            </tbody>
        </table>
        <table width="100%" border="1" cellspacing="0" bordercolor="ccc" cellpadding="2">
            <tr>
                <td width="3%"><b>Cant</b></td>
                <td width="25%"><b>Monodroga</b></td>
                <td width="25%"><b>Sugerida</b></td>
                <td width="20%"><b>Presentación</b></td>
                <td width="12%"><b>Dosis x día</b></td>
            </tr>
            <tr>
                <td width="3%">${datos.medicamento.cantprescripta}</td>
                <td width="25%">${datos.medicamento.monodroga.toUpperCase()}</td>
                <td width="25%">${datos.medicamento.nombre_comercial}</td>
                <td width="20%">${datos.medicamento.presentacion}</td>
                <td width="12%">${datos.medicamento.posologia}</td>
            </tr>
        </table>
        <table width="100%" cellpadding="2">
            <tr>
                <td colspan="6" width="100%"><font size="1.2em">
                <b>OBSERVACION:</b> ${datos.nota}<br></font>
                <font size="0.8em">Estimado/a, lamentablemente su prescripción ha sido denegada después de haber sido evaluada por nuestro equipo de auditoría médica. Si tiene alguna pregunta o necesita ayuda para obtener un medicamento alternativo, no dude en comunicarse con su médico de confianza o con nuestra Institución. Estamos aquí para ayudarlo/a en lo que necesite.</font>
                </td>
            </tr>
            <tr>
                <td colspan="6" width="100%"><hr style="border: 1px solid #CCC;" /></td>
            </tr> 
        </table>
        <table width="100%">
            <tr>
                <td width="20%"></td>
                <td width="40%" align="left"><font size="0.5em">Ley 27553 Recetas electrónicas o digitales. Ley de PRESCRIPCION Y VENTA DE MEDICAMENTOS UTILIZANDO RECETAS ELECTRONICAS. MODIFICACION DE LAS LEYES 17132, 17565, 17818 Y 1930.<br/> Ley 27.680 de Prevención y Control de la Resistencia a los Antimicrobianos.</font></td>
                <td width="40%" align="right"><img src="https://aplicaciones.cmpc.org.ar/receta/imglogos/desarrolladoporpara.jpg" width="60%"></td>
            </tr>
        </table>
        <div style="page-break-after:always;"></div>
    `;
}

export async function enviarEmailRecetas(auditoria, htmlContent, idauditoria) {
    // Implementar envío de email
    console.log(`Enviando email para auditoría ${idauditoria}`);
}

// Función principal para generar PDF
export const generarPDF = async (req, res) => {
    let connection = null;

    try {
        const { id } = req.params;
        const { estado = "0" } = req.body;

        console.log(`Iniciando generación de PDF para auditoría ${id}`);

        connection = await getConnection();

        // 1. Obtener datos de la auditoría
        const sqlAuditoria = `SELECT * FROM rec_auditoria WHERE id = ?`;
        const [auditoriaResult] = await connection.execute(sqlAuditoria, [id]);

        if (!auditoriaResult || auditoriaResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Auditoría no encontrada'
            });
        }

        const auditoria = auditoriaResult[0];
        const ciclo = auditoria.cantmeses;

        // 2. Generar HTML del PDF
        let htmlContent = '';
        let medicamentosAutorizados = 0;

        // Generar QR
        const nombreArchivo = `audinro${id}.pdf`;
        const urlPDF = `https://test1.recetasalud.ar/audi/tmp/${nombreArchivo}`;
        const qrCodeDataURL = await QRCode.toDataURL(urlPDF);

        // Procesar cada receta del ciclo
        for (let i = 0; i < ciclo; i++) {
            const nroReceta = `idreceta${i + 1}`;
            const idreceta = auditoria[nroReceta];

            if (!idreceta) continue;

            // Obtener datos de la receta
            const sqlReceta = `
                SELECT r.fechaemision, r.diagnostico, r.idobrasocafiliado,
                       p.dni, p.apellido, p.nombre, p.sexo, p.fecnac,
                       o.sigla, p.nromatriculadoc,
                       pp.apellido AS medape, pp.nombre AS mednom, r.matricprescr
                  FROM rec_receta AS r
            INNER JOIN rec_paciente AS p ON r.idpaciente = p.id
            INNER JOIN rec_obrasoc AS o ON o.id = r.idobrasocafiliado
            INNER JOIN tmp_person AS pp ON pp.matricula = r.matricprescr
                 WHERE r.idreceta = ?
            `;
            const [recetaResult] = await connection.execute(sqlReceta, [idreceta]);

            if (!recetaResult || recetaResult.length === 0) continue;

            const receta = recetaResult[0];

            // Configurar tabla según obra social
            let tablavadem = 'vademecum';
            let logoHeader = 'cmpc.jpg';

            switch (receta.idobrasocafiliado) {
                case 156:
                    tablavadem = 'vad_muni';
                    logoHeader = '156.jpg';
                    break;
                case 20:
                    tablavadem = 'vad_020';
                    logoHeader = '20.jpg';
                    break;
            }

            // Obtener medicamentos
            const sqlMedicamentos = `
                SELECT p.idreceta, p.nro_orden, 
                       DATE_FORMAT(r.fechaemision, '%d-%m-%Y') as fecha, 
                       DATE_FORMAT(DATE_ADD(r.fechaemision, INTERVAL 30 DAY), '%d-%m-%Y') as fechavto,
                       p.cantprescripta, p.posologia, 
                       v.monodroga, v.nombre_comercial, v.presentacion, 
                       v.tipo_venta, p.estado_auditoria,
                       p.porcentajecobertura as cobertura, p.cobertura2,
                       p.numero_farmalink, p.autorizacion_especial
                  FROM rec_prescrmedicamento p
            INNER JOIN ${tablavadem} v ON p.codigo = v.codigo
            INNER JOIN rec_receta r ON p.idreceta = r.idreceta
                 WHERE p.idreceta = ?
              ORDER BY p.nro_orden
            `;
            const [medicamentosResult] = await connection.execute(sqlMedicamentos, [idreceta]);

            if (!medicamentosResult || medicamentosResult.length === 0) continue;

            // Procesar identidad del paciente
            let identidadPaciente = `<b>${receta.apellido} ${receta.nombre}</b> DNI: ${receta.dni}`;
            if (estado == "1") {
                const fechaNac = new Date(receta.fecnac);
                const fechaFormateada = fechaNac.toLocaleDateString('es-ES').replace(/\//g, '');
                identidadPaciente = `${receta.sexo}${receta.nombre.substring(0, 2).toUpperCase()}${receta.apellido.substring(0, 2).toUpperCase()}${fechaFormateada}`;
            }

            // Generar HTML para cada medicamento
            for (const medicamento of medicamentosResult) {
                if (medicamento.estado_auditoria == 1) {
                    medicamentosAutorizados++;

                    const numeroReceta = medicamento.numero_farmalink || medicamento.idreceta;
                    const numeroDisplay = `${numeroReceta}-${medicamento.nro_orden}`;

                    let autorizacionEspecialInfo = '';
                    if (medicamento.autorizacion_especial) {
                        autorizacionEspecialInfo = `
                            <div style="background-color: #f0f0f0; padding: 5px; border: 1px solid #ccc; margin: 5px 0;">
                                <b>AUTORIZACIÓN ESPECIAL:</b> ${medicamento.autorizacion_especial}
                            </div>
                        `;
                    }

                    const codigoBarras = await PDFUtils.generarCodigoBarras(numeroDisplay);
                    const codigoBarrasAfiliado = await PDFUtils.generarCodigoBarras(receta.nromatriculadoc);

                    htmlContent += generarHTMLReceta({
                        logoHeader,
                        numeroDisplay,
                        autorizacionEspecialInfo,
                        fecha: medicamento.fecha,
                        identidadPaciente,
                        obraSocial: receta.sigla,
                        nroMatricula: receta.nromatriculadoc,
                        medicamento,
                        diagnostico: receta.diagnostico,
                        qrCode: qrCodeDataURL,
                        firma: '',
                        medico: `${receta.mednom} ${receta.medape}`,
                        matricula: receta.matricprescr,
                        especialidad: '',
                        codigoBarras,
                        codigoBarrasAfiliado,
                        fechaVence: medicamento.fechavto
                    });

                    // Duplicado para tipo_venta 3
                    if (medicamento.tipo_venta == 3) {
                        htmlContent += generarHTMLRecetaDuplicado({
                            logoHeader,
                            numeroDisplay,
                            autorizacionEspecialInfo,
                            fecha: medicamento.fecha,
                            identidadPaciente,
                            obraSocial: receta.sigla,
                            nroMatricula: receta.nromatriculadoc,
                            medicamento,
                            diagnostico: receta.diagnostico,
                            qrCode: qrCodeDataURL,
                            firma: '',
                            medico: `${receta.mednom} ${receta.medape}`,
                            matricula: receta.matricprescr,
                            especialidad: '',
                            codigoBarras,
                            codigoBarrasAfiliado,
                            fechaVence: medicamento.fechavto
                        });
                    }
                } else {
                    // Medicamento no autorizado
                    htmlContent += generarHTMLRecetaRechazada({
                        logoHeader,
                        identidadPaciente,
                        obraSocial: receta.sigla,
                        nroMatricula: receta.nromatriculadoc,
                        medicamento,
                        nota: auditoria.nota || 'Medicamento no autorizado'
                    });
                }
            }
        }

        if (!htmlContent) {
            return res.status(400).json({
                success: false,
                message: 'No hay contenido autorizado para generar el PDF'
            });
        }

        // 3. Generar PDF
        const pdfBuffer = await PDFUtils.generarPDFDesdeHTML(htmlContent);

        // 4. Guardar PDF
        const isDev = process.env.NODE_ENV !== 'production';

        let rutaPrincipal;
        if (isDev) {
            // En desarrollo: guardar en carpeta local del proyecto
            rutaPrincipal = path.join(process.cwd(), 'pdfs-generated');
        } else {
            // En producción: usar las rutas del servidor
            rutaPrincipal = `/var/www/test1.recetasalud.ar/audi/tmp/`;
        }

        const rutaAzure = `/mnt/fscpcess01/prod/`;

        // Crear directorio principal
        await fs.mkdir(rutaPrincipal, { recursive: true }).catch(() => { });

        // Guardar en ruta principal
        await fs.writeFile(path.join(rutaPrincipal, nombreArchivo), pdfBuffer);

        // En producción, guardar también en Azure
        if (!isDev) {
            await fs.mkdir(rutaAzure, { recursive: true }).catch(() => { });
            await fs.writeFile(path.join(rutaAzure, nombreArchivo), pdfBuffer);
        }

        console.log(`PDF generado exitosamente: ${nombreArchivo}`);
        console.log(`📂 Guardado en: ${rutaPrincipal}`);

        // Generar URL según entorno
        const pdfUrl = isDev
            ? `http://localhost:${process.env.PORT || 3000}/pdfs/${nombreArchivo}`
            : `https://test1.recetasalud.ar/audi/tmp/${nombreArchivo}`;

        res.json({
            success: true,
            message: 'PDF generado correctamente',
            data: {
                nombreArchivo,
                url: pdfUrl,
                medicamentosAutorizados,
                rutaLocal: isDev ? rutaPrincipal : undefined
            }
        });

    } catch (error) {
        console.error('Error generando PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno al generar PDF',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};
// NUEVA FUNCIÓN: OBTENER AUDITORÍA HISTÓRICA (SOLO LECTURA)

export const getAuditoriaHistorica = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('=== OBTENIENDO AUDITORÍA HISTÓRICA (SOLO LECTURA) ===');
        console.log('ID auditoría:', id);

        // Verificar que el ID sea válido
        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: `ID inválido: ${id}. Debe ser un número.`
            });
        }

        // 1. OBTENER DATOS BÁSICOS DE LA AUDITORÍA CON INFORMACIÓN DEL AUDITOR
        const sqlAuditoria = `
            SELECT 
                a.id,
                a.idpaciente,
                a.idprescriptor,
                DATE_FORMAT(a.fecha_origen, '%d/%m/%Y') as fecha_origen,
                a.renglones,
                a.cantmeses,
                a.auditado,
                a.auditadopor,
                a.nota,
                a.idreceta1,
                a.idreceta2,
                a.idreceta3,
                a.idobrasoc,
                DATE_FORMAT(a.fecha_origen, '%d/%m/%Y %H:%i') as fecha_auditoria,
                CONCAT(
                    CONCAT(UPPER(SUBSTRING(au.nombre, 1, 1)), LOWER(SUBSTRING(au.nombre, 2))), ' ',
                    CONCAT(UPPER(SUBSTRING(au.apellido, 1, 1)), LOWER(SUBSTRING(au.apellido, 2)))
                ) as auditor_nombre
            FROM rec_auditoria a
            LEFT JOIN user_au au ON a.auditadopor = au.id
            WHERE a.id = ? AND a.auditado IS NOT NULL AND (a.estado IS NULL OR a.estado != 1)
        `;

        const auditoriaResult = await executeQuery(sqlAuditoria, [id]);

        if (!auditoriaResult || auditoriaResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Auditoría histórica no encontrada o no está procesada'
            });
        }

        const auditoria = auditoriaResult[0];
        console.log('Auditoría histórica encontrada:', auditoria);

        // 2. OBTENER DATOS DEL PACIENTE
        const sqlPaciente = `
            SELECT 
                p.id,
                CONCAT(UPPER(SUBSTRING(p.apellido, 1, 1)), LOWER(SUBSTRING(p.apellido, 2))) as apellido,
                CONCAT(UPPER(SUBSTRING(p.nombre, 1, 1)), LOWER(SUBSTRING(p.nombre, 2))) as nombre,
                p.dni,
                p.sexo,
                DATE_FORMAT(p.fecnac, '%d/%m/%Y') as fecha_nacimiento,
                TIMESTAMPDIFF(YEAR, p.fecnac, CURDATE()) as edad,
                p.telefono,
                p.email,
                p.talla,
                p.peso,
                p.fecnac
            FROM rec_paciente p
            WHERE p.id = ?
        `;

        const pacienteResult = await executeQuery(sqlPaciente, [auditoria.idpaciente]);
        const paciente = pacienteResult[0] || {};

        // 3. OBTENER DATOS DEL MÉDICO PRESCRIPTOR
        const sqlMedico = `
            SELECT 
                t.matricula,
                CONCAT(
                    CONCAT(UPPER(SUBSTRING(t.nombre, 1, 1)), LOWER(SUBSTRING(t.nombre, 2))), ' ',
                    CONCAT(UPPER(SUBSTRING(t.apellido, 1, 1)), LOWER(SUBSTRING(t.apellido, 2)))
                ) as nombre_completo,
                e.especialidad
            FROM tmp_person t
            LEFT JOIN tmp_especialistas e ON t.matricula = e.matricula
            WHERE t.matricula = ?
        `;

        const medicoResult = await executeQuery(sqlMedico, [auditoria.idprescriptor]);
        const medico = medicoResult[0] || {};

        // 4. OBTENER OBRA SOCIAL Y DATOS DE RECETA
        const sqlObraSocial = `
            SELECT 
                DATE_FORMAT(r.fechaemision, '%d/%m/%Y') as fechaemision,
                r.diagnostico,
                r.diagnostico2,
                o.sigla as obra_social,
                p.nromatriculadoc as nro_afiliado
            FROM rec_receta r
            INNER JOIN rec_obrasoc o ON r.idobrasocafiliado = o.id
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            WHERE r.idreceta = ?
        `;

        const obraSocialResult = await executeQuery(sqlObraSocial, [auditoria.idreceta1]);
        const obraSocialData = obraSocialResult[0] || {};

        // 5. DETERMINAR TABLA DE VADEMÉCUM SEGÚN OBRA SOCIAL
        let tablaVademecum = 'vademecum';

        switch (parseInt(auditoria.idobrasoc)) {
            case 156:
                tablaVademecum = 'vad_muni';
                break;
            case 20:
                tablaVademecum = 'vad_020';
                break;
            default:
                tablaVademecum = 'vademecum';
        }

        // 6. OBTENER MEDICAMENTOS AGRUPADOS POR RECETA
        const recetas = {};
        const recetasIds = [auditoria.idreceta1, auditoria.idreceta2, auditoria.idreceta3].filter(r => r);

        for (let idReceta of recetasIds) {
            const sqlMedicamentos = `
                SELECT 
                    pm.idreceta,
                    pm.nro_orden,
                    pm.cantprescripta,
                    pm.posologia,
                    pm.porcentajecobertura as cobertura,
                    pm.cobertura2,
                    pm.estado_auditoria,
                    pm.observacion,
                    DATE_FORMAT(pm.fecha_auditoria, '%d/%m/%Y %H:%i') as fecha_auditoria_medicamento,
                    v.monodroga,
                    v.nombre_comercial,
                    v.presentacion,
                    v.tipod,
                    v.tipo_venta,
                    v.condicion,
                    CASE 
                        WHEN pm.estado_auditoria = 1 THEN 'APROBADO'
                        WHEN pm.estado_auditoria = 2 THEN 'RECHAZADO'
                        WHEN pm.estado_auditoria = 3 THEN 'OBSERVADO'
                        WHEN pm.estado_auditoria = 4 THEN 'PEND. MEDICO'
                        ELSE 'PENDIENTE'
                    END as estado_texto
                FROM rec_prescrmedicamento pm
                INNER JOIN ${tablaVademecum} v ON pm.codigo = v.codigo
                WHERE pm.idreceta = ?
                ORDER BY pm.nro_orden
            `;

            try {
                const medicamentosResult = await executeQuery(sqlMedicamentos, [idReceta]);

                if (medicamentosResult.length > 0) {
                    recetas[idReceta] = {
                        nroreceta: idReceta,
                        medicamentos: medicamentosResult.map(med => ({
                            id: `${med.idreceta}-${med.nro_orden}`,
                            nro_orden: med.nro_orden,
                            nombrecomercial: med.nombre_comercial || '',
                            monodroga: med.monodroga || '',
                            presentacion: med.presentacion || '',
                            cantidad: med.cantprescripta || 0,
                            posologia: med.posologia || '',
                            cobertura: med.cobertura || 0,
                            cobertura2: med.cobertura2 || '',
                            estado: med.estado_auditoria,
                            estado_texto: med.estado_texto,
                            observacion: med.observacion || '',
                            fecha_auditoria: med.fecha_auditoria_medicamento,
                            tipod: med.tipod || '',
                            tipo_venta: med.tipo_venta || '',
                            condicion: med.condicion || ''
                        }))
                    };
                }
            } catch (error) {
                console.error(`Error obteniendo medicamentos para receta ${idReceta}:`, error);
            }
        }

        // 7. CALCULAR ESTADÍSTICAS
        const todosLosMedicamentos = Object.values(recetas).flatMap(r => r.medicamentos);
        const estadisticas = {
            total_medicamentos: todosLosMedicamentos.length,
            medicamentos_aprobados: todosLosMedicamentos.filter(m => m.estado === 1).length,
            medicamentos_rechazados: todosLosMedicamentos.filter(m => m.estado === 2).length,
            medicamentos_observados: todosLosMedicamentos.filter(m => m.estado === 3).length
        };

        // 8. ESTRUCTURAR RESPUESTA PARA SOLO LECTURA - COMPATIBLE CON EL FRONTEND
        const responseData = {
            auditoria: {
                id: auditoria.id,
                fecha_origen: auditoria.fecha_origen,
                fecha_auditoria: auditoria.fecha_auditoria,
                renglones: auditoria.renglones,
                cantmeses: auditoria.cantmeses,
                auditado: auditoria.auditado,
                nota: auditoria.nota || '',
                estado_texto: auditoria.auditado === 1 ? 'APROBADO' :
                    auditoria.auditado === 2 ? 'RECHAZADO' :
                        auditoria.auditado === 3 ? 'OBSERVADO' : 'PENDIENTE'
            },

            paciente: {
                apellido: paciente.apellido || '',
                nombre: paciente.nombre || '',
                dni: paciente.dni || '',
                sexo: paciente.sexo || '',
                edad: paciente.edad || 0,
                fecha_nacimiento: paciente.fecha_nacimiento || '',
                telefono: paciente.telefono || '',
                email: paciente.email || '',
                talla: paciente.talla || 0,
                peso: paciente.peso || 0,
                fecnac: paciente.fecnac || ''
            },

            medico: {
                nombre: medico.nombre_completo || '',
                matricula: medico.matricula || '',
                especialidad: medico.especialidad || ''
            },

            obra_social: {
                nombre: obraSocialData.obra_social || '',
                nro_afiliado: obraSocialData.nro_afiliado || ''
            },

            diagnostico: {
                principal: obraSocialData.diagnostico || '',
                secundario: obraSocialData.diagnostico2 || '',
                fecha_emision: obraSocialData.fechaemision || ''
            },

            auditor: auditoria.auditor_nombre || 'No especificado',

            recetas: recetas,

            estadisticas: estadisticas,

            metadata: {
                readonly: true,
                tipo: 'historica',
                tabla_vademecum: tablaVademecum
            }
        };

        console.log('=== RESPUESTA AUDITORÍA HISTÓRICA ===');
        console.log('ID:', responseData.auditoria.id);
        console.log('Estado:', responseData.auditoria.estado_texto);
        console.log('Paciente:', `${responseData.paciente.apellido}, ${responseData.paciente.nombre}`);
        console.log('Total medicamentos:', responseData.estadisticas.total_medicamentos);
        console.log('Auditor:', responseData.auditor);

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('=== ERROR EN AUDITORÍA HISTÓRICA ===');
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);

        res.status(500).json({
            success: false,
            message: 'Error al obtener la auditoría histórica',
            error: error.message
        });
    }
};

// NUEVA FUNCIÓN: Procesar validación con Farmalink
export const procesarFarmalink = async (req, res) => {
    try {
        const { accion } = req.body;

        switch (accion) {
            case 'iniciar':
                return await iniciarProcesamientoFarmalink(req, res);

            case 'procesar_item':
                return await procesarItemFarmalink(req, res);

            case 'finalizar_cronicos':
                return await finalizarCronicos(req, res);

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Acción no reconocida'
                });
        }
    } catch (error) {
        console.error('Error en procesarFarmalink:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};



// 🔥 CREDENCIALES FARMALINK
const FL_CONFIG = {
    CLIENT_ID: 'CMPCClient',
    CLIENT_SECRET: 'Uvv5MwBYFjTS',
    OAUTH_USER: 'cmpc.ws00',
    OAUTH_PASS: '56H8tTZ9kpVN',
    RANGE: '9339',
    BASE_URL: 'https://servicios.farmalink.com.ar'
};

// 🔥 FUNCIÓN: Obtener tokens OAuth
async function obtenerTokenFarmalink(scope) {
    try {
        const credentials = Buffer.from(`${FL_CONFIG.CLIENT_ID}:${FL_CONFIG.CLIENT_SECRET}`).toString('base64');

        const response = await fetch(`${FL_CONFIG.BASE_URL}/api/oauth/token/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'grant_type': 'PASSWORD',
                'username': FL_CONFIG.OAUTH_USER,
                'password': FL_CONFIG.OAUTH_PASS,
                'scope': scope
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error(`Error obteniendo token ${scope}:`, error);
        throw error;
    }
}

// 🔥 FUNCIÓN: Iniciar procesamiento
async function iniciarProcesamientoFarmalink(req, res) {
    try {
        console.log('🚀 Iniciando procesamiento Farmalink...');

        const tokenReceta = await obtenerTokenFarmalink('Switch.RecetaElectRest');
        const tokenAfiliado = await obtenerTokenFarmalink('Switch.AfiliadoRest');

        if (!tokenReceta || !tokenAfiliado) {
            return res.json({
                status: 'error',
                message: 'No se pudieron obtener los tokens de Farmalink'
            });
        }

        console.log('✅ Tokens obtenidos exitosamente');

        res.json({
            status: 'success',
            tokenReceta: tokenReceta,
            tokenAfiliado: tokenAfiliado
        });

    } catch (error) {
        console.error('❌ Error iniciando Farmalink:', error);
        res.json({
            status: 'error',
            message: 'Error al inicializar Farmalink: ' + error.message
        });
    }
}

// 🔥 FUNCIÓN: Generar número EAN-13 para Farmalink
function generarNumeroFarmalink(idreceta, nroOrden) {
    const prefijo = FL_CONFIG.RANGE; // 9339
    const base11 = prefijo + String(idreceta).padStart(7, '0');
    const base12 = base11 + String(nroOrden);

    // Calcular dígito de control EAN-13
    const digits = base12.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;

    return base12 + checkDigit;
}

// 🔥 FUNCIÓN: Procesar medicamento individual
async function procesarItemFarmalink(req, res) {
    let connection = null;

    try {
        const { item, tokenReceta, tokenAfiliado, idreceta, nroOrden } = req.body;

        if (!item || !tokenReceta || !tokenAfiliado) {
            return res.json({
                success: false,
                message: 'Parámetros faltantes'
            });
        }

        // 🔥 CORRECCIÓN: Usar parámetros directos del frontend si están disponibles
        let finalIdReceta = idreceta;
        let finalNroOrden = nroOrden;

        // Si no vienen por parámetros directos, parsear del item
        if (!finalIdReceta || !finalNroOrden) {
            const [itemIdReceta, itemNroOrden] = item.split('_');

            if (!itemIdReceta || !itemNroOrden) {
                return res.json({
                    success: false,
                    message: `Formato inválido: ${item}. Se esperaba 'idreceta_numero'`
                });
            }

            finalIdReceta = itemIdReceta;
            finalNroOrden = parseInt(itemNroOrden);
        }

        // Validar que nroOrden sea un número válido
        if (isNaN(finalNroOrden)) {
            return res.json({
                success: false,
                message: `Número de orden inválido: ${finalNroOrden}`
            });
        }

        console.log(`🔄 Procesando medicamento: ${item} (idreceta: ${finalIdReceta}, nro_orden: ${finalNroOrden})`);

        connection = await getConnection();

        // 🔥 QUERY MEJORADA: Obtener datos del medicamento con manejo de NULLs
        const sqlMedicamento = `
            SELECT  
                m.*,
                COALESCE(v.cod_monodroga, '0') as cod_monodroga,
                COALESCE(v.nro_alfabeta, '0') as nro_alfabeta,
                COALESCE(r.diagnostico, 'Sin diagnóstico') as diagnostico,
                COALESCE(p.dni, '0') as dni,
                COALESCE(p.nromatriculadoc, '0') as nromatriculadoc,
                COALESCE(r.matricprescr, '0') as matricprescr,
                COALESCE(m.porcentajecobertura, 50) as porcentajecobertura,
                COALESCE(m.autorizacion_especial, '') as autorizacion_especial
            FROM rec_prescrmedicamento m
            INNER JOIN rec_receta r ON m.idreceta = r.idreceta
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            LEFT JOIN vademecum v ON v.codigo = m.codigo
            WHERE m.idreceta = ? AND m.nro_orden = ?
        `;

        const [medicamentoResult] = await connection.execute(sqlMedicamento, [finalIdReceta, finalNroOrden]);

        if (!medicamentoResult || medicamentoResult.length === 0) {
            console.log(`❌ Medicamento no encontrado: idreceta=${finalIdReceta}, nro_orden=${finalNroOrden}`);
            return res.json({
                success: false,
                message: `Medicamento no encontrado: ${finalIdReceta}-${finalNroOrden}`
            });
        }

        const med = medicamentoResult[0];
        console.log(`✅ Medicamento encontrado: ${med.codigo} - ${finalIdReceta}-${finalNroOrden}`);
        console.log(`🔍 Datos del medicamento:`, {
            dni: med.dni,
            matricprescr: med.matricprescr,
            nromatriculadoc: med.nromatriculadoc,
            diagnostico: med.diagnostico ? med.diagnostico.substring(0, 50) + '...' : 'Sin diagnóstico',
            cod_monodroga: med.cod_monodroga,
            nro_alfabeta: med.nro_alfabeta
        });

        // Verificar si es medicamento crónico (por DNI 16410809 como en el PHP)
        const esCronico = med.dni === '16410809' && med.autorizacion_especial;

        let resultado;
        if (esCronico) {
            resultado = await procesarMedicamentoCronico(med, tokenReceta, tokenAfiliado, connection);
        } else {
            resultado = await procesarMedicamentoNormal(med, tokenReceta, connection);
        }

        console.log(`🔄 Resultado procesamiento ${item}:`, resultado);
        res.json(resultado);

    } catch (error) {
        console.error('❌ Error procesando item Farmalink:', error);
        res.json({
            success: false,
            message: 'Error al procesar medicamento: ' + error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}
// 🔥 FUNCIÓN: Procesar medicamento normal (solo RE)
async function procesarMedicamentoNormal(med, tokenReceta, connection) {
    try {
        const numeroFarmalink = generarNumeroFarmalink(med.idreceta, med.nro_orden);

        console.log(`📋 Creando RE normal: ${numeroFarmalink} para ${med.idreceta}-${med.nro_orden}`);

        // 🔥 CORRECCIÓN: Validar y limpiar matrícula del prescriptor
        let matriculaSoloNumeros = '';
        if (med.matricprescr) {
            // Convertir a string si no lo es y limpiar
            matriculaSoloNumeros = String(med.matricprescr).replace(/\D/g, '');
        } else {
            console.warn(`⚠️ Matrícula del prescriptor faltante para medicamento ${med.idreceta}-${med.nro_orden}`);
            matriculaSoloNumeros = '0'; // Valor por defecto
        }

        // 🔥 CORRECCIÓN: Validar otros campos críticos
        const diagnosticoSeguro = med.diagnostico || 'Sin diagnóstico especificado';
        const dniSeguro = parseInt(med.dni) || 0;
        const nroMatriculaSeguro = med.nromatriculadoc || '0';
        const cantPrescriptaSegura = parseInt(med.cantprescripta) || 1;
        const nroAlfabetaSeguro = med.nro_alfabeta || '0';
        const codMonodrogaSeguro = med.cod_monodroga || '0';

        console.log(`🔍 Datos para Farmalink: DNI=${dniSeguro}, Matrícula=${matriculaSoloNumeros}, PAN=${nroMatriculaSeguro}`);

        const payload = {
            altaRecetaElectRq: {
                infoCabeceraRq: {
                    idOrganizacion: "39",
                    tipoOrganizacion: "NMD"
                },
                recElectronica: {
                    idRecElectronica: numeroFarmalink,
                    nroRecElectronica: numeroFarmalink,
                    fechaVigenciaDesde: new Date().toISOString().split('T')[0],
                    tipoTratamiento: "P",
                    afiliado: {
                        codEntidad: 688,
                        pan: nroMatriculaSeguro,
                        dni: dniSeguro
                    },
                    medico: {
                        tipoMatricula: "MP",
                        provMatricula: "X",
                        nroMatricula: matriculaSoloNumeros
                    },
                    diagnostico: {
                        textoLibre: diagnosticoSeguro
                    },
                    detalleRecElectronica: {
                        item: [{
                            cantidad: cantPrescriptaSegura,
                            codProducto: nroAlfabetaSeguro,
                            codDroga: codMonodrogaSeguro,
                            permiteSustitucion: "S"
                        }]
                    }
                }
            }
        };

        console.log(`📤 Enviando payload a Farmalink:`, JSON.stringify(payload, null, 2));

        // Enviar a Farmalink
        const respuestaFarmalink = await enviarAFarmalink('/api/recetaElect/altaReceta', payload, tokenReceta);

        if (respuestaFarmalink.success) {
            // Actualizar BD con número Farmalink
            const [updateResult] = await connection.execute(
                `UPDATE rec_prescrmedicamento 
                 SET numero_farmalink = ?, pendiente_farmalink = 0 
                 WHERE idreceta = ? AND nro_orden = ?`,
                [numeroFarmalink, med.idreceta, med.nro_orden]
            );

            console.log(`✅ RE normal OK: ${numeroFarmalink} (Actualización BD: ${updateResult.affectedRows} filas)`);

            return {
                success: true,
                message: `Receta ${numeroFarmalink} OK`,
                numeroFarmalink: numeroFarmalink
            };
        } else {
            console.log(`❌ Error RE normal: ${respuestaFarmalink.message}`);
            return {
                success: false,
                message: `Error alta receta: ${respuestaFarmalink.message}`
            };
        }

    } catch (error) {
        console.error('❌ Error en medicamento normal:', error);
        return {
            success: false,
            message: 'Error procesando medicamento normal: ' + error.message
        };
    }
}

// 🔥 FUNCIÓN: Procesar medicamento crónico (RE + acumular para AE)
async function procesarMedicamentoCronico(med, tokenReceta, tokenAfiliado, connection) {
    try {
        const numeroFarmalink = generarNumeroFarmalink(med.idreceta, med.nro_orden);

        console.log(`🔄 Creando RE crónica: ${numeroFarmalink} para ${med.idreceta}-${med.nro_orden}`);

        // 1. Crear RE individual (igual que normal)
        const resultado = await procesarMedicamentoNormal(med, tokenReceta, connection);

        if (!resultado.success) {
            return resultado;
        }

        // 2. Acumular datos para AE crónica (usar tabla temporal o sesión)
        // Por ahora, marcamos que requiere AE crónica
        await connection.execute(
            `UPDATE rec_prescrmedicamento 
             SET requiere_ae_cronica = 1 
             WHERE idreceta = ? AND nro_orden = ?`,
            [med.idreceta, med.nro_orden]
        );

        console.log(`✅ RE crónica OK: ${numeroFarmalink} - Marcado para AE`);

        return {
            success: true,
            message: `RE crónica ${numeroFarmalink} OK`,
            numeroFarmalink: numeroFarmalink,
            tipo: 'cronico'
        };

    } catch (error) {
        console.error('Error en medicamento crónico:', error);
        return {
            success: false,
            message: 'Error procesando medicamento crónico: ' + error.message
        };
    }
}

// 🔥 FUNCIÓN: Enviar datos a Farmalink
async function enviarAFarmalink(endpoint, payload, token) {
    try {
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-ibm-client-id': FL_CONFIG.CLIENT_ID,
            'x-ibm-client-secret': FL_CONFIG.CLIENT_SECRET,
            'rango_habilitado': FL_CONFIG.RANGE
        };

        console.log(`🌐 Enviando a Farmalink: ${endpoint}`);

        const response = await fetch(FL_CONFIG.BASE_URL + endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();

        try {
            const responseData = JSON.parse(responseText);

            // Verificar respuesta según tipo de endpoint
            if (endpoint.includes('altaReceta')) {
                const codigo = responseData?.altaRecetaElectRs?.respuesta?.codigo;
                if (codigo === '0') {
                    return { success: true, data: responseData };
                } else {
                    const mensaje = responseData?.error?.errorInterno?.mensaje || 'Error desconocido';
                    return { success: false, message: mensaje };
                }
            } else if (endpoint.includes('altaAutorizacionEspecial')) {
                const codigo = responseData?.altaAutorizacionEspecialAfiliadoRs?.respuesta?.codigo;
                if (codigo === '0') {
                    return { success: true, data: responseData };
                } else {
                    const mensaje = responseData?.error?.errorInterno?.mensaje || 'Error desconocido';
                    return { success: false, message: mensaje };
                }
            }

            return { success: false, message: 'Respuesta inesperada de Farmalink' };

        } catch (parseError) {
            console.error('Error parseando respuesta Farmalink:', responseText);
            return { success: false, message: 'Error en respuesta de Farmalink' };
        }

    } catch (error) {
        console.error('Error comunicando con Farmalink:', error);
        return { success: false, message: 'Error de conexión con Farmalink' };
    }
}

// 🔥 FUNCIÓN: Finalizar crónicos (crear AE agrupadas)
async function finalizarCronicos(req, res) {
    let connection = null;

    try {
        const { tokenAfiliado } = req.body;

        if (!tokenAfiliado) {
            return res.json({
                success: false,
                message: 'Token faltante'
            });
        }

        console.log('🏁 Iniciando finalización de crónicos...');

        connection = await getConnection();

        // Buscar medicamentos crónicos pendientes de AE
        const sqlCronicos = `
            SELECT 
                p.dni,
                p.nromatriculadoc,
                m.cod_monodroga,
                m.nro_alfabeta,
                SUM(pm.cantprescripta) as cantidad_total,
                MAX(pm.porcentajecobertura) as cobertura
            FROM rec_prescrmedicamento pm
            JOIN rec_receta r ON pm.idreceta = r.idreceta
            JOIN rec_paciente p ON r.idpaciente = p.id
            LEFT JOIN vademecum m ON pm.codigo = m.codigo
            WHERE pm.requiere_ae_cronica = 1
            AND pm.estado_auditoria = 1
            GROUP BY p.dni, m.cod_monodroga
        `;

        const [cronicosResult] = await connection.execute(sqlCronicos);

        let creadas = 0;
        let errores = [];

        for (const cronico of cronicosResult) {
            try {
                const idAE = Date.now().toString() + Math.floor(Math.random() * 1000);
                const fechaDesde = new Date().toISOString();
                const fechaHasta = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // +90 días

                const payloadAE = {
                    altaAutorizacionEspecialAfiliadoRq: {
                        infoCabeceraRq: {
                            idOrganizacion: "39",
                            tipoOrganizacion: "NMD"
                        },
                        autEspecial: {
                            idAutEspecial: idAE,
                            fechaVigenciaDesde: fechaDesde,
                            fechaVigenciaHasta: fechaHasta,
                            afiliado: {
                                codEntidad: 688,
                                pan: cronico.nromatriculadoc || "0"
                            },
                            detalleAutorizacion: {
                                cantidad: String(cronico.cantidad_total),
                                descuento: String(cronico.cobertura || 50),
                                unico: "1",
                                codProducto: parseInt(cronico.nro_alfabeta),
                                codDroga: parseInt(cronico.cod_monodroga),
                                generico: "0",
                                permiteSustitucion: "N",
                                ciclo: "1",
                                expediente: "",
                                sucursal: ""
                            }
                        }
                    }
                };

                const respuestaAE = await enviarAFarmalink('/api/afiliado/v1/altaAutorizacionEspecial', payloadAE, tokenAfiliado);

                if (respuestaAE.success) {
                    // Actualizar medicamentos relacionados
                    await connection.execute(
                        `UPDATE rec_prescrmedicamento pm
                         JOIN rec_receta r ON pm.idreceta = r.idreceta
                         JOIN rec_paciente p ON r.idpaciente = p.id
                         LEFT JOIN vademecum v ON pm.codigo = v.codigo
                         SET pm.autorizacion_especial = ?, 
                             pm.requiere_ae_cronica = 0
                         WHERE p.dni = ? AND v.cod_monodroga = ? AND pm.requiere_ae_cronica = 1`,
                        [idAE, cronico.dni, cronico.cod_monodroga]
                    );

                    console.log(`✅ AE crónica creada: ${idAE} para DNI ${cronico.dni}`);
                    creadas++;
                } else {
                    console.log(`❌ Error AE crónica: ${respuestaAE.message}`);
                    errores.push(`Error AE crónica DNI ${cronico.dni}: ${respuestaAE.message}`);
                }

            } catch (error) {
                console.error('Error creando AE crónica:', error);
                errores.push(`Error AE crónica DNI ${cronico.dni}: ${error.message}`);
            }
        }

        console.log(`🏁 Finalización completa: ${creadas} AE creadas, ${errores.length} errores`);

        res.json({
            success: true,
            message: `AE crónicas creadas: ${creadas}`,
            creadas: creadas,
            errores: errores
        });

    } catch (error) {
        console.error('❌ Error finalizando crónicos:', error);
        res.json({
            success: false,
            message: 'Error al finalizar crónicos: ' + error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// 🔥 FUNCIÓN: Verificar estado de procesamiento Farmalink
export const verificarEstadoFarmalink = async (req, res) => {
    try {
        const { id } = req.params; // ID de auditoría

        console.log(`🔍 Verificando estado Farmalink para auditoría ${id}`);

        // Consultar medicamentos pendientes de Farmalink
        const sqlPendientes = `
            SELECT 
                pm.idreceta,
                pm.nro_orden,
                pm.pendiente_farmalink,
                pm.numero_farmalink,
                pm.autorizacion_especial,
                pm.estado_auditoria,
                v.nombre_comercial,
                v.monodroga
            FROM rec_prescrmedicamento pm
            LEFT JOIN rec_auditoria a ON (
                pm.idreceta = a.idreceta1 OR 
                pm.idreceta = a.idreceta2 OR 
                pm.idreceta = a.idreceta3
            )
            LEFT JOIN vademecum v ON pm.codigo = v.codigo
            WHERE a.id = ? AND pm.estado_auditoria = 1
            ORDER BY pm.idreceta, pm.nro_orden
        `;

        const medicamentos = await executeQuery(sqlPendientes, [id]);

        const estadisticas = {
            total_aprobados: medicamentos.length,
            pendientes_farmalink: medicamentos.filter(m => m.pendiente_farmalink === 1).length,
            procesados_farmalink: medicamentos.filter(m => m.numero_farmalink).length,
            con_autorizacion_especial: medicamentos.filter(m => m.autorizacion_especial).length
        };

        const medicamentos_detalle = medicamentos.map(med => ({
            id: `${med.idreceta}-${med.nro_orden}`,
            nombre: med.nombre_comercial || 'Sin nombre',
            monodroga: med.monodroga || 'Sin monodroga',
            estado_farmalink: med.pendiente_farmalink === 1 ? 'PENDIENTE' :
                med.numero_farmalink ? 'PROCESADO' : 'NO REQUIERE',
            numero_farmalink: med.numero_farmalink || null,
            autorizacion_especial: med.autorizacion_especial || null
        }));

        res.json({
            success: true,
            data: {
                auditoria_id: id,
                estadisticas,
                medicamentos: medicamentos_detalle,
                necesita_procesamiento: estadisticas.pendientes_farmalink > 0
            }
        });

    } catch (error) {
        console.error('❌ Error verificando estado Farmalink:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar estado Farmalink',
            error: error.message
        });
    }
};

// 🔥 FUNCIÓN: Reprocesar Farmalink (en caso de errores)
export const reprocesarFarmalink = async (req, res) => {
    try {
        const { id } = req.params; // ID de auditoría
        const { medicamentos = [] } = req.body; // Array de IDs de medicamentos a reprocesar

        console.log(`🔄 Reprocesando Farmalink para auditoría ${id}`);

        if (medicamentos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se especificaron medicamentos para reprocesar'
            });
        }

        // Marcar medicamentos como pendientes nuevamente
        const placeholders = medicamentos.map(() => '?').join(',');
        const medicamentosIds = medicamentos.flatMap(item => {
            const [idreceta, nroOrden] = item.split('-');
            return [idreceta, nroOrden];
        });

        let sqlConditions = [];
        let params = [];

        for (let i = 0; i < medicamentos.length; i++) {
            const [idreceta, nroOrden] = medicamentos[i].split('-');
            sqlConditions.push('(idreceta = ? AND nro_orden = ?)');
            params.push(idreceta, nroOrden);
        }

        const sqlUpdate = `
            UPDATE rec_prescrmedicamento 
            SET pendiente_farmalink = 1,
                numero_farmalink = NULL,
                autorizacion_especial = NULL
            WHERE ${sqlConditions.join(' OR ')}
        `;

        const updateResult = await executeQuery(sqlUpdate, params);

        console.log(`✅ ${updateResult.affectedRows} medicamentos marcados para reprocesamiento`);

        res.json({
            success: true,
            message: `${updateResult.affectedRows} medicamentos marcados para reprocesamiento`,
            medicamentos_actualizados: updateResult.affectedRows
        });

    } catch (error) {
        console.error('❌ Error reprocesando Farmalink:', error);
        res.status(500).json({
            success: false,
            message: 'Error al reprocesar Farmalink',
            error: error.message
        });
    }
};

//  FUNCIÓN: Obtener log de procesamiento Farmalink
export const getLogFarmalink = async (req, res) => {
    try {
        const { id } = req.params; // ID de auditoría
        const { fecha = null } = req.query;

        console.log(`📋 Obteniendo log Farmalink para auditoría ${id}`);

        // Consulta para obtener el historial de procesamiento
        let sql = `
            SELECT 
                pm.idreceta,
                pm.nro_orden,
                pm.numero_farmalink,
                pm.autorizacion_especial,
                pm.fecha_auditoria,
                pm.observacion,
                v.nombre_comercial,
                v.monodroga,
                p.dni,
                p.apellido,
                p.nombre
            FROM rec_prescrmedicamento pm
            LEFT JOIN rec_auditoria a ON (
                pm.idreceta = a.idreceta1 OR 
                pm.idreceta = a.idreceta2 OR 
                pm.idreceta = a.idreceta3
            )
            LEFT JOIN vademecum v ON pm.codigo = v.codigo
            LEFT JOIN rec_receta r ON pm.idreceta = r.idreceta
            LEFT JOIN rec_paciente p ON r.idpaciente = p.id
            WHERE a.id = ? AND pm.estado_auditoria = 1
        `;

        const params = [id];

        if (fecha) {
            sql += ` AND DATE(pm.fecha_auditoria) = ?`;
            params.push(fecha);
        }

        sql += ` ORDER BY pm.fecha_auditoria DESC, pm.idreceta, pm.nro_orden`;

        const registros = await executeQuery(sql, params);

        const log_procesamiento = registros.map(reg => ({
            medicamento_id: `${reg.idreceta}-${reg.nro_orden}`,
            paciente: `${reg.apellido}, ${reg.nombre} (DNI: ${reg.dni})`,
            medicamento: reg.nombre_comercial || 'Sin nombre',
            monodroga: reg.monodroga || 'Sin monodroga',
            numero_farmalink: reg.numero_farmalink || 'No procesado',
            autorizacion_especial: reg.autorizacion_especial || 'No aplica',
            fecha_procesamiento: reg.fecha_auditoria || 'Sin fecha',
            estado: reg.numero_farmalink ? 'PROCESADO' : 'PENDIENTE',
            observaciones: reg.observacion || 'Sin observaciones'
        }));

        res.json({
            success: true,
            data: {
                auditoria_id: id,
                fecha_consulta: fecha || 'Todas las fechas',
                total_registros: log_procesamiento.length,
                registros: log_procesamiento
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo log Farmalink:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener log de Farmalink',
            error: error.message
        });
    }
};

// Función para descargar PDF
export const descargarPDF = async (req, res) => {
    try {
        const { id } = req.params;

        const nombreArchivo = `audinro${id}.pdf`;
        const rutaArchivo = `/var/www/cpce.recetasalud.ar/audi/tmp/${nombreArchivo}`;

        try {
            const pdfBuffer = await fs.readFile(rutaArchivo);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            res.send(pdfBuffer);

        } catch (fileError) {
            // Si el archivo no existe, intentar generarlo
            console.log('PDF no encontrado, generando...');
            return generarPDF(req, res);
        }

    } catch (error) {
        console.error('Error descargando PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error al descargar PDF',
            error: error.message
        });
    }
}


// REENVIAR EMAIL DE AUDITORÍA PROCESADA


// FUNCIÓN CORREGIDA PARA USAR TUS VARIABLES DE ENTORNO EXISTENTES
async function enviarEmailSimplificado(htmlContent, opciones) {
    try {
        console.log(`📧 Enviando email a: ${opciones.destinatario}`);

        // CORRECCIÓN: Usar las variables de entorno que ya tienes configuradas
        const smtpUser = process.env.SMTP_USERNAME || process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT;
        const smtpFrom = process.env.SMTP_SENDER || process.env.SMTP_FROM;

        // Verificar que las variables de entorno estén configuradas
        if (!smtpUser || !smtpPass) {
            console.error('Variables SMTP encontradas:', {
                SMTP_HOST: process.env.SMTP_HOST,
                SMTP_USERNAME: process.env.SMTP_USERNAME ? '***configurado***' : 'NO CONFIGURADO',
                SMTP_PASSWORD: process.env.SMTP_PASSWORD ? '***configurado***' : 'NO CONFIGURADO',
                SMTP_PORT: process.env.SMTP_PORT,
                SMTP_SENDER: process.env.SMTP_SENDER
            });
            throw new Error('Variables de entorno SMTP no configuradas. Revisa SMTP_USERNAME y SMTP_PASSWORD en .env.production');
        }

        // Configuración del transporter adaptada a tus variables
        const transporterConfig = {
            host: smtpHost?.replace(/"/g, '') || 'email-smtp.us-east-1.amazonaws.com',
            port: parseInt(smtpPort?.replace(/"/g, '')) || 465,
            secure: true, // true para puerto 465 (AWS SES)
            auth: {
                user: smtpUser?.replace(/"/g, ''),
                pass: smtpPass?.replace(/"/g, '')
            },
            // Configuraciones específicas para AWS SES
            tls: {
                rejectUnauthorized: false
            }
        };

        console.log('Configuración SMTP:', {
            host: transporterConfig.host,
            port: transporterConfig.port,
            secure: transporterConfig.secure,
            user: transporterConfig.auth.user,
            hasPassword: !!transporterConfig.auth.pass
        });

        const transporter = nodemailer.createTransport(transporterConfig);

        // Verificar conexión SMTP
        try {
            await transporter.verify();
            console.log('✅ Conexión SMTP verificada');
        } catch (verifyError) {
            console.error('❌ Error verificando SMTP:', verifyError.message);
            // No fallar aquí, intentar enviar de todas formas
            console.log('⚠️ Continuando sin verificación...');
        }

        // Configurar opciones del email
        const mailOptions = {
            from: smtpFrom?.replace(/"/g, '') || `"${process.env.SMTP_SENDER_NAME?.replace(/"/g, '') || 'Auditoría Médica'}" <${smtpUser?.replace(/"/g, '')}>`,
            to: opciones.destinatario,
            subject: opciones.asunto,
            html: htmlContent,
            attachments: []
        };

        // Adjuntar PDF si es necesario
        if (opciones.adjuntarPDF && opciones.rutaPDF) {
            try {
                await fs.access(opciones.rutaPDF);
                mailOptions.attachments.push({
                    filename: `auditoria.pdf`,
                    path: opciones.rutaPDF,
                    contentType: 'application/pdf'
                });
                console.log(`📎 PDF adjuntado: ${opciones.rutaPDF}`);
            } catch (fileError) {
                console.warn(`⚠️ No se pudo adjuntar el PDF: ${fileError.message}`);
            }
        }

        // Enviar email
        console.log('Enviando email con opciones:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject,
            attachments: mailOptions.attachments.length
        });

        const info = await transporter.sendMail(mailOptions);

        console.log(`✅ Email enviado exitosamente: ${info.messageId}`);

        return {
            success: true,
            messageId: info.messageId,
            destinatario: opciones.destinatario,
            response: info.response
        };

    } catch (error) {
        console.error('❌ Error enviando email:', error);
        return {
            success: false,
            message: error.message || 'Error desconocido al enviar email'
        };
    }
}

export const reenviarEmail = async (req, res) => {
    let connection = null;

    try {
        const { id } = req.params;

        console.log(`🔔 Iniciando reenvío de email para auditoría ${id}`);

        connection = await getConnection();

        // 1. VERIFICAR QUE LA AUDITORÍA EXISTE Y ESTÁ PROCESADA
        const sqlVerificar = `
            SELECT 
                a.id,
                a.auditado,
                a.idpaciente,
                a.nota,
                p.email,
                p.apellido,
                p.nombre,
                p.dni
            FROM rec_auditoria a
            INNER JOIN rec_paciente p ON a.idpaciente = p.id
            WHERE a.id = ? AND a.auditado IS NOT NULL
        `;

        const [auditoriaResult] = await connection.execute(sqlVerificar, [id]);

        if (!auditoriaResult || auditoriaResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Auditoría no encontrada o no está procesada'
            });
        }

        const auditoria = auditoriaResult[0];

        // Verificar que el paciente tenga email
        if (!auditoria.email || auditoria.email.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El paciente no tiene email registrado'
            });
        }

        console.log(`📧 Email del paciente: ${auditoria.email}`);

        // 2. VERIFICAR PDF
        const nombreArchivo = `audinro${id}.pdf`;
        const rutaArchivo = `/var/www/cpce.recetasalud.ar/audi/tmp/${nombreArchivo}`;
        const urlPDF = `https://test1.recetasalud.ar/audi/tmp/${nombreArchivo}`;

        let pdfExiste = false;
        try {
            await fs.access(rutaArchivo);
            console.log(`✅ PDF encontrado: ${nombreArchivo}`);
            pdfExiste = true;
        } catch (fileError) {
            console.log(`⚠️ PDF no encontrado: ${nombreArchivo}`);
            pdfExiste = false;
        }

        // 3. PREPARAR CONTENIDO DEL EMAIL
        const estadoTexto = {
            1: 'APROBADO',
            2: 'RECHAZADO',
            3: 'OBSERVADO'
        }[auditoria.auditado] || 'PROCESADO';

        const asunto = `Auditoría ${estadoTexto} - ${auditoria.apellido}, ${auditoria.nombre}`;

        let mensaje = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Estimado/a ${auditoria.nombre} ${auditoria.apellido}</h2>
                <p>Le informamos que su auditoría médica ha sido <strong style="color: ${auditoria.auditado === 1 ? '#059669' : auditoria.auditado === 2 ? '#dc2626' : '#d97706'};">${estadoTexto}</strong>.</p>
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Datos del paciente:</h3>
                    <ul style="margin: 10px 0;">
                        <li><strong>DNI:</strong> ${auditoria.dni}</li>
                        <li><strong>Estado:</strong> ${estadoTexto}</li>
                        <li><strong>Fecha de reenvío:</strong> ${new Date().toLocaleDateString('es-ES')}</li>
                    </ul>
                </div>
        `;

        if (auditoria.nota) {
            mensaje += `
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <p><strong>Observaciones:</strong> ${auditoria.nota}</p>
                </div>
            `;
        }

        if (auditoria.auditado === 1) {
            mensaje += `
                <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                    <p>✅ Su receta electrónica ha sido <strong>aprobada</strong>.</p>
                    ${pdfExiste ? '<p>📎 Puede descargar el PDF adjunto o acceder al siguiente enlace:</p>' : '<p>Puede acceder al siguiente enlace:</p>'}
                    <p><a href="${urlPDF}" target="_blank" style="color: #2563eb; text-decoration: none;">🔗 Descargar Receta PDF</a></p>
                </div>
            `;
        } else if (auditoria.auditado === 2) {
            mensaje += `
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                    <p>❌ Lamentablemente su prescripción ha sido <strong>denegada</strong> después de haber sido evaluada por nuestro equipo de auditoría médica.</p>
                    <p>Si tiene alguna pregunta o necesita ayuda para obtener un medicamento alternativo, no dude en comunicarse con su médico de confianza o con nuestra Institución.</p>
                </div>
            `;
        } else if (auditoria.auditado === 3) {
            mensaje += `
                <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <p>⚠️ Su prescripción tiene <strong>observaciones</strong>.</p>
                    <p>Por favor, revise ${pdfExiste ? 'el PDF adjunto' : 'el siguiente enlace'} para más detalles:</p>
                    <p><a href="${urlPDF}" target="_blank" style="color: #2563eb; text-decoration: none;">🔗 Ver Detalles en PDF</a></p>
                </div>
            `;
        }

        mensaje += `
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p>Saludos cordiales,<br>
                    <strong>Equipo de Auditoría Médica</strong><br>
                    Colegio Médico Provincia de Córdoba</p>
                </div>
            </div>
        `;

        // 4. CONFIGURAR Y ENVIAR EMAIL
        const opcionesEmail = {
            destinatario: auditoria.email,
            asunto: asunto,
            adjuntarPDF: pdfExiste && (auditoria.auditado === 1 || auditoria.auditado === 3),
            rutaPDF: pdfExiste ? rutaArchivo : null
        };

        console.log('Configuración del email:', opcionesEmail);

        const resultadoEmail = await enviarEmailSimplificado(mensaje, opcionesEmail);

        if (resultadoEmail.success) {
            console.log(`✅ Email reenviado exitosamente a ${auditoria.email}`);

            res.json({
                success: true,
                message: 'Email reenviado correctamente',
                data: {
                    id: id,
                    email: auditoria.email,
                    paciente: `${auditoria.apellido}, ${auditoria.nombre}`,
                    estado: estadoTexto,
                    fecha_envio: new Date().toISOString(),
                    pdf_adjunto: opcionesEmail.adjuntarPDF,
                    messageId: resultadoEmail.messageId
                }
            });
        } else {
            console.error(`❌ Error enviando email: ${resultadoEmail.message}`);

            return res.status(500).json({
                success: false,
                message: `Error al enviar email: ${resultadoEmail.message}`
            });
        }

    } catch (error) {
        console.error('❌ Error en reenviarEmail:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};
// FUNCIÓN AUXILIAR: Regenerar PDF para email
async function regenerarPDFParaEmail(auditoriaId, connection) {
    try {
        console.log(`🔄 Regenerando PDF para auditoría ${auditoriaId}`);

        // Reutilizar la lógica de generarPDF pero simplificada
        const sqlAuditoria = `SELECT * FROM rec_auditoria WHERE id = ?`;
        const [auditoriaResult] = await connection.execute(sqlAuditoria, [auditoriaId]);

        if (!auditoriaResult || auditoriaResult.length === 0) {
            throw new Error('Auditoría no encontrada para regenerar PDF');
        }

        const auditoria = auditoriaResult[0];
        const ciclo = auditoria.cantmeses;

        // Generar QR
        const nombreArchivo = `audinro${auditoriaId}.pdf`;
        const urlPDF = `https://test1.recetasalud.ar/audi/tmp/${nombreArchivo}`;
        const qrCodeDataURL = await QRCode.toDataURL(urlPDF);

        let htmlContent = '';
        let medicamentosAutorizados = 0;

        // Procesar cada receta del ciclo
        for (let i = 0; i < ciclo; i++) {
            const nroReceta = `idreceta${i + 1}`;
            const idreceta = auditoria[nroReceta];

            if (!idreceta) continue;

            // Obtener datos de la receta
            const sqlReceta = `
                SELECT r.fechaemision, r.diagnostico, r.idobrasocafiliado,
                       p.dni, p.apellido, p.nombre, p.sexo, p.fecnac,
                       o.sigla, p.nromatriculadoc,
                       pp.apellido AS medape, pp.nombre AS mednom, r.matricprescr
                FROM rec_receta AS r
                INNER JOIN rec_paciente AS p ON r.idpaciente = p.id
                INNER JOIN rec_obrasoc AS o ON o.id = r.idobrasocafiliado
                INNER JOIN tmp_person AS pp ON pp.matricula = r.matricprescr
                WHERE r.idreceta = ?
            `;
            const [recetaResult] = await connection.execute(sqlReceta, [idreceta]);

            if (!recetaResult || recetaResult.length === 0) continue;

            const receta = recetaResult[0];

            // Configurar tabla según obra social
            let tablavadem = 'vademecum';
            let logoHeader = 'cmpc.jpg';

            switch (receta.idobrasocafiliado) {
                case 156:
                    tablavadem = 'vad_muni';
                    logoHeader = '156.jpg';
                    break;
                case 20:
                    tablavadem = 'vad_020';
                    logoHeader = '20.jpg';
                    break;
            }

            // Obtener medicamentos
            const sqlMedicamentos = `
                SELECT p.idreceta, p.nro_orden, 
                       DATE_FORMAT(r.fechaemision, '%d-%m-%Y') as fecha, 
                       DATE_FORMAT(DATE_ADD(r.fechaemision, INTERVAL 30 DAY), '%d-%m-%Y') as fechavto,
                       p.cantprescripta, p.posologia, 
                       v.monodroga, v.nombre_comercial, v.presentacion, 
                       v.tipo_venta, p.estado_auditoria,
                       p.porcentajecobertura as cobertura, p.cobertura2,
                       p.numero_farmalink, p.autorizacion_especial
                FROM rec_prescrmedicamento p
                INNER JOIN ${tablavadem} v ON p.codigo = v.codigo
                INNER JOIN rec_receta r ON p.idreceta = r.idreceta
                WHERE p.idreceta = ?
                ORDER BY p.nro_orden
            `;
            const [medicamentosResult] = await connection.execute(sqlMedicamentos, [idreceta]);

            if (!medicamentosResult || medicamentosResult.length === 0) continue;

            // Procesar identidad del paciente (siempre usar identidad completa para emails)
            const identidadPaciente = `<b>${receta.apellido} ${receta.nombre}</b> DNI: ${receta.dni}`;

            // Generar HTML para cada medicamento
            for (const medicamento of medicamentosResult) {
                if (medicamento.estado_auditoria == 1) {
                    medicamentosAutorizados++;

                    const numeroReceta = medicamento.numero_farmalink || medicamento.idreceta;
                    const numeroDisplay = `${numeroReceta}-${medicamento.nro_orden}`;

                    let autorizacionEspecialInfo = '';
                    if (medicamento.autorizacion_especial) {
                        autorizacionEspecialInfo = `
                            <div style="background-color: #f0f0f0; padding: 5px; border: 1px solid #ccc; margin: 5px 0;">
                                <b>AUTORIZACIÓN ESPECIAL:</b> ${medicamento.autorizacion_especial}
                            </div>
                        `;
                    }

                    const codigoBarras = await PDFUtils.generarCodigoBarras(numeroDisplay);
                    const codigoBarrasAfiliado = await PDFUtils.generarCodigoBarras(receta.nromatriculadoc);

                    htmlContent += generarHTMLReceta({
                        logoHeader,
                        numeroDisplay,
                        autorizacionEspecialInfo,
                        fecha: medicamento.fecha,
                        identidadPaciente,
                        obraSocial: receta.sigla,
                        nroMatricula: receta.nromatriculadoc,
                        medicamento,
                        diagnostico: receta.diagnostico,
                        qrCode: qrCodeDataURL,
                        firma: '',
                        medico: `${receta.mednom} ${receta.medape}`,
                        matricula: receta.matricprescr,
                        especialidad: '',
                        codigoBarras,
                        codigoBarrasAfiliado,
                        fechaVence: medicamento.fechavto
                    });

                    // Duplicado para tipo_venta 3
                    if (medicamento.tipo_venta == 3) {
                        htmlContent += generarHTMLRecetaDuplicado({
                            logoHeader,
                            numeroDisplay,
                            autorizacionEspecialInfo,
                            fecha: medicamento.fecha,
                            identidadPaciente,
                            obraSocial: receta.sigla,
                            nroMatricula: receta.nromatriculadoc,
                            medicamento,
                            diagnostico: receta.diagnostico,
                            qrCode: qrCodeDataURL,
                            firma: '',
                            medico: `${receta.mednom} ${receta.medape}`,
                            matricula: receta.matricprescr,
                            especialidad: '',
                            codigoBarras,
                            codigoBarrasAfiliado,
                            fechaVence: medicamento.fechavto
                        });
                    }
                } else {
                    // Medicamento no autorizado
                    htmlContent += generarHTMLRecetaRechazada({
                        logoHeader,
                        identidadPaciente,
                        obraSocial: receta.sigla,
                        nroMatricula: receta.nromatriculadoc,
                        medicamento,
                        nota: auditoria.nota || 'Medicamento no autorizado'
                    });
                }
            }
        }

        if (!htmlContent) {
            throw new Error('No hay contenido para generar el PDF');
        }

        // Generar PDF
        const pdfBuffer = await PDFUtils.generarPDFDesdeHTML(htmlContent);

        // Guardar PDF
        const rutaLocal = `/var/www/cpce.recetasalud.ar/audi/tmp/`;
        const rutaAzure = `/mnt/fscpcess01/prod/`;

        // Crear directorios si no existen
        await fs.mkdir(rutaLocal, { recursive: true }).catch(() => { });
        await fs.mkdir(rutaAzure, { recursive: true }).catch(() => { });

        // Guardar en ambas ubicaciones
        await fs.writeFile(path.join(rutaLocal, nombreArchivo), pdfBuffer);
        await fs.writeFile(path.join(rutaAzure, nombreArchivo), pdfBuffer);

        console.log(`✅ PDF regenerado exitosamente: ${nombreArchivo}`);
        return true;

    } catch (error) {
        console.error('❌ Error regenerando PDF:', error);
        throw error;
    }

    // FUNCIÓN AUXILIAR MEJORADA: Enviar email con adjuntos
    async function enviarEmailRecetas(auditoria, htmlContent, idauditoria, opciones = {}) {
        try {
            console.log(`📧 Enviando email para auditoría ${idauditoria}`);

            // Configuración del transporter de nodemailer
            const transporter = nodemailer.createTransporter({
                host: process.env.SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com',
                port: process.env.SMTP_PORT || 465,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER || 'AKIAT6MBAVXI5NZU2ABU',
                    pass: process.env.SMTP_PASS || 'BCfSMSUVTvYik0LwLQYzYrdLNtKWli7w2UpU++5ENSXk'
                }
            });

            // Configurar opciones del email
            const mailOptions = {
                from: process.env.SMTP_FROM || '"Auditoría Médica" <auditoria@cmpc.org.ar>',
                to: opciones.destinatario,
                subject: opciones.asunto || `Auditoría Médica - ID ${idauditoria}`,
                html: htmlContent,
                attachments: []
            };

            // Adjuntar PDF si es necesario
            if (opciones.adjuntarPDF && opciones.rutaPDF) {
                try {
                    await fs.access(opciones.rutaPDF);
                    mailOptions.attachments.push({
                        filename: `auditoria-${idauditoria}.pdf`,
                        path: opciones.rutaPDF,
                        contentType: 'application/pdf'
                    });
                    console.log(`📎 PDF adjuntado: ${opciones.rutaPDF}`);
                } catch (fileError) {
                    console.warn(`⚠️ No se pudo adjuntar el PDF: ${fileError.message}`);
                }
            }

            // Enviar email
            const info = await transporter.sendMail(mailOptions);

            console.log(`✅ Email enviado exitosamente: ${info.messageId}`);
            return {
                success: true,
                messageId: info.messageId,
                destinatario: opciones.destinatario
            };

        } catch (error) {
            console.error('❌ Error enviando email:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }


};