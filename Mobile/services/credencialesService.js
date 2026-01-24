// services/credenciales.service.js
import getApiEndpoint from '../config/api.js';

/**
 * Servicio para gestionar credenciales biométricas
 */

// Obtener credenciales de un empleado
export const getCredencialesByEmpleado = async (empleadoId, token) => {
    try {
        console.log('[Credenciales Service] Obteniendo credenciales para empleado:', empleadoId);
        
        const response = await fetch(
            getApiEndpoint(`/api/credenciales/empleado/${empleadoId}`),
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = await response.json();
        
        // ✅ MEJORA: Diferenciar entre "no encontrado" (normal) y errores reales
        if (!response.ok) {
            // Si es 404, no hay credenciales (es normal para usuarios nuevos)
            if (response.status === 404 || data.message?.includes('no encontradas')) {
                console.log('[Credenciales Service] ℹ️ Usuario sin credenciales registradas (normal)');
                return {
                    success: false,
                    message: 'Sin credenciales registradas',
                    data: {
                        tiene_dactilar: false,
                        tiene_facial: false,
                        tiene_pin: false
                    }
                };
            }
            
            // Otros errores sí son problemáticos
            console.error('[Credenciales Service] ❌ Error del servidor:', data.message);
            throw new Error(data.message || 'Error al obtener credenciales');
        }

        console.log('[Credenciales Service] ✅ Credenciales obtenidas exitosamente');
        return data;
        
    } catch (error) {
        // Solo mostrar error si NO es el caso de "no encontradas"
        if (!error.message?.includes('no encontradas')) {
            console.error('[Credenciales Service] ❌ Error de conexión:', error);
        }
        throw error;
    }
};

// Guardar huella dactilar
export const guardarDactilar = async (empleadoId, dactilarBase64, token) => {
    try {
        console.log('[Credenciales Service] Guardando huella dactilar para empleado:', empleadoId);
        console.log('[Credenciales Service] Tamaño de datos:', dactilarBase64.length, 'caracteres');
        
        const response = await fetch(
            getApiEndpoint('/api/credenciales/dactilar'),
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    empleado_id: empleadoId,
                    dactilar: dactilarBase64
                })
            }
        );

        const data = await response.json();
        
        if (!response.ok) {
            console.error('[Credenciales Service] ❌ Error guardando huella:', data.message);
            throw new Error(data.message || 'Error al guardar huella dactilar');
        }

        console.log('[Credenciales Service] ✅ Huella guardada exitosamente');
        return data;
        
    } catch (error) {
        console.error('[Credenciales Service] ❌ Error al guardar huella:', error);
        throw error;
    }
};

// Guardar reconocimiento facial
export const guardarFacial = async (empleadoId, facialBase64, token) => {
    try {
        console.log('[Credenciales Service] Guardando reconocimiento facial para empleado:', empleadoId);
        console.log('[Credenciales Service] Tamaño de datos:', facialBase64.length, 'caracteres');
        
        const response = await fetch(
            getApiEndpoint('/api/credenciales/facial'),
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    empleado_id: empleadoId,
                    facial: facialBase64
                })
            }
        );

        const data = await response.json();
        
        if (!response.ok) {
            console.error('[Credenciales Service] ❌ Error guardando facial:', data.message);
            throw new Error(data.message || 'Error al guardar reconocimiento facial');
        }

        console.log('[Credenciales Service] ✅ Reconocimiento facial guardado exitosamente');
        return data;
        
    } catch (error) {
        console.error('[Credenciales Service] ❌ Error al guardar facial:', error);
        throw error;
    }
};

// Guardar PIN de seguridad
export const guardarPin = async (empleadoId, pin, token) => {
    try {
        console.log('[Credenciales Service] Guardando PIN para empleado:', empleadoId);
        
        // Validar que el PIN sea de 6 dígitos
        if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
            throw new Error('El PIN debe ser de exactamente 6 dígitos');
        }
        
        const response = await fetch(
            getApiEndpoint('/api/credenciales/pin'),
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    empleado_id: empleadoId,
                    pin: pin
                })
            }
        );

        const data = await response.json();
        
        if (!response.ok) {
            console.error('[Credenciales Service] ❌ Error guardando PIN:', data.message);
            throw new Error(data.message || 'Error al guardar PIN');
        }

        console.log('[Credenciales Service] ✅ PIN guardado exitosamente');
        return data;
        
    } catch (error) {
        console.error('[Credenciales Service] ❌ Error al guardar PIN:', error);
        throw error;
    }
};

// Verificar PIN
export const verificarPin = async (empleadoId, pin, token) => {
    try {
        console.log('[Credenciales Service] Verificando PIN para empleado:', empleadoId);
        
        const response = await fetch(
            getApiEndpoint('/api/credenciales/verificar-pin'),
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    empleado_id: empleadoId,
                    pin: pin
                })
            }
        );

        const data = await response.json();
        
        if (!response.ok) {
            console.error('[Credenciales Service] ❌ Error verificando PIN:', data.message);
            throw new Error(data.message || 'Error al verificar PIN');
        }

        console.log('[Credenciales Service] ✅ PIN verificado exitosamente');
        return data;
        
    } catch (error) {
        console.error('[Credenciales Service] ❌ Error al verificar PIN:', error);
        throw error;
    }
};

// Eliminar credencial específica
export const eliminarCredencial = async (empleadoId, tipo, token) => {
    try {
        console.log('[Credenciales Service] Eliminando credencial tipo:', tipo, 'para empleado:', empleadoId);
        
        const response = await fetch(
            getApiEndpoint(`/api/credenciales/empleado/${empleadoId}?tipo=${tipo}`),
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = await response.json();
        
        if (!response.ok) {
            console.error('[Credenciales Service] ❌ Error eliminando credencial:', data.message);
            throw new Error(data.message || 'Error al eliminar credencial');
        }

        console.log('[Credenciales Service] ✅ Credencial eliminada exitosamente');
        return data;
        
    } catch (error) {
        console.error('[Credenciales Service] ❌ Error al eliminar credencial:', error);
        throw error;
    }
};