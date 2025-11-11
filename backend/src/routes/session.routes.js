import { Router } from 'express';
import { validate, close, check } from '../controllers/session.controller.js';

const router = Router();

router.post('/validate', validate);
router.post('/close', close);
router.get('/check', check);

export default router;
