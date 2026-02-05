// services/credenciales.service.js
import getApiEndpoint from '../config/api.js';

/**
 * Servicio para gestionar credenciales biométricas
 */

// Obtener credenciales de un empleado
export const getCredencialesByEmpleado = async (empleadoId, token) => {
    try {
        
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
            throw new Error(data.message || 'Error al obtener credenciales');
        }

        return data;
        
    } catch (error) {
        // Solo mostrar error si NO es el caso de "no encontradas"
        if (!error.message?.includes('no encontradas')) {
        }
        throw error;
    }
};

// Guardar huella dactilar
export const guardarDactilar = async (empleadoId, dactilarBase64, token) => {
    try {
        
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
            throw new Error(data.message || 'Error al guardar huella dactilar');
        }

        return data;
        
    } catch (error) {
        throw error;
    }
};

// Guardar reconocimiento facial
export const guardarFacial = async (empleadoId, facialBase64, token) => {
    try {
        
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
            throw new Error(data.message || 'Error al guardar reconocimiento facial');
        }

        return data;
        
    } catch (error) {
        throw error;
    }
};

// Guardar PIN de seguridad
export const guardarPin = async (empleadoId, pin, token) => {
    try {
        
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
            throw new Error(data.message || 'Error al guardar PIN');
        }

        return data;
        
    } catch (error) {
        throw error;
    }
};

// Verificar PIN
export const verificarPin = async (empleadoId, pin, token) => {
    try {
        
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
            throw new Error(data.message || 'Error al verificar PIN');
        }

        return data;
        
    } catch (error) {
        throw error;
    }
};

// Eliminar credencial específica
export const eliminarCredencial = async (empleadoId, tipo, token) => {
    try {
        
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
            throw new Error(data.message || 'Error al eliminar credencial');
        }

        return data;
        
    } catch (error) {
        throw error;
    }
};