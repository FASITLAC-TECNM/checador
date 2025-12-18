// routes/biometric.routes.js
import { Router } from "express";
import {
  guardarHuellaDesdeMiddleware,
  verificarHuellaDesdeMiddleware,
  identificarHuella,
  obtenerHuellaParaVerificacion,
  listarUsuariosConHuella,
  eliminarHuellaEmpleado,
  verificarEstadoHuella,
  obtenerEstadisticasBiometricas,
} from "../controllers/biometric.controller.js";

const router = Router();

// ==================== ENDPOINTS PARA REACT COMPONENT ====================

/**
 * POST /api/biometric/enroll
 * Guarda la huella capturada desde el BiometricMiddleware
 * Body: { id_empleado, template_base64, userId }
 */
router.post("/enroll", guardarHuellaDesdeMiddleware);

/**
 * POST /api/biometric/verify
 * Verifica una huella capturada contra la registrada (1:1)
 * Body: { id_empleado, template_base64 }
 */
router.post("/verify", verificarHuellaDesdeMiddleware);

/**
 * POST /api/biometric/identify
 * Identifica a qué empleado pertenece una huella (1:N) - PARA LOGIN
 * Body: { template_base64 }
 */
router.post("/identify", identificarHuella);

/**
 * GET /api/biometric/template/:id_empleado
 * Obtiene el template de un empleado para verificación en el middleware
 */
router.get("/template/:id_empleado", obtenerHuellaParaVerificacion);

/**
 * GET /api/biometric/users
 * Lista todos los usuarios que tienen huella registrada
 */
router.get("/users", listarUsuariosConHuella);

/**
 * GET /api/biometric/status/:id_empleado
 * Verifica si un empleado tiene huella registrada
 */
router.get("/status/:id_empleado", verificarEstadoHuella);

/**
 * DELETE /api/biometric/:id_empleado
 * Elimina la huella de un empleado
 */
router.delete("/:id_empleado", eliminarHuellaEmpleado);

/**
 * GET /api/biometric/stats
 * Obtiene estadísticas del sistema biométrico
 */
router.get("/stats", obtenerEstadisticasBiometricas);

export default router;
