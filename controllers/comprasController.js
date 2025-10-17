import { executeQuery, getConnection } from '../config/database.js';
import nodemailer from 'nodemailer';

// Configurar transporter de nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT == 465,
    auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
    }
});

// ============================================
// FUNCIÓN AUXILIAR: ENVIAR EMAILS A PROVEEDORES
// ============================================
async function enviarEmailsProveedores(idReceta, medicamentos, proveedoresData) {
    try {
        console.log('[COMPRAS] Enviando emails a proveedores...');

        // Obtener datos de la receta para el email
        const sqlReceta = `
            SELECT
                r.idreceta,
                p.apellido,
                p.nombre,
                p.dni,
                DATE_FORMAT(r.fechaemision, '%d/%m/%Y') as fecha_emision,
                r.diagnostico
            FROM rec_receta_alto_costo r
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            WHERE r.idreceta = ?
        `;

        const recetaResult = await executeQuery(sqlReceta, [idReceta]);
        const receta = recetaResult[0];

        // Obtener medicamentos aprobados
        const sqlMedicamentos = `
            SELECT
                pm.nro_orden,
                pm.cantprescripta,
                v.monodroga,
                v.nombre_comercial,
                v.presentacion
            FROM rec_prescrmedicamento_alto_costo pm
            LEFT JOIN vad_020 v ON pm.codigo = v.codigo
            WHERE pm.idreceta = ? AND pm.estado_auditoria = 1
            ORDER BY pm.nro_orden
        `;

        const medicamentosResult = await executeQuery(sqlMedicamentos, [idReceta]);

        // Construir lista de medicamentos para el email
        let listaMedicamentos = '';
        medicamentosResult.forEach((med, index) => {
            listaMedicamentos += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${med.monodroga || 'N/A'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${med.nombre_comercial || 'N/A'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${med.presentacion || 'N/A'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${med.cantprescripta}</td>
                </tr>
            `;
        });

        // Enviar email a cada proveedor
        for (const proveedor of proveedoresData) {
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9f9f9; }
                        .table { width: 100%; border-collapse: collapse; margin: 20px 0; background-color: white; }
                        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
                        .btn { display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Solicitud de Presupuesto - Alto Costo</h1>
                            <p>Colegio de Médicos de la Provincia de Córdoba</p>
                        </div>

                        <div class="content">
                            <h2>Estimado/a proveedor: ${proveedor.nombre}</h2>

                            <p>Se solicita presupuesto para los siguientes medicamentos de <strong>Alto Costo</strong>:</p>

                            <h3>Datos del Paciente:</h3>
                            <ul>
                                <li><strong>Apellido y Nombre:</strong> ${receta.apellido}, ${receta.nombre}</li>
                                <li><strong>DNI:</strong> ${receta.dni}</li>
                                <li><strong>Fecha de Emisión:</strong> ${receta.fecha_emision}</li>
                                <li><strong>Diagnóstico:</strong> ${receta.diagnostico || 'No especificado'}</li>
                            </ul>

                            <h3>Medicamentos Solicitados:</h3>
                            <table class="table">
                                <thead style="background-color: #f0f0f0;">
                                    <tr>
                                        <th style="padding: 8px; border: 1px solid #ddd;">#</th>
                                        <th style="padding: 8px; border: 1px solid #ddd;">Monodroga</th>
                                        <th style="padding: 8px; border: 1px solid #ddd;">Nombre Comercial</th>
                                        <th style="padding: 8px; border: 1px solid #ddd;">Presentación</th>
                                        <th style="padding: 8px; border: 1px solid #ddd;">Cantidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${listaMedicamentos}
                                </tbody>
                            </table>

                            <p><strong>Importante:</strong></p>
                            <ul>
                                <li>Por favor, envíe su presupuesto detallando precio unitario, disponibilidad y tiempo de entrega</li>
                                <li>Incluir marca y presentación exacta del medicamento ofrecido</li>
                                <li>Especificar condiciones comerciales (forma de pago, descuentos, etc.)</li>
                            </ul>

                            <p style="text-align: center;">
                                <a href="${process.env.FRONTEND_URL}/proveedores/presupuestos" class="btn">
                                    Cargar Presupuesto
                                </a>
                            </p>

                            <p><strong>Receta N°:</strong> ${idReceta}</p>
                        </div>

                        <div class="footer">
                            <p>Este es un email automático del Sistema de Auditorías CMPC</p>
                            <p>Colegio de Médicos de la Provincia de Córdoba</p>
                            <p>Para consultas: receta@cmpc.org.ar</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const mailOptions = {
                from: `"${process.env.SMTP_SENDER_NAME}" <${process.env.SMTP_SENDER}>`,
                to: proveedor.email,
                subject: `Solicitud de Presupuesto - Receta Alto Costo N° ${idReceta}`,
                html: htmlContent
            };

            try {
                await transporter.sendMail(mailOptions);
                console.log(`[COMPRAS] Email enviado a: ${proveedor.nombre} (${proveedor.email})`);
            } catch (emailError) {
                console.error(`[COMPRAS] Error enviando email a ${proveedor.email}:`, emailError.message);
            }
        }

        console.log('[COMPRAS] Proceso de envío de emails completado');

    } catch (error) {
        console.error('[COMPRAS] Error en enviarEmailsProveedores:', error);
        // No lanzar error para no interrumpir el proceso principal
    }
}

// ============================================
// OBTENER AUDITORÍAS APROBADAS PENDIENTES DE ENVIAR A PROVEEDORES
// ============================================
export const getPendientes = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;

        console.log('[COMPRAS] Obteniendo recetas aprobadas pendientes');

        // Query para recetas con medicamentos aprobados pendientes de envío a proveedores
        let countSql = `
            SELECT COUNT(DISTINCT r.idreceta) as total
            FROM rec_receta_alto_costo r
            INNER JOIN rec_prescrmedicamento_alto_costo pm ON r.idreceta = pm.idreceta
            LEFT JOIN rec_compras_alto_costo c ON r.idreceta = c.idreceta
            WHERE r.idobrasocafiliado = 20
              AND pm.estado_auditoria = 1
              AND (c.estado_compra = 'pendiente_envio' OR c.estado_compra IS NULL)
        `;

        let dataSql = `
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
                COUNT(DISTINCT CASE WHEN pm.estado_auditoria = 1 THEN pm.nro_orden END) as medicamentos_aprobados,
                c.fecha_recepcion,
                c.estado_compra
            FROM rec_receta_alto_costo r
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            INNER JOIN tmp_person m ON r.matricprescr = m.matricula
            INNER JOIN rec_prescrmedicamento_alto_costo pm ON r.idreceta = pm.idreceta
            LEFT JOIN rec_compras_alto_costo c ON r.idreceta = c.idreceta
            WHERE r.idobrasocafiliado = 20
              AND pm.estado_auditoria = 1
              AND (c.estado_compra = 'pendiente_envio' OR c.estado_compra IS NULL)
        `;

        let params = [];

        // Agregar búsqueda si existe
        if (search && search.trim()) {
            const searchCondition = ` AND (p.apellido LIKE ? OR p.nombre LIKE ? OR p.dni LIKE ?)`;
            countSql += searchCondition;
            dataSql += searchCondition;
            const searchParam = `%${search.trim()}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        dataSql += ` GROUP BY r.idreceta, p.apellido, p.nombre, p.dni, r.fechaemision, m.nombre, m.apellido, m.matricula, c.fecha_recepcion, c.estado_compra`;
        dataSql += ` HAVING medicamentos_aprobados > 0`;

        // Contar total
        console.log('[COMPRAS] Count SQL:', countSql);
        const countResult = await executeQuery(countSql, params);
        const total = countResult[0]?.total || 0;
        const totalPages = Math.ceil(total / parseInt(limit));

        console.log('[COMPRAS] Total encontrado:', total);

        // Agregar paginación
        dataSql += ` ORDER BY r.fechaemision ASC LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page) - 1) * parseInt(limit)}`;

        console.log('[COMPRAS] Data SQL:', dataSql);
        const resultados = await executeQuery(dataSql, params);

        console.log('[COMPRAS] Resultados encontrados:', resultados.length);

        res.json({
            success: true,
            data: resultados,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages
            }
        });

    } catch (error) {
        console.error('[COMPRAS] Error obteniendo pendientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// ============================================
// OBTENER RECETAS ENVIADAS A PROVEEDORES
// ============================================
export const getEnviadas = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;

        console.log('[COMPRAS] Obteniendo recetas enviadas a proveedores');

        let countSql = `
            SELECT COUNT(DISTINCT r.idreceta) as total
            FROM rec_receta_alto_costo r
            INNER JOIN rec_compras_alto_costo c ON r.idreceta = c.idreceta
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            WHERE r.idobrasocafiliado = 20
              AND c.estado_compra IN ('enviado_proveedores', 'con_presupuestos')
        `;

        let dataSql = `
            SELECT
                r.idreceta as id,
                CONCAT(UPPER(SUBSTRING(p.apellido, 1, 1)), LOWER(SUBSTRING(p.apellido, 2))) AS apellido,
                CONCAT(UPPER(SUBSTRING(p.nombre, 1, 1)), LOWER(SUBSTRING(p.nombre, 2))) AS nombre,
                p.dni,
                DATE_FORMAT(r.fechaemision, '%d-%m-%Y') AS fecha,
                DATE_FORMAT(c.fecha_envio_proveedores, '%d-%m-%Y %H:%i') AS fecha_envio,
                c.estado_compra,
                COUNT(DISTINCT cp.id_proveedor) as proveedores_contactados,
                COUNT(DISTINCT pre.id) as presupuestos_recibidos
            FROM rec_receta_alto_costo r
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            INNER JOIN rec_compras_alto_costo c ON r.idreceta = c.idreceta
            LEFT JOIN rec_compras_proveedores cp ON c.id = cp.id_compra
            LEFT JOIN rec_presupuestos_alto_costo pre ON cp.id = pre.id_compra_proveedor
            WHERE r.idobrasocafiliado = 20
              AND c.estado_compra IN ('enviado_proveedores', 'con_presupuestos')
        `;

        let params = [];

        if (search && search.trim()) {
            const searchCondition = ` AND (p.apellido LIKE ? OR p.nombre LIKE ? OR p.dni LIKE ?)`;
            countSql += searchCondition;
            dataSql += searchCondition;
            const searchParam = `%${search.trim()}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        dataSql += ` GROUP BY r.idreceta, p.apellido, p.nombre, p.dni, r.fechaemision, c.fecha_envio_proveedores, c.estado_compra`;

        const countResult = await executeQuery(countSql, params);
        const total = countResult[0]?.total || 0;
        const totalPages = Math.ceil(total / parseInt(limit));

        dataSql += ` ORDER BY c.fecha_envio_proveedores DESC LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page) - 1) * parseInt(limit)}`;

        const resultados = await executeQuery(dataSql, params);

        res.json({
            success: true,
            data: resultados,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages
            }
        });

    } catch (error) {
        console.error('[COMPRAS] Error obteniendo enviadas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// ============================================
// OBTENER DETALLE DE UNA RECETA PARA COMPRAS
// ============================================
export const getDetalle = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('[COMPRAS] Obteniendo detalle de receta:', id);

        // Obtener datos de la receta
        const sqlReceta = `
            SELECT
                r.idreceta,
                r.idpaciente,
                r.matricprescr,
                DATE_FORMAT(r.fechaemision, '%d/%m/%Y') as fecha_emision,
                r.diagnostico,
                r.diagnostico2,
                p.apellido,
                p.nombre,
                p.dni,
                c.estado_compra,
                c.fecha_recepcion,
                c.fecha_envio_proveedores,
                c.observaciones
            FROM rec_receta_alto_costo r
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            LEFT JOIN rec_compras_alto_costo c ON r.idreceta = c.idreceta
            WHERE r.idreceta = ?
        `;

        const recetaResult = await executeQuery(sqlReceta, [id]);

        if (!recetaResult || recetaResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Receta no encontrada'
            });
        }

        const receta = recetaResult[0];

        // Obtener medicamentos APROBADOS
        const sqlMedicamentos = `
            SELECT
                pm.idreceta,
                pm.nro_orden,
                pm.codigo,
                pm.cantprescripta,
                pm.posologia,
                pm.porcentajecobertura,
                pm.estado_auditoria,
                v.monodroga,
                v.nombre_comercial,
                v.presentacion
            FROM rec_prescrmedicamento_alto_costo pm
            LEFT JOIN vad_020 v ON pm.codigo = v.codigo
            WHERE pm.idreceta = ? AND pm.estado_auditoria = 1
            ORDER BY pm.nro_orden
        `;

        const medicamentos = await executeQuery(sqlMedicamentos, [id]);

        res.json({
            success: true,
            data: {
                receta,
                medicamentos
            }
        });

    } catch (error) {
        console.error('[COMPRAS] Error obteniendo detalle:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// ============================================
// OBTENER LISTA DE PROVEEDORES ACTIVOS
// ============================================
export const getProveedores = async (req, res) => {
    try {
        console.log('[COMPRAS] Obteniendo lista de proveedores');

        const sql = `
            SELECT
                id,
                nombre,
                email,
                telefono,
                cuit,
                direccion
            FROM rec_proveedores
            WHERE activo = TRUE
            ORDER BY nombre ASC
        `;

        const proveedores = await executeQuery(sql);

        console.log('[COMPRAS] Proveedores encontrados:', proveedores.length);

        res.json({
            success: true,
            data: proveedores
        });

    } catch (error) {
        console.error('[COMPRAS] Error obteniendo proveedores:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// ============================================
// ENVIAR SOLICITUD A PROVEEDORES
// ============================================
export const enviarProveedores = async (req, res) => {
    let connection = null;

    try {
        const { id } = req.params; // idreceta
        const { id: userId } = req.user;
        const { medicamentos, observaciones = '' } = req.body;

        console.log('[COMPRAS] Enviando a proveedores - Receta:', id);
        console.log('[COMPRAS] Medicamentos:', medicamentos);

        if (!medicamentos || medicamentos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Debe seleccionar al menos un medicamento con proveedores'
            });
        }

        connection = await getConnection();

        // 1. Actualizar o crear registro en rec_compras_alto_costo
        const sqlCompras = `
            INSERT INTO rec_compras_alto_costo (idreceta, estado_compra, fecha_envio_proveedores, id_usuario_compras, observaciones)
            VALUES (?, 'enviado_proveedores', NOW(), ?, ?)
            ON DUPLICATE KEY UPDATE
                estado_compra = 'enviado_proveedores',
                fecha_envio_proveedores = NOW(),
                id_usuario_compras = ?,
                observaciones = ?
        `;

        const [comprasResult] = await connection.execute(sqlCompras, [id, userId, observaciones, userId, observaciones]);

        // Obtener el ID de la compra
        let idCompra;
        if (comprasResult.insertId) {
            idCompra = comprasResult.insertId;
        } else {
            const [compraExistente] = await connection.execute(
                'SELECT id FROM rec_compras_alto_costo WHERE idreceta = ?',
                [id]
            );
            idCompra = compraExistente[0].id;
        }

        console.log('[COMPRAS] ID Compra:', idCompra);

        // 2. Insertar registros en rec_compras_proveedores
        let totalProveedores = 0;

        for (const medicamento of medicamentos) {
            const { nro_orden, proveedores } = medicamento;

            for (const idProveedor of proveedores) {
                const sqlProveedores = `
                    INSERT INTO rec_compras_proveedores (id_compra, idreceta, nro_orden, id_proveedor, fecha_envio, estado)
                    VALUES (?, ?, ?, ?, NOW(), 'enviado')
                `;

                await connection.execute(sqlProveedores, [idCompra, id, nro_orden, idProveedor]);
                totalProveedores++;
            }
        }

        console.log(`[COMPRAS] ${totalProveedores} proveedores contactados`);

        // Obtener datos de los proveedores para enviar emails
        const idsProveedores = [...new Set(medicamentos.flatMap(m => m.proveedores))];
        const sqlProveedoresData = `
            SELECT id, nombre, email
            FROM rec_proveedores
            WHERE id IN (${idsProveedores.join(',')}) AND activo = TRUE
        `;
        const proveedoresData = await executeQuery(sqlProveedoresData);

        // Enviar emails a los proveedores
        await enviarEmailsProveedores(id, medicamentos, proveedoresData);

        res.json({
            success: true,
            message: 'Solicitud enviada a proveedores exitosamente',
            proveedoresContactados: totalProveedores,
            emailsEnviados: proveedoresData.length
        });

    } catch (error) {
        console.error('[COMPRAS] Error enviando a proveedores:', error);
        res.status(500).json({
            success: false,
            message: 'Error enviando solicitud a proveedores',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// ============================================
// OBTENER PRESUPUESTOS RECIBIDOS PARA UNA RECETA
// ============================================
export const getPresupuestos = async (req, res) => {
    try {
        const { id } = req.params; // idreceta

        console.log('[COMPRAS] Obteniendo presupuestos para receta:', id);

        const sql = `
            SELECT
                pm.nro_orden,
                pm.codigo,
                v.monodroga,
                v.nombre_comercial,
                v.presentacion,
                pm.cantprescripta,
                prov.id as id_proveedor,
                prov.nombre as proveedor,
                pre.id as id_presupuesto,
                pre.precio_unitario,
                pre.cantidad_disponible,
                pre.tiempo_entrega_dias,
                pre.observaciones as observaciones_proveedor,
                DATE_FORMAT(pre.fecha_presupuesto, '%d/%m/%Y %H:%i') as fecha_presupuesto,
                ps.id as seleccionado
            FROM rec_prescrmedicamento_alto_costo pm
            INNER JOIN vad_020 v ON pm.codigo = v.codigo
            INNER JOIN rec_compras_alto_costo c ON pm.idreceta = c.idreceta
            INNER JOIN rec_compras_proveedores cp ON c.id = cp.id_compra AND pm.nro_orden = cp.nro_orden
            INNER JOIN rec_proveedores prov ON cp.id_proveedor = prov.id
            LEFT JOIN rec_presupuestos_alto_costo pre ON cp.id = pre.id_compra_proveedor
            LEFT JOIN rec_presupuestos_seleccionados ps ON pre.id = ps.id_presupuesto
            WHERE pm.idreceta = ? AND pm.estado_auditoria = 1
            ORDER BY pm.nro_orden, pre.precio_unitario ASC
        `;

        const resultados = await executeQuery(sql, [id]);

        // Agrupar por medicamento
        const medicamentos = {};

        resultados.forEach(row => {
            if (!medicamentos[row.nro_orden]) {
                medicamentos[row.nro_orden] = {
                    nro_orden: row.nro_orden,
                    codigo: row.codigo,
                    monodroga: row.monodroga,
                    nombre_comercial: row.nombre_comercial,
                    presentacion: row.presentacion,
                    cantidad: row.cantprescripta,
                    presupuestos: []
                };
            }

            if (row.id_presupuesto) {
                medicamentos[row.nro_orden].presupuestos.push({
                    id_presupuesto: row.id_presupuesto,
                    id_proveedor: row.id_proveedor,
                    proveedor: row.proveedor,
                    precio_unitario: row.precio_unitario,
                    cantidad_disponible: row.cantidad_disponible,
                    tiempo_entrega_dias: row.tiempo_entrega_dias,
                    observaciones: row.observaciones_proveedor,
                    fecha_presupuesto: row.fecha_presupuesto,
                    seleccionado: !!row.seleccionado
                });
            }
        });

        const data = Object.values(medicamentos);

        console.log('[COMPRAS] Medicamentos con presupuestos:', data.length);

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('[COMPRAS] Error obteniendo presupuestos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// ============================================
// SELECCIONAR PRESUPUESTOS Y GENERAR PDF
// ============================================
export const seleccionarPresupuestos = async (req, res) => {
    let connection = null;

    try {
        const { id } = req.params; // idreceta
        const { id: userId } = req.user;
        const { presupuestos_seleccionados } = req.body;

        console.log('[COMPRAS] Seleccionando presupuestos para receta:', id);
        console.log('[COMPRAS] Presupuestos seleccionados:', presupuestos_seleccionados);

        if (!presupuestos_seleccionados || presupuestos_seleccionados.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Debe seleccionar al menos un presupuesto'
            });
        }

        connection = await getConnection();

        // Insertar presupuestos seleccionados
        for (const item of presupuestos_seleccionados) {
            const { nro_orden, id_presupuesto } = item;

            const sql = `
                INSERT INTO rec_presupuestos_seleccionados (id_presupuesto, idreceta, nro_orden, fecha_seleccion, id_usuario_seleccion)
                VALUES (?, ?, ?, NOW(), ?)
                ON DUPLICATE KEY UPDATE
                    id_presupuesto = VALUES(id_presupuesto),
                    fecha_seleccion = NOW(),
                    id_usuario_seleccion = VALUES(id_usuario_seleccion)
            `;

            await connection.execute(sql, [id_presupuesto, id, nro_orden, userId]);
        }

        // Actualizar estado de compras
        await connection.execute(
            "UPDATE rec_compras_alto_costo SET estado_compra = 'finalizado' WHERE idreceta = ?",
            [id]
        );

        console.log('[COMPRAS] Presupuestos seleccionados correctamente');

        // TODO: Aquí llamar a generarPDF() del altoCostoController
        // const pdfResult = await generarPDF(id);

        res.json({
            success: true,
            message: 'Presupuestos seleccionados exitosamente',
            presupuestosSeleccionados: presupuestos_seleccionados.length
            // pdfUrl: pdfResult.url  // TODO: Agregar cuando se implemente generación de PDF
        });

    } catch (error) {
        console.error('[COMPRAS] Error seleccionando presupuestos:', error);
        res.status(500).json({
            success: false,
            message: 'Error seleccionando presupuestos',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};
