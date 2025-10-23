import db from '../config/db.js';
import crypto from 'crypto';
import {
    enviarSolicitudPresupuesto,
    notificarRespuestaPresupuesto
} from '../services/emailService.js';

/**
 * Genera un token único para la solicitud de presupuesto
 */
const generarToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Genera un número de lote único
 */
const generarLoteNumero = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `LOTE-${año}${mes}${dia}-${random}`;
};

/**
 * Crear solicitud de presupuesto y enviar emails a proveedores
 * POST /api/presupuestos/solicitar
 *
 * Body: {
 *   auditoriaIds: [1, 2, 3],
 *   proveedorIds: [1, 2, 3],
 *   observaciones: "texto opcional"
 * }
 */
export const crearSolicitudPresupuesto = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { auditoriaIds, proveedorIds, observaciones } = req.body;
        const usuarioId = req.user?.id;

        // Validaciones
        if (!auditoriaIds || !Array.isArray(auditoriaIds) || auditoriaIds.length === 0) {
            return res.status(400).json({
                error: 'Debe proporcionar al menos una auditoría'
            });
        }

        if (!proveedorIds || !Array.isArray(proveedorIds) || proveedorIds.length === 0) {
            return res.status(400).json({
                error: 'Debe seleccionar al menos un proveedor'
            });
        }

        // Generar número de lote único
        const loteNumero = generarLoteNumero();

        // Crear la solicitud principal
        const [solicitudResult] = await connection.query(
            `INSERT INTO alt_solicitud_presupuesto
            (codigo_solicitud, id_usuario_creador, observaciones, estado, cantidad_auditorias, cantidad_proveedores)
            VALUES (?, ?, ?, 'ENVIADO', ?, ?)`,
            [loteNumero, usuarioId, observaciones || null, auditoriaIds.length, proveedorIds.length]
        );

        const solicitudId = solicitudResult.insertId;

        // Asociar auditorías a la solicitud
        for (const auditoriaId of auditoriaIds) {
            await connection.query(
                `INSERT INTO alt_solicitud_presupuesto_auditoria
                (id_solicitud, id_auditoria) VALUES (?, ?)`,
                [solicitudId, auditoriaId]
            );
        }

        // Obtener detalles de las auditorías con medicamentos
        const [auditorias] = await connection.query(
            `SELECT
                a.id,
                a.paciente_nombre,
                a.paciente_dni,
                GROUP_CONCAT(
                    CONCAT(
                        '{"id":', am.medicamento_id,
                        ',"nombre":"', m.nombre,
                        '","presentacion":"', m.presentacion,
                        '","cantidad":', am.cantidad, '}'
                    ) SEPARATOR ','
                ) as medicamentos_json
            FROM auditorias a
            INNER JOIN auditoria_medicamentos am ON a.id = am.auditoria_id
            INNER JOIN medicamentos m ON am.medicamento_id = m.id
            WHERE a.id IN (?)
            GROUP BY a.id`,
            [auditoriaIds]
        );

        // Parsear medicamentos JSON
        const auditoriasConMedicamentos = auditorias.map(aud => ({
            ...aud,
            medicamentos: JSON.parse(`[${aud.medicamentos_json}]`)
        }));

        // Obtener detalles de proveedores
        const [proveedores] = await connection.query(
            `SELECT id, nombre, email, telefono FROM proveedores WHERE id IN (?)`,
            [proveedorIds]
        );

        // Fecha de expiración (72 horas desde ahora)
        const fechaExpiracion = new Date();
        fechaExpiracion.setHours(fechaExpiracion.getHours() + 72);

        // Crear registros de proveedores y enviar emails
        const resultadosEnvio = [];

        for (const proveedor of proveedores) {
            // Generar token único para este proveedor
            const token = generarToken();

            // Insertar registro de proveedor en la solicitud
            await connection.query(
                `INSERT INTO presupuesto_solicitud_proveedores
                (solicitud_id, proveedor_id, token, fecha_expiracion, estado)
                VALUES (?, ?, ?, ?, 'pendiente')`,
                [solicitudId, proveedor.id, token, fechaExpiracion]
            );

            // Enviar email al proveedor
            try {
                const resultadoEmail = await enviarSolicitudPresupuesto({
                    proveedorEmail: proveedor.email,
                    proveedorNombre: proveedor.nombre,
                    token: token,
                    loteNumero: loteNumero,
                    auditorias: auditoriasConMedicamentos,
                    fechaExpiracion: fechaExpiracion
                });

                resultadosEnvio.push({
                    proveedor: proveedor.nombre,
                    email: proveedor.email,
                    enviado: resultadoEmail.success,
                    error: resultadoEmail.error || null
                });

            } catch (error) {
                console.error(`Error enviando email a ${proveedor.nombre}:`, error);
                resultadosEnvio.push({
                    proveedor: proveedor.nombre,
                    email: proveedor.email,
                    enviado: false,
                    error: error.message
                });
            }
        }

        await connection.commit();

        res.status(201).json({
            mensaje: 'Solicitud de presupuesto creada exitosamente',
            solicitudId: solicitudId,
            loteNumero: loteNumero,
            auditorias: auditoriaIds.length,
            proveedores: proveedorIds.length,
            fechaExpiracion: fechaExpiracion,
            resultadosEnvio: resultadosEnvio
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error creando solicitud de presupuesto:', error);
        res.status(500).json({
            error: 'Error al crear la solicitud de presupuesto',
            detalle: error.message
        });
    } finally {
        connection.release();
    }
};

