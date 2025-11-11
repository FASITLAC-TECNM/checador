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
    verificarPIN,
    cambiarEstadoEmpleado,
    getHistorialEstados,
    getStats
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
router.post('/', createEmpleado);
router.put('/:id', updateEmpleado);
router.delete('/:id', deleteEmpleado);

// Rutas de gestión de estado
router.patch('/:id/estado', cambiarEstadoEmpleado);
router.get('/:id/historial-estado', getHistorialEstados);

// Ruta de verificación de PIN
router.post('/:id/verificar-pin', verificarPIN);

export default router;
