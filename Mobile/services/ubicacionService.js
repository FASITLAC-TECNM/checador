// services/ubicacionService.js
// Servicio para gestión de ubicación y validación de zonas permitidas

import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');


/**
 * Normalizar coordenadas a formato {lat, lng}
 * @param {Array|Object} coords - Puede ser [lat, lng] o {lat, lng}
 * @returns {Object} {lat, lng}
 */
const normalizarCoordenada = (coords) => {
  if (Array.isArray(coords)) {
    return {
      lat: coords[0],
      lng: coords[1]
    };
  }
  return coords;
};

/**
 * Verifica si un punto está dentro de un polígono usando Ray Casting Algorithm
 * @param {Object} point - {lat, lng}
 * @param {Array} polygon - Array de coordenadas (pueden ser [lat, lng] o {lat, lng})
 * @returns {boolean}
 */
export const isPointInPolygon = (point, polygon) => {
    if (!polygon || polygon.length < 3) {
        return false;
    }
    
    // Normalizar el punto
    const normalizedPoint = normalizarCoordenada(point);
    
    // Normalizar todas las coordenadas del polígono
    const normalizedPolygon = polygon.map(coord => normalizarCoordenada(coord));
    
    
    let inside = false;
    const x = normalizedPoint.lat;
    const y = normalizedPoint.lng;
    
    for (let i = 0, j = normalizedPolygon.length - 1; i < normalizedPolygon.length; j = i++) {
        const xi = normalizedPolygon[i].lat;
        const yi = normalizedPolygon[i].lng;
        const xj = normalizedPolygon[j].lat;
        const yj = normalizedPolygon[j].lng;
        
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        
        if (intersect) inside = !inside;
    }
    
    return inside;
};

/**
 * Extraer coordenadas del formato que viene del backend
 * @param {string|Object|Array} ubicacion - Ubicación en cualquier formato
 * @returns {Array|null} Array de coordenadas normalizadas
 */
const extraerCoordenadas = (ubicacion) => {
    if (!ubicacion) {
        return null;
    }

    try {
        // 1. Si es string, parsearlo
        let parsed = ubicacion;
        if (typeof ubicacion === 'string') {
            parsed = JSON.parse(ubicacion);
        }


        // 2. Extraer coordenadas según la estructura
        let coordenadas = null;

        // ⭐ CASO NUEVO: Objeto con propiedad 'zonas' (array de zonas)
        if (parsed.zonas && Array.isArray(parsed.zonas) && parsed.zonas.length > 0) {
            
            // Tomar la primera zona (puedes modificar esto si necesitas manejar múltiples zonas)
            const primeraZona = parsed.zonas[0];
            
            if (primeraZona.coordinates && Array.isArray(primeraZona.coordinates)) {
                coordenadas = primeraZona.coordinates;
            }
        }
        // Caso A: Objeto con propiedad 'coordenadas'
        else if (parsed.coordenadas && Array.isArray(parsed.coordenadas)) {
            coordenadas = parsed.coordenadas;
        }
        // Caso B: Objeto con propiedad 'coordinates'
        else if (parsed.coordinates && Array.isArray(parsed.coordinates)) {
            coordenadas = parsed.coordinates;
        }
        // Caso C: Array directo de coordenadas
        else if (Array.isArray(parsed)) {
            
            // Sub-caso 1: Array de objetos polígono/rectángulo [{type: 'polygon'/'rectangle', coordinates: [...]}]
            if (parsed.length > 0 && parsed[0].coordinates && Array.isArray(parsed[0].coordinates)) {
                coordenadas = parsed[0].coordinates;
            }
            // Sub-caso 2: Array de coordenadas directamente [[lat, lng], ...]
            else if (parsed.length > 0 && (Array.isArray(parsed[0]) || parsed[0].lat !== undefined)) {
                coordenadas = parsed;
            }
        }

        if (!coordenadas || coordenadas.length < 3) {
            return null;
        }


        return coordenadas;

    } catch (e) {
        return null;
    }
};

