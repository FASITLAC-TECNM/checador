import express from 'express';
import * as escritorioController from '../controllers/escritorio.controller.js';

const router = express.Router();

// Rutas de escritorios
router.get('/', escritorioController.getEscritorios);
router.get('/stats', escritorioController.getEstadisticas);
router.get('/:id', escritorioController.getEscritorioById);
router.post('/', escritorioController.createEscritorio);
router.put('/:id', escritorioController.updateEscritorio);
router.delete('/:id', escritorioController.deleteEscritorio);
router.patch('/:id/status', escritorioController.updateEstadoEscritorio);
router.post('/:id/ping', escritorioController.registrarSync);
router.post('/:id/sync', escritorioController.registrarSync);

export default router;
