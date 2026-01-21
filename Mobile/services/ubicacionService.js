// services/ubicacionService.js
// Servicio para gestión de ubicación y validación de zonas permitidas

import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');

console.log('📍 Ubicación API URL:', API_URL);

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
        console.warn('⚠️ Polígono inválido o con menos de 3 puntos');
        return false;
    }
    
    // Normalizar el punto
    const normalizedPoint = normalizarCoordenada(point);
    
    // Normalizar todas las coordenadas del polígono
    const normalizedPolygon = polygon.map(coord => normalizarCoordenada(coord));
    
    console.log('📍 Punto a verificar:', normalizedPoint);
    console.log('🔷 Polígono normalizado (primeros 2 puntos):', normalizedPolygon.slice(0, 2));
    
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
    
    console.log(`📍 Punto (${x.toFixed(6)}, ${y.toFixed(6)}) ${inside ? '✅ DENTRO' : '❌ FUERA'} del polígono`);
    return inside;
};

/**
 * Extraer coordenadas del formato que viene del backend
 * @param {string|Object|Array} ubicacion - Ubicación en cualquier formato
 * @returns {Array|null} Array de coordenadas normalizadas
 */
const extraerCoordenadas = (ubicacion) => {
    if (!ubicacion) {
        console.warn('⚠️ Ubicación vacía');
        return null;
    }

    try {
        // 1. Si es string, parsearlo
        let parsed = ubicacion;
        if (typeof ubicacion === 'string') {
            console.log('📍 Ubicación es string, parseando...');
            parsed = JSON.parse(ubicacion);
        }

        console.log('📍 Estructura parseada:', JSON.stringify(parsed).substring(0, 200));

        // 2. Extraer coordenadas según la estructura
        let coordenadas = null;

        // ⭐ CASO NUEVO: Objeto con propiedad 'zonas' (array de zonas)
        if (parsed.zonas && Array.isArray(parsed.zonas) && parsed.zonas.length > 0) {
            console.log('✅ Estructura: Objeto con propiedad zonas');
            console.log('📊 Número de zonas:', parsed.zonas.length);
            
            // Tomar la primera zona (puedes modificar esto si necesitas manejar múltiples zonas)
            const primeraZona = parsed.zonas[0];
            console.log('📍 Primera zona tipo:', primeraZona.type);
            
            if (primeraZona.coordinates && Array.isArray(primeraZona.coordinates)) {
                coordenadas = primeraZona.coordinates;
                console.log('✅ Coordenadas extraídas de zona');
            }
        }
        // Caso A: Objeto con propiedad 'coordenadas'
        else if (parsed.coordenadas && Array.isArray(parsed.coordenadas)) {
            console.log('✅ Estructura: Objeto con propiedad coordenadas');
            coordenadas = parsed.coordenadas;
        }
        // Caso B: Objeto con propiedad 'coordinates'
        else if (parsed.coordinates && Array.isArray(parsed.coordinates)) {
            console.log('✅ Estructura: Objeto con propiedad coordinates');
            coordenadas = parsed.coordinates;
        }
        // Caso C: Array directo de coordenadas
        else if (Array.isArray(parsed)) {
            console.log('✅ Estructura: Array directo');
            
            // Sub-caso 1: Array de objetos polígono/rectángulo [{type: 'polygon'/'rectangle', coordinates: [...]}]
            if (parsed.length > 0 && parsed[0].coordinates && Array.isArray(parsed[0].coordinates)) {
                console.log('✅ Sub-estructura: Array de objetos con coordinates');
                console.log('📍 Tipo de objeto:', parsed[0].type);
                coordenadas = parsed[0].coordinates;
            }
            // Sub-caso 2: Array de coordenadas directamente [[lat, lng], ...]
            else if (parsed.length > 0 && (Array.isArray(parsed[0]) || parsed[0].lat !== undefined)) {
                console.log('✅ Sub-estructura: Array de coordenadas directas');
                coordenadas = parsed;
            }
        }

        if (!coordenadas || coordenadas.length < 3) {
            console.error('❌ No se pudieron extraer coordenadas válidas');
            console.log('📊 Estructura recibida:', parsed);
            return null;
        }

        console.log('📊 Coordenadas extraídas:', coordenadas.length, 'puntos');
        console.log('📍 Primera coordenada:', coordenadas[0]);
        console.log('📍 Última coordenada:', coordenadas[coordenadas.length - 1]);

        return coordenadas;

    } catch (e) {
        console.error('❌ Error procesando ubicación:', e);
        console.error('❌ Ubicación raw:', ubicacion);
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
        console.log('🏢 Obteniendo ubicación del departamento:', departamentoId);
        console.log('🏢 URL completa:', url);

        const response = await fetch(url);

        console.log('📡 Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error del servidor:', errorText);
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Departamento obtenido:', data.nombre);
        console.log('📦 Ubicación raw:', data.ubicacion);

        // Extraer coordenadas usando la función auxiliar
        const coordenadas = extraerCoordenadas(data.ubicacion);

        if (!coordenadas) {
            console.warn('⚠️ No se pudieron obtener coordenadas válidas');
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
        console.error('❌ Error obteniendo ubicación del departamento:', error);
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
        console.log('═══════════════════════════════════════');
        console.log('🔍 VALIDANDO UBICACIÓN');
        console.log('═══════════════════════════════════════');
        console.log('📍 Usuario en:', ubicacionUsuario);
        console.log('🏢 Departamento ID:', departamentoId);

        // Obtener ubicación del departamento
        const departamento = await getUbicacionDepartamento(departamentoId);

        if (!departamento || !departamento.ubicacion) {
            console.warn('⚠️ Departamento sin ubicación configurada');
            return {
                dentroDelArea: false,
                departamento: null,
                error: 'Departamento sin ubicación configurada'
            };
        }

        // Obtener coordenadas
        const coordenadas = departamento.ubicacion.coordenadas;
        
        if (!Array.isArray(coordenadas) || coordenadas.length < 3) {
            console.warn('⚠️ Coordenadas inválidas');
            console.log('📊 Coordenadas recibidas:', coordenadas);
            return {
                dentroDelArea: false,
                departamento: departamento,
                error: 'Coordenadas del departamento inválidas'
            };
        }

        console.log('📊 Validando con', coordenadas.length, 'puntos del polígono');

        // Validar si está dentro del polígono
        const dentroDelArea = isPointInPolygon(ubicacionUsuario, coordenadas);

        console.log('═══════════════════════════════════════');
        console.log(dentroDelArea ? '✅ USUARIO DENTRO DEL ÁREA' : '❌ USUARIO FUERA DEL ÁREA');
        console.log('═══════════════════════════════════════');

        return {
            dentroDelArea,
            departamento,
            error: null
        };
    } catch (error) {
        console.error('❌ Error validando ubicación:', error);
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
    
    console.log(`📏 Distancia calculada: ${distancia.toFixed(2)} metros`);
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