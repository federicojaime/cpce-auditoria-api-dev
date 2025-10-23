import { executeQuery, getConnection } from '../config/database.js';
import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';
import PDFUtils from '../utils/pdfUtils.js';
import QRCode from 'qrcode';
import { generarHTMLReceta, generarHTMLRecetaDuplicado, generarHTMLRecetaRechazada } from './auditoriasController.js';

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

// RECETAS PENDIENTES DE ALTO COSTO (SIN rec_auditoria)
// estado_auditoria: 0=Pendiente, 1=Aprobado, 2=Rechazado, 3=Observado
export const getPendientes = async (req, res) => {
    try {
        const { rol } = req.user;
        const { search = '', page = 1, limit = 10 } = req.query;

        // Recetas pendientes = medicamentos con estado_auditoria = 0 o NULL
        let sql = `
            SELECT
                r.idreceta as id,
                CONCAT(UPPER(SUBSTRING(p.apellido, 1, 1)), LOWER(SUBSTRING(p.apellido, 2))) AS apellido,
                CONCAT(UPPER(SUBSTRING(p.nombre, 1, 1)), LOWER(SUBSTRING(p.nombre, 2))) AS nombre,
                p.dni,
                DATE_FORMAT(r.fechaemision, '%d-%m-%Y') AS fecha,
                CONCAT(
                    CONCAT(UPPER(SUBSTRING(m.nombre, 1, 1)), LOWER(SUBSTRING(m.nombre, 2))), ' ',
                    CONCAT(UPPER(SUBSTRING(m.apellido, 1, 1)), LOWER(SUBSTRING(m.apellido, 2))), ' MP-', m.matricula
                ) AS medico,
                COUNT(DISTINCT pm.nro_orden) as renglones,
                COALESCE(SUM(v.precio * pm.cantprescripta), 0) as precio_total
            FROM rec_receta_alto_costo r
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            INNER JOIN tmp_person m ON r.matricprescr = m.matricula
            INNER JOIN rec_prescrmedicamento_alto_costo pm ON r.idreceta = pm.idreceta
            LEFT JOIN vad_020 v ON pm.codigo = v.codigo
            WHERE r.idobrasocafiliado = 20
              AND (pm.estado_auditoria = 0 OR pm.estado_auditoria IS NULL)
        `;

        let params = [];

        // Agregar búsqueda
        if (search && search.trim()) {
            sql += " AND (p.apellido LIKE ? OR p.nombre LIKE ? OR p.dni LIKE ?)";
            const searchParam = `%${search.trim()}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        sql += " GROUP BY r.idreceta, p.apellido, p.nombre, p.dni, r.fechaemision, m.nombre, m.apellido, m.matricula";

        // Contar total
        let countSql = `
            SELECT COUNT(DISTINCT r.idreceta) as total
            FROM rec_receta_alto_costo r
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            INNER JOIN rec_prescrmedicamento_alto_costo pm ON r.idreceta = pm.idreceta
            WHERE r.idobrasocafiliado = 20
              AND (pm.estado_auditoria = 0 OR pm.estado_auditoria IS NULL)
        `;

        if (search && search.trim()) {
            countSql += " AND (p.apellido LIKE ? OR p.nombre LIKE ? OR p.dni LIKE ?)";
        }

        console.log('[ALTO COSTO] Count SQL:', countSql);
        const countResult = await executeQuery(countSql, params);
        const total = countResult[0]?.total || 0;
        console.log('[ALTO COSTO] Total encontrado:', total);

        const totalPages = Math.ceil(total / parseInt(limit));

        // Agregar paginación
        sql += ` ORDER BY r.fechaemision ASC LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page) - 1) * parseInt(limit)}`;

        console.log('[ALTO COSTO] Data SQL:', sql);
        const result = await executeQuery(sql, params);
        console.log('[ALTO COSTO] Resultados encontrados:', result.length);

        res.json({
            success: true,
            data: result,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages
            }
        });

    } catch (error) {
        console.error('[ALTO COSTO] Error obteniendo pendientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// RECETAS PROCESADAS/HISTÓRICAS DE ALTO COSTO
// estado_auditoria != 0 AND NOT NULL (ya fueron auditadas)
export const getHistoricas = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        console.log('[ALTO COSTO] Parámetros recibidos:', { search, page: pageNum, limit: limitNum, offset });

        // Recetas históricas = medicamentos con estado_auditoria != 0 y NOT NULL
        let countSql = `
            SELECT COUNT(DISTINCT r.idreceta) as total
            FROM rec_receta_alto_costo r
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            INNER JOIN rec_prescrmedicamento_alto_costo pm ON r.idreceta = pm.idreceta
            WHERE r.idobrasocafiliado = 20
              AND pm.estado_auditoria IS NOT NULL
              AND pm.estado_auditoria != 0
        `;

        let sql = `
            SELECT
                r.idreceta as id,
                CONCAT(UPPER(SUBSTRING(p.apellido, 1, 1)), LOWER(SUBSTRING(p.apellido, 2))) AS apellido,
                CONCAT(UPPER(SUBSTRING(p.nombre, 1, 1)), LOWER(SUBSTRING(p.nombre, 2))) AS nombre,
                p.dni,
                DATE_FORMAT(r.fechaemision, '%d-%m-%Y') AS fecha,
                CONCAT(
                    CONCAT(UPPER(SUBSTRING(m.nombre, 1, 1)), LOWER(SUBSTRING(m.nombre, 2))), ' ',
                    CONCAT(UPPER(SUBSTRING(m.apellido, 1, 1)), LOWER(SUBSTRING(m.apellido, 2))), ' MP-', m.matricula
                ) AS medico,
                COUNT(DISTINCT pm.nro_orden) as renglones,
                DATE_FORMAT(MAX(pm.fecha_auditoria), '%d-%m-%Y') AS fechaAuditoria,
                CONCAT(
                    CONCAT(UPPER(SUBSTRING(au.nombre, 1, 1)), LOWER(SUBSTRING(au.nombre, 2))), ' ',
                    CONCAT(UPPER(SUBSTRING(au.apellido, 1, 1)), LOWER(SUBSTRING(au.apellido, 2)))
                ) AS auditor,
                COALESCE(SUM(v.precio * pm.cantprescripta), 0) as precio_total
            FROM rec_receta_alto_costo r
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            INNER JOIN tmp_person m ON r.matricprescr = m.matricula
            INNER JOIN rec_prescrmedicamento_alto_costo pm ON r.idreceta = pm.idreceta
            LEFT JOIN user_au au ON pm.id_auditor = au.id
            LEFT JOIN vad_020 v ON pm.codigo = v.codigo
            WHERE r.idobrasocafiliado = 20
              AND pm.estado_auditoria IS NOT NULL
              AND pm.estado_auditoria != 0
        `;

        let params = [];

        // Agregar búsqueda
        if (search && search.trim()) {
            const searchCondition = ` AND (p.apellido LIKE ? OR p.nombre LIKE ? OR p.dni LIKE ?)`;
            countSql += searchCondition;
            sql += searchCondition;
            const searchParam = `%${search.trim()}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        sql += " GROUP BY r.idreceta, p.apellido, p.nombre, p.dni, r.fechaemision, m.nombre, m.apellido, m.matricula, au.nombre, au.apellido";

        // Contar total
        console.log('[ALTO COSTO] Count SQL:', countSql);
        const countResult = await executeQuery(countSql, params);
        const total = countResult[0]?.total || 0;
        const totalPages = Math.ceil(total / limitNum);

        console.log('[ALTO COSTO] Total registros:', total, 'Total páginas:', totalPages);

        // Agregar paginación
        sql += ` ORDER BY MAX(pm.fecha_auditoria) DESC LIMIT ${limitNum} OFFSET ${offset}`;

        console.log('[ALTO COSTO] Data SQL:', sql);
        const resultados = await executeQuery(sql, params);
        console.log('[ALTO COSTO] Registros obtenidos:', resultados.length);

        res.json({
            success: true,
            data: resultados,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages
        });

    } catch (error) {
        console.error('[ALTO COSTO] Error obteniendo históricas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// OBTENER DETALLES COMPLETOS DE UNA RECETA DE ALTO COSTO
export const getAuditoriaCompleta = async (req, res) => {
    try {
        const { id } = req.params; // idreceta

        console.log('[ALTO COSTO] Obteniendo receta ID:', id);

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: `ID inválido: ${id}. Debe ser un número.`
            });
        }

        // 1. Obtener datos de la receta
        const sqlReceta = `
            SELECT
                r.idreceta,
                r.idpaciente,
                r.matricprescr as idprescriptor,
                DATE_FORMAT(r.fechaemision, '%d/%m/%Y') as fecha_origen,
                r.diagnostico,
                r.diagnostico2,
                r.idobrasocafiliado as idobrasoc
            FROM rec_receta_alto_costo r
            WHERE r.idreceta = ?
        `;

        const recetaResult = await executeQuery(sqlReceta, [id]);

        if (!recetaResult || recetaResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Receta de alto costo no encontrada'
            });
        }

        const receta = recetaResult[0];

        // 2. Obtener datos del paciente
        const sqlPaciente = `
            SELECT
                p.id,
                p.apellido,
                p.nombre,
                p.dni,
                p.sexo,
                DATE_FORMAT(p.fecnac, '%d/%m/%Y') as fecha_nacimiento,
                TIMESTAMPDIFF(YEAR, p.fecnac, CURDATE()) as edad,
                p.telefono,
                p.email,
                p.talla,
                p.peso
            FROM rec_paciente p
            WHERE p.id = ?
        `;

        const pacienteResult = await executeQuery(sqlPaciente, [receta.idpaciente]);
        const paciente = pacienteResult[0] || {};

        // 3. Obtener medicamentos
        const sqlMedicamentos = `
            SELECT
                pm.idreceta,
                pm.nro_orden,
                pm.codigo,
                pm.cantprescripta,
                pm.posologia,
                pm.porcentajecobertura,
                pm.cobertura2,
                pm.estado_auditoria,
                pm.observacion,
                pm.fecha_auditoria,
                pm.id_auditor,
                v.monodroga,
                v.nombre_comercial,
                v.presentacion,
                v.tipo_venta,
                COALESCE(v.precio, 0) as precio_unitario,
                COALESCE(v.precio * pm.cantprescripta, 0) as precio_total
            FROM rec_prescrmedicamento_alto_costo pm
            LEFT JOIN vad_020 v ON pm.codigo = v.codigo
            WHERE pm.idreceta = ?
            ORDER BY pm.nro_orden
        `;

        const medicamentos = await executeQuery(sqlMedicamentos, [id]);

        // Calcular precio total de la auditoría
        const precio_total_auditoria = medicamentos.reduce((sum, med) => sum + parseFloat(med.precio_total || 0), 0);

        // 4. Obtener datos del médico
        const sqlMedico = `
            SELECT
                t.matricula,
                CONCAT(t.nombre, ' ', t.apellido) as nombre_completo,
                e.especialidad
            FROM tmp_person t
            LEFT JOIN tmp_especialistas e ON t.matricula = e.matricula
            WHERE t.matricula = ?
        `;

        const medicoResult = await executeQuery(sqlMedico, [receta.idprescriptor]);
        const medico = medicoResult[0] || {};

        res.json({
            success: true,
            auditoria: {
                id: receta.idreceta,
                ...receta,
                paciente,
                medico,
                medicamentos,
                renglones: medicamentos.length,
                precio_total: precio_total_auditoria
            }
        });

    } catch (error) {
        console.error('[ALTO COSTO] Error obteniendo receta completa:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// PROCESAR RECETA DE ALTO COSTO (Aprobar/Rechazar medicamentos)
export const procesarAuditoria = async (req, res) => {
    let connection = null;

    try {
        const { id } = req.params; // idreceta
        const { id: userId, rol } = req.user;
        const {
            chequedos = '',
            nochequeados = '',
            cobert1, cobert2_1,
            nota = ''
        } = req.body;

        console.log('[ALTO COSTO] Procesando receta ID:', id);
        console.log('[ALTO COSTO] Usuario:', { userId, rol });

        connection = await getConnection();

        const aprobados = chequedos.split(',').filter(Boolean);
        const rechazados = nochequeados.split(',').filter(Boolean);

        console.log('[ALTO COSTO] Medicamentos aprobados:', aprobados);
        console.log('[ALTO COSTO] Medicamentos rechazados:', rechazados);

        // PROCESAR MEDICAMENTOS APROBADOS (estado = 1)
        for (const item of aprobados) {
            const [idReceta, nroOrden] = item.split('_');
            const cobertura = cobert1 || 50;
            const cobertura2 = cobert2_1 || 'CE';

            const sqlUpdate = `
                UPDATE rec_prescrmedicamento_alto_costo
                SET estado_auditoria = 1,
                    porcentajecobertura = ?,
                    cobertura2 = ?,
                    fecha_auditoria = NOW(),
                    id_auditor = ?,
                    observacion = COALESCE(?, observacion)
                WHERE idreceta = ? AND nro_orden = ?
            `;

            await connection.execute(sqlUpdate, [
                parseInt(cobertura) || 50,
                cobertura2 || 'CE',
                userId,
                nota || null,
                idReceta,
                nroOrden
            ]);

            console.log(`[ALTO COSTO] Medicamento aprobado: ${item}`);
        }

        // PROCESAR MEDICAMENTOS RECHAZADOS (estado = 2)
        for (const item of rechazados) {
            const [idReceta, nroOrden] = item.split('_');

            const sqlUpdate = `
                UPDATE rec_prescrmedicamento_alto_costo
                SET estado_auditoria = 2,
                    fecha_auditoria = NOW(),
                    id_auditor = ?,
                    observacion = ?
                WHERE idreceta = ? AND nro_orden = ?
            `;

            await connection.execute(sqlUpdate, [userId, nota, idReceta, nroOrden]);
            console.log(`[ALTO COSTO] Medicamento rechazado: ${item}`);
        }

        // Si hay medicamentos aprobados, crear registro en tabla de compras
        if (aprobados.length > 0) {
            const sqlCompras = `
                INSERT INTO rec_compras_alto_costo (idreceta, estado_compra, id_usuario_compras, fecha_recepcion)
                VALUES (?, 'pendiente_envio', ?, NOW())
                ON DUPLICATE KEY UPDATE
                    estado_compra = 'pendiente_envio',
                    id_usuario_compras = ?,
                    fecha_recepcion = NOW()
            `;

            await connection.execute(sqlCompras, [id, userId, userId]);
            console.log(`[ALTO COSTO] Receta enviada a COMPRAS (estado: pendiente_envio)`);
        }

        console.log(`[ALTO COSTO] Receta procesada exitosamente`);

        res.json({
            success: true,
            message: 'Receta de alto costo procesada exitosamente',
            aprobados: aprobados.length,
            rechazados: rechazados.length,
            enviadoACompras: aprobados.length > 0
        });

    } catch (error) {
        console.error('[ALTO COSTO] Error procesando receta:', error);
        res.status(500).json({
            success: false,
            message: 'Error procesando receta de alto costo',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// GENERAR PDF DE ALTO COSTO
export const generarPDF = async (req, res) => {
    let connection = null;

    try {
        const { id } = req.params; // idreceta
        const { estado = "0" } = req.body;

        console.log(`[ALTO COSTO] Iniciando generación de PDF para receta ${id}`);

        connection = await getConnection();

        // 1. Obtener datos de la receta
        const sqlReceta = `
            SELECT
                r.*,
                p.dni, p.apellido, p.nombre, p.sexo, p.fecnac, p.nromatriculadoc,
                o.sigla,
                m.apellido AS medape, m.nombre AS mednom, m.matricula
            FROM rec_receta_alto_costo r
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            INNER JOIN rec_obrasoc o ON o.id = r.idobrasocafiliado
            INNER JOIN tmp_person m ON m.matricula = r.matricprescr
            WHERE r.idreceta = ?
        `;

        const [recetaResult] = await connection.execute(sqlReceta, [id]);

        if (!recetaResult || recetaResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Receta de alto costo no encontrada'
            });
        }

        const receta = recetaResult[0];

        // 2. Obtener medicamentos
        let tablavadem = 'vad_020'; // Obra social 20
        if (receta.idobrasocafiliado === 156) {
            tablavadem = 'vad_muni';
        }

        const sqlMedicamentos = `
            SELECT
                pm.idreceta, pm.nro_orden,
                DATE_FORMAT(r.fechaemision, '%d-%m-%Y') as fecha,
                DATE_FORMAT(DATE_ADD(r.fechaemision, INTERVAL 30 DAY), '%d-%m-%Y') as fechavto,
                pm.cantprescripta, pm.posologia,
                v.monodroga, v.nombre_comercial, v.presentacion,
                v.tipo_venta, pm.estado_auditoria,
                pm.porcentajecobertura as cobertura, pm.cobertura2,
                pm.numero_farmalink, pm.autorizacion_especial
            FROM rec_prescrmedicamento_alto_costo pm
            INNER JOIN ${tablavadem} v ON pm.codigo = v.codigo
            INNER JOIN rec_receta_alto_costo r ON pm.idreceta = r.idreceta
            WHERE pm.idreceta = ?
            ORDER BY pm.nro_orden
        `;

        const [medicamentosResult] = await connection.execute(sqlMedicamentos, [id]);

        if (!medicamentosResult || medicamentosResult.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No hay medicamentos para generar el PDF'
            });
        }

        // 3. Generar HTML
        const nombreArchivo = `receta_alto_costo_${id}.pdf`;
        const isDev = process.env.NODE_ENV !== 'production';
        const urlPDF = isDev
            ? `http://localhost:${process.env.PORT || 3000}/pdfs/${nombreArchivo}`
            : `https://test1.recetasalud.ar/audi/tmp/${nombreArchivo}`;

        const qrCodeDataURL = await QRCode.toDataURL(urlPDF);

        let htmlContent = '';
        let medicamentosAutorizados = 0;

        // Procesar identidad del paciente
        let identidadPaciente = `<b>${receta.apellido} ${receta.nombre}</b> DNI: ${receta.dni}`;
        if (estado == "1") {
            const fechaNac = new Date(receta.fecnac);
            const fechaFormateada = fechaNac.toLocaleDateString('es-ES').replace(/\//g, '');
            identidadPaciente = `${receta.sexo}${receta.nombre.substring(0, 2).toUpperCase()}${receta.apellido.substring(0, 2).toUpperCase()}${fechaFormateada}`;
        }

        let logoHeader = receta.idobrasocafiliado === 156 ? '156.jpg' : '20.jpg';

        // Generar HTML para cada medicamento
        for (const medicamento of medicamentosResult) {
            if (medicamento.estado_auditoria == 1) {
                medicamentosAutorizados++;
            }

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
                matricula: receta.matricula,
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
                    matricula: receta.matricula,
                    especialidad: '',
                    codigoBarras,
                    codigoBarrasAfiliado,
                    fechaVence: medicamento.fechavto
                });
            }
        }

        // 4. Generar PDF
        const pdfBuffer = await PDFUtils.generarPDFDesdeHTML(htmlContent);

        // 5. Guardar PDF
        let rutaPrincipal;
        if (isDev) {
            rutaPrincipal = path.join(process.cwd(), 'pdfs-generated');
        } else {
            rutaPrincipal = `/var/www/test1.recetasalud.ar/audi/tmp/`;
        }

        const rutaAzure = `/mnt/fscpcess01/prod/`;

        await fs.mkdir(rutaPrincipal, { recursive: true }).catch(() => { });
        await fs.writeFile(path.join(rutaPrincipal, nombreArchivo), pdfBuffer);

        if (!isDev) {
            await fs.mkdir(rutaAzure, { recursive: true }).catch(() => { });
            await fs.writeFile(path.join(rutaAzure, nombreArchivo), pdfBuffer);
        }

        console.log(`[ALTO COSTO] PDF generado: ${nombreArchivo}`);

        res.json({
            success: true,
            message: 'PDF de alto costo generado correctamente',
            data: {
                nombreArchivo,
                url: urlPDF,
                medicamentosAutorizados
            }
        });

    } catch (error) {
        console.error('[ALTO COSTO] Error generando PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error generando PDF de alto costo',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};
