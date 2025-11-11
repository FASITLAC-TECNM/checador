import { Router } from 'express';
import { login, logout, verificarSesion } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/verificar', verificarSesion);

export default router;
