import express from 'express';
import * as configuracionController from '../controllers/configuracion.controller.js';

const router = express.Router();

// Rutas de configuración
router.get('/', configuracionController.getConfiguracion);
router.put('/', configuracionController.updateConfiguracion);
router.patch('/mantenimiento', configuracionController.toggleMantenimiento);

export default router;
