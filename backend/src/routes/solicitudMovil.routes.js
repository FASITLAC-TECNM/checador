import express from 'express';
import * as solicitudMovilController from '../controllers/solicitudMovil.controller.js';

const router = express.Router();

// Rutas de solicitudes móviles
router.get('/', solicitudMovilController.getSolicitudesMoviles);
router.get('/pendientes', solicitudMovilController.getSolicitudesMovilesPendientes);
router.get('/stats', solicitudMovilController.getEstadisticasMoviles);
router.get('/token/:token', solicitudMovilController.getSolicitudMovilByToken);
router.get('/:id', solicitudMovilController.getSolicitudMovilById);
router.post('/', solicitudMovilController.createSolicitudMovil);
router.post('/:id/aceptar', solicitudMovilController.aceptarSolicitudMovil);
router.post('/:id/rechazar', solicitudMovilController.rechazarSolicitudMovil);
router.delete('/:id', solicitudMovilController.deleteSolicitudMovil);

export default router;