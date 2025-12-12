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
    ping,
    getRolesDeUsuario,
    asignarRolAUsuario,
    removerRolDeUsuario
} from '../controllers/usuarios.controller.js';

const router = Router();

router.get('/', getUsuarios);
router.get('/filtrar', filterUsuarios);
router.get('/stats', getStats);
router.get('/:id', getUsuarioById);
router.get('/:id/roles', getRolesDeUsuario);
router.post('/', createUsuario);
router.post('/ping', ping);
router.post('/:id/roles', asignarRolAUsuario);
router.put('/:id', updateUsuario);
router.delete('/:id', deleteUsuario);
router.delete('/:id/roles/:idRol', removerRolDeUsuario);
router.patch('/:id/estado', updateEstado);

export default router;
