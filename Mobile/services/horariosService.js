import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');







export const getHorarioPorEmpleado = async (empleadoId, token = null) => {
  try {
    const url = `${API_URL}/empleados/${empleadoId}/horario`;

    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response;
    try {
       response = await Promise.race([
         fetch(url, {
           method: 'GET',
           headers: headers,
           signal: controller.signal
         }),
         new Promise((_, reject) => {
           const timeout = setTimeout(() => reject(new Error('Timeout de 5s')), 5000);
           controller.signal.addEventListener('abort', () => clearTimeout(timeout));
         })
       ]);
    } catch (e) {
       clearTimeout(timeoutId);
       throw new Error(`Timeout de red: ${e.message}`);
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();

      if (response.status === 404) {
        throw new Error('No tienes un horario asignado');
      }

      if (response.status === 401) {
        throw new Error('No autorizado. Verifica tu sesión.');
      }

      throw new Error(`Error del servidor (${response.status}): ${errorText}`);
    }

    const responseText = await response.text();

    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      throw new Error(`Respuesta inválida del servidor`);
    }

    const horario = data.data || data;

    if (!horario.configuracion) {
      throw new Error('El horario no tiene configuración válida');
    }

    return horario;
  } catch (error) {
    throw error;
  }
};






const parsearHorarioNuevo = (configuracionSemanal) => {
  const diasMap = {
    'lunes': 'Lunes',
    'martes': 'Martes',
    'miercoles': 'Miércoles',
    'jueves': 'Jueves',
    'viernes': 'Viernes',
    'sabado': 'Sábado',
    'domingo': 'Domingo'
  };

  const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

  return diasSemana.map((dia) => {
    const turnosDelDia = configuracionSemanal[dia] || [];
    const diaActivo = turnosDelDia.length > 0;

    const turnos = turnosDelDia.map((turno) => ({
      entrada: turno.inicio,
      salida: turno.fin
    }));

    const tipo = turnos.length > 1 ? 'quebrado' : 'continuo';

    return {
      day: diasMap[dia],
      active: diaActivo,
      location: diaActivo ? 'Edificio A' : 'Día de descanso',
      time: diaActivo ? formatearHorarioTurnos(turnos) : '---',
      hours: diaActivo ? calcularHorasTurnos(turnos) : '',
      turnos: turnos,
      tipo: tipo
    };
  });
};






export const parsearHorario = (horario) => {
  try {
    if (!horario) {
      return obtenerHorarioVacio();
    }

    const configRaw = horario.configuracion || horario.config_excep;

    if (!configRaw) {
      return obtenerHorarioVacio();
    }

    let config;
    try {
      config = typeof configRaw === 'string' ?
        JSON.parse(configRaw) :
        configRaw;
    } catch (parseError) {
      return obtenerHorarioVacio();
    }

    if (config.configuracion_semanal) {
      return parsearHorarioNuevo(config.configuracion_semanal);
    }

    if (!config.dias || !Array.isArray(config.dias)) {
      return obtenerHorarioVacio();
    }

    if (!config.turnos || !Array.isArray(config.turnos)) {
      return obtenerHorarioVacio();
    }

    const diasMap = {
      'lunes': 'Lunes',
      'martes': 'Martes',
      'miercoles': 'Miércoles',
      'jueves': 'Jueves',
      'viernes': 'Viernes',
      'sabado': 'Sábado',
      'domingo': 'Domingo'
    };

    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

    return diasSemana.map((dia) => {
      const diaActivo = config.dias.includes(dia);
      const turnos = config.turnos || [];

      return {
        day: diasMap[dia],
        active: diaActivo,
        location: diaActivo ? 'Edificio A' : 'Día de descanso',
        time: diaActivo ? formatearHorarioTurnos(turnos) : '---',
        hours: diaActivo ? calcularHorasTurnos(turnos) : '',
        turnos: diaActivo ? turnos : [],
        tipo: config.tipo || 'continuo'
      };
    });
  } catch (error) {
    return obtenerHorarioVacio();
  }
};






const formatearHorarioTurnos = (turnos) => {
  if (!turnos || turnos.length === 0) return '---';

  if (turnos.length === 1) {
    return `${turnos[0].entrada} - ${turnos[0].salida}`;
  }

  return turnos.map((t) => `${t.entrada}-${t.salida}`).join(' | ');
};






