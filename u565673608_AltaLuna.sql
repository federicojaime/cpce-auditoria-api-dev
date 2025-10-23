-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 20-10-2025 a las 11:23:02
-- Versión del servidor: 11.8.3-MariaDB-log
-- Versión de PHP: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `u565673608_AltaLuna`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alt_contacto_proveedor`
--

CREATE TABLE `alt_contacto_proveedor` (
  `id_contacto` int(11) NOT NULL,
  `id_proveedor` int(11) NOT NULL COMMENT 'FK al proveedor',
  `nombre` varchar(100) NOT NULL COMMENT 'Nombre del contacto',
  `apellido` varchar(100) NOT NULL COMMENT 'Apellido del contacto',
  `cargo` varchar(100) DEFAULT NULL COMMENT 'Cargo o función',
  `email` varchar(255) DEFAULT NULL COMMENT 'Email del contacto',
  `telefono` varchar(50) DEFAULT NULL COMMENT 'Teléfono del contacto',
  `principal` tinyint(1) DEFAULT 0 COMMENT '1 = contacto principal, 0 = secundario',
  `fecha_alta` datetime DEFAULT current_timestamp() COMMENT 'Fecha de creación',
  `fecha_modificacion` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Última modificación'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci COMMENT='Contactos de proveedores';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alt_notificacion_paciente`
--

