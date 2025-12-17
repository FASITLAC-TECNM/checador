// backend/src/routes/asistencia.routes.js
import { Router } from 'express';
import {
    registrarAsistencia,
    registrarAsistenciaFacial,
    obtenerAsistenciasEmpleado,
    obtenerAsistenciasPorFecha,
    obtenerUltimoRegistro,
    obtenerEstadisticas,
    registrarAsistenciaManual,
    eliminarRegistro,
    obtenerReporte,
    obtenerTodosRegistros,
    healthCheck
} from '../controllers/asistencia.controller.js';

const router = Router();

// ==================== HEALTH CHECK ====================

// Verificar disponibilidad del sistema
router.get('/health', healthCheck);

// ==================== REGISTRO DE ASISTENCIA ====================

// Registrar entrada/salida con huella dactilar
router.post('/registrar', registrarAsistencia);

// Registrar asistencia con reconocimiento facial
router.post('/registrar-facial', registrarAsistenciaFacial);

// Registrar asistencia manual (solo admin)
router.post('/registrar-manual', registrarAsistenciaManual);

// ==================== CONSULTAS ====================

// IMPORTANTE: Rutas específicas primero (antes de parámetros dinámicos)
router.get('/estadisticas', obtenerEstadisticas);
router.get('/reporte', obtenerReporte);
router.get('/todos', obtenerTodosRegistros);

// Obtener último registro de un empleado (para saber si toca Entrada o Salida)
router.get('/empleado/:id_empleado/ultimo', obtenerUltimoRegistro);

// Obtener todas las asistencias de un empleado (con filtros opcionales)
router.get('/empleado/:id_empleado', obtenerAsistenciasEmpleado);

// Obtener todas las asistencias de una fecha específica
router.get('/fecha/:fecha', obtenerAsistenciasPorFecha);

// ==================== ADMINISTRACIÓN ====================

// Eliminar un registro de asistencia
router.delete('/:id', eliminarRegistro);

export default router;