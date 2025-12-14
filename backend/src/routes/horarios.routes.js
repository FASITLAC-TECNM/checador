import { Router } from 'express';
import {
    getHorarios,
    getHorarioById,
    createHorario,
    updateHorario,
    deleteHorario,
    getEmpleadosPorHorario,
    asignarHorarioAEmpleado,
    getHorariosVistaCalendario,
    getHorarioPorEmpleado
} from '../controllers/horarios.controller.js';

const router = Router();

// Rutas específicas primero (antes de las rutas con parámetros)
router.get('/vista/calendario', getHorariosVistaCalendario);
router.get('/empleado/:empleadoId', getHorarioPorEmpleado);

// Rutas generales
router.get('/', getHorarios);
router.get('/:id', getHorarioById);
router.get('/:id/empleados', getEmpleadosPorHorario);
router.post('/', createHorario);
router.post('/:idHorario/empleado/:idEmpleado', asignarHorarioAEmpleado);
router.put('/:id', updateHorario);
router.delete('/:id', deleteHorario);

export default router;
