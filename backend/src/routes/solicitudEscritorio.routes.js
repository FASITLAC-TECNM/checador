import express from 'express';
import * as solicitudController from '../controllers/solicitudEscritorio.controller.js';

const router = express.Router();

// Rutas de solicitudes de escritorio
router.get('/', solicitudController.getSolicitudes);
router.get('/pendientes', solicitudController.getSolicitudesPendientes);
router.get('/stats', solicitudController.getEstadisticas);
router.get('/:id', solicitudController.getSolicitudById);
router.post('/', solicitudController.createSolicitud);
router.post('/:id/aceptar', solicitudController.aceptarSolicitud);
router.post('/:id/rechazar', solicitudController.rechazarSolicitud);
router.delete('/:id', solicitudController.deleteSolicitud);

export default router;
