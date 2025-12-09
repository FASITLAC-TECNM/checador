import { Router } from 'express';
import {
    getRoles,
    getRolById,
    createRol,
    updateRol,
    deleteRol,
    getModulos
} from '../controllers/roles.controller.js';

const router = Router();

// Rutas de roles
router.get('/roles', getRoles);
router.get('/roles/:id', getRolById);
router.post('/roles', createRol);
router.put('/roles/:id', updateRol);
router.delete('/roles/:id', deleteRol);

// Rutas de módulos
router.get('/modulos', getModulos);

export default router;
