import { pool, getConnection } from '../config/database.js';
import crypto from 'crypto';
import {
    enviarSolicitudPresupuesto,
    notificarRespuestaPresupuesto,
    notificarCambioEstadoOrden
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
 * POST /api/presupuestos/solicitar-con-email
 */
export const crearSolicitudPresupuesto = async (req, res) => {
    const connection = await getConnection();

    try {
        await connection.beginTransaction();

        const { auditoriaIds, proveedorIds, observaciones, horasExpiracion } = req.body;
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

        // Validar horasExpiracion (por defecto 72 horas, mínimo 1 hora, máximo 720 horas = 30 días)
        let horas = 72; // Valor por defecto
        if (horasExpiracion !== undefined && horasExpiracion !== null) {
            horas = parseInt(horasExpiracion);
            if (isNaN(horas) || horas < 1) {
                return res.status(400).json({
                    error: 'Las horas de expiración deben ser un número mayor o igual a 1'
                });
            }
            if (horas > 720) {
                return res.status(400).json({
                    error: 'Las horas de expiración no pueden exceder 720 horas (30 días)'
                });
            }
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

        // Asociar auditorías a la solicitud y actualizar estado
        for (const auditoriaId of auditoriaIds) {
            // Insertar relación solicitud-auditoría
            await connection.query(
                `INSERT INTO alt_solicitud_presupuesto_auditoria
                (id_solicitud, id_auditoria) VALUES (?, ?)`,
                [solicitudId, auditoriaId]
            );

            // Actualizar estado de los medicamentos a "En presupuesto" (estado 4)
            await connection.query(
                `UPDATE rec_prescrmedicamento_alto_costo
                SET estado_auditoria = 4
                WHERE idreceta = ?
                AND estado_auditoria = 1`,
                [auditoriaId]
            );
        }

        // Obtener detalles de las auditorías con medicamentos
        const [auditorias] = await connection.query(
            `SELECT
                r.idreceta as id,
                CONCAT(p.apellido, ', ', p.nombre) as paciente_nombre,
                p.dni as paciente_dni,
                GROUP_CONCAT(
                    CONCAT(
                        '{"id":', pm.idmedicamento,
                        ',"nombre":"', COALESCE(v.nombre_comercial, 'Medicamento'),
                        '","presentacion":"', COALESCE(v.presentacion, ''),
                        '","cantidad":', pm.cantprescripta,
                        ',"precio":', COALESCE(v.precio, 0), '}'
                    ) SEPARATOR ','
                ) as medicamentos_json
            FROM rec_receta_alto_costo r
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            INNER JOIN rec_prescrmedicamento_alto_costo pm ON r.idreceta = pm.idreceta
            LEFT JOIN vad_020 v ON pm.codigo = v.codigo
            WHERE r.idreceta IN (?)
            AND pm.estado_auditoria = 4
            GROUP BY r.idreceta, p.apellido, p.nombre, p.dni`,
            [auditoriaIds]
        );

        // Parsear medicamentos JSON
        const auditoriasConMedicamentos = auditorias.map(aud => ({
            ...aud,
            medicamentos: JSON.parse(`[${aud.medicamentos_json}]`)
        }));

        // Obtener detalles de proveedores con su contacto principal
        const [proveedores] = await connection.query(
            `SELECT
                p.id_proveedor as id,
                p.razon_social as nombre,
                COALESCE(c.email, p.email_general) as email,
                COALESCE(c.telefono, p.telefono_general) as telefono
            FROM alt_proveedor p
            LEFT JOIN alt_contacto_proveedor c ON p.id_proveedor = c.id_proveedor AND c.principal = 1
            WHERE p.id_proveedor IN (?)`,
            [proveedorIds]
        );

        // LOG PARA DEBUG
        console.log('========== PROVEEDORES OBTENIDOS ==========');
        proveedores.forEach(p => {
            console.log(`ID: ${p.id} | Nombre: ${p.nombre} | Email: ${p.email}`);
        });
        console.log('==========================================');

        // Fecha de expiración (horas configurables desde ahora)
        const fechaExpiracion = new Date();
        fechaExpiracion.setHours(fechaExpiracion.getHours() + horas);

        // Crear registros de proveedores y enviar emails
        const resultadosEnvio = [];

        for (const proveedor of proveedores) {
            // Generar token único para este proveedor
            const token = generarToken();

            // Insertar registro de proveedor en la solicitud
            await connection.query(
                `INSERT INTO alt_solicitud_presupuesto_proveedor
                (id_solicitud, id_proveedor, token, fecha_expiracion, estado)
                VALUES (?, ?, ?, ?, 'ENVIADO')`,
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
        const [solicitudProveedor] = await pool.query(
            `SELECT
                sp.id,
                sp.id_solicitud,
                sp.id_proveedor,
                sp.fecha_expiracion,
                sp.estado,
                sp.fecha_respuesta,
                s.codigo_solicitud as lote_numero,
                s.fecha_envio,
                s.observaciones,
                p.razon_social as proveedor_nombre,
                COALESCE(c.email, p.email_general) as proveedor_email
            FROM alt_solicitud_presupuesto_proveedor sp
            INNER JOIN alt_solicitud_presupuesto s ON sp.id_solicitud = s.id_solicitud
            INNER JOIN alt_proveedor p ON sp.id_proveedor = p.id_proveedor
            LEFT JOIN alt_contacto_proveedor c ON p.id_proveedor = c.id_proveedor AND c.principal = 1
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
            if (solicitud.estado !== 'EXPIRADO') {
                await pool.query(
                    `UPDATE alt_solicitud_presupuesto_proveedor
                    SET estado = 'EXPIRADO' WHERE id = ?`,
                    [solicitud.id]
                );
            }

            return res.status(410).json({
                error: 'Esta solicitud ha expirado',
                fechaExpiracion: solicitud.fecha_expiracion
            });
        }

        // Verificar si ya respondió
        if (solicitud.estado === 'RESPONDIDO') {
            return res.status(400).json({
                error: 'Ya ha respondido a esta solicitud',
                fechaRespuesta: solicitud.fecha_respuesta
            });
        }

        // Obtener auditorías y medicamentos de la solicitud
        const [auditorias] = await pool.query(
            `SELECT
                r.idreceta as auditoria_id,
                CONCAT(p.apellido, ', ', p.nombre) as paciente_nombre,
                p.dni as paciente_dni,
                pm.idmedicamento as medicamento_id,
                COALESCE(v.nombre_comercial, 'Medicamento') as medicamento_nombre,
                COALESCE(v.presentacion, '') as presentacion,
                pm.cantprescripta as cantidad
            FROM alt_solicitud_presupuesto_auditoria sa
            INNER JOIN rec_receta_alto_costo r ON sa.id_auditoria = r.idreceta
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            INNER JOIN rec_prescrmedicamento_alto_costo pm ON r.idreceta = pm.idreceta
            LEFT JOIN vad_020 v ON pm.codigo = v.codigo
            WHERE sa.id_solicitud = ?
            AND pm.estado_auditoria = 4
            ORDER BY r.idreceta, v.nombre_comercial`,
            [solicitud.id_solicitud]
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
            solicitudProveedorId: solicitud.id
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
 */
export const responderSolicitud = async (req, res) => {
    const connection = await getConnection();

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
                sp.id,
                sp.id_solicitud,
                sp.id_proveedor,
                sp.fecha_expiracion,
                sp.estado,
                s.codigo_solicitud as lote_numero,
                p.razon_social as proveedor_nombre
            FROM alt_solicitud_presupuesto_proveedor sp
            INNER JOIN alt_solicitud_presupuesto s ON sp.id_solicitud = s.id_solicitud
            INNER JOIN alt_proveedor p ON sp.id_proveedor = p.id_proveedor
            LEFT JOIN alt_contacto_proveedor c ON p.id_proveedor = c.id_proveedor AND c.principal = 1
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
        if (solicitud.estado === 'RESPONDIDO') {
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
                lugarRetiro,
                comentarios
            } = respuesta;

            // Validar campos obligatorios
            if (auditoriaId === undefined || medicamentoId === undefined || acepta === undefined) {
                return res.status(400).json({
                    error: 'Cada respuesta debe incluir auditoriaId, medicamentoId y acepta'
                });
            }

            // Si acepta, debe incluir precio, fecha de retiro, vencimiento y lugar de retiro
            if (acepta && (!precio || !fechaRetiro || !fechaVencimiento || !lugarRetiro)) {
                return res.status(400).json({
                    error: 'Si acepta la solicitud debe proporcionar precio, fechaRetiro, fechaVencimiento y lugarRetiro'
                });
            }

            await connection.query(
                `INSERT INTO alt_presupuesto_respuesta_detalle
                (id_solicitud_proveedor, id_auditoria, id_medicamento, acepta,
                precio, fecha_retiro, fecha_vencimiento, lugar_retiro, comentarios)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    solicitud.id,
                    auditoriaId,
                    medicamentoId,
                    acepta ? 1 : 0,
                    acepta ? precio : null,
                    acepta ? fechaRetiro : null,
                    acepta ? fechaVencimiento : null,
                    acepta ? lugarRetiro : null,
                    comentarios || null
                ]
            );
        }

        // Actualizar estado de la solicitud del proveedor
        await connection.query(
            `UPDATE alt_solicitud_presupuesto_proveedor
            SET estado = 'RESPONDIDO', fecha_respuesta = NOW()
            WHERE id = ?`,
            [solicitud.id]
        );

        // Actualizar estado general de la solicitud
        await connection.query(
            `UPDATE alt_solicitud_presupuesto
            SET estado = 'PARCIAL'
            WHERE id_solicitud = ?`,
            [solicitud.id_solicitud]
        );

        await connection.commit();

        // Enviar notificación interna (después del commit, usar pool en lugar de connection)
        try {
            // Obtener emails de usuarios administradores (rol 1 = admin) que tengan email configurado
            const [admins] = await pool.query(
                `SELECT email FROM user_au WHERE rol = 1 AND email IS NOT NULL AND email != ''`
            );

            if (admins.length > 0) {
                const emailsAdmins = admins.map(a => a.email).join(',');

                // Crear resumen
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
            } else {
                console.log('⚠️ No hay administradores con email configurado para notificar');
            }
        } catch (emailError) {
            console.error('❌ Error enviando notificación:', emailError);
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
 * Listar solicitudes de presupuesto
 * GET /api/presupuestos/solicitudes-email
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

        const [solicitudes] = await pool.query(
            `SELECT
                s.id_solicitud as id,
                s.codigo_solicitud as lote_numero,
                s.fecha_envio,
                s.estado,
                s.observaciones,
                CONCAT(u.nombre, ' ', u.apellido) as usuario_envia_nombre,
                s.cantidad_auditorias as total_auditorias,
                s.cantidad_proveedores as total_proveedores,
                COUNT(DISTINCT CASE WHEN sp.estado = 'RESPONDIDO' THEN sp.id END) as respuestas_recibidas
            FROM alt_solicitud_presupuesto s
            LEFT JOIN user_au u ON s.id_usuario_creador = u.id
            LEFT JOIN alt_solicitud_presupuesto_proveedor sp ON s.id_solicitud = sp.id_solicitud
            ${whereClause}
            GROUP BY s.id_solicitud
            ORDER BY s.fecha_envio DESC
            LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        // Contar total
        const [countResult] = await pool.query(
            `SELECT COUNT(DISTINCT s.id_solicitud) as total
            FROM alt_solicitud_presupuesto s ${whereClause}`,
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
 * GET /api/presupuestos/solicitudes-email/:id
 */
export const obtenerDetalleSolicitud = async (req, res) => {
    try {
        const { id } = req.params;

        // Información general
        const [solicitud] = await pool.query(
            `SELECT
                s.id_solicitud as id,
                s.codigo_solicitud as lote_numero,
                s.fecha_envio,
                s.estado,
                s.observaciones,
                CONCAT(u.nombre, ' ', u.apellido) as usuario_envia_nombre,
                u.user as usuario_envia_email
            FROM alt_solicitud_presupuesto s
            LEFT JOIN user_au u ON s.id_usuario_creador = u.id
            WHERE s.id_solicitud = ?`,
            [id]
        );

        if (solicitud.length === 0) {
            return res.status(404).json({
                error: 'Solicitud no encontrada'
            });
        }

        // Auditorías
        const [auditorias] = await pool.query(
            `SELECT
                r.idreceta as id,
                CONCAT(p.apellido, ', ', p.nombre) as paciente_nombre,
                p.dni as paciente_dni
            FROM alt_solicitud_presupuesto_auditoria sa
            INNER JOIN rec_receta_alto_costo r ON sa.id_auditoria = r.idreceta
            INNER JOIN rec_paciente p ON r.idpaciente = p.id
            WHERE sa.id_solicitud = ?`,
            [id]
        );

        // Proveedores y respuestas
        const [proveedores] = await pool.query(
            `SELECT
                sp.id as solicitud_proveedor_id,
                sp.estado,
                sp.fecha_expiracion,
                sp.fecha_respuesta,
                p.id_proveedor as proveedor_id,
                p.razon_social as proveedor_nombre,
                COALESCE(c.email, p.email_general) as proveedor_email,
                COALESCE(c.telefono, p.telefono_general) as proveedor_telefono
            FROM alt_solicitud_presupuesto_proveedor sp
            INNER JOIN alt_proveedor p ON sp.id_proveedor = p.id_proveedor
            LEFT JOIN alt_contacto_proveedor c ON p.id_proveedor = c.id_proveedor AND c.principal = 1
            WHERE sp.id_solicitud = ?`,
            [id]
        );

        // Para cada proveedor, obtener sus respuestas
        for (const proveedor of proveedores) {
            const [respuestas] = await pool.query(
                `SELECT
                    pr.id_auditoria as auditoria_id,
                    pr.id_medicamento as medicamento_id,
                    pr.acepta,
                    pr.precio,
                    pr.fecha_retiro,
                    pr.fecha_vencimiento,
                    pr.lugar_retiro,
                    pr.comentarios,
                    pr.fecha_respuesta,
                    COALESCE(v.nombre_comercial, 'Medicamento') as medicamento_nombre,
                    COALESCE(v.presentacion, '') as medicamento_presentacion
                FROM alt_presupuesto_respuesta_detalle pr
                LEFT JOIN vad_020 v ON pr.id_medicamento = v.codigo
                WHERE pr.id_solicitud_proveedor = ?
                ORDER BY pr.id_auditoria, v.nombre_comercial`,
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
        const [comparacion] = await pool.query(
            `SELECT
                r.idreceta as auditoria_id,
                CONCAT(pac.apellido, ', ', pac.nombre) as paciente_nombre,
                pac.dni as paciente_dni,
                pm.idmedicamento as medicamento_id,
                COALESCE(v.nombre_comercial, 'Medicamento') as medicamento_nombre,
                COALESCE(v.presentacion, '') as medicamento_presentacion,
                pr.acepta,
                pr.precio,
                pr.fecha_retiro,
                pr.fecha_vencimiento,
                pr.lugar_retiro,
                pr.comentarios,
                p.id_proveedor as proveedor_id,
                p.razon_social as proveedor_nombre
            FROM alt_solicitud_presupuesto_auditoria sa
            INNER JOIN rec_receta_alto_costo r ON sa.id_auditoria = r.idreceta
            INNER JOIN rec_paciente pac ON r.idpaciente = pac.id
            INNER JOIN rec_prescrmedicamento_alto_costo pm ON r.idreceta = pm.idreceta
            LEFT JOIN vad_020 v ON pm.codigo = v.codigo
            LEFT JOIN alt_solicitud_presupuesto_proveedor sp ON sa.id_solicitud = sp.id_solicitud
            LEFT JOIN alt_presupuesto_respuesta_detalle pr ON sp.id = pr.id_solicitud_proveedor
                AND pr.id_auditoria = r.idreceta
                AND pr.id_medicamento = pm.idmedicamento
            LEFT JOIN alt_proveedor p ON sp.id_proveedor = p.id_proveedor
            WHERE sa.id_solicitud = ?
            AND pm.estado_auditoria = 4
            ORDER BY r.idreceta, v.nombre_comercial, pr.precio ASC`,
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

        // Convertir a array y encontrar mejor precio
        const comparacionArray = Object.values(resultado).map(item => {
            const ofertasAceptadas = item.ofertas.filter(o => o.acepta && o.precio);

            let mejorOferta = null;
            if (ofertasAceptadas.length > 0) {
                mejorOferta = ofertasAceptadas.reduce((min, oferta) =>
                    parseFloat(oferta.precio) < parseFloat(min.precio) ? oferta : min
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

/**
 * Obtener contadores de solicitudes por estado
 * GET /api/presupuestos/estadisticas
 */
export const obtenerEstadisticas = async (req, res) => {
    try {
        // Total de solicitudes
        const [totalResult] = await pool.query(
            `SELECT COUNT(*) as total FROM alt_solicitud_presupuesto`
        );

        // Por estado
        const [enviados] = await pool.query(
            `SELECT COUNT(*) as total FROM alt_solicitud_presupuesto WHERE estado = 'ENVIADO'`
        );

        const [parciales] = await pool.query(
            `SELECT COUNT(*) as total FROM alt_solicitud_presupuesto WHERE estado = 'PARCIAL'`
        );

        const [completados] = await pool.query(
            `SELECT COUNT(*) as total FROM alt_solicitud_presupuesto WHERE estado = 'COMPLETADO'`
        );

        const [vencidos] = await pool.query(
            `SELECT COUNT(*) as total FROM alt_solicitud_presupuesto WHERE estado = 'VENCIDO'`
        );

        const [adjudicados] = await pool.query(
            `SELECT COUNT(*) as total FROM alt_solicitud_presupuesto WHERE estado = 'ADJUDICADO'`
        );

        // Pendientes (sin ninguna respuesta aún)
        const [pendientes] = await pool.query(
            `SELECT COUNT(DISTINCT s.id_solicitud) as total
            FROM alt_solicitud_presupuesto s
            WHERE s.estado = 'ENVIADO'
            AND NOT EXISTS (
                SELECT 1 FROM alt_solicitud_presupuesto_proveedor sp
                WHERE sp.id_solicitud = s.id_solicitud
                AND sp.estado = 'RESPONDIDO'
            )`
        );

        res.json({
            total: totalResult[0].total,
            enviados: enviados[0].total,
            recibidos: parciales[0].total + completados[0].total,
            pendientes: pendientes[0].total,
            vencidos: vencidos[0].total,
            adjudicados: adjudicados[0].total,
            detalle: {
                parcial: parciales[0].total,
                completado: completados[0].total
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            error: 'Error al obtener estadísticas',
            detalle: error.message
        });
    }
};

/**
 * Actualizar estado de solicitud manualmente
 * PUT /api/presupuestos/solicitudes-email/:id/estado
 */
export const actualizarEstadoSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const estadosValidos = ['ENVIADO', 'PARCIAL', 'COMPLETADO', 'VENCIDO', 'ADJUDICADO', 'CANCELADO'];

        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                error: 'Estado inválido',
                estadosValidos: estadosValidos
            });
        }

        await pool.query(
            `UPDATE alt_solicitud_presupuesto
            SET estado = ?
            WHERE id_solicitud = ?`,
            [estado, id]
        );

        res.json({
            mensaje: 'Estado actualizado exitosamente',
            solicitudId: id,
            nuevoEstado: estado
        });

    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json({
            error: 'Error al actualizar estado',
            detalle: error.message
        });
    }
};

/**
 * Adjudicar presupuesto a un proveedor y crear orden de compra
 * POST /api/presupuestos/solicitudes-email/:id/adjudicar
 */
export const adjudicarPresupuesto = async (req, res) => {
    const connection = await getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params; // solicitudId
        const { proveedorId, observaciones } = req.body;
        const usuarioId = req.user?.id;

        // Validaciones
        if (!proveedorId) {
            return res.status(400).json({
                error: 'Debe proporcionar el ID del proveedor adjudicado'
            });
        }

        // Obtener información de la solicitud
        const [solicitud] = await connection.query(
            `SELECT
                s.id_solicitud,
                s.codigo_solicitud,
                s.estado
            FROM alt_solicitud_presupuesto s
            WHERE s.id_solicitud = ?`,
            [id]
        );

        if (solicitud.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Solicitud no encontrada'
            });
        }

        // Verificar que el proveedor respondió
        const [respuestaProveedor] = await connection.query(
            `SELECT
                sp.id,
                sp.estado,
                p.razon_social as proveedor_nombre
            FROM alt_solicitud_presupuesto_proveedor sp
            INNER JOIN alt_proveedor p ON sp.id_proveedor = p.id_proveedor
            WHERE sp.id_solicitud = ?
            AND sp.id_proveedor = ?`,
            [id, proveedorId]
        );

        if (respuestaProveedor.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                error: 'El proveedor no está en esta solicitud'
            });
        }

        if (respuestaProveedor[0].estado !== 'RESPONDIDO') {
            await connection.rollback();
            return res.status(400).json({
                error: 'El proveedor aún no ha respondido'
            });
        }

        // Obtener auditorías de la solicitud
        const [auditorias] = await connection.query(
            `SELECT id_auditoria
            FROM alt_solicitud_presupuesto_auditoria
            WHERE id_solicitud = ?`,
            [id]
        );

        // Obtener respuestas aceptadas del proveedor
        const [respuestasAceptadas] = await connection.query(
            `SELECT
                pr.id_auditoria,
                pr.id_medicamento,
                pr.precio,
                pr.fecha_retiro,
                pr.fecha_vencimiento,
                pr.lugar_retiro,
                pr.comentarios,
                pm.cantprescripta,
                v.nombre_comercial,
                v.presentacion
            FROM alt_presupuesto_respuesta_detalle pr
            INNER JOIN rec_prescrmedicamento_alto_costo pm
                ON pr.id_auditoria = pm.idreceta
                AND pr.id_medicamento = pm.idmedicamento
            LEFT JOIN vad_020 v ON pr.id_medicamento = v.codigo
            WHERE pr.id_solicitud_proveedor = ?
            AND pr.acepta = 1`,
            [respuestaProveedor[0].id]
        );

        if (respuestasAceptadas.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                error: 'El proveedor no aceptó ningún medicamento'
            });
        }

        // Calcular monto total
        const montoTotal = respuestasAceptadas.reduce((sum, item) =>
            sum + (parseFloat(item.precio) * parseInt(item.cantprescripta)), 0
        );

        // Crear órdenes de compra por cada auditoría
        const ordenesCreadas = [];

        for (const auditoria of auditorias) {
            const medicamentosAuditoria = respuestasAceptadas.filter(
                r => r.id_auditoria === auditoria.id_auditoria
            );

            if (medicamentosAuditoria.length === 0) continue;

            // Obtener datos del paciente
            const [paciente] = await connection.query(
                `SELECT
                    p.id,
                    CONCAT(p.apellido, ', ', p.nombre) as nombre_completo,
                    p.email,
                    p.telefono,
                    p.dni
                FROM rec_receta_alto_costo r
                INNER JOIN rec_paciente p ON r.idpaciente = p.id
                WHERE r.idreceta = ?`,
                [auditoria.id_auditoria]
            );

            const montoAuditoria = medicamentosAuditoria.reduce((sum, item) =>
                sum + (parseFloat(item.precio) * parseInt(item.cantprescripta)), 0
            );

            // Obtener lugar de retiro del primer medicamento (todos deberían tener el mismo del proveedor)
            const lugarRetiro = medicamentosAuditoria[0].lugar_retiro;

            // Crear orden de compra
            const [ordenResult] = await connection.query(
                `INSERT INTO rec_compras_alto_costo
                (idreceta, id_proveedor, id_solicitud_presupuesto, monto_total,
                 estado_compra, fecha_estimada_entrega, lugar_retiro, observaciones, usuario_adjudico)
                VALUES (?, ?, ?, ?, 'adjudicado', ?, ?, ?, ?)`,
                [
                    auditoria.id_auditoria,
                    proveedorId,
                    id, // id_solicitud_presupuesto
                    montoAuditoria,
                    medicamentosAuditoria[0].fecha_retiro,
                    lugarRetiro,
                    observaciones || `Adjudicado desde lote ${solicitud[0].codigo_solicitud}`,
                    req.user?.id || null // ID del usuario que adjudicó
                ]
            );

            const ordenId = ordenResult.insertId;

            // Insertar detalle de la compra (cada medicamento con su precio)
            for (const med of medicamentosAuditoria) {
                const precioTotal = parseFloat(med.precio) * parseInt(med.cantprescripta);

                await connection.query(
                    `INSERT INTO rec_compras_alto_costo_detalle
                    (id_compra, id_medicamento, codigo_medicamento, nombre_medicamento,
                     presentacion, cantidad, precio_unitario, precio_total, fecha_vencimiento, observaciones)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        ordenId,
                        med.id_medicamento,
                        med.id_medicamento, // código del medicamento
                        med.nombre_comercial,
                        med.presentacion,
                        med.cantprescripta,
                        med.precio,
                        precioTotal,
                        med.fecha_vencimiento,
                        med.comentarios
                    ]
                );
            }

            // Actualizar estado de medicamentos a "En compra" (estado 5)
            await connection.query(
                `UPDATE rec_prescrmedicamento_alto_costo
                SET estado_auditoria = 5
                WHERE idreceta = ?
                AND estado_auditoria = 4`,
                [auditoria.id_auditoria]
            );

            ordenesCreadas.push({
                ordenId: ordenId,
                auditoriaId: auditoria.id_auditoria,
                paciente: paciente[0]?.nombre_completo,
                monto: montoAuditoria,
                medicamentos: medicamentosAuditoria.length,
                lugarRetiro: lugarRetiro,
                fechaRetiro: medicamentosAuditoria[0]?.fecha_retiro
            });
        }

        // Actualizar estado de la solicitud a ADJUDICADO
        await connection.query(
            `UPDATE alt_solicitud_presupuesto
            SET estado = 'ADJUDICADO'
            WHERE id_solicitud = ?`,
            [id]
        );

        // Marcar proveedor como adjudicado
        await connection.query(
            `UPDATE alt_solicitud_presupuesto_proveedor
            SET estado = 'ADJUDICADO'
            WHERE id_solicitud = ?
            AND id_proveedor = ?`,
            [id, proveedorId]
        );

        await connection.commit();

        // Notificar a los pacientes sobre la adjudicación
        const proveedorNombre = respuestaProveedor[0].proveedor_nombre;

        for (const orden of ordenesCreadas) {
            try {
                // Obtener información del paciente y medicamentos
                const [pacienteInfo] = await pool.query(
                    `SELECT p.email, CONCAT(p.apellido, ', ', p.nombre) as nombre_completo
                    FROM rec_receta_alto_costo r
                    INNER JOIN rec_paciente p ON r.idpaciente = p.id
                    WHERE r.idreceta = ?`,
                    [orden.auditoriaId]
                );

                const [medicamentosOrden] = await pool.query(
                    `SELECT d.nombre_medicamento as nombre, d.presentacion, d.cantidad
                    FROM rec_compras_alto_costo_detalle d
                    WHERE d.id_compra = ?`,
                    [orden.ordenId]
                );

                if (pacienteInfo[0]?.email) {
                    await notificarCambioEstadoOrden({
                        emailPaciente: pacienteInfo[0].email,
                        nombrePaciente: pacienteInfo[0].nombre_completo,
                        numeroOrden: orden.ordenId,
                        estadoNuevo: 'adjudicado',
                        proveedor: proveedorNombre,
                        montoTotal: orden.monto,
                        fechaEntrega: orden.fechaRetiro,
                        lugarRetiro: orden.lugarRetiro,
                        medicamentos: medicamentosOrden
                    });
                } else {
                    console.log(`⚠️ Paciente de orden ${orden.ordenId} no tiene email configurado`);
                }
            } catch (emailError) {
                console.error(`❌ Error notificando paciente de orden ${orden.ordenId}:`, emailError);
                // No fallar la adjudicación por error de email
            }
        }

        res.status(201).json({
            mensaje: 'Presupuesto adjudicado exitosamente',
            solicitudId: id,
            loteNumero: solicitud[0].codigo_solicitud,
            proveedorNombre: proveedorNombre,
            montoTotal: montoTotal,
            ordenesCreadas: ordenesCreadas,
            cantidadOrdenes: ordenesCreadas.length
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error adjudicando presupuesto:', error);
        res.status(500).json({
            error: 'Error al adjudicar presupuesto',
            detalle: error.message
        });
    } finally {
        connection.release();
    }
};

/**
 * Actualizar estado de una orden de compra
 * PUT /api/compras/ordenes/:id/estado
 */
export const actualizarEstadoOrdenCompra = async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevoEstado, observaciones } = req.body;

        // Validar que el estado sea válido
        const estadosValidos = [
            'adjudicado', 'confirmado', 'en_preparacion',
            'listo_retiro', 'entregado', 'cancelado', 'finalizado'
        ];

        if (!estadosValidos.includes(nuevoEstado)) {
            return res.status(400).json({
                error: 'Estado inválido',
                estadosValidos: estadosValidos
            });
        }

        // Obtener información actual de la orden
        const [orden] = await pool.query(
            `SELECT
                c.id,
                c.idreceta,
                c.estado_compra as estado_actual,
                c.id_proveedor,
                c.monto_total,
                c.fecha_estimada_entrega,
                c.lugar_retiro,
                p.razon_social as proveedor_nombre,
                pac.email as paciente_email,
                CONCAT(pac.apellido, ', ', pac.nombre) as paciente_nombre
            FROM rec_compras_alto_costo c
            INNER JOIN alt_proveedor p ON c.id_proveedor = p.id_proveedor
            INNER JOIN rec_receta_alto_costo r ON c.idreceta = r.idreceta
            INNER JOIN rec_paciente pac ON r.idpaciente = pac.id
            WHERE c.id = ?`,
            [id]
        );

        if (orden.length === 0) {
            return res.status(404).json({
                error: 'Orden de compra no encontrada'
            });
        }

        const ordenActual = orden[0];

        // Actualizar estado
        await pool.query(
            `UPDATE rec_compras_alto_costo
            SET estado_compra = ?,
                observaciones = CONCAT(COALESCE(observaciones, ''), '\n', NOW(), ' - Estado cambiado a ', ?, COALESCE(CONCAT(': ', ?), ''))
            WHERE id = ?`,
            [nuevoEstado, nuevoEstado.toUpperCase(), observaciones, id]
        );

        // Si el estado es "entregado", registrar fecha real de entrega
        if (nuevoEstado === 'entregado') {
            await pool.query(
                `UPDATE rec_compras_alto_costo
                SET fecha_entrega_real = NOW()
                WHERE id = ?`,
                [id]
            );
        }

        // Obtener medicamentos de la orden
        const [medicamentos] = await pool.query(
            `SELECT nombre_medicamento as nombre, presentacion, cantidad
            FROM rec_compras_alto_costo_detalle
            WHERE id_compra = ?`,
            [id]
        );

        // Notificar al paciente si tiene email
        if (ordenActual.paciente_email) {
            try {
                await notificarCambioEstadoOrden({
                    emailPaciente: ordenActual.paciente_email,
                    nombrePaciente: ordenActual.paciente_nombre,
                    numeroOrden: id,
                    estadoNuevo: nuevoEstado,
                    proveedor: ordenActual.proveedor_nombre,
                    montoTotal: ordenActual.monto_total,
                    fechaEntrega: ordenActual.fecha_estimada_entrega,
                    lugarRetiro: ordenActual.lugar_retiro,
                    medicamentos: medicamentos
                });
            } catch (emailError) {
                console.error('❌ Error enviando notificación al paciente:', emailError);
                // No fallar la actualización por error de email
            }
        } else {
            console.log(`⚠️ Paciente de orden ${id} no tiene email configurado`);
        }

        res.status(200).json({
            mensaje: 'Estado de orden actualizado exitosamente',
            ordenId: id,
            estadoAnterior: ordenActual.estado_actual,
            estadoNuevo: nuevoEstado,
            pacienteNotificado: !!ordenActual.paciente_email
        });

    } catch (error) {
        console.error('Error actualizando estado de orden:', error);
        res.status(500).json({
            error: 'Error al actualizar estado de orden',
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
    compararPresupuestos,
    obtenerEstadisticas,
    actualizarEstadoSolicitud,
    adjudicarPresupuesto,
    actualizarEstadoOrdenCompra
};