const calcularHorasTurnos = (turnos) => {
  if (!turnos || turnos.length === 0) return '';

  let totalMinutos = 0;

  turnos.forEach((turno) => {
    if (!turno.entrada || !turno.salida) {
      return;
    }

    const [horaEntrada, minEntrada] = turno.entrada.split(':').map(Number);
    const [horaSalida, minSalida] = turno.salida.split(':').map(Number);

    const minutosTotalesEntrada = horaEntrada * 60 + minEntrada;
    const minutosTotalesSalida = horaSalida * 60 + minSalida;

    totalMinutos += minutosTotalesSalida - minutosTotalesEntrada;
  });

  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;

  if (minutos === 0) {
    return `${horas} horas`;
  }

  return `${horas}h ${minutos}m`;
};





const obtenerHorarioVacio = () => {
  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return dias.map((day) => ({
    day,
    active: false,
    location: 'Sin configurar',
    time: '---',
    hours: '',
    turnos: [],
    tipo: 'continuo'
  }));
};






export const calcularResumenSemanal = (horarioParsed) => {
  try {
    const diasActivos = horarioParsed.filter((d) => d.active);

    let horasTotales = 0;
    diasActivos.forEach((dia) => {
      if (!dia.turnos || dia.turnos.length === 0) return;

      dia.turnos.forEach((turno) => {
        if (!turno.entrada || !turno.salida) return;

        const [horaEntrada, minEntrada] = turno.entrada.split(':').map(Number);
        const [horaSalida, minSalida] = turno.salida.split(':').map(Number);

        const minutosTotalesEntrada = horaEntrada * 60 + minEntrada;
        const minutosTotalesSalida = horaSalida * 60 + minSalida;

        horasTotales += (minutosTotalesSalida - minutosTotalesEntrada) / 60;
      });
    });

    return {
      diasLaborales: diasActivos.length,
      totalDias: horarioParsed.length,
      horasTotales: horasTotales.toFixed(1)
    };
  } catch (error) {
    return {
      diasLaborales: 0,
      totalDias: 7,
      horasTotales: '0'
    };
  }
};






export const getInfoDiaActual = (horarioParsed) => {
  try {
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const hoy = new Date().getDay();
    const nombreDiaHoy = diasSemana[hoy];

    const diaActual = horarioParsed.find((d) => d.day === nombreDiaHoy);

    if (!diaActual || !diaActual.active) {
      return {
        trabaja: false,
        entrada: null,
        salida: null,
        turnos: []
      };
    }

    return {
      trabaja: true,
      entrada: diaActual.turnos[0]?.entrada || null,
      salida: diaActual.turnos[diaActual.turnos.length - 1]?.salida || null,
      turnos: diaActual.turnos,
      tipo: diaActual.tipo
    };
  } catch (error) {
    return {
      trabaja: false,
      entrada: null,
      salida: null,
      turnos: []
    };
  }
};





export const getHorarios = async (token) => {
  try {
    const response = await fetch(`${API_URL}/horarios`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error del servidor (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};





export const getHorarioById = async (horarioId, token) => {
  try {
    const response = await fetch(`${API_URL}/horarios/${horarioId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error del servidor (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};





export const createHorario = async (horarioData, token) => {
  try {
    const response = await fetch(`${API_URL}/horarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(horarioData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error del servidor (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};





export const updateHorario = async (horarioId, horarioData, token) => {
  try {
    const response = await fetch(`${API_URL}/horarios/${horarioId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(horarioData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error del servidor (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};





export const deleteHorario = async (horarioId, token) => {
  try {
    const response = await fetch(`${API_URL}/horarios/${horarioId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error del servidor (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};





export const reactivarHorario = async (horarioId, token) => {
  try {
    const response = await fetch(`${API_URL}/horarios/${horarioId}/reactivar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error del servidor (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};








export const asignarHorario = async (horarioId, empleadoIds, token) => {
  try {
    const response = await fetch(`${API_URL}/horarios/${horarioId}/asignar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ empleado_ids: empleadoIds })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error del servidor (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};


export default {
  getHorarioPorEmpleado,
  parsearHorario,
  calcularResumenSemanal,
  getInfoDiaActual,
  getHorarios,
  getHorarioById,
  createHorario,
  updateHorario,
  deleteHorario,
  reactivarHorario,
  asignarHorario
};