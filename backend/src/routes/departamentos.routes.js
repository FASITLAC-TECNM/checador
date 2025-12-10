import { Router } from 'express';
import {
    getDepartamentos,
    getDepartamentoById,
    createDepartamento,
    updateDepartamento,
    deleteDepartamento
} from '../controllers/departamentos.controller.js';

const router = Router();

// Rutas de departamentos
router.get('/', getDepartamentos);
router.get('/:id', getDepartamentoById);
router.post('/', createDepartamento);
router.put('/:id', updateDepartamento);
router.delete('/:id', deleteDepartamento);

export default router;
