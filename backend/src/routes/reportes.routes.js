import { Router } from 'express';
import {
    obtenerReporteEmpleado,
    obtenerReporteDepartamento,
    obtenerReporteGlobal,
    obtenerReporteIncidencias
} from '../controllers/reportes.controller.js';

const router = Router();

// Reporte Individual de Empleado
// GET /api/reportes/empleado/:id_empleado?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD&incluir_incidencias=true&incluir_estadisticas=true
router.get('/empleado/:id_empleado', obtenerReporteEmpleado);

// Reporte por Departamento
// GET /api/reportes/departamento/:id_departamento?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD&incluir_empleados_inactivos=false
router.get('/departamento/:id_departamento', obtenerReporteDepartamento);

// Reporte Global/Ejecutivo
// GET /api/reportes/global?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD&agrupar_por=departamento
router.get('/global', obtenerReporteGlobal);

// Reporte de Incidencias
// GET /api/reportes/incidencias?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD&tipo_incidencia=permiso&estado=aprobada&id_empleado=1&id_departamento=1
router.get('/incidencias', obtenerReporteIncidencias);

export default router;
