import { Router } from 'express';
import {
    getUsuarios,
    getUsuarioById,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    updateEstado,
    filterUsuarios,
    getStats,
    ping
} from '../controllers/usuarios.controller.js';

const router = Router();

router.get('/', getUsuarios);
router.get('/filtrar', filterUsuarios);
router.get('/stats', getStats);
router.get('/:id', getUsuarioById);
router.post('/', createUsuario);
router.post('/ping', ping);
router.put('/:id', updateUsuario);
router.delete('/:id', deleteUsuario);
router.patch('/:id/estado', updateEstado);

export default router;
