
import { getApiEndpoint } from '../config/api.js';
const API_URL = getApiEndpoint('/api');

const normalizarCoordenada = (coords) => {
  if (Array.isArray(coords)) {
    return {
      lat: coords[0],
      lng: coords[1]
    };
  }
  return coords;
};

export const isPointInPolygon = (point, polygon) => {
  if (!polygon || polygon.length < 3) {
    return false;
  }


  const normalizedPoint = normalizarCoordenada(point);
  const normalizedPolygon = polygon.map((coord) => normalizarCoordenada(coord));

  // Validación rápida: si es un único punto (centro) u objeto
  if (normalizedPolygon.length < 3) {
    const distance = calcularDistancia(normalizedPoint, normalizedPolygon[0]);
    return distance <= 200; // Tolerancia geofence radio predeterminado
  }

  let inside = false;
  const x = normalizedPoint.lat;
  const y = normalizedPoint.lng;

  for (let i = 0, j = normalizedPolygon.length - 1; i < normalizedPolygon.length; j = i++) {
    const xi = normalizedPolygon[i].lat;
    const yi = normalizedPolygon[i].lng;
    const xj = normalizedPolygon[j].lat;
    const yj = normalizedPolygon[j].lng;

    const intersect = yi > y !== yj > y &&
      x < (xj - xi) * (y - yi) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
};






const extraerCoordenadas = (ubicacion) => {
  if (!ubicacion) {
    return null;
  }

  try {
    let parsed = ubicacion;
    if (typeof ubicacion === 'string') {
      try {
        parsed = JSON.parse(ubicacion);
      } catch (e) {
        // Ignorar error y manejarlo como null debajo
      }
    }

    let coordsArray = [];

    // Helper robusto para interpretar cualquier forma de coordenada de un solo índice
    const extractPoint = (p) => {
      if (!p) return null;

      let latVal = null;
      let lngVal = null;

      if (Array.isArray(p) && p.length >= 2) {
        latVal = parseFloat(p[0]);
        lngVal = parseFloat(p[1]);
      } else if (p.lat !== undefined && p.lng !== undefined) {
        latVal = parseFloat(p.lat);
        lngVal = parseFloat(p.lng);
      } else if (p.latitude !== undefined && p.longitude !== undefined) {
        latVal = parseFloat(p.latitude);
        lngVal = parseFloat(p.longitude);
      } else if (p.latitud !== undefined && p.longitud !== undefined) {
        latVal = parseFloat(p.latitud);
        lngVal = parseFloat(p.longitud);
      }

      if (latVal !== null && lngVal !== null && !isNaN(latVal) && !isNaN(lngVal)) {
        // Auto-corrección destructiva: GeoJSON a veces exporta invertido [longitud, latitud].
        // La Latitud terrestre SOLO existe entre -90 y 90. Si lat rebasa esto, están invertidas.
        if (Math.abs(latVal) > 90 && Math.abs(lngVal) <= 90) {
          const temp = latVal;
          latVal = lngVal;
          lngVal = temp;
        }
        return { lat: latVal, lng: lngVal };
      }

      return null;
    };

    if (parsed.zonas && Array.isArray(parsed.zonas) && parsed.zonas.length > 0) {
      if (parsed.zonas.length === 1) {
        // Un solo polígono (retrocompatibilidad plana)
        const zona = parsed.zonas[0];
        if (zona.coordinates && Array.isArray(zona.coordinates)) {
          if (Array.isArray(zona.coordinates[0]) && Array.isArray(zona.coordinates[0][0])) {
            coordsArray = zona.coordinates[0].map(extractPoint);
          } else {
            coordsArray = zona.coordinates.map(extractPoint);
          }
        }
      } else {
        // Múltiples zonas: Regresar arreglo de arreglos (MultiPolygon)
        let multiPolygon = [];
        parsed.zonas.forEach(zona => {
          if (zona.coordinates && Array.isArray(zona.coordinates)) {
            let poly = [];
            if (Array.isArray(zona.coordinates[0]) && Array.isArray(zona.coordinates[0][0])) {
               poly = zona.coordinates[0].map(extractPoint).filter(c => c && typeof c.lat === 'number');
            } else {
               poly = zona.coordinates.map(extractPoint).filter(c => c && typeof c.lat === 'number');
            }
            if (poly.length > 0) {
               multiPolygon.push(poly);
            }
          }
        });
        
        if (multiPolygon.length > 0) {
           return multiPolygon; // Salida directa como MultiPolygon limpio
        }
      }
    } else if (parsed.coordenadas && Array.isArray(parsed.coordenadas)) {
      coordsArray = parsed.coordenadas.map(extractPoint);
    } else if (parsed.coordinates && Array.isArray(parsed.coordinates)) {
      coordsArray = parsed.coordinates.map(extractPoint);
    } else if (Array.isArray(parsed)) {
      if (parsed.length > 0) {
        // ¿Array de objetos/arrays? (Polígono clásico)
        if (Array.isArray(parsed[0]) || typeof parsed[0] === 'object') {
          coordsArray = parsed.map(extractPoint);
        } else if (parsed.length >= 2 && typeof parsed[0] !== 'object') {
          // Es un solo array plano: [19.05, -99.05]
          const pt = extractPoint(parsed);
          if (pt) coordsArray = [pt];
        }
      }
    } else if (typeof parsed === 'object') {
      // Es un objeto plano {lat: 19, lng: -99}
      const pt = extractPoint(parsed);
      if (pt) coordsArray = [pt];
    }

    // Filtrar objetos corruptos
    coordsArray = coordsArray.filter(c => c && typeof c.lat === 'number' && typeof c.lng === 'number' && !isNaN(c.lat) && !isNaN(c.lng));

    if (!coordsArray || coordsArray.length === 0) {
      return null;
    }

    return coordsArray;

  } catch (e) {
    return null;
  }
};







export const getUbicacionDepartamento = async (departamentoId, token) => {
  try {
    const url = `${API_URL}/departamentos/${departamentoId}`;

    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });


    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error del servidor (${response.status}): ${errorText}`);
    }

    const data = await response.json();


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








export const validarUbicacionPermitida = async (ubicacionUsuario, departamentoId, token) => {
  try {


    const departamento = await getUbicacionDepartamento(departamentoId, token);

    if (!departamento || !departamento.ubicacion) {
      return {
        dentroDelArea: false,
        departamento: null,
        error: 'Departamento sin ubicación configurada'
      };
    }


    const coordenadas = departamento.ubicacion.coordenadas;

    if (!Array.isArray(coordenadas) || coordenadas.length < 3) {
      return {
        dentroDelArea: false,
        departamento: departamento,
        error: 'Coordenadas del departamento inválidas'
      };
    }



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








export const calcularDistancia = (point1, point2) => {
  const R = 6371e3;
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






export const getCentroPoligono = (coordenadas) => {
  if (!coordenadas || coordenadas.length === 0) return null;


  const normalizedCoords = coordenadas.map((coord) => normalizarCoordenada(coord));

  const sumLat = normalizedCoords.reduce((sum, coord) => sum + coord.lat, 0);
  const sumLng = normalizedCoords.reduce((sum, coord) => sum + coord.lng, 0);

  return {
    lat: sumLat / normalizedCoords.length,
    lng: sumLng / normalizedCoords.length
  };
};






export const formatearCoordenadas = (coords) => {
  if (!coords) return 'Sin coordenadas';

  const normalized = normalizarCoordenada(coords);
  return `${normalized.lat.toFixed(6)}, ${normalized.lng.toFixed(6)}`;
};


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