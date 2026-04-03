// services/index.js
// Punto de entrada centralizado para todos los servicios

// ============================================
// SERVICIOS MODULARES (Recomendado)
// ============================================

// Servicio de usuarios como namespace
export { default as usuarioService } from './usuarioService';

// Servicio de empleados como namespace
export { default as empleadoService } from './empleadoService';

// ============================================
// EXPORTACIONES INDIVIDUALES
// ============================================

// Funciones individuales de usuarios
export {
    getUsuarios,
    getUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    actualizarEstadoConexion,
    filtrarUsuarios,
    getEstadisticas
} from './usuarioService';

// Funciones individuales de empleados
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

// ============================================
// EJEMPLOS DE USO
// ============================================
/*
// Opción 1: Importar servicios como namespace (Recomendado)
import { usuarioService, empleadoService } from './services';
const usuarios = await usuarioService.getUsuarios();
const empleados = await empleadoService.getEmpleados();

// Opción 2: Importar funciones individuales
import { getUsuarios, getEmpleados } from './services';
const usuarios = await getUsuarios();
const empleados = await getEmpleados();

// Opción 3: Importar todo el servicio
import * as services from './services';
const usuarios = await services.getUsuarios();
*/