CREATE TABLE `alt_notificacion_paciente` (
  `id_notificacion` int(11) NOT NULL,
  `id_orden` int(11) NOT NULL,
  `paciente_nombre` varchar(255) NOT NULL,
  `paciente_dni` varchar(20) NOT NULL,
  `paciente_telefono` varchar(50) DEFAULT NULL,
  `paciente_email` varchar(255) DEFAULT NULL,
  `tipo` enum('MEDICAMENTOS_DISPONIBLES','REENVIO_NOTIFICACION','ORDEN_CANCELADA','RECORDATORIO') DEFAULT 'MEDICAMENTOS_DISPONIBLES',
  `canal` enum('EMAIL_SMS','EMAIL','SMS','WHATSAPP') DEFAULT 'EMAIL_SMS',
  `urgencia` enum('ALTA','MEDIA','BAJA') DEFAULT 'MEDIA',
  `email_enviado` tinyint(1) DEFAULT 0,
  `email_fecha` datetime DEFAULT NULL,
  `email_error` text DEFAULT NULL,
  `sms_enviado` tinyint(1) DEFAULT 0,
  `sms_fecha` datetime DEFAULT NULL,
  `sms_error` text DEFAULT NULL,
  `mensaje_email` text DEFAULT NULL,
  `mensaje_sms` varchar(500) DEFAULT NULL,
  `id_usuario_envio` int(11) NOT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alt_orden_compra`
--

CREATE TABLE `alt_orden_compra` (
  `id_orden` int(11) NOT NULL,
  `numero_orden` varchar(50) NOT NULL,
  `id_solicitud` int(11) NOT NULL,
  `id_proveedor` int(11) NOT NULL,
  `id_respuesta_presupuesto` int(11) DEFAULT NULL,
  `estado` enum('BORRADOR','ENVIADA','CONFIRMADA','EN_PREPARACION','ENVIADO','ENTREGADO','CANCELADA') DEFAULT 'BORRADOR',
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  `fecha_envio` datetime DEFAULT NULL,
  `fecha_confirmacion` datetime DEFAULT NULL,
  `fecha_entrega_estimada` datetime DEFAULT NULL,
  `fecha_entrega_real` datetime DEFAULT NULL,
  `subtotal` decimal(15,2) DEFAULT 0.00,
  `descuento` decimal(15,2) DEFAULT 0.00,
  `impuestos` decimal(15,2) DEFAULT 0.00,
  `total` decimal(15,2) NOT NULL,
  `tracking_numero` varchar(100) DEFAULT NULL,
  `tracking_empresa` varchar(200) DEFAULT NULL,
  `tracking_estado` varchar(100) DEFAULT NULL,
  `tracking_url` varchar(500) DEFAULT NULL,
  `notificacion_enviada` tinyint(1) DEFAULT 0,
  `fecha_notificacion` datetime DEFAULT NULL,
  `cantidad_pacientes` int(11) DEFAULT 0,
  `observaciones` text DEFAULT NULL,
  `motivo_cancelacion` text DEFAULT NULL,
  `id_usuario_creador` int(11) NOT NULL,
  `fecha_modificacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alt_orden_compra_detalle`
--

CREATE TABLE `alt_orden_compra_detalle` (
  `id_detalle` int(11) NOT NULL,
  `id_orden` int(11) NOT NULL,
  `id_auditoria` int(11) NOT NULL,
  `id_medicamento` int(11) DEFAULT NULL,
  `paciente_nombre` varchar(255) NOT NULL,
  `paciente_dni` varchar(20) NOT NULL,
  `paciente_telefono` varchar(50) DEFAULT NULL,
  `paciente_email` varchar(255) DEFAULT NULL,
  `medicamento_nombre` varchar(255) NOT NULL,
  `medicamento_categoria` varchar(100) DEFAULT NULL,
  `cantidad` int(11) NOT NULL,
  `precio_unitario` decimal(15,2) NOT NULL,
  `subtotal` decimal(15,2) NOT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alt_orden_compra_historial`
--

CREATE TABLE `alt_orden_compra_historial` (
  `id_historial` int(11) NOT NULL,
  `id_orden` int(11) NOT NULL,
  `estado_anterior` varchar(50) DEFAULT NULL,
  `estado_nuevo` varchar(50) NOT NULL,
  `evento` varchar(200) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha_evento` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alt_presupuesto_respuesta`
--

CREATE TABLE `alt_presupuesto_respuesta` (
  `id_respuesta` int(11) NOT NULL,
  `id_solicitud` int(11) NOT NULL,
  `id_proveedor` int(11) NOT NULL,
  `monto_total` decimal(15,2) NOT NULL,
  `descuento` decimal(15,2) DEFAULT 0.00,
  `monto_final` decimal(15,2) NOT NULL,
  `tiempo_entrega` varchar(100) DEFAULT NULL,
  `validez_oferta` varchar(100) DEFAULT NULL,
  `forma_pago` varchar(200) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `detalle_medicamentos` text DEFAULT NULL,
  `archivo_presupuesto` varchar(500) DEFAULT NULL,
  `adjudicado` tinyint(1) DEFAULT 0,
  `fecha_respuesta` datetime DEFAULT current_timestamp(),
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  `fecha_modificacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alt_proveedor`
--

CREATE TABLE `alt_proveedor` (
  `id_proveedor` int(11) NOT NULL,
  `razon_social` varchar(255) NOT NULL COMMENT 'Razón social del proveedor',
  `cuit` varchar(13) NOT NULL COMMENT 'CUIT del proveedor (formato: 20-12345678-9)',
  `tipo_proveedor` enum('Laboratorio','Droguería','Ambos') DEFAULT 'Laboratorio' COMMENT 'Tipo de proveedor',
  `email_general` varchar(255) DEFAULT NULL COMMENT 'Email general del proveedor',
  `telefono_general` varchar(50) DEFAULT NULL COMMENT 'Teléfono general',
  `direccion_calle` varchar(255) DEFAULT NULL COMMENT 'Calle',
  `direccion_numero` varchar(20) DEFAULT NULL COMMENT 'Número',
  `barrio` varchar(100) DEFAULT NULL COMMENT 'Barrio',
  `localidad` varchar(100) DEFAULT NULL COMMENT 'Localidad',
  `provincia` varchar(100) DEFAULT NULL COMMENT 'Provincia',
  `activo` tinyint(1) DEFAULT 1 COMMENT '1 = activo, 0 = inactivo',
  `fecha_alta` datetime DEFAULT current_timestamp() COMMENT 'Fecha de creación',
  `fecha_modificacion` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Última modificación'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci COMMENT='Tabla de proveedores (laboratorios y droguerías)';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alt_solicitud_presupuesto`
--

CREATE TABLE `alt_solicitud_presupuesto` (
  `id_solicitud` int(11) NOT NULL,
  `codigo_solicitud` varchar(50) NOT NULL,
  `fecha_envio` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_limite` datetime DEFAULT NULL,
  `estado` enum('ENVIADO','PARCIAL','COMPLETO','ADJUDICADO','CANCELADO') DEFAULT 'ENVIADO',
  `urgencia` enum('ALTA','MEDIA','BAJA') DEFAULT 'MEDIA',
  `cantidad_auditorias` int(11) DEFAULT 0,
  `cantidad_proveedores` int(11) DEFAULT 0,
  `monto_total_estimado` decimal(15,2) DEFAULT 0.00,
  `id_proveedor_adjudicado` int(11) DEFAULT NULL,
  `fecha_adjudicacion` datetime DEFAULT NULL,
  `motivo_adjudicacion` text DEFAULT NULL,
  `id_orden_compra` int(11) DEFAULT NULL,
  `id_usuario_creador` int(11) NOT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  `fecha_modificacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alt_solicitud_presupuesto_auditoria`
--

CREATE TABLE `alt_solicitud_presupuesto_auditoria` (
  `id` int(11) NOT NULL,
  `id_solicitud` int(11) NOT NULL,
  `id_auditoria` int(11) NOT NULL,
  `monto_estimado` decimal(15,2) DEFAULT 0.00,
  `fecha_agregado` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alt_solicitud_presupuesto_proveedor`
--

CREATE TABLE `alt_solicitud_presupuesto_proveedor` (
  `id` int(11) NOT NULL,
  `id_solicitud` int(11) NOT NULL,
  `id_proveedor` int(11) NOT NULL,
  `estado` enum('ENVIADO','RECIBIDO','PENDIENTE','VENCIDO','ADJUDICADO','NO_ADJUDICADO') DEFAULT 'ENVIADO',
  `fecha_respuesta` datetime DEFAULT NULL,
  `id_respuesta` int(11) DEFAULT NULL,
  `fecha_envio` datetime DEFAULT current_timestamp(),
  `fecha_modificacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `bajamejorar`
--

CREATE TABLE `bajamejorar` (
  `apenom` varchar(90) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `dni` int(11) NOT NULL,
  `obsoc` varchar(27) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cert_cabecera`
--

CREATE TABLE `cert_cabecera` (
  `idestudio` int(11) NOT NULL,
  `id_encriptado` varchar(256) DEFAULT NULL,
  `fechaemision` datetime NOT NULL,
  `ipprescriptor` varchar(90) NOT NULL,
  `matricprescr` int(11) NOT NULL,
  `matricespec_prescr` int(11) NOT NULL,
  `idpaciente` int(11) NOT NULL,
  `idobrasocafiliado` int(11) NOT NULL,
  `lugaratencion` int(11) DEFAULT NULL,
  `diagnostico` varchar(700) NOT NULL,
  `diagnostico2` varchar(700) DEFAULT NULL,
  `identidadreserv` int(11) DEFAULT NULL COMMENT 'Identidad Reservada',
  `estado` int(11) DEFAULT NULL,
  `anulacionmotivo` varchar(250) DEFAULT NULL,
  `device` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cert_cuerpo`
--

CREATE TABLE `cert_cuerpo` (
  `idestuprescripto` int(11) NOT NULL,
  `idestudio` int(11) NOT NULL,
  `idauditoria` int(11) DEFAULT NULL,
  `nro_orden` int(11) NOT NULL,
  `codigo` int(11) NOT NULL,
  `descripcion` varchar(1600) NOT NULL,
  `dispensado` varchar(1) DEFAULT NULL,
  `observacion` varchar(200) DEFAULT NULL,
  `fecha_disp` datetime NOT NULL DEFAULT current_timestamp(),
  `ip_disp` varchar(90) DEFAULT NULL,
  `tipo_opera` int(11) DEFAULT NULL,
  `estado_auditoria` int(11) DEFAULT NULL COMMENT '0=espera ser auditado, 1=Autorizado, 2=Denegado',
  `id_auditor` int(11) DEFAULT NULL,
  `ip_auditor` varchar(90) DEFAULT NULL,
  `porcentajecobertura` varchar(9) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cer_certificado`
--

CREATE TABLE `cer_certificado` (
  `id` int(11) NOT NULL,
  `fechaemision` timestamp NOT NULL,
  `ipprescriptor` varchar(90) NOT NULL,
  `matricprescr` int(11) NOT NULL,
  `matricespec_prescr` int(11) NOT NULL,
  `idpaciente` int(11) NOT NULL,
  `diagnostico` varchar(250) NOT NULL,
  `tratamiento` varchar(250) NOT NULL,
  `presentadoen` varchar(250) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cie10_categorias`
--

CREATE TABLE `cie10_categorias` (
  `id` int(11) NOT NULL,
  `clave` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `descripcion` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `idSubGrupo` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cie10_grupos`
--

CREATE TABLE `cie10_grupos` (
  `id` int(11) NOT NULL,
  `clave` varchar(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `descripcion` varchar(122) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cie10_subgrupos`
--

CREATE TABLE `cie10_subgrupos` (
  `id` int(11) NOT NULL,
  `clave` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `descripcion` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `idGrupo` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clinicas`
--

CREATE TABLE `clinicas` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `direccion` varchar(150) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(80) DEFAULT NULL,
  `codigo_postal` varchar(10) DEFAULT NULL,
  `ciudad` varchar(50) DEFAULT NULL,
  `provincia` varchar(50) DEFAULT NULL,
  `cuit` varchar(15) DEFAULT NULL,
  `activa` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `consultas_api`
--

CREATE TABLE `consultas_api` (
  `id` int(11) NOT NULL,
  `idusuario` int(11) NOT NULL,
  `fecha` datetime NOT NULL,
  `endpoint` varchar(255) NOT NULL,
  `ip` varchar(100) NOT NULL,
  `jwt_matricula` varchar(255) DEFAULT NULL,
  `jwt_nombre` varchar(255) DEFAULT NULL,
  `respuesta` longtext DEFAULT NULL,
  `payload` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `CONTACTO_PROVEEDOR`
--

CREATE TABLE `CONTACTO_PROVEEDOR` (
  `id_contacto` int(11) NOT NULL,
  `id_proveedor` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL COMMENT 'Nombre del contacto',
  `apellido` varchar(100) NOT NULL COMMENT 'Apellido del contacto',
  `cargo` varchar(100) DEFAULT NULL COMMENT 'Cargo o puesto',
  `email` varchar(255) DEFAULT NULL COMMENT 'Email del contacto',
  `telefono` varchar(50) DEFAULT NULL COMMENT 'Teléfono del contacto',
  `principal` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Indica si es el contacto principal',
  `fecha_alta` timestamp NULL DEFAULT current_timestamp(),
  `fecha_modificacion` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contactos de cada proveedor';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cuips`
--

CREATE TABLE `cuips` (
  `id` int(11) NOT NULL,
  `matric` int(11) NOT NULL,
  `matricula` int(11) DEFAULT NULL,
  `dni` int(11) NOT NULL,
  `licencia` int(11) NOT NULL COMMENT 'id_profesional',
  `cuit` varchar(18) DEFAULT NULL,
  `cuips` varchar(18) DEFAULT NULL,
  `sexo` varchar(1) NOT NULL,
  `fecnac` varchar(11) NOT NULL,
  `apellido` varchar(45) NOT NULL,
  `nombre` varchar(45) NOT NULL,
  `profesion` int(11) NOT NULL,
  `fallecido` varchar(2) NOT NULL,
  `fecha_fallecido` varchar(11) NOT NULL,
  `habilitado` varchar(2) NOT NULL,
  `situacion` varchar(2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cuips0`
--

CREATE TABLE `cuips0` (
  `id` int(11) NOT NULL,
  `matric` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `matricula` int(11) DEFAULT NULL,
  `dni` int(11) NOT NULL,
  `licencia` int(11) NOT NULL COMMENT 'id_profesional',
  `cuit` varchar(18) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `cuips` varchar(18) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `sexo` varchar(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `fecnac` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `apellido` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `nombre` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `profesion` int(11) NOT NULL,
  `fallecido` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `fecha_fallecido` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `habilitado` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `situacion` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cuips1`
--

CREATE TABLE `cuips1` (
  `id` int(11) NOT NULL,
  `matric` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `matricula` int(11) DEFAULT NULL,
  `dni` int(11) NOT NULL,
  `licencia` int(11) NOT NULL COMMENT 'id_profesional',
  `cuit` varchar(18) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `cuips` varchar(18) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `sexo` varchar(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `fecnac` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `apellido` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `nombre` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `profesion` int(11) NOT NULL,
  `fallecido` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `fecha_fallecido` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `habilitado` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `situacion` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `epicrisis_cabecera`
--

CREATE TABLE `epicrisis_cabecera` (
  `idepicrisis` int(11) NOT NULL,
  `fechaemision` datetime NOT NULL,
  `ipprescriptor` varchar(50) NOT NULL,
  `matricprescr` int(11) NOT NULL,
  `matricespec_prescr` int(11) NOT NULL,
  `idpaciente` int(11) NOT NULL,
  `idobrasocafiliado` int(11) NOT NULL,
  `id_encriptado` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `epicrisis_cuerpo`
--

CREATE TABLE `epicrisis_cuerpo` (
  `id` int(11) NOT NULL,
  `idepicrisis` int(11) NOT NULL,
  `nro_orden` int(11) NOT NULL,
  `codigo` int(11) NOT NULL DEFAULT 0,
  `descripcion` mediumtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `est_prescrestudio`
--

CREATE TABLE `est_prescrestudio` (
  `idestuprescripto` int(11) NOT NULL,
  `idestudio` int(11) NOT NULL,
  `idauditoria` int(11) DEFAULT NULL,
  `nro_orden` int(11) NOT NULL,
  `codigo` int(11) NOT NULL,
  `descripcion` varchar(256) NOT NULL,
  `dispensado` varchar(1) DEFAULT NULL,
  `observacion` varchar(200) DEFAULT NULL,
  `fecha_disp` datetime DEFAULT current_timestamp(),
  `ip_disp` varchar(90) DEFAULT NULL,
  `tipo_opera` int(11) DEFAULT NULL,
  `estado_auditoria` int(11) DEFAULT NULL COMMENT '0=espera ser auditado, 1=Autorizado, 2=Denegado',
  `id_auditor` int(11) DEFAULT NULL,
  `ip_auditor` varchar(90) DEFAULT NULL,
  `porcentajecobertura` varchar(9) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `est_receta`
--

CREATE TABLE `est_receta` (
  `idestudio` int(11) NOT NULL,
  `id_encriptado` varchar(256) DEFAULT NULL,
  `fechaemision` datetime NOT NULL DEFAULT current_timestamp(),
  `ipprescriptor` varchar(90) NOT NULL,
  `matricprescr` int(11) NOT NULL,
  `matricespec_prescr` int(11) NOT NULL,
  `idpaciente` int(11) NOT NULL,
  `idobrasocafiliado` int(11) NOT NULL,
  `lugaratencion` int(11) DEFAULT NULL,
  `diagnostico` varchar(255) NOT NULL,
  `diagnostico2` varchar(700) DEFAULT NULL,
  `identidadreserv` int(11) DEFAULT NULL COMMENT 'Identidad Reservada',
  `estado` int(11) DEFAULT NULL,
  `anulacionmotivo` varchar(250) DEFAULT NULL,
  `device` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `farm_usuarios`
--

CREATE TABLE `farm_usuarios` (
  `usu_clave` varchar(255) NOT NULL,
  `cuit` varchar(80) NOT NULL,
  `dni` varchar(10) DEFAULT NULL,
  `matricula` int(11) DEFAULT NULL,
  `razon_soc` varchar(80) DEFAULT NULL,
  `nombre_farm` varchar(80) DEFAULT NULL,
  `direccion_farm` varchar(120) DEFAULT NULL,
  `contacto_farm` varchar(150) DEFAULT NULL,
  `tipo_user` varchar(255) DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL COMMENT 'Token de reseteo de contraseña',
  `reset_expiracion` datetime DEFAULT NULL COMMENT 'Expiracion de reseteo, usualmente 1 hora	'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `guias_clicks`
--

CREATE TABLE `guias_clicks` (
  `id` int(11) NOT NULL,
  `matricula` varchar(50) NOT NULL,
  `fecha` datetime NOT NULL,
  `dispositivo` varchar(20) NOT NULL,
  `ip_publico` varchar(45) NOT NULL,
  `sistema_operativo` varchar(50) NOT NULL,
  `guia_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial`
--

CREATE TABLE `historial` (
  `id` int(11) NOT NULL,
  `matricula` int(11) NOT NULL,
  `diahora` datetime NOT NULL,
  `visito` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `horarios_medicos`
--

CREATE TABLE `horarios_medicos` (
  `id` int(11) NOT NULL,
  `matricula` int(11) NOT NULL,
  `clinica_id` int(11) NOT NULL,
  `dia_semana` tinyint(4) NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `duracion_turno` int(11) DEFAULT 30,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `indic_cabecera`
--

CREATE TABLE `indic_cabecera` (
  `idestudio` int(11) NOT NULL,
  `id_encriptado` varchar(256) DEFAULT NULL,
  `fechaemision` datetime NOT NULL,
  `ipprescriptor` varchar(90) NOT NULL,
  `matricprescr` int(11) NOT NULL,
  `matricespec_prescr` int(11) NOT NULL,
  `idpaciente` int(11) NOT NULL,
  `idobrasocafiliado` int(11) NOT NULL,
  `lugaratencion` int(11) DEFAULT NULL,
  `diagnostico` varchar(700) NOT NULL,
  `diagnostico2` varchar(700) DEFAULT NULL,
  `identidadreserv` int(11) DEFAULT NULL COMMENT 'Identidad Reservada',
  `estado` int(11) DEFAULT NULL,
  `anulacionmotivo` varchar(250) DEFAULT NULL,
  `device` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `indic_cuerpo`
--

CREATE TABLE `indic_cuerpo` (
  `idestuprescripto` int(11) NOT NULL,
  `idestudio` int(11) NOT NULL,
  `idauditoria` int(11) DEFAULT NULL,
  `nro_orden` int(11) NOT NULL,
  `codigo` int(11) NOT NULL,
  `descripcion` varchar(1600) NOT NULL,
  `dispensado` varchar(1) DEFAULT NULL,
  `observacion` varchar(200) DEFAULT NULL,
  `fecha_disp` datetime NOT NULL DEFAULT current_timestamp(),
  `ip_disp` varchar(90) DEFAULT NULL,
  `tipo_opera` int(11) DEFAULT NULL,
  `estado_auditoria` int(11) DEFAULT NULL COMMENT '0=espera ser auditado, 1=Autorizado, 2=Denegado',
  `id_auditor` int(11) DEFAULT NULL,
  `ip_auditor` varchar(90) DEFAULT NULL,
  `porcentajecobertura` varchar(9) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `medico_clinica`
--

CREATE TABLE `medico_clinica` (
  `id` int(11) NOT NULL,
  `matricula` int(11) NOT NULL,
  `clinica_id` int(11) NOT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `fecha_ingreso` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mejorar`
--

CREATE TABLE `mejorar` (
  `apenom` varchar(90) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `dni` int(11) NOT NULL,
  `fecha` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `muni_excep`
--

CREATE TABLE `muni_excep` (
  `id` int(11) NOT NULL,
  `idreceta` int(11) NOT NULL,
  `idpaciente` int(11) NOT NULL,
  `motivo` varchar(200) NOT NULL,
  `nrocelular` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `muni_lugar`
--

CREATE TABLE `muni_lugar` (
  `id` int(11) NOT NULL,
  `idctro` int(11) NOT NULL,
  `centrosalud` varchar(54) NOT NULL,
  `calle` varchar(90) DEFAULT NULL,
  `altura` varchar(9) DEFAULT NULL,
  `barrio` varchar(45) DEFAULT NULL,
  `horario` varchar(36) DEFAULT NULL,
  `telefono` varchar(45) DEFAULT NULL,
  `responsable` varchar(90) DEFAULT NULL,
  `ubicacion` varchar(180) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `nico_postgress`
--

CREATE TABLE `nico_postgress` (
  `matricula` int(11) NOT NULL,
  `apellido` varchar(45) NOT NULL,
  `nombre` varchar(45) NOT NULL,
  `cuit` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `PROVEEDOR`
--

CREATE TABLE `PROVEEDOR` (
  `id_proveedor` int(11) NOT NULL,
  `razon_social` varchar(255) NOT NULL COMMENT 'Nombre legal de la empresa',
  `cuit` varchar(20) NOT NULL COMMENT 'Clave Única de Identificación Tributaria',
  `tipo_proveedor` enum('Laboratorio','Droguería','Ambos') NOT NULL DEFAULT 'Laboratorio',
  `email_general` varchar(255) DEFAULT NULL COMMENT 'Correo institucional general',
  `telefono_general` varchar(50) DEFAULT NULL COMMENT 'Teléfono general',
  `direccion_calle` varchar(100) DEFAULT NULL COMMENT 'Nombre de la calle',
  `direccion_numero` varchar(10) DEFAULT NULL COMMENT 'Altura o número de calle',
  `barrio` varchar(100) DEFAULT NULL COMMENT 'Barrio o zona',
  `localidad` varchar(100) DEFAULT NULL COMMENT 'Ciudad o pueblo',
  `provincia` varchar(100) DEFAULT NULL COMMENT 'Provincia o estado',
  `activo` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Si sigue vigente como proveedor',
  `fecha_alta` timestamp NULL DEFAULT current_timestamp() COMMENT 'Fecha de registro',
  `fecha_modificacion` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla principal de proveedores de medicación de alto costo';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `PROVEEDOR_MEDICAMENTO`
--

CREATE TABLE `PROVEEDOR_MEDICAMENTO` (
  `id` int(11) NOT NULL,
  `id_proveedor` int(11) NOT NULL,
  `id_medicamento` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) DEFAULT NULL COMMENT 'Precio por unidad del medicamento',
  `moneda` varchar(3) DEFAULT 'ARS' COMMENT 'Moneda del precio (ARS, USD, etc)',
  `fecha_vigencia_desde` date DEFAULT NULL COMMENT 'Desde cuándo rige este precio',
  `fecha_vigencia_hasta` date DEFAULT NULL COMMENT 'Hasta cuándo rige este precio',
  `activo` tinyint(1) DEFAULT 1,
  `fecha_alta` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Relación entre proveedores y medicamentos con precios';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_auditoria`
--

CREATE TABLE `rec_auditoria` (
  `id` int(11) NOT NULL,
  `idpaciente` int(11) NOT NULL,
  `idprescriptor` int(11) NOT NULL,
  `matricespec_prescr` int(11) NOT NULL,
  `fecha_origen` date NOT NULL,
  `idobrasoc` int(11) NOT NULL,
  `cantmeses` int(11) NOT NULL,
  `renglones` int(11) NOT NULL,
  `idreceta1` int(11) NOT NULL,
  `idreceta2` int(11) DEFAULT NULL,
  `idreceta3` int(11) DEFAULT NULL,
  `idreceta4` int(11) DEFAULT NULL,
  `idreceta5` int(11) DEFAULT NULL,
  `idreceta6` int(11) DEFAULT NULL,
  `bloqueadaxauditor` int(11) DEFAULT NULL,
  `fechahora_bloqueo` datetime DEFAULT NULL,
  `auditado` int(11) DEFAULT NULL COMMENT '1=si NULL= no',
  `estado` int(11) DEFAULT NULL COMMENT 'null = visible, 1 = borrado',
  `nota` varchar(256) DEFAULT NULL,
  `auditadopor` int(11) DEFAULT NULL,
  `altocosto` int(11) DEFAULT NULL COMMENT '1=alto costo',
  `necesita_farmalink` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_compras_alto_costo`
--

CREATE TABLE `rec_compras_alto_costo` (
  `id` int(11) NOT NULL,
  `idreceta` int(11) NOT NULL,
  `estado_compra` enum('pendiente_envio','enviado_proveedores','con_presupuestos','finalizado') DEFAULT 'pendiente_envio',
  `fecha_recepcion` datetime DEFAULT current_timestamp(),
  `fecha_envio_proveedores` datetime DEFAULT NULL,
  `id_usuario_compras` int(11) DEFAULT NULL,
  `observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_compras_proveedores`
--

CREATE TABLE `rec_compras_proveedores` (
  `id` int(11) NOT NULL,
  `id_compra` int(11) NOT NULL,
  `idreceta` int(11) NOT NULL,
  `nro_orden` int(11) NOT NULL,
  `id_proveedor` int(11) NOT NULL,
  `fecha_envio` datetime DEFAULT current_timestamp(),
  `estado` enum('enviado','presupuesto_recibido','rechazado') DEFAULT 'enviado'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_obrasoc`
--

CREATE TABLE `rec_obrasoc` (
  `id` int(11) NOT NULL,
  `sigla` varchar(30) NOT NULL,
  `descripcion` varchar(160) NOT NULL,
  `estado` int(11) NOT NULL COMMENT '1=activo   0=inactivo',
  `plan` int(11) NOT NULL COMMENT '0=Universal 1=Propio',
  `abiertocerrado` int(11) DEFAULT NULL COMMENT '0=cerrado 1=abierto',
  `id_validador` int(11) DEFAULT NULL,
  `cod_validador` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_obrasoc_medico`
--

CREATE TABLE `rec_obrasoc_medico` (
  `id` int(11) NOT NULL,
  `idobrasocial` int(11) NOT NULL,
  `activo` int(11) DEFAULT NULL COMMENT '0=Inactivo 1=activo',
  `matric` int(11) NOT NULL,
  `dni` int(11) DEFAULT NULL,
  `desde` date DEFAULT NULL,
  `hasta` date DEFAULT NULL,
  `lugar` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci DEFAULT NULL,
  `lunes` int(11) DEFAULT NULL,
  `martes` int(11) DEFAULT NULL,
  `miercoles` int(11) DEFAULT NULL,
  `jueves` int(11) DEFAULT NULL,
  `viernes` int(11) DEFAULT NULL,
  `sabado` int(11) DEFAULT NULL,
  `domingo` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_obrasoc_medico_vadem`
--

CREATE TABLE `rec_obrasoc_medico_vadem` (
  `id` int(11) NOT NULL,
  `idobrasocial` int(11) NOT NULL,
  `dni` int(11) NOT NULL,
  `idmedicoespecialidad` int(11) NOT NULL,
  `fecha_autorizado` datetime NOT NULL,
  `idoperador` int(11) NOT NULL,
  `ipoperador` varchar(90) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_obrasoc_plan`
--

CREATE TABLE `rec_obrasoc_plan` (
  `id` int(11) NOT NULL,
  `id_obrasoc` int(11) NOT NULL,
  `plan` varchar(18) NOT NULL,
  `descripcion` varchar(45) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_obsocplan_vademecum`
--

CREATE TABLE `rec_obsocplan_vademecum` (
  `id` int(11) NOT NULL,
  `nro_registro` int(11) NOT NULL COMMENT 'vad_manual',
  `id_obrasoc` int(11) NOT NULL COMMENT 'rec_obrasoc',
  `tipocobertura` varchar(1) NOT NULL COMMENT '0=Universal 1=Embarazada',
  `idplan_obrasoc` int(11) NOT NULL COMMENT 'rec_obrasoc_plan',
  `cantunidades` int(11) NOT NULL COMMENT 'Cantidad de Unidades',
  `tipoperiodo` int(11) NOT NULL COMMENT '0=diario, 1=mes, 2=bimestre, 6=semestre,9=atemporal',
  `canttiempo` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_paciente`
--

CREATE TABLE `rec_paciente` (
  `id` int(11) NOT NULL,
  `dni` int(11) NOT NULL,
  `cuil` int(11) DEFAULT NULL,
  `apellido` text NOT NULL,
  `nombre` text NOT NULL,
  `sexo` text NOT NULL,
  `talla` int(11) DEFAULT NULL,
  `peso` int(11) DEFAULT NULL,
  `latitud` varchar(30) DEFAULT NULL,
  `longitud` varchar(30) DEFAULT NULL,
  `calle` varchar(200) DEFAULT NULL,
  `numero` int(11) DEFAULT NULL,
  `piso` int(11) DEFAULT NULL,
  `departamento` varchar(200) DEFAULT NULL,
  `cpostal` varchar(30) DEFAULT NULL,
  `barrio` varchar(200) DEFAULT NULL,
  `monoblock` varchar(200) DEFAULT NULL,
  `ciudad` varchar(150) DEFAULT NULL,
  `municipio` varchar(150) DEFAULT NULL,
  `provincia` varchar(80) DEFAULT NULL,
  `pais` varchar(50) DEFAULT NULL,
  `mensaf` varchar(50) DEFAULT NULL,
  `origenf` varchar(50) DEFAULT NULL,
  `fechaf` varchar(20) DEFAULT NULL,
  `foto` varchar(200) DEFAULT NULL,
  `fechaConsulta` varchar(20) DEFAULT NULL,
  `email` text DEFAULT NULL,
  `paistelef` varchar(5) DEFAULT NULL,
  `telefono` text DEFAULT NULL,
  `idobrasocial` int(11) NOT NULL,
  `nromatriculadoc` text DEFAULT NULL,
  `tipoplan` int(11) DEFAULT NULL COMMENT '1:Mejorar - 2:Excep - 3:Otros - 4:NoMejorar',
  `fecnac` date DEFAULT NULL,
  `renaper_act` timestamp NULL DEFAULT NULL COMMENT 'Utlima actualizacion con renaper',
  `fecha` varchar(255) DEFAULT NULL,
  `numeroafiliado` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_pacienteobrasoc`
--

CREATE TABLE `rec_pacienteobrasoc` (
  `id` int(11) NOT NULL,
  `idpaciente` int(11) NOT NULL,
  `idobrasoc` int(11) NOT NULL,
  `nroafiliado` varchar(200) NOT NULL,
  `fecharegistro` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ipregistro` varchar(90) NOT NULL COMMENT 'IPV6 tiene 71 IPV4 tiene 15'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_pacienteplanespecial`
--

CREATE TABLE `rec_pacienteplanespecial` (
  `id` int(11) NOT NULL,
  `id_paciente` int(11) NOT NULL,
  `id_obrasocial` int(11) NOT NULL,
  `tipo_plan` int(11) NOT NULL,
  `id_planespecial` int(11) NOT NULL,
  `fechainicio` datetime NOT NULL,
  `fechafin` datetime NOT NULL,
  `codigo_autorizacion` varchar(90) NOT NULL,
  `ip_autorizador` varchar(90) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_persona`
--

CREATE TABLE `rec_persona` (
  `id` int(11) NOT NULL,
  `matricula` int(11) NOT NULL,
  `apellido` varchar(40) NOT NULL,
  `nombre` varchar(40) NOT NULL,
  `fechnac` varchar(10) DEFAULT NULL,
  `sexo` varchar(1) DEFAULT NULL,
  `foto` longblob DEFAULT NULL,
  `firma` longblob DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_prescrmedicamento`
--

CREATE TABLE `rec_prescrmedicamento` (
  `idrecetamedic` int(11) NOT NULL,
  `idreceta` int(11) NOT NULL,
  `idauditoria` int(11) DEFAULT NULL,
  `nro_orden` int(11) NOT NULL,
  `idmedicamento` int(11) DEFAULT NULL,
  `codigo` int(11) NOT NULL,
  `IDSnomed` varchar(32) DEFAULT NULL,
  `cie10` varchar(18) DEFAULT NULL,
  `ley25649` varchar(1) DEFAULT NULL,
  `cantprescripta` int(11) DEFAULT NULL,
  `posologia` varchar(180) DEFAULT NULL,
  `dispensado` varchar(1) DEFAULT NULL,
  `observacion` varchar(200) DEFAULT NULL,
  `farmacia` varchar(11) DEFAULT NULL,
  `sucursal` varchar(11) DEFAULT NULL,
  `codigo_dispensado` int(11) DEFAULT NULL,
  `cant_disp` int(11) DEFAULT NULL,
  `fecha_disp` datetime DEFAULT current_timestamp(),
  `ip_disp` varchar(90) DEFAULT NULL,
  `bloqueo` int(11) DEFAULT NULL,
  `fech_hora_blo` datetime DEFAULT NULL,
  `tipo_opera` int(11) DEFAULT NULL,
  `bono_nombre` varchar(60) DEFAULT NULL,
  `bono_autoriza` varchar(100) DEFAULT NULL,
  `estado_auditoria` int(11) DEFAULT NULL COMMENT '0=espera ser auditado, 1=Autorizado, 2=Denegado	',
  `fecha_auditoria` timestamp NULL DEFAULT NULL,
  `id_auditor` int(11) DEFAULT NULL,
  `ip_auditor` varchar(90) DEFAULT NULL,
  `porcentajecobertura` varchar(9) DEFAULT NULL,
  `cobertura2` varchar(100) DEFAULT NULL,
  `indicacion` varchar(256) NOT NULL,
  `autorizacion_especial` varchar(20) NOT NULL,
  `pendiente_farmalink` int(11) NOT NULL,
  `numero_farmalink` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_prescrmedicamento_alto_costo`
--

CREATE TABLE `rec_prescrmedicamento_alto_costo` (
  `idrecetamedic` int(11) NOT NULL,
  `idreceta` int(11) NOT NULL,
  `idauditoria` int(11) DEFAULT NULL,
  `nro_orden` int(11) NOT NULL,
  `idmedicamento` int(11) DEFAULT NULL,
  `codigo` int(11) NOT NULL,
  `IDSnomed` varchar(32) DEFAULT NULL,
  `cie10` varchar(18) DEFAULT NULL,
  `ley25649` varchar(1) DEFAULT NULL,
  `cantprescripta` int(11) DEFAULT NULL,
  `posologia` varchar(180) DEFAULT NULL,
  `dispensado` varchar(1) DEFAULT NULL,
  `observacion` varchar(200) DEFAULT NULL,
  `farmacia` varchar(11) DEFAULT NULL,
  `sucursal` varchar(11) DEFAULT NULL,
  `codigo_dispensado` int(11) DEFAULT NULL,
  `cant_disp` int(11) DEFAULT NULL,
  `fecha_disp` datetime DEFAULT current_timestamp(),
  `ip_disp` varchar(90) DEFAULT NULL,
  `bloqueo` int(11) DEFAULT NULL,
  `fech_hora_blo` datetime DEFAULT NULL,
  `tipo_opera` int(11) DEFAULT NULL,
  `bono_nombre` varchar(60) DEFAULT NULL,
  `bono_autoriza` varchar(100) DEFAULT NULL,
  `estado_auditoria` int(11) DEFAULT 0 COMMENT '0=espera ser auditado, 1=Autorizado, 2=Denegado, 3=Requiere información adicional',
  `fecha_auditoria` timestamp NULL DEFAULT NULL,
  `id_auditor` int(11) DEFAULT NULL,
  `ip_auditor` varchar(90) DEFAULT NULL,
  `porcentajecobertura` varchar(9) DEFAULT NULL,
  `cobertura2` varchar(100) DEFAULT NULL,
  `pendiente_farmalink` tinyint(1) DEFAULT 0,
  `numero_farmalink` varchar(20) DEFAULT NULL COMMENT 'Número de receta Farmalink que comienza con 9339',
  `autorizacion_especial` varchar(250) NOT NULL,
  `fecha_ae_vigencia_hasta` date DEFAULT NULL,
  `nroRecetaFinanciadora` varchar(50) DEFAULT NULL,
  `es_alto_costo` tinyint(1) DEFAULT 1 COMMENT 'Marca que es medicamento de alto costo',
  `categoria_alto_costo` varchar(50) DEFAULT NULL COMMENT 'Categoría: ONCOLOGICO, INMUNOLOGICO, etc.',
  `requiere_protocolo` tinyint(1) DEFAULT 1 COMMENT 'Si requiere protocolo especial',
  `duracion_tratamiento_dias` int(11) DEFAULT 30 COMMENT 'Duración estimada del tratamiento'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci COMMENT='Medicamentos prescritos de alto costo';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_presupuestos_alto_costo`
--

CREATE TABLE `rec_presupuestos_alto_costo` (
  `id` int(11) NOT NULL,
  `id_compra_proveedor` int(11) NOT NULL,
  `idreceta` int(11) NOT NULL,
  `nro_orden` int(11) NOT NULL,
  `id_proveedor` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `cantidad_disponible` int(11) NOT NULL,
  `tiempo_entrega_dias` int(11) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_presupuesto` datetime DEFAULT current_timestamp(),
  `id_usuario_proveedor` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_presupuestos_seleccionados`
--

CREATE TABLE `rec_presupuestos_seleccionados` (
  `id` int(11) NOT NULL,
  `id_presupuesto` int(11) NOT NULL,
  `idreceta` int(11) NOT NULL,
  `nro_orden` int(11) NOT NULL,
  `fecha_seleccion` datetime DEFAULT current_timestamp(),
  `id_usuario_seleccion` int(11) NOT NULL,
  `pdf_generado` tinyint(1) DEFAULT 0,
  `pdf_url` varchar(500) DEFAULT NULL,
  `fecha_pdf` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_proveedores`
--

CREATE TABLE `rec_proveedores` (
  `id` int(11) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `cuit` varchar(20) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `fecha_alta` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_proveedores_usuarios`
--

CREATE TABLE `rec_proveedores_usuarios` (
  `id` int(11) NOT NULL,
  `id_proveedor` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `ultimo_acceso` datetime DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_receta`
--

CREATE TABLE `rec_receta` (
  `idreceta` int(11) NOT NULL,
  `num_receta_ofuscada` varchar(256) DEFAULT NULL,
  `fechaemision` datetime NOT NULL DEFAULT current_timestamp(),
  `ipprescriptor` varchar(90) NOT NULL,
  `matricprescr` int(11) NOT NULL,
  `matricespec_prescr` int(11) NOT NULL,
  `idpaciente` int(11) NOT NULL,
  `idobrasocafiliado` int(11) NOT NULL,
  `lugaratencion` int(11) DEFAULT NULL,
  `tipo_farmacia_destino` int(11) DEFAULT NULL COMMENT '1=publica 2=comercial',
  `diagnostico` varchar(255) NOT NULL,
  `diagnostico2` varchar(700) DEFAULT NULL,
  `bloqueo` varchar(9) DEFAULT NULL,
  `fech_bloqueo` datetime DEFAULT NULL,
  `apikeyboqueo` varchar(90) DEFAULT NULL,
  `identidadreserv` int(11) DEFAULT NULL COMMENT 'Identidad Reservada',
  `estado` int(11) DEFAULT NULL,
  `anulacionmotivo` varchar(250) DEFAULT NULL,
  `idespecialidad` int(11) NOT NULL,
  `device` varchar(255) DEFAULT NULL,
  `empresa` varchar(255) DEFAULT NULL,
  `expertoria` varchar(10) NOT NULL,
  `nroRecetaFinanciadora` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_receta_alto_costo`
--

CREATE TABLE `rec_receta_alto_costo` (
  `idreceta` int(11) NOT NULL,
  `num_receta_ofuscada` varchar(256) DEFAULT NULL,
  `fechaemision` datetime NOT NULL DEFAULT current_timestamp(),
  `ipprescriptor` varchar(90) NOT NULL,
  `matricprescr` int(11) NOT NULL,
  `expertoria` varchar(100) DEFAULT NULL,
  `matricespec_prescr` int(11) NOT NULL,
  `idpaciente` int(11) NOT NULL,
  `idobrasocafiliado` int(11) NOT NULL,
  `lugaratencion` int(11) DEFAULT NULL,
  `tipo_farmacia_destino` int(11) DEFAULT NULL COMMENT '1=publica 2=comercial',
  `diagnostico` varchar(255) NOT NULL,
  `diagnostico2` varchar(700) DEFAULT NULL,
  `bloqueo` varchar(9) DEFAULT NULL,
  `fech_bloqueo` datetime DEFAULT NULL,
  `apikeyboqueo` varchar(90) DEFAULT NULL,
  `identidadreserv` int(11) DEFAULT NULL COMMENT 'Identidad Reservada',
  `estado` int(11) DEFAULT NULL,
  `anulacionmotivo` varchar(250) DEFAULT NULL,
  `nroRecetaFinanciadora` varchar(250) DEFAULT NULL,
  `idEmpresa` int(11) NOT NULL,
  `empresa` varchar(100) DEFAULT NULL,
  `device` varchar(255) DEFAULT NULL COMMENT 'Dispositivo utilizado',
  `codigoGemcia` varchar(255) DEFAULT NULL,
  `es_alto_costo` tinyint(1) DEFAULT 1 COMMENT 'Siempre 1 para esta tabla',
  `numero_solicitud_ac` varchar(20) DEFAULT NULL COMMENT 'Número único AC-YYYY-NNNN',
  `historia_clinica_complementaria` text DEFAULT NULL COMMENT 'Historia clínica del registro complementario',
  `justificacion_alto_costo` text DEFAULT NULL COMMENT 'Justificación específica para medicamentos de alto costo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci COMMENT='Recetas de medicamentos de alto costo';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_reversionvta`
--

CREATE TABLE `rec_reversionvta` (
  `id` int(11) NOT NULL,
  `idreceta` int(11) NOT NULL,
  `nro_orden` int(11) NOT NULL,
  `matfarmac` int(11) NOT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ipfarmaceutico` varchar(90) NOT NULL,
  `motivo` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rec_vademecum`
--

CREATE TABLE `rec_vademecum` (
  `id` int(11) NOT NULL,
  `monodroga` varchar(45) NOT NULL,
  `nombre_comercial` varchar(90) NOT NULL,
  `presentacion` varchar(90) NOT NULL,
  `laboratorio` varchar(45) NOT NULL,
  `tipo` varchar(45) NOT NULL,
  `codigo` int(11) NOT NULL,
  `codigobarra` bigint(20) NOT NULL,
  `estado` varchar(45) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `represcripta`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `represcripta` (
`idreceta` int(11)
,`fechaemision` datetime
,`diagnostico` varchar(255)
,`dni` int(11)
,`apellido` text
,`nombre` text
,`email` text
,`telefono` text
,`sexo` text
,`fecnac` date
,`plan` varchar(18)
,`lugaratencion` int(11)
,`centroasist` varchar(54)
,`matricprescr` int(11)
,`matricespec_prescr` int(11)
,`medape` varchar(160)
,`mednom` varchar(160)
,`renglon` int(11)
,`cod_prescripto` int(11)
,`descripcion` varchar(155)
,`cantprescripta` int(11)
,`dispensado` varchar(2)
);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_aux`
--

CREATE TABLE `tmp_aux` (
  `id` int(11) NOT NULL,
  `matr` int(11) NOT NULL,
  `apellido` varchar(45) NOT NULL,
  `nombre` varchar(45) NOT NULL,
  `puntos` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_codigo_postal`
--

CREATE TABLE `tmp_codigo_postal` (
  `codigo_postal` int(11) NOT NULL,
  `sub_codigo_postal` int(11) NOT NULL,
  `provincia` varchar(18) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `localidad` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `departamento` int(11) NOT NULL,
  `pais` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_distrito`
--

CREATE TABLE `tmp_distrito` (
  `distrito` int(11) NOT NULL,
  `denominacion` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_domici`
--

CREATE TABLE `tmp_domici` (
  `matricula` int(11) NOT NULL,
  `persona` int(11) NOT NULL,
  `tipo_domicilio` int(11) NOT NULL,
  `domicilio` varchar(250) NOT NULL,
  `numero` varchar(40) DEFAULT NULL,
  `departamento` varchar(80) DEFAULT NULL,
  `codigo_postal` int(11) DEFAULT NULL,
  `codigo_postal_sub` int(11) DEFAULT NULL,
  `codigo_barrio` int(11) DEFAULT NULL,
  `cod_area_tel` int(11) DEFAULT NULL,
  `nro_telefono` int(11) DEFAULT NULL,
  `cod_area_fax` int(11) DEFAULT NULL,
  `nro_fax` int(11) DEFAULT NULL,
  `mail` varchar(250) DEFAULT NULL,
  `est_mail` char(4) DEFAULT NULL COMMENT '"V" vigente',
  `fecha_migrada` varchar(40) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_domici0`
--

CREATE TABLE `tmp_domici0` (
  `matricula` int(11) NOT NULL,
  `persona` int(11) NOT NULL,
  `tipo_domicilio` int(11) NOT NULL,
  `domicilio` varchar(250) NOT NULL,
  `numero` varchar(40) DEFAULT NULL,
  `departamento` varchar(80) DEFAULT NULL,
  `codigo_postal` int(11) DEFAULT NULL,
  `codigo_postal_sub` int(11) DEFAULT NULL,
  `codigo_barrio` int(11) DEFAULT NULL,
  `cod_area_tel` int(11) DEFAULT NULL,
  `nro_telefono` int(11) DEFAULT NULL,
  `cod_area_fax` int(11) DEFAULT NULL,
  `nro_fax` int(11) DEFAULT NULL,
  `mail` varchar(250) DEFAULT NULL,
  `est_mail` char(4) DEFAULT NULL COMMENT '"V" vigente',
  `fecha_migrada` varchar(40) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_especialidades`
--

CREATE TABLE `tmp_especialidades` (
  `especialidad` int(11) NOT NULL,
  `denominacion` varchar(45) NOT NULL,
  `denominacion_diploma` int(11) DEFAULT NULL,
  `colacion_nro_orden` int(11) DEFAULT NULL,
  `colacion_turno` int(11) DEFAULT NULL,
  `antecedentes` varchar(1) DEFAULT NULL,
  `antecedentes_denominacion` varchar(30) DEFAULT NULL,
  `tipo_especialidad` varchar(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_especialistas`
--

CREATE TABLE `tmp_especialistas` (
  `tipo_especialidad` int(11) NOT NULL,
  `matricula` int(11) NOT NULL,
  `matricula_especialista` int(11) NOT NULL,
  `especialidad` int(11) NOT NULL,
  `fecha_especialista` varchar(10) NOT NULL,
  `especialidad_estado` int(11) NOT NULL,
  `fecha_ult_renovacion` varchar(10) NOT NULL,
  `cantidad_renovacion` int(11) NOT NULL,
  `libro_tomo` int(11) NOT NULL,
  `libro_folio` int(11) NOT NULL,
  `fecha_vencimiento` varchar(10) NOT NULL,
  `obtenido` int(11) NOT NULL,
  `submatricula` int(11) NOT NULL,
  `cantidad_renovaciones_solicitada` int(11) NOT NULL,
  `fecha_hasta` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_especialistas0`
--

CREATE TABLE `tmp_especialistas0` (
  `tipo_especialidad` int(11) NOT NULL,
  `matricula` int(11) NOT NULL,
  `matricula_especialista` int(11) NOT NULL,
  `especialidad` int(11) NOT NULL,
  `fecha_especialista` varchar(10) NOT NULL,
  `especialidad_estado` int(11) NOT NULL,
  `fecha_ult_renovacion` varchar(10) NOT NULL,
  `cantidad_renovacion` int(11) NOT NULL,
  `libro_tomo` int(11) NOT NULL,
  `libro_folio` int(11) NOT NULL,
  `fecha_vencimiento` varchar(10) NOT NULL,
  `obtenido` int(11) NOT NULL,
  `submatricula` int(11) NOT NULL,
  `cantidad_renovaciones_solicitada` int(11) NOT NULL,
  `fecha_hasta` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_expertorias`
--

CREATE TABLE `tmp_expertorias` (
  `CODIGO` int(11) NOT NULL,
  `DESCRIPCION` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_expertorias_medico`
--

CREATE TABLE `tmp_expertorias_medico` (
  `id` int(11) NOT NULL,
  `matricula` int(11) DEFAULT NULL,
  `id_expertoria` int(11) NOT NULL,
  `codigo_expertoria` varchar(50) DEFAULT NULL,
  `fecha_asignacion` date DEFAULT NULL,
  `activo` tinyint(4) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_guiasclinicas`
--

CREATE TABLE `tmp_guiasclinicas` (
  `id` int(11) NOT NULL,
  `idtema` varchar(2) NOT NULL,
  `tematica` varchar(90) NOT NULL,
  `articulo` varchar(180) NOT NULL,
  `palabrasclaves` varchar(450) NOT NULL,
  `texto` mediumtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_lmm`
--

CREATE TABLE `tmp_lmm` (
  `id` int(11) NOT NULL,
  `matric` int(11) NOT NULL,
  `apellido` varchar(27) NOT NULL,
  `nombre` varchar(45) NOT NULL,
  `idlugar` int(11) NOT NULL,
  `lugar` varchar(45) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_matriculados`
--

CREATE TABLE `tmp_matriculados` (
  `matricula` int(11) NOT NULL,
  `persona` int(11) NOT NULL,
  `situacion` int(11) NOT NULL,
  `colegio` int(11) DEFAULT NULL,
  `lugar_pago` int(11) DEFAULT NULL,
  `oli` char(4) DEFAULT NULL,
  `libro` int(11) DEFAULT NULL,
  `folio` int(11) DEFAULT NULL,
  `universidad` int(11) DEFAULT NULL,
  `nro_jubilado` varchar(40) DEFAULT NULL,
  `fecha_matricula` varchar(40) DEFAULT NULL,
  `qap` int(11) DEFAULT NULL,
  `oca` varchar(120) DEFAULT NULL,
  `fecha_ca` varchar(40) DEFAULT NULL,
  `eti` varchar(120) DEFAULT NULL,
  `fet` varchar(40) DEFAULT NULL,
  `omu` varchar(80) DEFAULT NULL,
  `fti` varchar(40) DEFAULT NULL,
  `fecha_egreso` varchar(40) DEFAULT NULL,
  `fecha_retroactiva` varchar(40) DEFAULT NULL,
  `con` char(4) DEFAULT NULL,
  `cor` char(4) DEFAULT NULL,
  `fecha_migracion` varchar(40) DEFAULT NULL,
  `n` char(4) DEFAULT NULL,
  `bb2018_cmpc` tinyint(1) NOT NULL COMMENT 'bandera boleta bancaria 2018 Colegiacion',
  `bb2018_fisap` tinyint(1) NOT NULL COMMENT 'bandera boleta bancaria 2018 Fisap',
  `rematriculado` varchar(4) DEFAULT NULL,
  `certificado_ethica` varchar(4) DEFAULT NULL,
  `fecha_nota_ingreso` varchar(40) DEFAULT NULL,
  `orcl_afi_atm_id` varchar(2) DEFAULT NULL,
  `orcl_afi_atm_descrip` varchar(60) DEFAULT NULL,
  `orcl_es_id` int(11) DEFAULT NULL,
  `orcl_es_descrip` varchar(60) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_matriculados0`
--

CREATE TABLE `tmp_matriculados0` (
  `matricula` int(11) NOT NULL,
  `persona` int(11) NOT NULL,
  `situacion` int(11) NOT NULL,
  `colegio` int(11) DEFAULT NULL,
  `lugar_pago` int(11) DEFAULT NULL,
  `oli` char(4) DEFAULT NULL,
  `libro` int(11) DEFAULT NULL,
  `folio` int(11) DEFAULT NULL,
  `universidad` int(11) DEFAULT NULL,
  `nro_jubilado` varchar(40) DEFAULT NULL,
  `fecha_matricula` varchar(40) DEFAULT NULL,
  `qap` int(11) DEFAULT NULL,
  `oca` varchar(120) DEFAULT NULL,
  `fecha_ca` varchar(40) DEFAULT NULL,
  `eti` varchar(120) DEFAULT NULL,
  `fet` varchar(40) DEFAULT NULL,
  `omu` varchar(80) DEFAULT NULL,
  `fti` varchar(40) DEFAULT NULL,
  `fecha_egreso` varchar(40) DEFAULT NULL,
  `fecha_retroactiva` varchar(40) DEFAULT NULL,
  `con` char(4) DEFAULT NULL,
  `cor` char(4) DEFAULT NULL,
  `fecha_migracion` varchar(40) DEFAULT NULL,
  `n` char(4) DEFAULT NULL,
  `bb2018_cmpc` tinyint(1) NOT NULL COMMENT 'bandera boleta bancaria 2018 Colegiacion',
  `bb2018_fisap` tinyint(1) NOT NULL COMMENT 'bandera boleta bancaria 2018 Fisap',
  `rematriculado` varchar(4) DEFAULT NULL,
  `certificado_ethica` varchar(4) DEFAULT NULL,
  `fecha_nota_ingreso` varchar(40) DEFAULT NULL,
  `orcl_afi_atm_id` varchar(2) DEFAULT NULL,
  `orcl_afi_atm_descrip` varchar(60) DEFAULT NULL,
  `orcl_es_id` int(11) DEFAULT NULL,
  `orcl_es_descrip` varchar(60) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_person`
--

CREATE TABLE `tmp_person` (
  `matricula` int(11) NOT NULL,
  `persona` int(11) NOT NULL,
  `apellido` varchar(160) NOT NULL,
  `nombre` varchar(160) NOT NULL,
  `tipo_documento` int(11) DEFAULT NULL,
  `nro_documento` int(11) NOT NULL,
  `fec_nacimiento` char(40) DEFAULT NULL,
  `lugar_nacimiento` int(11) DEFAULT NULL,
  `nacionalidad` int(11) DEFAULT NULL,
  `sexo` char(4) NOT NULL,
  `est_civil` int(11) NOT NULL,
  `orcl_foto` mediumblob DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_person0`
--

CREATE TABLE `tmp_person0` (
  `matricula` int(11) NOT NULL,
  `persona` int(11) NOT NULL,
  `apellido` varchar(160) NOT NULL,
  `nombre` varchar(160) NOT NULL,
  `tipo_documento` int(11) DEFAULT NULL,
  `nro_documento` int(11) NOT NULL,
  `fec_nacimiento` char(40) DEFAULT NULL,
  `lugar_nacimiento` int(11) DEFAULT NULL,
  `nacionalidad` int(11) DEFAULT NULL,
  `sexo` char(4) NOT NULL,
  `est_civil` int(11) NOT NULL,
  `orcl_foto` mediumblob DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tmp_rm2`
--

CREATE TABLE `tmp_rm2` (
  `idreceta` int(11) NOT NULL,
  `matricprescr` int(11) NOT NULL,
  `idpaciente` int(11) NOT NULL,
  `dnipaciente` int(11) NOT NULL,
  `lugar` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `turnos`
--

CREATE TABLE `turnos` (
  `id` int(11) NOT NULL,
  `matricula` int(11) NOT NULL,
  `clinica_id` int(11) NOT NULL,
  `paciente_id` int(11) NOT NULL,
  `especialidad_id` int(11) DEFAULT NULL,
  `fecha` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `estado` enum('agendado','confirmado','completado','cancelado','no_asistio') DEFAULT 'agendado',
  `motivo` varchar(200) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `precio` decimal(10,2) DEFAULT NULL,
  `pagado` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `userapikey`
--

CREATE TABLE `userapikey` (
  `id` int(11) NOT NULL,
  `cuit` varchar(11) NOT NULL,
  `sucursal` int(11) NOT NULL,
  `razonsocial` varchar(36) NOT NULL,
  `apikey` varchar(256) NOT NULL,
  `privez` int(11) NOT NULL,
  `tipouser` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usercia_au`
--

CREATE TABLE `usercia_au` (
  `id` int(11) NOT NULL,
  `sigla` varchar(18) NOT NULL,
  `organizacion` varchar(90) NOT NULL,
  `cuit` varchar(18) NOT NULL,
  `direccion` varchar(45) NOT NULL,
  `responsable` varchar(45) NOT NULL,
  `localidad` varchar(45) NOT NULL,
  `provincia` varchar(45) NOT NULL,
  `telefono` varchar(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `userlog_au`
--

CREATE TABLE `userlog_au` (
  `id` int(11) NOT NULL,
  `iduser` int(11) NOT NULL,
  `fecacceso` datetime NOT NULL,
  `ip_conexion` varchar(90) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `userrol_au`
--

CREATE TABLE `userrol_au` (
  `id` int(11) NOT NULL,
  `rol` varchar(18) NOT NULL,
  `nivel` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id_user` int(11) NOT NULL,
  `razon_social` text DEFAULT NULL,
  `cuit` text DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `provincia` text DEFAULT NULL,
  `localidad` text DEFAULT NULL,
  `cp` text DEFAULT NULL,
  `client_id` text DEFAULT NULL,
  `client_secret` text DEFAULT NULL,
  `token` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_asistido`
--

CREATE TABLE `user_asistido` (
  `id_asistencia` int(11) NOT NULL,
  `usu_passwmp` varchar(254) NOT NULL,
  `mat_id` varchar(80) NOT NULL,
  `fecha_asist` datetime NOT NULL,
  `user_cmpc` int(11) NOT NULL,
  `devuelta` int(11) NOT NULL COMMENT '0=moderador 1=devuelta'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_au`
--

CREATE TABLE `user_au` (
  `id` int(11) NOT NULL,
  `idcia` int(11) NOT NULL COMMENT 'compañia a la cual pertenecen',
  `apellido` varchar(45) NOT NULL,
  `nombre` varchar(45) NOT NULL,
  `user` varchar(18) NOT NULL,
  `password` varchar(36) NOT NULL,
  `ultimoreseteo` datetime DEFAULT NULL,
  `rol` int(11) NOT NULL,
  `dni` int(11) DEFAULT NULL,
  `keypublica` varchar(45) DEFAULT NULL,
  `keyprivada` varchar(45) DEFAULT NULL,
  `foto` varchar(256) DEFAULT NULL,
  `firma` varchar(265) DEFAULT NULL,
  `es_prueba` tinyint(1) DEFAULT 0 COMMENT 'Indica si el usuario es de prueba (1) o definitivo (0)',
  `fecha_inicio_prueba` datetime DEFAULT NULL COMMENT 'Fecha en que inició el período de prueba',
  `dias_prueba` int(11) DEFAULT 30 COMMENT 'Cantidad de días de prueba asignados',
  `fecha_expiracion_prueba` datetime DEFAULT NULL COMMENT 'Fecha en que expira el período de prueba (calculado automáticamente)',
  `ultimo_acceso` datetime DEFAULT NULL COMMENT 'Última fecha de acceso al sistema para el contador',
  `estado_cuenta` enum('activa','prueba_activa','prueba_expirada','suspendida') DEFAULT 'activa' COMMENT 'Estado actual de la cuenta'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

--
-- Disparadores `user_au`
--
DELIMITER $$
CREATE TRIGGER `before_user_trial_insert` BEFORE INSERT ON `user_au` FOR EACH ROW BEGIN
    IF NEW.es_prueba = 1 AND NEW.fecha_inicio_prueba IS NOT NULL THEN
        SET NEW.fecha_expiracion_prueba = DATE_ADD(NEW.fecha_inicio_prueba, INTERVAL NEW.dias_prueba DAY);
        SET NEW.estado_cuenta = 'prueba_activa';
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_user_trial_update` BEFORE UPDATE ON `user_au` FOR EACH ROW BEGIN
    IF NEW.es_prueba = 1 THEN
        IF NEW.fecha_inicio_prueba IS NOT NULL AND
           (OLD.fecha_inicio_prueba IS NULL OR
            OLD.fecha_inicio_prueba != NEW.fecha_inicio_prueba OR
            OLD.dias_prueba != NEW.dias_prueba) THEN
            SET NEW.fecha_expiracion_prueba = DATE_ADD(NEW.fecha_inicio_prueba, INTERVAL NEW.dias_prueba DAY);
        END IF;

        -- Actualizar estado según la fecha de expiración
        IF NEW.fecha_expiracion_prueba IS NOT NULL THEN
            IF NOW() < NEW.fecha_expiracion_prueba THEN
                SET NEW.estado_cuenta = 'prueba_activa';
            ELSE
                SET NEW.estado_cuenta = 'prueba_expirada';
            END IF;
        END IF;
    ELSE
        -- Si no es prueba, la cuenta está activa
        SET NEW.estado_cuenta = 'activa';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_col`
--

CREATE TABLE `user_col` (
  `id` int(11) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `user` varchar(100) NOT NULL,
  `password` varchar(100) NOT NULL,
  `rol` int(11) DEFAULT NULL,
  `dni` int(11) DEFAULT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `firma` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `usu_clave` varchar(255) NOT NULL,
  `mat_id` varchar(80) NOT NULL,
  `tipo_user` varchar(255) NOT NULL,
  `reset_token` varchar(255) DEFAULT NULL COMMENT 'Token de reseteo de contraseña',
  `reset_expiracion` datetime DEFAULT NULL COMMENT 'Expiracion de reseteo, usualmente 1 hora	'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios_api`
--

CREATE TABLE `usuarios_api` (
  `id` int(11) NOT NULL,
  `usuario` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `token` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios_iframe`
--

CREATE TABLE `usuarios_iframe` (
  `id` bigint(20) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `company` enum('CMPC','Gemcia') NOT NULL,
  `company_key` varchar(255) NOT NULL,
  `logo` varchar(255) NOT NULL,
  `status` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vademecum`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vademecum` (
`id` int(11)
,`cod_monodroga` int(11)
,`monodroga` varchar(32)
,`nro_alfabeta` int(11)
,`nombre_comercial` varchar(44)
,`presentacion` varchar(24)
,`laboratorio` varchar(15)
,`codigo` int(11)
,`idsnomed` varchar(32)
,`cod_barra` varchar(13)
,`unidades` int(11)
,`tipo_venta` varchar(1)
,`tipod` varchar(1)
,`tipo` varchar(30)
,`precio` bigint(20)
,`condicion` varchar(1)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vadetot`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vadetot` (
`id` int(11)
,`monodroga` varchar(57)
,`nombre_comercial` varchar(51)
,`presentacion` varchar(45)
,`laboratorio` varchar(18)
,`codigo` int(11)
,`cod_barra` varchar(13)
,`tipo_venta` varchar(1)
,`tipod` varchar(1)
,`tipo` varchar(30)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vad_020`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vad_020` (
`id` int(11)
,`cod_monodroga` int(11)
,`monodroga` varchar(32)
,`nro_alfabeta` int(11)
,`nombre_comercial` varchar(44)
,`presentacion` varchar(24)
,`laboratorio` varchar(15)
,`codigo` int(11)
,`cod_barra` varchar(13)
,`tipo_venta` varchar(1)
,`tipod` varchar(1)
,`tipo` varchar(30)
,`precio` bigint(20)
,`condicion` int(11)
);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_020_armado`
--

CREATE TABLE `vad_020_armado` (
  `id` int(11) NOT NULL,
  `condicion` int(11) NOT NULL COMMENT '1=Reconocido/Autorizado, 2=Auditoria, 3=NO Recido'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_020_armadocDupl`
--

CREATE TABLE `vad_020_armadocDupl` (
  `id` int(11) NOT NULL,
  `condicion` int(11) NOT NULL COMMENT '1=Reconocido/Autorizado, 2=Auditoria, 3=NO Recido'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vad_114`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vad_114` (
`id` int(11)
,`cod_monodroga` int(11)
,`monodroga` varchar(32)
,`nro_alfabeta` int(11)
,`nombre_comercial` varchar(44)
,`presentacion` varchar(24)
,`laboratorio` varchar(15)
,`codigo` int(11)
,`cod_barra` varchar(13)
,`tipo_venta` varchar(1)
,`tipod` varchar(1)
,`tipo` varchar(30)
,`precio` bigint(20)
,`condicion` int(11)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vad_9000`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vad_9000` (
`id` int(11)
,`cod_monodroga` int(11)
,`monodroga` varchar(32)
,`nro_alfabeta` int(11)
,`nombre_comercial` varchar(44)
,`presentacion` varchar(24)
,`laboratorio` varchar(15)
,`codigo` int(11)
,`cod_barra` varchar(13)
,`tipo_venta` varchar(1)
,`tipod` varchar(1)
,`tipo` varchar(30)
,`precio` bigint(20)
,`condicion` int(11)
);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_9000_armado`
--

CREATE TABLE `vad_9000_armado` (
  `id` int(11) NOT NULL,
  `condicion` int(11) NOT NULL COMMENT '1=Reconocido/Autorizado, 2=Auditoria, 3=NO Recido'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_acciofar`
--

CREATE TABLE `vad_acciofar` (
  `codigo` int(11) NOT NULL,
  `descripcion` varchar(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_acciofar0`
--

CREATE TABLE `vad_acciofar0` (
  `codigo` int(11) NOT NULL,
  `descripcion` varchar(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_barextra`
--

CREATE TABLE `vad_barextra` (
  `id` int(11) NOT NULL,
  `cod_barra` varchar(13) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_barextra0`
--

CREATE TABLE `vad_barextra0` (
  `id` int(11) NOT NULL,
  `cod_barra` varchar(13) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_formas`
--

CREATE TABLE `vad_formas` (
  `codigo` int(11) NOT NULL,
  `descripcion` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_formas0`
--

CREATE TABLE `vad_formas0` (
  `codigo` int(11) NOT NULL,
  `descripcion` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_gtin1`
--

CREATE TABLE `vad_gtin1` (
  `id` int(11) NOT NULL,
  `cod_gtin_medi` varchar(14) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_gtin10`
--

CREATE TABLE `vad_gtin10` (
  `id` int(11) NOT NULL,
  `cod_gtin_medi` varchar(14) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_laboratorios`
--

CREATE TABLE `vad_laboratorios` (
  `codigo` int(11) DEFAULT NULL,
  `descripcion` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_laboratorios0`
--

CREATE TABLE `vad_laboratorios0` (
  `codigo` int(11) DEFAULT NULL,
  `descripcion` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_manextra`
--

CREATE TABLE `vad_manextra` (
  `nro_registro` int(11) NOT NULL COMMENT 'manual.dat',
  `cod_tamano_presenta` int(11) NOT NULL COMMENT 'tamanos.txt',
  `cod_accion_farma` int(11) NOT NULL COMMENT 'acciofar.txt\r\n',
  `cod_droga` int(11) NOT NULL COMMENT 'monodro.txt',
  `cod_forma_fama` int(11) NOT NULL COMMENT 'formas.txt',
  `potencia` varchar(16) NOT NULL,
  `cod_und_potencia` int(11) NOT NULL COMMENT 'upotenci.txt',
  `cod_tipo_und` int(11) NOT NULL COMMENT 'tipoUnid.txt',
  `cod_via_admin` int(11) NOT NULL COMMENT 'vias.txt'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_manextra0`
--

CREATE TABLE `vad_manextra0` (
  `nro_registro` int(11) NOT NULL COMMENT 'manual.dat',
  `cod_tamano_presenta` int(11) NOT NULL COMMENT 'tamanos.txt',
  `cod_accion_farma` int(11) NOT NULL COMMENT 'acciofar.txt\r\n',
  `cod_droga` int(11) NOT NULL COMMENT 'monodro.txt',
  `cod_forma_fama` int(11) NOT NULL COMMENT 'formas.txt',
  `potencia` varchar(16) NOT NULL,
  `cod_und_potencia` int(11) NOT NULL COMMENT 'upotenci.txt',
  `cod_tipo_und` int(11) NOT NULL COMMENT 'tipoUnid.txt',
  `cod_via_admin` int(11) NOT NULL COMMENT 'vias.txt'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_manual`
--

CREATE TABLE `vad_manual` (
  `troquel` int(11) NOT NULL,
  `nombre` varchar(44) NOT NULL,
  `presentacion` varchar(24) NOT NULL,
  `blanco_1` int(11) NOT NULL,
  `ioma_marca` varchar(1) NOT NULL,
  `ioma_cober` varchar(1) NOT NULL,
  `laboratorio` varchar(15) NOT NULL,
  `precio` bigint(20) NOT NULL,
  `fecha` varchar(8) NOT NULL,
  `marca_prod_control` varchar(1) NOT NULL,
  `importado` varchar(1) NOT NULL,
  `tipo_venta` varchar(1) NOT NULL,
  `iva` varchar(1) NOT NULL,
  `cod_desc_pami` varchar(1) NOT NULL,
  `cod_laboratorio` int(11) NOT NULL,
  `nro_registro` int(11) NOT NULL,
  `baja` varchar(1) NOT NULL,
  `cod_barra` varchar(13) NOT NULL,
  `unidades` int(11) NOT NULL,
  `tamano` varchar(1) NOT NULL,
  `heladera` varchar(1) NOT NULL,
  `sifar` varchar(1) NOT NULL,
  `pami_vivir_mejor` varchar(1) NOT NULL,
  `gravamen` varchar(1) NOT NULL,
  `digito_8` varchar(1) NOT NULL,
  `blanco_2` varchar(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_manual0`
--

CREATE TABLE `vad_manual0` (
  `troquel` int(11) NOT NULL,
  `nombre` varchar(44) NOT NULL,
  `presentacion` varchar(24) NOT NULL,
  `ioma_monto` int(11) NOT NULL,
  `ioma_marca` varchar(1) NOT NULL,
  `ioma_cober` varchar(1) NOT NULL,
  `laboratorio` varchar(15) NOT NULL,
  `precio` bigint(20) NOT NULL,
  `fecha` varchar(8) NOT NULL,
  `marca_prod_control` varchar(1) NOT NULL,
  `importado` varchar(1) NOT NULL,
  `tipo_venta` varchar(1) NOT NULL,
  `iva` varchar(1) NOT NULL,
  `cod_desc_pami` varchar(1) NOT NULL,
  `cod_laboratorio` int(11) NOT NULL,
  `nro_registro` int(11) NOT NULL,
  `baja` varchar(1) NOT NULL,
  `cod_barra` varchar(13) NOT NULL,
  `unidades` int(11) NOT NULL,
  `tamano` varchar(1) NOT NULL,
  `heladera` varchar(1) NOT NULL,
  `sifar` varchar(1) NOT NULL,
  `blanco_1` varchar(1) NOT NULL,
  `gravamen` varchar(1) NOT NULL,
  `blanco_2` varchar(2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_manual_viejo`
--

CREATE TABLE `vad_manual_viejo` (
  `troquel` int(11) NOT NULL,
  `nombre` varchar(44) NOT NULL,
  `presentacion` varchar(24) NOT NULL,
  `ioma_monto` int(11) NOT NULL,
  `ioma_marca` varchar(1) NOT NULL,
  `ioma_cober` varchar(1) NOT NULL,
  `laboratorio` varchar(15) NOT NULL,
  `precio` int(11) NOT NULL,
  `fecha` varchar(8) NOT NULL,
  `marca_prod_control` varchar(1) NOT NULL,
  `importado` varchar(1) NOT NULL,
  `tipo_venta` varchar(1) NOT NULL,
  `iva` varchar(1) NOT NULL,
  `cod_desc_pami` varchar(1) NOT NULL,
  `cod_laboratorio` int(11) NOT NULL,
  `nro_registro` int(11) NOT NULL,
  `baja` varchar(1) NOT NULL,
  `cod_barra` varchar(13) NOT NULL,
  `unidades` int(11) NOT NULL,
  `tamano` varchar(1) NOT NULL,
  `heladera` varchar(1) NOT NULL,
  `sifar` varchar(1) NOT NULL,
  `blanco_1` varchar(1) NOT NULL,
  `gravamen` varchar(1) NOT NULL,
  `blanco_2` varchar(2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_monodro`
--

CREATE TABLE `vad_monodro` (
  `codigo` int(11) NOT NULL,
  `descripcion` varchar(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_monodro0`
--

CREATE TABLE `vad_monodro0` (
  `codigo` int(11) NOT NULL,
  `descripcion` varchar(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_multidro`
--

CREATE TABLE `vad_multidro` (
  `id` int(11) NOT NULL COMMENT 'manual.txt',
  `cod_droga` int(11) NOT NULL COMMENT 'nuevadro.txt'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_multidro0`
--

CREATE TABLE `vad_multidro0` (
  `id` int(11) NOT NULL COMMENT 'manual.txt',
  `cod_droga` int(11) NOT NULL COMMENT 'nuevadro.txt'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_muni`
--

CREATE TABLE `vad_muni` (
  `id` int(11) NOT NULL,
  `monodroga` varchar(57) NOT NULL,
  `nombre_comercial` varchar(51) NOT NULL,
  `presentacion` varchar(45) NOT NULL,
  `unidades` int(11) NOT NULL,
  `laboratorio` varchar(18) NOT NULL,
  `codigo` int(11) NOT NULL COMMENT 'Nro Troquel',
  `nro_alfabeta` int(11) NOT NULL,
  `cod_barra` varchar(13) NOT NULL,
  `tipo_venta` varchar(1) NOT NULL,
  `tipod` varchar(1) NOT NULL,
  `tipo` varchar(30) NOT NULL,
  `condicion` int(11) NOT NULL,
  `quiendisp` int(11) NOT NULL COMMENT '1=colfacor, 2=muni',
  `alta` int(11) DEFAULT NULL COMMENT '0=Inactivo 1=activo',
  `prescripmax` int(11) DEFAULT NULL,
  `colfacor` int(11) NOT NULL,
  `001-stock` int(11) NOT NULL,
  `001-puntocritico` int(11) NOT NULL,
  `001-prescripto` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_muni1`
--

CREATE TABLE `vad_muni1` (
  `id` int(11) NOT NULL,
  `monodroga` varchar(57) NOT NULL,
  `nombre_comercial` varchar(51) NOT NULL,
  `presentacion` varchar(45) NOT NULL,
  `laboratorio` varchar(18) NOT NULL,
  `codigo` int(11) NOT NULL COMMENT 'Nro Troquel',
  `nro_alfabeta` int(11) NOT NULL,
  `cod_barra` varchar(13) NOT NULL,
  `tipo_venta` varchar(1) NOT NULL,
  `tipod` varchar(1) NOT NULL,
  `tipo` varchar(30) NOT NULL,
  `condicion` int(11) NOT NULL,
  `quiendisp` int(11) NOT NULL COMMENT '1=colfacor, 2=muni',
  `colfacor` int(11) NOT NULL,
  `001-stock` int(11) NOT NULL,
  `001-puntocritico` int(11) NOT NULL,
  `001-prescripto` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_muni2`
--

CREATE TABLE `vad_muni2` (
  `id` int(11) NOT NULL,
  `monodroga` varchar(32) NOT NULL,
  `nombre_comercial` varchar(44) NOT NULL,
  `presentacion` varchar(24) NOT NULL,
  `unidades` int(11) NOT NULL,
  `laboratorio` varchar(18) NOT NULL,
  `codigo` int(11) NOT NULL,
  `cod_barra` varchar(13) NOT NULL,
  `tipo_venta` varchar(1) NOT NULL,
  `tipod` varchar(1) NOT NULL,
  `tipo` varchar(30) NOT NULL,
  `condicion` int(11) NOT NULL,
  `nro_alfabeta` int(11) NOT NULL,
  `alta` int(11) DEFAULT NULL COMMENT '0=Inactivo 1=activo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_muni_especialidad`
--

CREATE TABLE `vad_muni_especialidad` (
  `id` int(11) NOT NULL,
  `descripcion` varchar(45) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_muni_medicespecialidad`
--

CREATE TABLE `vad_muni_medicespecialidad` (
  `id` int(11) NOT NULL,
  `id_tipoespecialidad` int(11) NOT NULL,
  `id_vadmuni` int(11) NOT NULL,
  `codigo` int(11) NOT NULL COMMENT 'troquel'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vad_muni_si`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vad_muni_si` (
`id` int(11)
,`cod_monodroga` int(1) unsigned
,`monodroga` varchar(57)
,`nro_alfabeta` int(11)
,`nombre_comercial` varchar(51)
,`presentacion` varchar(45)
,`laboratorio` varchar(18)
,`codigo` int(11)
,`cod_barra` varchar(13)
,`unidades` int(11)
,`tipo_venta` varchar(1)
,`prescripmax` int(11)
,`tipod` varchar(1)
,`tipo` varchar(30)
,`condicion` int(11)
);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_nuevadro`
--

CREATE TABLE `vad_nuevadro` (
  `cod_droga` int(11) NOT NULL,
  `descripcion` varchar(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_nuevadro0`
--

CREATE TABLE `vad_nuevadro0` (
  `cod_droga` int(11) NOT NULL,
  `descripcion` varchar(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_preciopami`
--

CREATE TABLE `vad_preciopami` (
  `id` int(11) NOT NULL,
  `precio_pami` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_preciopami0`
--

CREATE TABLE `vad_preciopami0` (
  `id` int(11) NOT NULL,
  `precio_pami` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_prod_control`
--

CREATE TABLE `vad_prod_control` (
  `codigo` varchar(1) NOT NULL,
  `descripcion` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_prod_control0`
--

CREATE TABLE `vad_prod_control0` (
  `codigo` varchar(1) NOT NULL,
  `descripcion` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_regnueva`
--

CREATE TABLE `vad_regnueva` (
  `id` int(11) NOT NULL COMMENT 'Manual.dat',
  `cod_droga` int(11) NOT NULL COMMENT 'nuevadro.txt',
  `potencia` varchar(16) NOT NULL,
  `cod_unidad_potencia` int(11) NOT NULL COMMENT 'uPotenci.txt'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_regnueva0`
--

CREATE TABLE `vad_regnueva0` (
  `id` int(11) NOT NULL COMMENT 'Manual.dat',
  `cod_droga` int(11) NOT NULL COMMENT 'nuevadro.txt',
  `potencia` varchar(16) NOT NULL,
  `cod_unidad_potencia` int(11) NOT NULL COMMENT 'uPotenci.txt'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_snomed`
--

CREATE TABLE `vad_snomed` (
  `nro_registro` int(11) NOT NULL,
  `IDSnomed` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_snomed0`
--

CREATE TABLE `vad_snomed0` (
  `nro_registro` int(11) NOT NULL,
  `IDSnomed` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_tamanos`
--

CREATE TABLE `vad_tamanos` (
  `codigo` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `descripcion` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_tamanos0`
--

CREATE TABLE `vad_tamanos0` (
  `codigo` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL,
  `descripcion` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_tipounid`
--

CREATE TABLE `vad_tipounid` (
  `codigo` int(11) NOT NULL,
  `descripcion` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_tipounid0`
--

CREATE TABLE `vad_tipounid0` (
  `codigo` int(11) NOT NULL,
  `descripcion` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_upotenci`
--

CREATE TABLE `vad_upotenci` (
  `codigo` int(11) NOT NULL,
  `descripcion` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_upotenci0`
--

CREATE TABLE `vad_upotenci0` (
  `codigo` int(11) NOT NULL,
  `descripcion` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_vias`
--

CREATE TABLE `vad_vias` (
  `codigo` int(11) NOT NULL,
  `descripcion` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vad_vias0`
--

CREATE TABLE `vad_vias0` (
  `codigo` int(11) NOT NULL,
  `descripcion` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `view_matrsinverificador`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `view_matrsinverificador` (
`matricula` int(11)
,`matr` decimal(10,0)
,`apellido` varchar(160)
,`nombre` varchar(160)
,`dni` int(11)
,`sexo` char(4)
,`situacion` int(11)
,`rematrdo` varchar(1)
,`persona` int(11)
,`orcl_afi_atm_id` varchar(2)
,`orcl_afi_atm_descrip` varchar(60)
,`orcl_es_id` int(11)
,`orcl_es_descrip` varchar(60)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `view_mesxmedico`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `view_mesxmedico` (
`mes` varchar(2)
,`cant` bigint(21)
,`medico` varchar(321)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `view_mesxmpxmedicamento`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `view_mesxmpxmedicamento` (
`mes` varchar(2)
,`precioUn` decimal(23,4)
,`nombre_comercial` varchar(44)
,`medico` varchar(321)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `view_usuarios`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `view_usuarios` (
`matric` varchar(320)
,`mat_id` varchar(80)
,`tipo_user` varchar(255)
,`usu_clave` varchar(255)
,`reset_token` varchar(255)
,`reset_expiracion` datetime
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_proveedores_completo`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_proveedores_completo` (
`id_proveedor` int(11)
,`razon_social` varchar(255)
,`cuit` varchar(13)
,`tipo_proveedor` enum('Laboratorio','Droguería','Ambos')
,`email_general` varchar(255)
,`telefono_general` varchar(50)
,`direccion_completa` varchar(480)
,`activo` tinyint(1)
,`fecha_alta` datetime
,`total_contactos` bigint(21)
,`contactos` longtext
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_usuarios_prueba`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_usuarios_prueba` (
`id` int(11)
,`user` varchar(18)
,`nombre` varchar(45)
,`apellido` varchar(45)
,`es_prueba` tinyint(1)
,`fecha_inicio_prueba` datetime
,`dias_prueba` int(11)
,`fecha_expiracion_prueba` datetime
,`ultimo_acceso` datetime
,`estado_cuenta` enum('activa','prueba_activa','prueba_expirada','suspendida')
,`dias_restantes` int(8)
,`estado_prueba` varchar(23)
);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `alt_contacto_proveedor`
--
ALTER TABLE `alt_contacto_proveedor`
  ADD PRIMARY KEY (`id_contacto`),
  ADD KEY `fk_proveedor` (`id_proveedor`),
  ADD KEY `idx_principal` (`principal`),
  ADD KEY `idx_nombre_apellido` (`nombre`,`apellido`);

--
-- Indices de la tabla `alt_notificacion_paciente`
--
ALTER TABLE `alt_notificacion_paciente`
  ADD PRIMARY KEY (`id_notificacion`),
  ADD KEY `id_orden` (`id_orden`),
  ADD KEY `paciente_dni` (`paciente_dni`);

--
-- Indices de la tabla `alt_orden_compra`
--
ALTER TABLE `alt_orden_compra`
  ADD PRIMARY KEY (`id_orden`),
  ADD UNIQUE KEY `numero_orden` (`numero_orden`),
  ADD KEY `id_solicitud` (`id_solicitud`),
  ADD KEY `id_proveedor` (`id_proveedor`),
  ADD KEY `estado` (`estado`);

--
-- Indices de la tabla `alt_orden_compra_detalle`
--
ALTER TABLE `alt_orden_compra_detalle`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `id_orden` (`id_orden`),
  ADD KEY `paciente_dni` (`paciente_dni`);

--
-- Indices de la tabla `alt_orden_compra_historial`
--
ALTER TABLE `alt_orden_compra_historial`
  ADD PRIMARY KEY (`id_historial`),
  ADD KEY `id_orden` (`id_orden`);

--
-- Indices de la tabla `alt_presupuesto_respuesta`
--
ALTER TABLE `alt_presupuesto_respuesta`
  ADD PRIMARY KEY (`id_respuesta`),
  ADD KEY `id_solicitud` (`id_solicitud`),
  ADD KEY `id_proveedor` (`id_proveedor`);

--
-- Indices de la tabla `alt_proveedor`
--
ALTER TABLE `alt_proveedor`
  ADD PRIMARY KEY (`id_proveedor`),
  ADD UNIQUE KEY `uk_cuit` (`cuit`),
  ADD KEY `idx_razon_social` (`razon_social`),
  ADD KEY `idx_tipo` (`tipo_proveedor`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indices de la tabla `alt_solicitud_presupuesto`
--
ALTER TABLE `alt_solicitud_presupuesto`
  ADD PRIMARY KEY (`id_solicitud`),
  ADD UNIQUE KEY `codigo_solicitud` (`codigo_solicitud`),
  ADD KEY `estado` (`estado`),
  ADD KEY `fecha_envio` (`fecha_envio`);

--
-- Indices de la tabla `alt_solicitud_presupuesto_auditoria`
--
ALTER TABLE `alt_solicitud_presupuesto_auditoria`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_solicitud` (`id_solicitud`),
  ADD KEY `id_auditoria` (`id_auditoria`);

--
-- Indices de la tabla `alt_solicitud_presupuesto_proveedor`
--
ALTER TABLE `alt_solicitud_presupuesto_proveedor`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_solicitud` (`id_solicitud`),
  ADD KEY `id_proveedor` (`id_proveedor`);

--
-- Indices de la tabla `cert_cabecera`
--
ALTER TABLE `cert_cabecera`
  ADD PRIMARY KEY (`idestudio`);

--
-- Indices de la tabla `cert_cuerpo`
--
ALTER TABLE `cert_cuerpo`
  ADD PRIMARY KEY (`idestuprescripto`);

--
-- Indices de la tabla `cer_certificado`
--
ALTER TABLE `cer_certificado`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `cie10_categorias`
--
ALTER TABLE `cie10_categorias`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `cie10_grupos`
--
ALTER TABLE `cie10_grupos`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `cie10_subgrupos`
--
ALTER TABLE `cie10_subgrupos`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `clinicas`
--
ALTER TABLE `clinicas`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `consultas_api`
--
ALTER TABLE `consultas_api`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `CONTACTO_PROVEEDOR`
--
ALTER TABLE `CONTACTO_PROVEEDOR`
  ADD PRIMARY KEY (`id_contacto`),
  ADD KEY `idx_proveedor` (`id_proveedor`),
  ADD KEY `idx_nombre_apellido` (`nombre`,`apellido`),
  ADD KEY `idx_principal` (`principal`);

--
-- Indices de la tabla `cuips0`
--
ALTER TABLE `cuips0`
  ADD PRIMARY KEY (`id`),
  ADD KEY `dni` (`dni`),
  ADD KEY `matricula` (`matricula`);

--
-- Indices de la tabla `cuips1`
--
ALTER TABLE `cuips1`
  ADD PRIMARY KEY (`id`),
  ADD KEY `dni` (`dni`),
  ADD KEY `matricula` (`matricula`);

--
-- Indices de la tabla `epicrisis_cabecera`
--
ALTER TABLE `epicrisis_cabecera`
  ADD PRIMARY KEY (`idepicrisis`);

--
-- Indices de la tabla `epicrisis_cuerpo`
--
ALTER TABLE `epicrisis_cuerpo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idepicrisis` (`idepicrisis`);

--
-- Indices de la tabla `est_prescrestudio`
--
ALTER TABLE `est_prescrestudio`
  ADD PRIMARY KEY (`idestuprescripto`);

--
-- Indices de la tabla `est_receta`
--
ALTER TABLE `est_receta`
  ADD PRIMARY KEY (`idestudio`);

--
-- Indices de la tabla `farm_usuarios`
--
ALTER TABLE `farm_usuarios`
  ADD PRIMARY KEY (`cuit`);

--
-- Indices de la tabla `guias_clicks`
--
ALTER TABLE `guias_clicks`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `historial`
--
ALTER TABLE `historial`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `horarios_medicos`
--
ALTER TABLE `horarios_medicos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `matricula` (`matricula`),
  ADD KEY `clinica_id` (`clinica_id`);

--
-- Indices de la tabla `indic_cabecera`
--
ALTER TABLE `indic_cabecera`
  ADD PRIMARY KEY (`idestudio`);

--
-- Indices de la tabla `indic_cuerpo`
--
ALTER TABLE `indic_cuerpo`
  ADD PRIMARY KEY (`idestuprescripto`);

--
-- Indices de la tabla `medico_clinica`
--
ALTER TABLE `medico_clinica`
  ADD PRIMARY KEY (`id`),
  ADD KEY `matricula` (`matricula`),
  ADD KEY `clinica_id` (`clinica_id`);

--
-- Indices de la tabla `muni_excep`
--
ALTER TABLE `muni_excep`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `muni_lugar`
--
ALTER TABLE `muni_lugar`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idctro` (`idctro`);

--
-- Indices de la tabla `PROVEEDOR`
--
ALTER TABLE `PROVEEDOR`
  ADD PRIMARY KEY (`id_proveedor`),
  ADD UNIQUE KEY `cuit` (`cuit`),
  ADD KEY `idx_razon_social` (`razon_social`),
  ADD KEY `idx_cuit` (`cuit`),
  ADD KEY `idx_tipo_proveedor` (`tipo_proveedor`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indices de la tabla `PROVEEDOR_MEDICAMENTO`
--
ALTER TABLE `PROVEEDOR_MEDICAMENTO`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_proveedor_medicamento_periodo` (`id_proveedor`,`id_medicamento`,`fecha_vigencia_desde`),
  ADD KEY `idx_proveedor_medicamento` (`id_proveedor`,`id_medicamento`),
  ADD KEY `idx_vigencia` (`fecha_vigencia_desde`,`fecha_vigencia_hasta`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indices de la tabla `rec_auditoria`
--
ALTER TABLE `rec_auditoria`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `rec_compras_alto_costo`
--
ALTER TABLE `rec_compras_alto_costo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_usuario_compras` (`id_usuario_compras`),
  ADD KEY `idx_estado` (`estado_compra`),
  ADD KEY `idx_receta` (`idreceta`);

--
-- Indices de la tabla `rec_compras_proveedores`
--
ALTER TABLE `rec_compras_proveedores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_compra` (`id_compra`),
  ADD KEY `id_proveedor` (`id_proveedor`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_receta_orden` (`idreceta`,`nro_orden`);

--
-- Indices de la tabla `rec_obrasoc`
--
ALTER TABLE `rec_obrasoc`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sigla` (`sigla`);

--
-- Indices de la tabla `rec_obrasoc_medico`
--
ALTER TABLE `rec_obrasoc_medico`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `rec_obrasoc_medico_vadem`
--
ALTER TABLE `rec_obrasoc_medico_vadem`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `rec_obrasoc_plan`
--
ALTER TABLE `rec_obrasoc_plan`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `rec_obsocplan_vademecum`
--
ALTER TABLE `rec_obsocplan_vademecum`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `rec_paciente`
--
ALTER TABLE `rec_paciente`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `indice1` (`dni`),
  ADD KEY `idobrasocial` (`idobrasocial`),
  ADD KEY `tipoplan` (`tipoplan`);

--
-- Indices de la tabla `rec_pacienteobrasoc`
--
ALTER TABLE `rec_pacienteobrasoc`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `rec_persona`
--
ALTER TABLE `rec_persona`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `rec_prescrmedicamento`
--
ALTER TABLE `rec_prescrmedicamento`
  ADD PRIMARY KEY (`idrecetamedic`),
  ADD KEY `idreceta` (`idreceta`);

--
-- Indices de la tabla `rec_prescrmedicamento_alto_costo`
--
ALTER TABLE `rec_prescrmedicamento_alto_costo`
  ADD PRIMARY KEY (`idrecetamedic`),
  ADD KEY `idx_idreceta` (`idreceta`),
  ADD KEY `idx_estado_auditoria` (`estado_auditoria`),
  ADD KEY `idx_es_alto_costo` (`es_alto_costo`),
  ADD KEY `idx_codigo` (`codigo`);

--
-- Indices de la tabla `rec_presupuestos_alto_costo`
--
ALTER TABLE `rec_presupuestos_alto_costo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_compra_proveedor` (`id_compra_proveedor`),
  ADD KEY `id_usuario_proveedor` (`id_usuario_proveedor`),
  ADD KEY `idx_receta_orden` (`idreceta`,`nro_orden`),
  ADD KEY `idx_proveedor` (`id_proveedor`);

--
-- Indices de la tabla `rec_presupuestos_seleccionados`
--
ALTER TABLE `rec_presupuestos_seleccionados`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id_presupuesto` (`id_presupuesto`),
  ADD KEY `id_usuario_seleccion` (`id_usuario_seleccion`),
  ADD KEY `idx_receta` (`idreceta`),
  ADD KEY `idx_pdf_generado` (`pdf_generado`);

--
-- Indices de la tabla `rec_proveedores`
--
ALTER TABLE `rec_proveedores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_email` (`email`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indices de la tabla `rec_proveedores_usuarios`
--
ALTER TABLE `rec_proveedores_usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `id_proveedor` (`id_proveedor`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indices de la tabla `rec_receta`
--
ALTER TABLE `rec_receta`
  ADD PRIMARY KEY (`idreceta`),
  ADD KEY `fk_rec_prescriptor` (`matricprescr`),
  ADD KEY `idpaciente` (`idpaciente`),
  ADD KEY `fechaemision` (`fechaemision`);

--
-- Indices de la tabla `rec_receta_alto_costo`
--
ALTER TABLE `rec_receta_alto_costo`
  ADD PRIMARY KEY (`idreceta`),
  ADD UNIQUE KEY `numero_solicitud_ac` (`numero_solicitud_ac`),
  ADD KEY `idx_matricprescr` (`matricprescr`),
  ADD KEY `idx_idpaciente` (`idpaciente`),
  ADD KEY `idx_fechaemision` (`fechaemision`),
  ADD KEY `idx_numero_solicitud` (`numero_solicitud_ac`),
  ADD KEY `idx_es_alto_costo` (`es_alto_costo`);

--
-- Indices de la tabla `rec_reversionvta`
--
ALTER TABLE `rec_reversionvta`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `rec_vademecum`
--
ALTER TABLE `rec_vademecum`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `tmp_codigo_postal`
--
ALTER TABLE `tmp_codigo_postal`
  ADD KEY `departamento` (`departamento`),
  ADD KEY `codigo_postal` (`codigo_postal`);

--
-- Indices de la tabla `tmp_distrito`
--
ALTER TABLE `tmp_distrito`
  ADD UNIQUE KEY `distrito` (`distrito`);

--
-- Indices de la tabla `tmp_domici`
--
ALTER TABLE `tmp_domici`
  ADD PRIMARY KEY (`matricula`,`persona`,`tipo_domicilio`,`domicilio`),
  ADD UNIQUE KEY `matricula` (`matricula`,`persona`,`tipo_domicilio`),
  ADD UNIQUE KEY `matricula_2` (`matricula`,`persona`,`tipo_domicilio`);

--
-- Indices de la tabla `tmp_domici0`
--
ALTER TABLE `tmp_domici0`
  ADD PRIMARY KEY (`matricula`,`persona`,`tipo_domicilio`,`domicilio`),
  ADD UNIQUE KEY `matricula` (`matricula`,`persona`,`tipo_domicilio`),
  ADD UNIQUE KEY `matricula_2` (`matricula`,`persona`,`tipo_domicilio`);

--
-- Indices de la tabla `tmp_especialidades`
--
ALTER TABLE `tmp_especialidades`
  ADD PRIMARY KEY (`especialidad`);

--
-- Indices de la tabla `tmp_especialistas`
--
ALTER TABLE `tmp_especialistas`
  ADD PRIMARY KEY (`tipo_especialidad`,`matricula`,`matricula_especialista`),
  ADD KEY `matricula` (`matricula`),
  ADD KEY `especialista` (`matricula_especialista`);

--
-- Indices de la tabla `tmp_especialistas0`
--
ALTER TABLE `tmp_especialistas0`
  ADD PRIMARY KEY (`tipo_especialidad`,`matricula`,`matricula_especialista`),
  ADD KEY `matricula` (`matricula`),
  ADD KEY `especialista` (`matricula_especialista`);

--
-- Indices de la tabla `tmp_expertorias`
--
ALTER TABLE `tmp_expertorias`
  ADD PRIMARY KEY (`CODIGO`,`DESCRIPCION`);

--
-- Indices de la tabla `tmp_expertorias_medico`
--
ALTER TABLE `tmp_expertorias_medico`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `tmp_guiasclinicas`
--
ALTER TABLE `tmp_guiasclinicas`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `tmp_lmm`
--
ALTER TABLE `tmp_lmm`
  ADD PRIMARY KEY (`id`),
  ADD KEY `matric` (`matric`);

--
-- Indices de la tabla `tmp_matriculados`
--
ALTER TABLE `tmp_matriculados`
  ADD PRIMARY KEY (`matricula`,`persona`);

--
-- Indices de la tabla `tmp_matriculados0`
--
ALTER TABLE `tmp_matriculados0`
  ADD PRIMARY KEY (`matricula`,`persona`);

--
-- Indices de la tabla `tmp_person`
--
ALTER TABLE `tmp_person`
  ADD PRIMARY KEY (`matricula`,`persona`);

--
-- Indices de la tabla `tmp_person0`
--
ALTER TABLE `tmp_person0`
  ADD PRIMARY KEY (`matricula`,`persona`);

--
-- Indices de la tabla `turnos`
--
ALTER TABLE `turnos`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `userapikey`
--
ALTER TABLE `userapikey`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `usercia_au`
--
ALTER TABLE `usercia_au`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `userrol_au`
--
ALTER TABLE `userrol_au`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `user_asistido`
--
ALTER TABLE `user_asistido`
  ADD PRIMARY KEY (`id_asistencia`) USING BTREE;

--
-- Indices de la tabla `user_au`
--
ALTER TABLE `user_au`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_es_prueba` (`es_prueba`),
  ADD KEY `idx_estado_cuenta` (`estado_cuenta`),
  ADD KEY `idx_fecha_expiracion` (`fecha_expiracion_prueba`);

--
-- Indices de la tabla `user_col`
--
ALTER TABLE `user_col`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`mat_id`);

--
-- Indices de la tabla `usuarios_api`
--
ALTER TABLE `usuarios_api`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `usuarios_iframe`
--
ALTER TABLE `usuarios_iframe`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_company` (`company`);

--
-- Indices de la tabla `vad_020_armado`
--
ALTER TABLE `vad_020_armado`
  ADD KEY `id` (`id`);

--
-- Indices de la tabla `vad_020_armadocDupl`
--
ALTER TABLE `vad_020_armadocDupl`
  ADD KEY `id` (`id`);

--
-- Indices de la tabla `vad_9000_armado`
--
ALTER TABLE `vad_9000_armado`
  ADD KEY `id` (`id`);

--
-- Indices de la tabla `vad_acciofar`
--
ALTER TABLE `vad_acciofar`
  ADD PRIMARY KEY (`codigo`);

--
-- Indices de la tabla `vad_acciofar0`
--
ALTER TABLE `vad_acciofar0`
  ADD PRIMARY KEY (`codigo`);

--
-- Indices de la tabla `vad_barextra`
--
ALTER TABLE `vad_barextra`
  ADD KEY `id` (`id`);

--
-- Indices de la tabla `vad_barextra0`
--
ALTER TABLE `vad_barextra0`
  ADD KEY `id` (`id`);

--
-- Indices de la tabla `vad_formas`
--
ALTER TABLE `vad_formas`
  ADD PRIMARY KEY (`codigo`),
  ADD KEY `codigo` (`codigo`);

--
-- Indices de la tabla `vad_formas0`
--
ALTER TABLE `vad_formas0`
  ADD KEY `codigo` (`codigo`);

--
-- Indices de la tabla `vad_gtin1`
--
ALTER TABLE `vad_gtin1`
  ADD KEY `id` (`id`);

--
-- Indices de la tabla `vad_gtin10`
--
ALTER TABLE `vad_gtin10`
  ADD KEY `id` (`id`);

--
-- Indices de la tabla `vad_manextra`
--
ALTER TABLE `vad_manextra`
  ADD KEY `nro_registro` (`nro_registro`),
  ADD KEY `cod_droga` (`cod_droga`);

--
-- Indices de la tabla `vad_manextra0`
--
ALTER TABLE `vad_manextra0`
  ADD KEY `nro_registro` (`nro_registro`),
  ADD KEY `cod_droga` (`cod_droga`);

--
-- Indices de la tabla `vad_manual`
--
ALTER TABLE `vad_manual`
  ADD KEY `troquel` (`troquel`),
  ADD KEY `nro_registro` (`nro_registro`),
  ADD KEY `marca_prod_control` (`marca_prod_control`),
  ADD KEY `idx_nombre` (`nombre`),
  ADD KEY `idx_pres` (`presentacion`),
  ADD KEY `idx_lab` (`laboratorio`),
  ADD KEY `idx_baja` (`baja`);
ALTER TABLE `vad_manual` ADD FULLTEXT KEY `ft_vad_manual_nombre` (`nombre`);
ALTER TABLE `vad_manual` ADD FULLTEXT KEY `ft_vad_manual_lab` (`laboratorio`);
ALTER TABLE `vad_manual` ADD FULLTEXT KEY `ft_vad_manual_pres` (`presentacion`);

--
-- Indices de la tabla `vad_manual0`
--
ALTER TABLE `vad_manual0`
  ADD KEY `troquel` (`troquel`),
  ADD KEY `nro_registro` (`nro_registro`),
  ADD KEY `marca_prod_control` (`marca_prod_control`);

--
-- Indices de la tabla `vad_monodro`
--
ALTER TABLE `vad_monodro`
  ADD KEY `codigo` (`codigo`);

--
-- Indices de la tabla `vad_monodro0`
--
ALTER TABLE `vad_monodro0`
  ADD KEY `codigo` (`codigo`);

--
-- Indices de la tabla `vad_multidro`
--
ALTER TABLE `vad_multidro`
  ADD KEY `id` (`id`);

--
-- Indices de la tabla `vad_multidro0`
--
ALTER TABLE `vad_multidro0`
  ADD KEY `id` (`id`);

--
-- Indices de la tabla `vad_muni`
--
ALTER TABLE `vad_muni`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `vad_muni1`
--
ALTER TABLE `vad_muni1`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `vad_muni2`
--
ALTER TABLE `vad_muni2`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `vad_muni_especialidad`
--
ALTER TABLE `vad_muni_especialidad`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `vad_muni_medicespecialidad`
--
ALTER TABLE `vad_muni_medicespecialidad`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `vad_nuevadro`
--
ALTER TABLE `vad_nuevadro`
  ADD KEY `cod_droga` (`cod_droga`);

--
-- Indices de la tabla `vad_nuevadro0`
--
ALTER TABLE `vad_nuevadro0`
  ADD KEY `cod_droga` (`cod_droga`);

--
-- Indices de la tabla `vad_preciopami`
--
ALTER TABLE `vad_preciopami`
  ADD KEY `id` (`id`);

--
-- Indices de la tabla `vad_preciopami0`
--
ALTER TABLE `vad_preciopami0`
  ADD KEY `id` (`id`);

--
-- Indices de la tabla `vad_prod_control`
--
ALTER TABLE `vad_prod_control`
  ADD KEY `codigo` (`codigo`);

--
-- Indices de la tabla `vad_prod_control0`
--
ALTER TABLE `vad_prod_control0`
  ADD KEY `codigo` (`codigo`);

--
-- Indices de la tabla `vad_regnueva`
--
ALTER TABLE `vad_regnueva`
  ADD KEY `id` (`id`);

--
-- Indices de la tabla `vad_regnueva0`
--
ALTER TABLE `vad_regnueva0`
  ADD KEY `id` (`id`);

--
-- Indices de la tabla `vad_vias`
--
ALTER TABLE `vad_vias`
  ADD PRIMARY KEY (`codigo`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `alt_contacto_proveedor`
--
ALTER TABLE `alt_contacto_proveedor`
  MODIFY `id_contacto` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `alt_notificacion_paciente`
--
ALTER TABLE `alt_notificacion_paciente`
  MODIFY `id_notificacion` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `alt_orden_compra`
--
ALTER TABLE `alt_orden_compra`
  MODIFY `id_orden` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `alt_orden_compra_detalle`
--
ALTER TABLE `alt_orden_compra_detalle`
  MODIFY `id_detalle` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `alt_orden_compra_historial`
--
ALTER TABLE `alt_orden_compra_historial`
  MODIFY `id_historial` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `alt_presupuesto_respuesta`
--
ALTER TABLE `alt_presupuesto_respuesta`
  MODIFY `id_respuesta` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `alt_proveedor`
--
ALTER TABLE `alt_proveedor`
  MODIFY `id_proveedor` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `alt_solicitud_presupuesto`
--
ALTER TABLE `alt_solicitud_presupuesto`
  MODIFY `id_solicitud` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `alt_solicitud_presupuesto_auditoria`
--
ALTER TABLE `alt_solicitud_presupuesto_auditoria`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `alt_solicitud_presupuesto_proveedor`
--
ALTER TABLE `alt_solicitud_presupuesto_proveedor`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cert_cabecera`
--
ALTER TABLE `cert_cabecera`
  MODIFY `idestudio` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cert_cuerpo`
--
ALTER TABLE `cert_cuerpo`
  MODIFY `idestuprescripto` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cer_certificado`
--
ALTER TABLE `cer_certificado`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cie10_categorias`
--
ALTER TABLE `cie10_categorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cie10_grupos`
--
ALTER TABLE `cie10_grupos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cie10_subgrupos`
--
ALTER TABLE `cie10_subgrupos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `clinicas`
--
ALTER TABLE `clinicas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `consultas_api`
--
ALTER TABLE `consultas_api`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `CONTACTO_PROVEEDOR`
--
ALTER TABLE `CONTACTO_PROVEEDOR`
  MODIFY `id_contacto` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cuips0`
--
ALTER TABLE `cuips0`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cuips1`
--
ALTER TABLE `cuips1`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `epicrisis_cabecera`
--
ALTER TABLE `epicrisis_cabecera`
  MODIFY `idepicrisis` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `epicrisis_cuerpo`
--
ALTER TABLE `epicrisis_cuerpo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `est_prescrestudio`
--
ALTER TABLE `est_prescrestudio`
  MODIFY `idestuprescripto` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `est_receta`
--
ALTER TABLE `est_receta`
  MODIFY `idestudio` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `guias_clicks`
--
ALTER TABLE `guias_clicks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `historial`
--
ALTER TABLE `historial`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `horarios_medicos`
--
ALTER TABLE `horarios_medicos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `indic_cabecera`
--
ALTER TABLE `indic_cabecera`
  MODIFY `idestudio` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `indic_cuerpo`
--
ALTER TABLE `indic_cuerpo`
  MODIFY `idestuprescripto` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `medico_clinica`
--
ALTER TABLE `medico_clinica`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `muni_excep`
--
ALTER TABLE `muni_excep`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `muni_lugar`
--
ALTER TABLE `muni_lugar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `PROVEEDOR`
--
ALTER TABLE `PROVEEDOR`
  MODIFY `id_proveedor` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `PROVEEDOR_MEDICAMENTO`
--
ALTER TABLE `PROVEEDOR_MEDICAMENTO`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_auditoria`
--
ALTER TABLE `rec_auditoria`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_compras_alto_costo`
--
ALTER TABLE `rec_compras_alto_costo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_compras_proveedores`
--
ALTER TABLE `rec_compras_proveedores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_obrasoc`
--
ALTER TABLE `rec_obrasoc`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_obrasoc_medico`
--
ALTER TABLE `rec_obrasoc_medico`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_obrasoc_medico_vadem`
--
ALTER TABLE `rec_obrasoc_medico_vadem`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_obrasoc_plan`
--
ALTER TABLE `rec_obrasoc_plan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_paciente`
--
ALTER TABLE `rec_paciente`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_pacienteobrasoc`
--
ALTER TABLE `rec_pacienteobrasoc`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_persona`
--
ALTER TABLE `rec_persona`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_prescrmedicamento`
--
ALTER TABLE `rec_prescrmedicamento`
  MODIFY `idrecetamedic` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_prescrmedicamento_alto_costo`
--
ALTER TABLE `rec_prescrmedicamento_alto_costo`
  MODIFY `idrecetamedic` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_presupuestos_alto_costo`
--
ALTER TABLE `rec_presupuestos_alto_costo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_presupuestos_seleccionados`
--
ALTER TABLE `rec_presupuestos_seleccionados`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_proveedores`
--
ALTER TABLE `rec_proveedores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_proveedores_usuarios`
--
ALTER TABLE `rec_proveedores_usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_receta`
--
ALTER TABLE `rec_receta`
  MODIFY `idreceta` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_receta_alto_costo`
--
ALTER TABLE `rec_receta_alto_costo`
  MODIFY `idreceta` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_reversionvta`
--
ALTER TABLE `rec_reversionvta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rec_vademecum`
--
ALTER TABLE `rec_vademecum`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `tmp_expertorias`
--
ALTER TABLE `tmp_expertorias`
  MODIFY `CODIGO` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `tmp_expertorias_medico`
--
ALTER TABLE `tmp_expertorias_medico`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `turnos`
--
ALTER TABLE `turnos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usercia_au`
--
ALTER TABLE `usercia_au`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `userrol_au`
--
ALTER TABLE `userrol_au`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `user_asistido`
--
ALTER TABLE `user_asistido`
  MODIFY `id_asistencia` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `user_au`
--
ALTER TABLE `user_au`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `user_col`
--
ALTER TABLE `user_col`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios_api`
--
ALTER TABLE `usuarios_api`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios_iframe`
--
ALTER TABLE `usuarios_iframe`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `vad_muni`
--
ALTER TABLE `vad_muni`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `vad_muni1`
--
ALTER TABLE `vad_muni1`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `vad_muni_especialidad`
--
ALTER TABLE `vad_muni_especialidad`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `vad_muni_medicespecialidad`
--
ALTER TABLE `vad_muni_medicespecialidad`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------

--
-- Estructura para la vista `represcripta`
--
DROP TABLE IF EXISTS `represcripta`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u565673608_AltaLuna`@`localhost` SQL SECURITY DEFINER VIEW `represcripta`  AS SELECT `r`.`idreceta` AS `idreceta`, `r`.`fechaemision` AS `fechaemision`, `r`.`diagnostico` AS `diagnostico`, `p`.`dni` AS `dni`, `p`.`apellido` AS `apellido`, `p`.`nombre` AS `nombre`, `p`.`email` AS `email`, `p`.`telefono` AS `telefono`, `p`.`sexo` AS `sexo`, `p`.`fecnac` AS `fecnac`, `pl`.`plan` AS `plan`, `r`.`lugaratencion` AS `lugaratencion`, `ml`.`centrosalud` AS `centroasist`, `r`.`matricprescr` AS `matricprescr`, `r`.`matricespec_prescr` AS `matricespec_prescr`, `pp`.`apellido` AS `medape`, `pp`.`nombre` AS `mednom`, `pm`.`nro_orden` AS `renglon`, `pm`.`codigo` AS `cod_prescripto`, concat(`vm`.`monodroga`,'-',`vm`.`nombre_comercial`,'-',`vm`.`presentacion`) AS `descripcion`, `pm`.`cantprescripta` AS `cantprescripta`, if(`pm`.`dispensado` = 0,'NO','SI') AS `dispensado` FROM (((((((`rec_receta` `r` join `rec_paciente` `p` on(`r`.`idpaciente` = `p`.`id`)) join `rec_obrasoc_plan` `pl` on(`p`.`tipoplan` = `pl`.`id`)) join `rec_obrasoc` `o` on(`r`.`idobrasocafiliado` = `o`.`id`)) join `tmp_person` `pp` on(`r`.`matricprescr` = `pp`.`matricula`)) join `rec_prescrmedicamento` `pm` on(`r`.`idreceta` = `pm`.`idreceta`)) join `vad_muni_si` `vm` on(`pm`.`codigo` = `vm`.`codigo`)) join `muni_lugar` `ml` on(`r`.`lugaratencion` = `ml`.`idctro`)) WHERE `r`.`idobrasocafiliado` = 156 ORDER BY `r`.`idreceta` ASC, `pm`.`nro_orden` ASC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vademecum`
--
DROP TABLE IF EXISTS `vademecum`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u565673608_AltaLuna`@`localhost` SQL SECURITY DEFINER VIEW `vademecum`  AS SELECT `b`.`nro_registro` AS `id`, `a`.`cod_droga` AS `cod_monodroga`, `c`.`descripcion` AS `monodroga`, `b`.`nro_registro` AS `nro_alfabeta`, `b`.`nombre` AS `nombre_comercial`, `b`.`presentacion` AS `presentacion`, `b`.`laboratorio` AS `laboratorio`, `b`.`troquel` AS `codigo`, `e`.`IDSnomed` AS `idsnomed`, `b`.`cod_barra` AS `cod_barra`, `b`.`unidades` AS `unidades`, `b`.`tipo_venta` AS `tipo_venta`, `d`.`codigo` AS `tipod`, `d`.`descripcion` AS `tipo`, `b`.`precio` AS `precio`, '1' AS `condicion` FROM ((((`vad_manextra` `a` join `vad_manual` `b` on(`a`.`nro_registro` = `b`.`nro_registro`)) join `vad_monodro` `c` on(`a`.`cod_droga` = `c`.`codigo`)) join `vad_prod_control` `d` on(`b`.`marca_prod_control` = `d`.`codigo`)) left join `vad_snomed` `e` on(`b`.`nro_registro` = `e`.`nro_registro`)) WHERE `b`.`baja` = 0 ORDER BY `c`.`descripcion` ASC, `b`.`laboratorio` ASC, `b`.`presentacion` ASC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vadetot`
--
DROP TABLE IF EXISTS `vadetot`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u565673608_AltaLuna`@`localhost` SQL SECURITY DEFINER VIEW `vadetot`  AS SELECT `a`.`id` AS `id`, `a`.`monodroga` AS `monodroga`, `a`.`nombre_comercial` AS `nombre_comercial`, `a`.`presentacion` AS `presentacion`, `a`.`laboratorio` AS `laboratorio`, `a`.`codigo` AS `codigo`, `a`.`cod_barra` AS `cod_barra`, `a`.`tipo_venta` AS `tipo_venta`, `a`.`tipod` AS `tipod`, `a`.`tipo` AS `tipo` FROM `vademecum` AS `a`union select `b`.`id` AS `id`,`b`.`monodroga` AS `monodroga`,`b`.`nombre_comercial` AS `nombre_comercial`,`b`.`presentacion` AS `presentacion`,`b`.`laboratorio` AS `laboratorio`,`b`.`codigo` AS `codigo`,`b`.`cod_barra` AS `cod_barra`,`b`.`tipo_venta` AS `tipo_venta`,`b`.`tipod` AS `tipod`,`b`.`tipo` AS `tipo` from `vad_muni` `b` order by `codigo`  ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vad_020`
--
DROP TABLE IF EXISTS `vad_020`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u565673608_AltaLuna`@`localhost` SQL SECURITY DEFINER VIEW `vad_020`  AS SELECT `a`.`id` AS `id`, `b`.`cod_monodroga` AS `cod_monodroga`, `b`.`monodroga` AS `monodroga`, `b`.`nro_alfabeta` AS `nro_alfabeta`, `b`.`nombre_comercial` AS `nombre_comercial`, `b`.`presentacion` AS `presentacion`, `b`.`laboratorio` AS `laboratorio`, `b`.`codigo` AS `codigo`, `b`.`cod_barra` AS `cod_barra`, `b`.`tipo_venta` AS `tipo_venta`, `b`.`tipod` AS `tipod`, `b`.`tipo` AS `tipo`, `b`.`precio` AS `precio`, `a`.`condicion` AS `condicion` FROM (`vad_020_armado` `a` join `vademecum` `b` on(`a`.`id` = `b`.`codigo`)) ORDER BY `b`.`tipo` ASC, `b`.`laboratorio` ASC, `b`.`presentacion` ASC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vad_114`
--
DROP TABLE IF EXISTS `vad_114`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u565673608_AltaLuna`@`localhost` SQL SECURITY DEFINER VIEW `vad_114`  AS SELECT `a`.`id` AS `id`, `b`.`cod_monodroga` AS `cod_monodroga`, `b`.`monodroga` AS `monodroga`, `b`.`nro_alfabeta` AS `nro_alfabeta`, `b`.`nombre_comercial` AS `nombre_comercial`, `b`.`presentacion` AS `presentacion`, `b`.`laboratorio` AS `laboratorio`, `b`.`codigo` AS `codigo`, `b`.`cod_barra` AS `cod_barra`, `b`.`tipo_venta` AS `tipo_venta`, `b`.`tipod` AS `tipod`, `b`.`tipo` AS `tipo`, `b`.`precio` AS `precio`, `a`.`condicion` AS `condicion` FROM (`vad_020_armado` `a` join `vademecum` `b` on(`a`.`id` = `b`.`codigo`)) ORDER BY `b`.`tipo` ASC, `b`.`laboratorio` ASC, `b`.`presentacion` ASC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vad_9000`
--
DROP TABLE IF EXISTS `vad_9000`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u565673608_AltaLuna`@`localhost` SQL SECURITY DEFINER VIEW `vad_9000`  AS SELECT `a`.`id` AS `id`, `b`.`cod_monodroga` AS `cod_monodroga`, `b`.`monodroga` AS `monodroga`, `b`.`nro_alfabeta` AS `nro_alfabeta`, `b`.`nombre_comercial` AS `nombre_comercial`, `b`.`presentacion` AS `presentacion`, `b`.`laboratorio` AS `laboratorio`, `b`.`codigo` AS `codigo`, `b`.`cod_barra` AS `cod_barra`, `b`.`tipo_venta` AS `tipo_venta`, `b`.`tipod` AS `tipod`, `b`.`tipo` AS `tipo`, `b`.`precio` AS `precio`, `a`.`condicion` AS `condicion` FROM (`vad_9000_armado` `a` join `vademecum` `b` on(`a`.`id` = `b`.`codigo`)) ORDER BY `b`.`tipo` ASC, `b`.`laboratorio` ASC, `b`.`presentacion` ASC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vad_muni_si`
--
DROP TABLE IF EXISTS `vad_muni_si`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u565673608_AltaLuna`@`localhost` SQL SECURITY DEFINER VIEW `vad_muni_si`  AS SELECT `a`.`id` AS `id`, cast(1 as unsigned) AS `cod_monodroga`, `a`.`monodroga` AS `monodroga`, `a`.`nro_alfabeta` AS `nro_alfabeta`, `a`.`nombre_comercial` AS `nombre_comercial`, `a`.`presentacion` AS `presentacion`, `a`.`laboratorio` AS `laboratorio`, `a`.`codigo` AS `codigo`, `a`.`cod_barra` AS `cod_barra`, `a`.`unidades` AS `unidades`, `a`.`tipo_venta` AS `tipo_venta`, `a`.`prescripmax` AS `prescripmax`, `a`.`tipod` AS `tipod`, `a`.`tipo` AS `tipo`, `a`.`condicion` AS `condicion` FROM `vad_muni` AS `a` WHERE `a`.`alta` = 1 ;

-- --------------------------------------------------------

--
-- Estructura para la vista `view_matrsinverificador`
--
DROP TABLE IF EXISTS `view_matrsinverificador`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u565673608_AltaLuna`@`localhost` SQL SECURITY DEFINER VIEW `view_matrsinverificador`  AS SELECT `m`.`matricula` AS `matricula`, truncate(`m`.`matricula` / 10,0) AS `matr`, `p`.`apellido` AS `apellido`, `p`.`nombre` AS `nombre`, `p`.`nro_documento` AS `dni`, `p`.`sexo` AS `sexo`, `m`.`situacion` AS `situacion`, if(`m`.`rematriculado` is null,'S','N') AS `rematrdo`, `p`.`persona` AS `persona`, `m`.`orcl_afi_atm_id` AS `orcl_afi_atm_id`, `m`.`orcl_afi_atm_descrip` AS `orcl_afi_atm_descrip`, `m`.`orcl_es_id` AS `orcl_es_id`, `m`.`orcl_es_descrip` AS `orcl_es_descrip` FROM (`tmp_matriculados` `m` join `tmp_person` `p` on(`p`.`persona` = `m`.`persona`)) ;

-- --------------------------------------------------------

--
-- Estructura para la vista `view_mesxmedico`
--
DROP TABLE IF EXISTS `view_mesxmedico`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u565673608_AltaLuna`@`localhost` SQL SECURITY DEFINER VIEW `view_mesxmedico`  AS SELECT `e`.`mes` AS `mes`, count(`e`.`mes`) AS `cant`, `e`.`medico` AS `medico` FROM (select distinct `d`.`mes` AS `mes`,`d`.`fec` AS `fec`,`d`.`medico` AS `medico`,`d`.`paciente` AS `paciente` from (select substr(`a`.`fechaemision`,6,2) AS `mes`,substr(`a`.`fechaemision`,1,10) AS `fec`,concat(`b`.`apellido`,' ',`b`.`nombre`) AS `medico`,concat(convert(`c`.`apellido` using utf8mb4),' ',convert(`c`.`nombre` using utf8mb4)) AS `paciente` from ((`rec_receta` `a` join `tmp_person` `b` on(`a`.`matricprescr` = `b`.`matricula`)) join `rec_paciente` `c` on(`a`.`idpaciente` = `c`.`id`)) order by substr(`a`.`fechaemision`,6,2),concat(`b`.`apellido`,' ',`b`.`nombre`)) `d` order by `d`.`mes`,`d`.`medico`) AS `e` GROUP BY `e`.`mes`, `e`.`medico` ORDER BY `e`.`mes` ASC, count(`e`.`mes`) DESC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `view_mesxmpxmedicamento`
--
DROP TABLE IF EXISTS `view_mesxmpxmedicamento`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u565673608_AltaLuna`@`localhost` SQL SECURITY DEFINER VIEW `view_mesxmpxmedicamento`  AS SELECT `f`.`mes` AS `mes`, `f`.`precio`/ 100 AS `precioUn`, `f`.`nombre_comercial` AS `nombre_comercial`, `f`.`medico` AS `medico` FROM (select distinct substr(`a`.`fechaemision`,6,2) AS `mes`,substr(`a`.`fechaemision`,1,10) AS `fec`,concat(`b`.`apellido`,' ',`b`.`nombre`) AS `medico`,concat(convert(`c`.`apellido` using utf8mb4),' ',convert(`c`.`nombre` using utf8mb4)) AS `paciente`,`e`.`codigo` AS `codigo`,`e`.`nombre_comercial` AS `nombre_comercial`,`e`.`precio` AS `precio` from ((((`rec_receta` `a` join `tmp_person` `b` on(`a`.`matricprescr` = `b`.`matricula`)) join `rec_paciente` `c` on(`a`.`idpaciente` = `c`.`id`)) join `rec_prescrmedicamento` `d` on(`a`.`idreceta` = `d`.`idreceta`)) join `vademecum` `e` on(`d`.`codigo` = `e`.`codigo`)) order by substr(`a`.`fechaemision`,6,2),concat(`b`.`apellido`,' ',`b`.`nombre`)) AS `f` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `view_usuarios`
--
DROP TABLE IF EXISTS `view_usuarios`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u565673608_AltaLuna`@`localhost` SQL SECURITY DEFINER VIEW `view_usuarios`  AS SELECT substr(`usuarios`.`mat_id`,1,octet_length(`usuarios`.`mat_id`) - 1) AS `matric`, `usuarios`.`mat_id` AS `mat_id`, `usuarios`.`tipo_user` AS `tipo_user`, `usuarios`.`usu_clave` AS `usu_clave`, `usuarios`.`reset_token` AS `reset_token`, `usuarios`.`reset_expiracion` AS `reset_expiracion` FROM `usuarios` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_proveedores_completo`
--
DROP TABLE IF EXISTS `v_proveedores_completo`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u565673608_AltaLuna`@`127.0.0.1` SQL SECURITY DEFINER VIEW `v_proveedores_completo`  AS SELECT `p`.`id_proveedor` AS `id_proveedor`, `p`.`razon_social` AS `razon_social`, `p`.`cuit` AS `cuit`, `p`.`tipo_proveedor` AS `tipo_proveedor`, `p`.`email_general` AS `email_general`, `p`.`telefono_general` AS `telefono_general`, concat(coalesce(`p`.`direccion_calle`,''),' ',coalesce(`p`.`direccion_numero`,''),', ',coalesce(`p`.`localidad`,''),', ',coalesce(`p`.`provincia`,'')) AS `direccion_completa`, `p`.`activo` AS `activo`, `p`.`fecha_alta` AS `fecha_alta`, count(`c`.`id_contacto`) AS `total_contactos`, group_concat(concat(`c`.`nombre`,' ',`c`.`apellido`,case when `c`.`principal` = 1 then ' (Principal)' else '' end) separator '; ') AS `contactos` FROM (`alt_proveedor` `p` left join `alt_contacto_proveedor` `c` on(`p`.`id_proveedor` = `c`.`id_proveedor`)) GROUP BY `p`.`id_proveedor` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_usuarios_prueba`
--
DROP TABLE IF EXISTS `v_usuarios_prueba`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u565673608_AltaLuna`@`127.0.0.1` SQL SECURITY DEFINER VIEW `v_usuarios_prueba`  AS SELECT `user_au`.`id` AS `id`, `user_au`.`user` AS `user`, `user_au`.`nombre` AS `nombre`, `user_au`.`apellido` AS `apellido`, `user_au`.`es_prueba` AS `es_prueba`, `user_au`.`fecha_inicio_prueba` AS `fecha_inicio_prueba`, `user_au`.`dias_prueba` AS `dias_prueba`, `user_au`.`fecha_expiracion_prueba` AS `fecha_expiracion_prueba`, `user_au`.`ultimo_acceso` AS `ultimo_acceso`, `user_au`.`estado_cuenta` AS `estado_cuenta`, to_days(`user_au`.`fecha_expiracion_prueba`) - to_days(current_timestamp()) AS `dias_restantes`, CASE WHEN `user_au`.`fecha_expiracion_prueba` is null THEN 'Sin fecha de expiración' WHEN current_timestamp() < `user_au`.`fecha_expiracion_prueba` THEN 'Activo' ELSE 'Expirado' END AS `estado_prueba` FROM `user_au` WHERE `user_au`.`es_prueba` = 1 ;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `alt_contacto_proveedor`
--
ALTER TABLE `alt_contacto_proveedor`
  ADD CONSTRAINT `fk_contacto_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `alt_proveedor` (`id_proveedor`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `CONTACTO_PROVEEDOR`
--
ALTER TABLE `CONTACTO_PROVEEDOR`
  ADD CONSTRAINT `CONTACTO_PROVEEDOR_ibfk_1` FOREIGN KEY (`id_proveedor`) REFERENCES `PROVEEDOR` (`id_proveedor`) ON DELETE CASCADE;

--
-- Filtros para la tabla `epicrisis_cuerpo`
--
ALTER TABLE `epicrisis_cuerpo`
  ADD CONSTRAINT `epicrisis_cuerpo_ibfk_1` FOREIGN KEY (`idepicrisis`) REFERENCES `epicrisis_cabecera` (`idepicrisis`) ON DELETE CASCADE;

--
-- Filtros para la tabla `horarios_medicos`
--
ALTER TABLE `horarios_medicos`
  ADD CONSTRAINT `horarios_medicos_ibfk_1` FOREIGN KEY (`matricula`) REFERENCES `tmp_matriculados` (`matricula`),
  ADD CONSTRAINT `horarios_medicos_ibfk_2` FOREIGN KEY (`clinica_id`) REFERENCES `clinicas` (`id`);

--
-- Filtros para la tabla `medico_clinica`
--
ALTER TABLE `medico_clinica`
  ADD CONSTRAINT `medico_clinica_ibfk_1` FOREIGN KEY (`matricula`) REFERENCES `tmp_matriculados` (`matricula`),
  ADD CONSTRAINT `medico_clinica_ibfk_2` FOREIGN KEY (`clinica_id`) REFERENCES `clinicas` (`id`);

--
-- Filtros para la tabla `PROVEEDOR_MEDICAMENTO`
--
ALTER TABLE `PROVEEDOR_MEDICAMENTO`
  ADD CONSTRAINT `PROVEEDOR_MEDICAMENTO_ibfk_1` FOREIGN KEY (`id_proveedor`) REFERENCES `PROVEEDOR` (`id_proveedor`) ON DELETE CASCADE;

--
-- Filtros para la tabla `rec_compras_alto_costo`
--
ALTER TABLE `rec_compras_alto_costo`
  ADD CONSTRAINT `rec_compras_alto_costo_ibfk_1` FOREIGN KEY (`idreceta`) REFERENCES `rec_receta_alto_costo` (`idreceta`),
  ADD CONSTRAINT `rec_compras_alto_costo_ibfk_2` FOREIGN KEY (`id_usuario_compras`) REFERENCES `user_au` (`id`);

--
-- Filtros para la tabla `rec_compras_proveedores`
--
ALTER TABLE `rec_compras_proveedores`
  ADD CONSTRAINT `rec_compras_proveedores_ibfk_1` FOREIGN KEY (`id_compra`) REFERENCES `rec_compras_alto_costo` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `rec_compras_proveedores_ibfk_2` FOREIGN KEY (`id_proveedor`) REFERENCES `rec_proveedores` (`id`);

--
-- Filtros para la tabla `rec_prescrmedicamento_alto_costo`
--
ALTER TABLE `rec_prescrmedicamento_alto_costo`
  ADD CONSTRAINT `rec_prescrmedicamento_alto_costo_ibfk_1` FOREIGN KEY (`idreceta`) REFERENCES `rec_receta_alto_costo` (`idreceta`) ON DELETE CASCADE;

--
-- Filtros para la tabla `rec_presupuestos_alto_costo`
--
ALTER TABLE `rec_presupuestos_alto_costo`
  ADD CONSTRAINT `rec_presupuestos_alto_costo_ibfk_1` FOREIGN KEY (`id_compra_proveedor`) REFERENCES `rec_compras_proveedores` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `rec_presupuestos_alto_costo_ibfk_2` FOREIGN KEY (`id_proveedor`) REFERENCES `rec_proveedores` (`id`),
  ADD CONSTRAINT `rec_presupuestos_alto_costo_ibfk_3` FOREIGN KEY (`id_usuario_proveedor`) REFERENCES `rec_proveedores_usuarios` (`id`);

--
-- Filtros para la tabla `rec_presupuestos_seleccionados`
--
ALTER TABLE `rec_presupuestos_seleccionados`
  ADD CONSTRAINT `rec_presupuestos_seleccionados_ibfk_1` FOREIGN KEY (`id_presupuesto`) REFERENCES `rec_presupuestos_alto_costo` (`id`),
  ADD CONSTRAINT `rec_presupuestos_seleccionados_ibfk_2` FOREIGN KEY (`id_usuario_seleccion`) REFERENCES `user_au` (`id`);

--
-- Filtros para la tabla `rec_proveedores_usuarios`
--
ALTER TABLE `rec_proveedores_usuarios`
  ADD CONSTRAINT `rec_proveedores_usuarios_ibfk_1` FOREIGN KEY (`id_proveedor`) REFERENCES `rec_proveedores` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
