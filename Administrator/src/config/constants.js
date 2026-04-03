/**
 * Constantes centralizadas de la aplicación
 */

// Paginación
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    EMPLEADOS_PAGE_SIZE: 8,
    ROLES_PAGE_SIZE: 5,
    HORARIOS_PAGE_SIZE: 10,
    DISPOSITIVOS_PAGE_SIZE: 8,
};

// Estados de usuarios/empleados
export const ESTADOS = {
    ACTIVO: 'activo',
    SUSPENDIDO: 'suspendido',
    BAJA: 'baja',
};

// Tipos de roles
export const ROLES = {
    ADMIN: 'admin',
    SUPERVISOR: 'supervisor',
    EMPLEADO: 'empleado',
};

// Tipos de asistencia
export const TIPO_ASISTENCIA = {
    ENTRADA: 'entrada',
    SALIDA: 'salida',
};

// Estados de solicitudes
export const ESTADO_SOLICITUD = {
    PENDIENTE: 'pendiente',
    APROBADA: 'aprobada',
    RECHAZADA: 'rechazada',
};

// Tipos de incidencias
export const TIPO_INCIDENCIA = {
    FALTA: 'falta',
    RETARDO: 'retardo',
    PERMISO: 'permiso',
    VACACIONES: 'vacaciones',
};

// Mensajes de error comunes
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
    UNAUTHORIZED: 'No tienes permisos para realizar esta acción.',
    NOT_FOUND: 'El recurso solicitado no existe.',
    SERVER_ERROR: 'Error del servidor. Intenta más tarde.',
    VALIDATION_ERROR: 'Los datos ingresados no son válidos.',
};

// Mensajes de éxito comunes
export const SUCCESS_MESSAGES = {
    CREATED: 'Registro creado exitosamente.',
    UPDATED: 'Registro actualizado exitosamente.',
    DELETED: 'Registro eliminado exitosamente.',
    SAVED: 'Cambios guardados exitosamente.',
};
