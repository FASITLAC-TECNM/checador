


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
      parsed = JSON.parse(ubicacion);
    }



    let coordenadas = null;


    if (parsed.zonas && Array.isArray(parsed.zonas) && parsed.zonas.length > 0) {


      const primeraZona = parsed.zonas[0];

      if (primeraZona.coordinates && Array.isArray(primeraZona.coordinates)) {
        coordenadas = primeraZona.coordinates;
      }
    } else

    if (parsed.coordenadas && Array.isArray(parsed.coordenadas)) {
      coordenadas = parsed.coordenadas;
    } else

    if (parsed.coordinates && Array.isArray(parsed.coordinates)) {
      coordenadas = parsed.coordinates;
    } else

    if (Array.isArray(parsed)) {


      if (parsed.length > 0 && parsed[0].coordinates && Array.isArray(parsed[0].coordinates)) {
        coordenadas = parsed[0].coordinates;
      } else

      if (parsed.length > 0 && (Array.isArray(parsed[0]) || parsed[0].lat !== undefined)) {
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
  extraerCoordenadas };


export default {
  isPointInPolygon,
  getUbicacionDepartamento,
  validarUbicacionPermitida,
  calcularDistancia,
  getCentroPoligono,
  formatearCoordenadas,
  extraerCoordenadas
};