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

        // Parsear ubicación
        let ubicacionParsed = null;
        if (data.ubicacion) {
            try {
                // Si viene como string, parsearlo
                if (typeof data.ubicacion === 'string') {
                    console.log('📍 Ubicación es string, parseando...');
                    ubicacionParsed = JSON.parse(data.ubicacion);
                } else {
                    console.log('📍 Ubicación ya es objeto');
                    ubicacionParsed = data.ubicacion;
                }
                
                console.log('📍 Tipo de ubicación:', Array.isArray(ubicacionParsed) ? 'Array' : 'Objeto');
                
                // La ubicación puede ser un array de polígonos o un solo polígono
                let coordenadas = null;
                
                if (Array.isArray(ubicacionParsed)) {
                    // Si es un array, puede ser:
                    // 1. Array de objetos polígono: [{type: 'polygon', coordinates: [...]}]
                    // 2. Array directo de coordenadas: [[lat, lng], [lat, lng], ...]
                    
                    if (ubicacionParsed.length > 0) {
                        if (ubicacionParsed[0].type === 'polygon' && ubicacionParsed[0].coordinates) {
                            // Caso 1: Array de objetos polígono
                            console.log('✅ Estructura: Array de polígonos');
                            coordenadas = ubicacionParsed[0].coordinates;
                        } else if (Array.isArray(ubicacionParsed[0])) {
                            // Caso 2: Array directo de coordenadas
                            console.log('✅ Estructura: Array directo de coordenadas');
                            coordenadas = ubicacionParsed;
                        }
                    }
                } else if (ubicacionParsed.type === 'polygon' && ubicacionParsed.coordinates) {
                    // Objeto polígono único
                    console.log('✅ Estructura: Objeto polígono único');
                    coordenadas = ubicacionParsed.coordinates;
                } else if (ubicacionParsed.coordenadas) {
                    // Objeto con propiedad 'coordenadas'
                    console.log('✅ Estructura: Objeto con propiedad coordenadas');
                    coordenadas = ubicacionParsed.coordenadas;
                }
                
                if (coordenadas) {
                    console.log('📊 Número de puntos del polígono:', coordenadas.length);
                    console.log('📍 Primera coordenada:', coordenadas[0]);
                    
                    // Asignar las coordenadas procesadas
                    ubicacionParsed = {
                        type: 'polygon',
                        coordenadas: coordenadas
                    };
                } else {
                    console.warn('⚠️ No se pudieron extraer las coordenadas');
                    return null;
                }
                
            } catch (e) {
                console.error('❌ Error parseando ubicación:', e);
                console.error('❌ Ubicación raw:', data.ubicacion);
                return null;
            }
        } else {
            console.warn('⚠️ No hay campo ubicacion en la respuesta');
        }

        return {
            id: data.id || data.id_departamento,
            nombre: data.nombre,
            ubicacion: ubicacionParsed,
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

        // Verificar estructura de coordenadas
        const coordenadas = departamento.ubicacion.coordenadas || departamento.ubicacion;
        
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

// Exportar todo el servicio
export default {
    isPointInPolygon,
    getUbicacionDepartamento,
    validarUbicacionPermitida,
    calcularDistancia,
    getCentroPoligono,
    formatearCoordenadas
};