/**
 * Obtener ubicación del departamento por ID
 * @param {number} departamentoId - ID del departamento
 * @returns {Promise<Object>} Datos de ubicación del departamento
 */
export const getUbicacionDepartamento = async (departamentoId) => {
    try {
        const url = `${API_URL}/departamentos/${departamentoId}`;

        const response = await fetch(url);


        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }

        const data = await response.json();

        // Extraer coordenadas usando la función auxiliar
        const coordenadas = extraerCoordenadas(data.ubicacion);

        if (!coordenadas) {
            return {
                id: data.id || data.id_departamento,
                nombre: data.nombre,
                ubicacion: null,
                color: data.color
            };
        }

        return {
            id: data.id || data.id_departamento,
            nombre: data.nombre,
            ubicacion: {
                type: 'polygon',
                coordenadas: coordenadas
            },
            color: data.color
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Validar si usuario está dentro del área permitida
 * @param {Object} ubicacionUsuario - {lat, lng}
 * @param {number} departamentoId - ID del departamento
 * @returns {Promise<Object>} {dentroDelArea: boolean, departamento: Object}
 */
export const validarUbicacionPermitida = async (ubicacionUsuario, departamentoId) => {
    try {

        // Obtener ubicación del departamento
        const departamento = await getUbicacionDepartamento(departamentoId);

        if (!departamento || !departamento.ubicacion) {
            return {
                dentroDelArea: false,
                departamento: null,
                error: 'Departamento sin ubicación configurada'
            };
        }

        // Obtener coordenadas
        const coordenadas = departamento.ubicacion.coordenadas;
        
        if (!Array.isArray(coordenadas) || coordenadas.length < 3) {
            return {
                dentroDelArea: false,
                departamento: departamento,
                error: 'Coordenadas del departamento inválidas'
            };
        }


        // Validar si está dentro del polígono
        const dentroDelArea = isPointInPolygon(ubicacionUsuario, coordenadas);


        return {
            dentroDelArea,
            departamento,
            error: null
        };
    } catch (error) {
        return {
            dentroDelArea: false,
            departamento: null,
            error: error.message
        };
    }
};

/**
 * Calcular distancia entre dos puntos (en metros)
 * Fórmula de Haversine
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {number} Distancia en metros
 */
export const calcularDistancia = (point1, point2) => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distancia = R * c;
    
    return distancia;
};

/**
 * Obtener centro del polígono (centroide aproximado)
 * @param {Array} coordenadas - Array de coordenadas
 * @returns {Object} {lat, lng}
 */
export const getCentroPoligono = (coordenadas) => {
    if (!coordenadas || coordenadas.length === 0) return null;
    
    // Normalizar coordenadas
    const normalizedCoords = coordenadas.map(coord => normalizarCoordenada(coord));
    
    const sumLat = normalizedCoords.reduce((sum, coord) => sum + coord.lat, 0);
    const sumLng = normalizedCoords.reduce((sum, coord) => sum + coord.lng, 0);
    
    return {
        lat: sumLat / normalizedCoords.length,
        lng: sumLng / normalizedCoords.length
    };
};

/**
 * Formatear coordenadas para mostrar
 * @param {Object|Array} coords - {lat, lng} o [lat, lng]
 * @returns {string} String formateado
 */
export const formatearCoordenadas = (coords) => {
    if (!coords) return 'Sin coordenadas';
    
    const normalized = normalizarCoordenada(coords);
    return `${normalized.lat.toFixed(6)}, ${normalized.lng.toFixed(6)}`;
};

// Exportar funciones individuales y servicio completo
export {
    normalizarCoordenada,
    extraerCoordenadas
};

export default {
    isPointInPolygon,
    getUbicacionDepartamento,
    validarUbicacionPermitida,
    calcularDistancia,
    getCentroPoligono,
    formatearCoordenadas,
    extraerCoordenadas
};