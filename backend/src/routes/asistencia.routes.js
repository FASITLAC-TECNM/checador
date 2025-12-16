// backend/src/routes/asistencia.routes.js
import { Router } from 'express';
import {
    registrarAsistencia,
    obtenerAsistenciasEmpleado,
    obtenerAsistenciasPorFecha,
    obtenerUltimoRegistro,
    obtenerEstadisticas,
    registrarAsistenciaManual,
    eliminarRegistro,
    obtenerReporte
} from '../controllers/asistencia.controller.js';

const router = Router();

// ==================== REGISTRO DE ASISTENCIA ====================

// Registrar entrada/salida con huella dactilar
router.post('/registrar', registrarAsistencia);

// Registrar asistencia manual (solo admin)
router.post('/registrar-manual', registrarAsistenciaManual);

// ==================== CONSULTAS ====================

// IMPORTANTE: Rutas específicas primero (antes de parámetros dinámicos)
router.get('/estadisticas', obtenerEstadisticas);
router.get('/reporte', obtenerReporte);

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