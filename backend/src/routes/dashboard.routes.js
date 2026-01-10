import { Router } from 'express';
import { getEstadisticasDashboard } from '../controllers/dashboard.controller.js';

const router = Router();

// GET /api/dashboard/stats - Obtener estadísticas generales del dashboard
router.get('/stats', getEstadisticasDashboard);

export default router;
