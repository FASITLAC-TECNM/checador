import express from 'express';
import * as empleadoDepartamentoController from '../controllers/empleadoDepartamento.controller.js';

const router = express.Router();

// Rutas de empleado-departamento
router.get('/empleado/:id_empleado', empleadoDepartamentoController.getDepartamentosEmpleado);
router.post('/', empleadoDepartamentoController.asignarDepartamento);
router.delete('/:id', empleadoDepartamentoController.eliminarAsignacionDepartamento);

export default router;
