import { Router } from 'express';
import {
    getHorarios,
    getHorarioById,
    createHorario,
    updateHorario,
    deleteHorario,
    getEmpleadosPorHorario,
    asignarHorarioAEmpleado
} from '../controllers/horarios.controller.js';

const router = Router();

router.get('/', getHorarios);
router.get('/:id', getHorarioById);
router.get('/:id/empleados', getEmpleadosPorHorario);
router.post('/', createHorario);
router.post('/:idHorario/empleado/:idEmpleado', asignarHorarioAEmpleado);
router.put('/:id', updateHorario);
router.delete('/:id', deleteHorario);

export default router;