/**
 * Obtener información de solicitud por token (para proveedores)
 * GET /api/presupuestos/solicitud/:token
 * Endpoint PÚBLICO - No requiere autenticación
 */
export const obtenerSolicitudPorToken = async (req, res) => {
    try {
        const { token } = req.params;

        // Buscar la solicitud del proveedor por token
        const [solicitudProveedor] = await db.query(
            `SELECT
                sp.id as solicitud_proveedor_id,
                sp.solicitud_id,
                sp.proveedor_id,
                sp.fecha_expiracion,
                sp.estado,
                sp.fecha_respuesta,
                s.lote_numero,
                s.fecha_envio,
                s.observaciones,
                p.nombre as proveedor_nombre,
                p.email as proveedor_email
            FROM presupuesto_solicitud_proveedores sp
            INNER JOIN presupuesto_solicitudes s ON sp.solicitud_id = s.id
            INNER JOIN proveedores p ON sp.proveedor_id = p.id
            WHERE sp.token = ?`,
            [token]
        );

        if (solicitudProveedor.length === 0) {
            return res.status(404).json({
                error: 'Solicitud no encontrada o token inválido'
            });
        }

        const solicitud = solicitudProveedor[0];

        // Verificar si el token expiró
        const ahora = new Date();
        const fechaExpiracion = new Date(solicitud.fecha_expiracion);

        if (ahora > fechaExpiracion) {
            // Actualizar estado a expirado si no lo está
            if (solicitud.estado !== 'expirado') {
                await db.query(
                    `UPDATE presupuesto_solicitud_proveedores
                    SET estado = 'expirado' WHERE id = ?`,
                    [solicitud.solicitud_proveedor_id]
                );
            }

            return res.status(410).json({
                error: 'Esta solicitud ha expirado',
                fechaExpiracion: solicitud.fecha_expiracion
            });
        }

        // Verificar si ya respondió
        if (solicitud.estado === 'respondido') {
            return res.status(400).json({
                error: 'Ya ha respondido a esta solicitud',
                fechaRespuesta: solicitud.fecha_respuesta
            });
        }

        // Obtener auditorías y medicamentos de la solicitud
        const [auditorias] = await db.query(
            `SELECT
                a.id as auditoria_id,
                a.paciente_nombre,
                a.paciente_dni,
                am.medicamento_id,
                m.nombre as medicamento_nombre,
                m.presentacion,
                am.cantidad
            FROM presupuesto_solicitud_auditorias sa
            INNER JOIN auditorias a ON sa.auditoria_id = a.id
            INNER JOIN auditoria_medicamentos am ON a.id = am.auditoria_id
            INNER JOIN medicamentos m ON am.medicamento_id = m.id
            WHERE sa.solicitud_id = ?
            ORDER BY a.id, m.nombre`,
            [solicitud.solicitud_id]
        );

        // Agrupar medicamentos por auditoría
        const auditoriasAgrupadas = auditorias.reduce((acc, row) => {
            const auditoriaExistente = acc.find(a => a.id === row.auditoria_id);

            const medicamento = {
                id: row.medicamento_id,
                nombre: row.medicamento_nombre,
                presentacion: row.presentacion,
                cantidad: row.cantidad
            };

            if (auditoriaExistente) {
                auditoriaExistente.medicamentos.push(medicamento);
            } else {
                acc.push({
                    id: row.auditoria_id,
                    paciente_nombre: row.paciente_nombre,
                    paciente_dni: row.paciente_dni,
                    medicamentos: [medicamento]
                });
            }

            return acc;
        }, []);

        res.json({
            solicitud: {
                loteNumero: solicitud.lote_numero,
                fechaEnvio: solicitud.fecha_envio,
                fechaExpiracion: solicitud.fecha_expiracion,
                observaciones: solicitud.observaciones,
                proveedor: {
                    nombre: solicitud.proveedor_nombre,
                    email: solicitud.proveedor_email
                }
            },
            auditorias: auditoriasAgrupadas,
            solicitudProveedorId: solicitud.solicitud_proveedor_id
        });

    } catch (error) {
        console.error('Error obteniendo solicitud por token:', error);
        res.status(500).json({
            error: 'Error al obtener la solicitud',
            detalle: error.message
        });
    }
};

