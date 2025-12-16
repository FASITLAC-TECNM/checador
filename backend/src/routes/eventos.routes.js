import { Router } from 'express';
import {
    getEventos,
    getEventoById,
    getEstadisticasEventos,
    buscarEventos,
    createEvento,
    limpiarEventosAntiguos
} from '../controllers/eventos.controller.js';

const router = Router();

// IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros dinámicos

// Rutas específicas
router.get('/estadisticas', getEstadisticasEventos);
router.get('/buscar', buscarEventos);
router.delete('/limpiar', limpiarEventosAntiguos);

// Rutas CRUD principales
router.get('/', getEventos);
router.get('/:id', getEventoById);
router.post('/', createEvento);

export default router;
