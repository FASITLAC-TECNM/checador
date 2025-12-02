import { Router } from 'express';
import {
    getEmpleados,
    getEmpleadoById,
    getEmpleadoByUsuarioId,
    createEmpleado,
    updateEmpleado,
    deleteEmpleado,
    buscarPorNSS,
    buscarPorRFC,
    getStats,
    getEmpleadoConPermisos
} from '../controllers/empleados.controller.js';

const router = Router();

// IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros dinámicos

// Rutas de estadísticas y búsqueda (específicas primero)
router.get('/stats', getStats);
router.get('/usuario/:id_usuario', getEmpleadoByUsuarioId);
router.get('/nss/:nss', buscarPorNSS);
router.get('/rfc/:rfc', buscarPorRFC);

// Rutas CRUD principales
router.get('/', getEmpleados);
router.get('/:id', getEmpleadoById);
router.get('/:id/permisos', getEmpleadoConPermisos);
router.post('/', createEmpleado);
router.put('/:id', updateEmpleado);
router.delete('/:id', deleteEmpleado);

export default router;