/**
 * Enviar respuesta de presupuesto (proveedor)
 * POST /api/presupuestos/responder/:token
 * Endpoint PÚBLICO - No requiere autenticación
 *
 * Body: {
 *   respuestas: [
 *     {
 *       auditoriaId: 1,
 *       medicamentoId: 1,
 *       acepta: true,
 *       precio: 1500.50,
 *       fechaRetiro: "2025-10-25",
 *       fechaVencimiento: "2026-12-31",
 *       comentarios: "Disponible inmediatamente"
 *     },
 *     ...
 *   ]
 * }
 */
export const responderSolicitud = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { token } = req.params;
        const { respuestas } = req.body;

        // Validar que haya respuestas
        if (!respuestas || !Array.isArray(respuestas) || respuestas.length === 0) {
            return res.status(400).json({
                error: 'Debe proporcionar al menos una respuesta'
            });
        }

        // Obtener información de la solicitud
        const [solicitudProveedor] = await connection.query(
            `SELECT
                sp.id as solicitud_proveedor_id,
                sp.solicitud_id,
                sp.proveedor_id,
                sp.fecha_expiracion,
                sp.estado,
                s.lote_numero,
                p.nombre as proveedor_nombre
            FROM presupuesto_solicitud_proveedores sp
            INNER JOIN presupuesto_solicitudes s ON sp.solicitud_id = s.id
            INNER JOIN proveedores p ON sp.proveedor_id = p.id
            WHERE sp.token = ?`,
            [token]
        );

        if (solicitudProveedor.length === 0) {
            return res.status(404).json({
                error: 'Solicitud no encontrada o token inválido'
            });
        }

        const solicitud = solicitudProveedor[0];

        // Verificar expiración
        if (new Date() > new Date(solicitud.fecha_expiracion)) {
            return res.status(410).json({
                error: 'Esta solicitud ha expirado'
            });
        }

        // Verificar si ya respondió
        if (solicitud.estado === 'respondido') {
            return res.status(400).json({
                error: 'Ya ha respondido a esta solicitud'
            });
        }

        // Insertar las respuestas
        for (const respuesta of respuestas) {
            const {
                auditoriaId,
                medicamentoId,
                acepta,
                precio,
                fechaRetiro,
                fechaVencimiento,
                comentarios
            } = respuesta;

            // Validar campos obligatorios
            if (auditoriaId === undefined || medicamentoId === undefined || acepta === undefined) {
                return res.status(400).json({
                    error: 'Cada respuesta debe incluir auditoriaId, medicamentoId y acepta'
                });
            }

            // Si acepta, debe incluir precio, fecha de retiro y vencimiento
            if (acepta && (!precio || !fechaRetiro || !fechaVencimiento)) {
                return res.status(400).json({
                    error: 'Si acepta la solicitud debe proporcionar precio, fechaRetiro y fechaVencimiento'
                });
            }

            await connection.query(
                `INSERT INTO presupuesto_respuestas
                (solicitud_proveedor_id, auditoria_id, medicamento_id, acepta,
                precio, fecha_retiro, fecha_vencimiento, comentarios)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    solicitud.solicitud_proveedor_id,
                    auditoriaId,
                    medicamentoId,
                    acepta,
                    acepta ? precio : null,
                    acepta ? fechaRetiro : null,
                    acepta ? fechaVencimiento : null,
                    comentarios || null
                ]
            );
        }

        // Actualizar estado de la solicitud del proveedor
        await connection.query(
            `UPDATE presupuesto_solicitud_proveedores
            SET estado = 'respondido', fecha_respuesta = NOW()
            WHERE id = ?`,
            [solicitud.solicitud_proveedor_id]
        );

        // Actualizar estado general de la solicitud
        await connection.query(
            `UPDATE presupuesto_solicitudes
            SET estado = 'en_proceso'
            WHERE id = ?`,
            [solicitud.solicitud_id]
        );

        await connection.commit();

        // Enviar notificación interna
        try {
            // Obtener emails de usuarios administradores para notificar
            const [admins] = await connection.query(
                `SELECT email FROM usuarios WHERE rol = 'admin' AND email IS NOT NULL`
            );

            if (admins.length > 0) {
                const emailsAdmins = admins.map(a => a.email).join(',');

                // Crear resumen de la respuesta
                const aceptadas = respuestas.filter(r => r.acepta).length;
                const rechazadas = respuestas.length - aceptadas;
                const resumen = `${aceptadas} medicamento(s) aceptado(s), ${rechazadas} rechazado(s)`;

                await notificarRespuestaPresupuesto({
                    emailsDestinatarios: emailsAdmins,
                    proveedorNombre: solicitud.proveedor_nombre,
                    loteNumero: solicitud.lote_numero,
                    auditoriaId: respuestas[0].auditoriaId,
                    resumen: resumen
                });
            }
        } catch (emailError) {
            console.error('Error enviando notificación:', emailError);
            // No fallar la operación si el email falla
        }

        res.status(200).json({
            mensaje: 'Respuesta enviada exitosamente',
            loteNumero: solicitud.lote_numero,
            proveedor: solicitud.proveedor_nombre,
            respuestasEnviadas: respuestas.length
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error guardando respuesta de presupuesto:', error);
        res.status(500).json({
            error: 'Error al guardar la respuesta',
            detalle: error.message
        });
    } finally {
        connection.release();
    }
};

/**
 * Listar solicitudes de presupuesto (para usuarios internos)
 * GET /api/presupuestos/solicitudes
 */
export const listarSolicitudes = async (req, res) => {
    try {
        const { estado, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];

        if (estado) {
            whereClause = 'WHERE s.estado = ?';
            params.push(estado);
        }

        const [solicitudes] = await db.query(
            `SELECT
                s.id,
                s.lote_numero,
                s.fecha_envio,
                s.estado,
                s.observaciones,
                u.nombre as usuario_envia_nombre,
                COUNT(DISTINCT sa.auditoria_id) as total_auditorias,
                COUNT(DISTINCT sp.proveedor_id) as total_proveedores,
                SUM(CASE WHEN sp.estado = 'respondido' THEN 1 ELSE 0 END) as respuestas_recibidas
            FROM presupuesto_solicitudes s
            LEFT JOIN usuarios u ON s.usuario_envia = u.id
            LEFT JOIN presupuesto_solicitud_auditorias sa ON s.id = sa.solicitud_id
            LEFT JOIN presupuesto_solicitud_proveedores sp ON s.id = sp.solicitud_id
            ${whereClause}
            GROUP BY s.id
            ORDER BY s.fecha_envio DESC
            LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        // Contar total de solicitudes
        const [countResult] = await db.query(
            `SELECT COUNT(DISTINCT s.id) as total
            FROM presupuesto_solicitudes s ${whereClause}`,
            params
        );

        const total = countResult[0].total;

        res.json({
            solicitudes: solicitudes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error listando solicitudes:', error);
        res.status(500).json({
            error: 'Error al listar las solicitudes',
            detalle: error.message
        });
    }
};

/**
 * Obtener detalles de una solicitud con todas las respuestas
 * GET /api/presupuestos/solicitudes/:id
 */
export const obtenerDetalleSolicitud = async (req, res) => {
    try {
        const { id } = req.params;

        // Información general de la solicitud
        const [solicitud] = await db.query(
            `SELECT
                s.id,
                s.lote_numero,
                s.fecha_envio,
                s.estado,
                s.observaciones,
                u.nombre as usuario_envia_nombre,
                u.email as usuario_envia_email
            FROM presupuesto_solicitudes s
            LEFT JOIN usuarios u ON s.usuario_envia = u.id
            WHERE s.id = ?`,
            [id]
        );

        if (solicitud.length === 0) {
            return res.status(404).json({
                error: 'Solicitud no encontrada'
            });
        }

        // Auditorías de la solicitud
        const [auditorias] = await db.query(
            `SELECT
                a.id,
                a.paciente_nombre,
                a.paciente_dni
            FROM presupuesto_solicitud_auditorias sa
            INNER JOIN auditorias a ON sa.auditoria_id = a.id
            WHERE sa.solicitud_id = ?`,
            [id]
        );

        // Proveedores y sus respuestas
        const [proveedores] = await db.query(
            `SELECT
                sp.id as solicitud_proveedor_id,
                sp.estado,
                sp.fecha_expiracion,
                sp.fecha_respuesta,
                p.id as proveedor_id,
                p.nombre as proveedor_nombre,
                p.email as proveedor_email,
                p.telefono as proveedor_telefono
            FROM presupuesto_solicitud_proveedores sp
            INNER JOIN proveedores p ON sp.proveedor_id = p.id
            WHERE sp.solicitud_id = ?`,
            [id]
        );

        // Para cada proveedor, obtener sus respuestas
        for (const proveedor of proveedores) {
            const [respuestas] = await db.query(
                `SELECT
                    pr.auditoria_id,
                    pr.medicamento_id,
                    pr.acepta,
                    pr.precio,
                    pr.fecha_retiro,
                    pr.fecha_vencimiento,
                    pr.comentarios,
                    pr.fecha_respuesta,
                    m.nombre as medicamento_nombre,
                    m.presentacion as medicamento_presentacion
                FROM presupuesto_respuestas pr
                INNER JOIN medicamentos m ON pr.medicamento_id = m.id
                WHERE pr.solicitud_proveedor_id = ?
                ORDER BY pr.auditoria_id, m.nombre`,
                [proveedor.solicitud_proveedor_id]
            );

            proveedor.respuestas = respuestas;
        }

        res.json({
            solicitud: solicitud[0],
            auditorias: auditorias,
            proveedores: proveedores
        });

    } catch (error) {
        console.error('Error obteniendo detalle de solicitud:', error);
        res.status(500).json({
            error: 'Error al obtener el detalle de la solicitud',
            detalle: error.message
        });
    }
};

/**
 * Comparar presupuestos de diferentes proveedores
 * GET /api/presupuestos/comparar/:solicitudId
 */
export const compararPresupuestos = async (req, res) => {
    try {
        const { solicitudId } = req.params;

        // Obtener todas las respuestas agrupadas por medicamento
        const [comparacion] = await db.query(
            `SELECT
                a.id as auditoria_id,
                a.paciente_nombre,
                a.paciente_dni,
                m.id as medicamento_id,
                m.nombre as medicamento_nombre,
                m.presentacion as medicamento_presentacion,
                pr.acepta,
                pr.precio,
                pr.fecha_retiro,
                pr.fecha_vencimiento,
                pr.comentarios,
                p.id as proveedor_id,
                p.nombre as proveedor_nombre
            FROM presupuesto_solicitud_auditorias sa
            INNER JOIN auditorias a ON sa.auditoria_id = a.id
            INNER JOIN auditoria_medicamentos am ON a.id = am.auditoria_id
            INNER JOIN medicamentos m ON am.medicamento_id = m.id
            LEFT JOIN presupuesto_solicitud_proveedores sp ON sa.solicitud_id = sp.solicitud_id
            LEFT JOIN presupuesto_respuestas pr ON sp.id = pr.solicitud_proveedor_id
                AND pr.auditoria_id = a.id
                AND pr.medicamento_id = m.id
            LEFT JOIN proveedores p ON sp.proveedor_id = p.id
            WHERE sa.solicitud_id = ?
            ORDER BY a.id, m.nombre, pr.precio ASC`,
            [solicitudId]
        );

        // Agrupar por auditoría y medicamento
        const resultado = {};

        comparacion.forEach(row => {
            const key = `${row.auditoria_id}_${row.medicamento_id}`;

            if (!resultado[key]) {
                resultado[key] = {
                    auditoria: {
                        id: row.auditoria_id,
                        paciente_nombre: row.paciente_nombre,
                        paciente_dni: row.paciente_dni
                    },
                    medicamento: {
                        id: row.medicamento_id,
                        nombre: row.medicamento_nombre,
                        presentacion: row.medicamento_presentacion
                    },
                    ofertas: []
                };
            }

            if (row.proveedor_id) {
                resultado[key].ofertas.push({
                    proveedor_id: row.proveedor_id,
                    proveedor_nombre: row.proveedor_nombre,
                    acepta: row.acepta,
                    precio: row.precio,
                    fecha_retiro: row.fecha_retiro,
                    fecha_vencimiento: row.fecha_vencimiento,
                    comentarios: row.comentarios
                });
            }
        });

        // Convertir objeto a array y encontrar mejor precio para cada medicamento
        const comparacionArray = Object.values(resultado).map(item => {
            const ofertasAceptadas = item.ofertas.filter(o => o.acepta && o.precio);

            let mejorOferta = null;
            if (ofertasAceptadas.length > 0) {
                mejorOferta = ofertasAceptadas.reduce((min, oferta) =>
                    oferta.precio < min.precio ? oferta : min
                );
            }

            return {
                ...item,
                mejorOferta: mejorOferta,
                totalOfertas: item.ofertas.length,
                ofertasAceptadas: ofertasAceptadas.length
            };
        });

        res.json({
            solicitudId: solicitudId,
            comparacion: comparacionArray
        });

    } catch (error) {
        console.error('Error comparando presupuestos:', error);
        res.status(500).json({
            error: 'Error al comparar presupuestos',
            detalle: error.message
        });
    }
};

export default {
    crearSolicitudPresupuesto,
    obtenerSolicitudPorToken,
    responderSolicitud,
    listarSolicitudes,
    obtenerDetalleSolicitud,
    compararPresupuestos
};
