import express from 'express';
import * as devicesController from '../controllers/devices.controller.js';

const router = express.Router();

// Rutas de dispositivos
router.get('/', devicesController.getDevices);
router.get('/stats', devicesController.getDeviceStats);
router.get('/:id', devicesController.getDeviceById);
router.post('/', devicesController.createDevice);
router.put('/:id', devicesController.updateDevice);
router.delete('/:id', devicesController.deleteDevice);
router.patch('/:id/status', devicesController.updateDeviceStatus);
router.post('/:id/ping', devicesController.pingDevice);

export default router;
