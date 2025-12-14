// services/index.js
// Punto de entrada centralizado para todos los servicios

// ============================================
// SERVICIO DE AUTENTICACIÓN
// ============================================
export { default as authService } from './authService';
export {
    login,
    logout,
    verificarEmail,
    solicitarRecuperacion,
    cambiarPassword
} from './authService';

// ============================================
// SERVICIOS DE USUARIOS
// ============================================
export {
    getUsuarios,
    getUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    actualizarEstadoConexion,
    filtrarUsuarios,
    getEstadisticas
} from './api';

// ============================================
// SERVICIO MODULAR DE EMPLEADOS
// ============================================
export { default as empleadoService } from './empleadosServices.js';

export {
    getEmpleados,
    getEmpleado,
    getEmpleadoPorUsuario,
    getEmpleadoConPermisos,
    getStats,
    crearEmpleado,
    actualizarEmpleado,
    eliminarEmpleado,
    validarPinEmpleado,
    buscarPorNSS,
    buscarPorRFC,
    getEmpleadosConUsuarios,
    validarNSSUnico,
    validarRFCUnico,
    cambiarEstadoEmpleado,
    getHistorialEstadoEmpleado
} from './empleadosServices.js';