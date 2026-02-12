// services/index.js
// Punto de entrada centralizado para todos los servicios

// ============================================
// SERVICIO DE AUTENTICACIÓN
// ============================================
export { default as authService } from './authService';
export {
    login,
    logout,
    cambiarPassword,
    loginBiometrico
} from './authService';

// ============================================
// SERVICIOS DE USUARIOS
// ============================================
export {
    getUsuarios,
    getUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario
} from './api';

// ============================================
// SERVICIO MODULAR DE EMPLEADOS
// ============================================
export { default as empleadoService } from './empleadoServices.js';

export {
    getEmpleados,
    getEmpleado,
    getEmpleadoPorUsuario,
    crearEmpleado,
    actualizarEmpleado,
    eliminarEmpleado,
    validarPinEmpleado,
    buscarPorNSS,
    buscarPorRFC,
    getDepartamentosDeEmpleado,
    asignarDepartamento,
    removerDepartamento,
    getHorarioDeEmpleado
} from './empleadoServices.js';

// ============================================
// SERVICIO DE ASISTENCIAS
// ============================================
export { default as asistenciasService } from './asistenciasService.js';

export {
    registrarAsistencia,
    getAsistencias,
    getAsistenciasEmpleado,
    getUltimoRegistroHoy,
    getAsistenciasHoy
} from './asistenciasService.js';

// ============================================
// SERVICIO DE HORARIOS
// ============================================
export { default as horariosService } from './horariosService.js';

export {
    getHorarioPorEmpleado,
    parsearHorario,
    calcularResumenSemanal,
    getInfoDiaActual,
    getHorarios,
    getHorarioById,
    createHorario,
    updateHorario,
    deleteHorario,
    reactivarHorario,
    asignarHorario
} from './horariosService.js';

// ============================================
// SERVICIO DE TOLERANCIAS
// ============================================
export { default as toleranciaService } from './toleranciaService.js';

export {
    getTolerancias,
    getToleranciaById,
    getToleranciaEmpleado,
    createTolerancia,
    updateTolerancia,
    deleteTolerancia
} from './toleranciaService.js';