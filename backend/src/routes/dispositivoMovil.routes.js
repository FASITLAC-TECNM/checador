import express from 'express';
import * as dispositivoMovilController from '../controllers/dispositivoMovil.controller.js';

const router = express.Router();

// Rutas de dispositivos móviles
// IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros dinámicos
router.get('/usuario/:id_usuario', dispositivoMovilController.getDispositivosMovilesPorUsuario);
router.get('/empleado/:id_empleado', dispositivoMovilController.getDispositivosMovilesPorEmpleado);
router.get('/', dispositivoMovilController.getDispositivosMoviles);
router.get('/:id', dispositivoMovilController.getDispositivoMovilById);
router.post('/', dispositivoMovilController.createDispositivoMovil);
router.put('/:id', dispositivoMovilController.updateDispositivoMovil);
router.delete('/:id', dispositivoMovilController.deleteDispositivoMovil);

export default router;
