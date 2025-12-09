import { Router } from 'express';
import {
    getCredencialesByEmpleado,
    createCredenciales,
    updateCredenciales,
    deleteCredenciales,
    validarPin,
    updateDactilar,
    updateFacial,
    getMetodosAutenticacion
} from '../controllers/credenciales.controller.js';

const router = Router();

// Rutas para gestión de credenciales
router.get('/empleado/:id_empleado', getCredencialesByEmpleado);
router.get('/empleado/:id_empleado/metodos', getMetodosAutenticacion);
router.post('/', createCredenciales);
router.put('/empleado/:id_empleado', updateCredenciales);
router.delete('/empleado/:id_empleado', deleteCredenciales);

// Rutas para validación
router.post('/validar-pin', validarPin);

// Rutas para actualizar datos biométricos
router.put('/empleado/:id_empleado/dactilar', updateDactilar);
router.put('/empleado/:id_empleado/facial', updateFacial);

export default router;
