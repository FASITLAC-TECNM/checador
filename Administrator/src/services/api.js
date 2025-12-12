// services/api.js
// Punto de compatibilidad - Re-exporta servicios modulares
// NOTA: Se recomienda importar directamente desde usuarioService o empleadoService

// Re-exportar servicios de usuarios
export {
    getUsuarios,
    getUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    actualizarEstadoConexion,
    filtrarUsuarios,
    getEstadisticas,
    obtenerRolesDeUsuario,
    asignarRolAUsuario,
    removerRolDeUsuario
} from './usuarioService';

// Re-exportar servicios de empleados
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
    getEmpleadosConUsuarios,
    validarNSSUnico,
    validarRFCUnico,
    cambiarEstadoEmpleado,
    getHistorialEstadoEmpleado
} from './empleadoService';

// Re-exportar servicios modulares como namespaces
export { default as usuarioService } from './usuarioService';
export { default as empleadoService } from './empleadoService';
export { default as credencialesService } from './credencialesService';
export { default as rolesService } from './rolesService';
