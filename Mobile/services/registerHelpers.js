import { getApiEndpoint } from '../config/api';
const API_URL = getApiEndpoint('/api');

export const obtenerHorarioSimplificado = async (empleadoId, token) => {
  try {
    const response = await fetch(
      `${API_URL}/empleados/${empleadoId}/horario`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    if (!response.ok) return { trabaja: false, turnos: [] };
    const data = await response.json();
    const horario = data.data || data.horario || data;
    if (!horario?.configuracion) return { trabaja: false, turnos: [] };
    let config = typeof horario.configuracion === 'string' ?
      JSON.parse(horario.configuracion) :
      horario.configuracion;
    const diaHoy = getDiaSemana();
    let turnosHoy = [];
    if (config.configuracion_semanal?.[diaHoy]) {
      turnosHoy = config.configuracion_semanal[diaHoy].map((t) => ({
        entrada: t.inicio,
        salida: t.fin
      }));
    } else if (config.dias?.includes(diaHoy)) {
      turnosHoy = config.turnos || [];
    }
    if (!turnosHoy || turnosHoy.length === 0) {
      return { trabaja: false, turnos: [] };
    }
    return {
      trabaja: true,
      turnos: turnosHoy,
      entrada: turnosHoy[0]?.entrada || null,
      salida: turnosHoy[turnosHoy.length - 1]?.salida || null
    };
  } catch (err) {
    return { trabaja: false, turnos: [] };
  }
};

const DEFAULT_TOLERANCIA = {
  permite_registro_anticipado: true,
  minutos_anticipado_max: 60,
  aplica_tolerancia_entrada: true,
  aplica_tolerancia_salida: false,
  reglas: [
    { id: 'retardo_a', limite_minutos: 20, penalizacion_tipo: 'acumulacion', penalizacion_valor: 3 },
    { id: 'retardo_b', limite_minutos: 29, penalizacion_tipo: 'acumulacion', penalizacion_valor: 2 },
    { id: 'falta_por_retardo', limite_minutos: 60, penalizacion_tipo: 'directa', penalizacion_valor: 1 }]

};

export const obtenerTolerancia = async (token) => {
  try {
    const response = await fetch(`${API_URL}/tolerancias`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) return { ...DEFAULT_TOLERANCIA };
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      const t = data.data[0];
      if (typeof t.reglas === 'string') {
        try { t.reglas = JSON.parse(t.reglas); } catch { t.reglas = DEFAULT_TOLERANCIA.reglas; }
      }
      if (!Array.isArray(t.reglas) || t.reglas.length === 0) {
        t.reglas = DEFAULT_TOLERANCIA.reglas;
      }
      if (typeof t.dias_aplica === 'string') {
        try { t.dias_aplica = JSON.parse(t.dias_aplica); } catch { t.dias_aplica = {}; }
      }
      return { ...DEFAULT_TOLERANCIA, ...t };
    }
    return { ...DEFAULT_TOLERANCIA };
  } catch (err) {
    return { ...DEFAULT_TOLERANCIA };
  }
};

export const obtenerUltimoRegistro = async (empleadoId, token) => {
  try {
    const response = await fetch(
      `${API_URL}/asistencias/empleado/${empleadoId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.data?.length) return null;
    const hoy = new Date().toDateString();
    const registrosHoy = data.data.filter((registro) => {
      const fechaRegistro = new Date(registro.fecha_registro);
      return fechaRegistro.toDateString() === hoy;
    });
    if (!registrosHoy.length) return null;
    const ultimo = registrosHoy[0];
    return {
      tipo: ultimo.tipo,
      estado: ultimo.estado,
      fecha_registro: new Date(ultimo.fecha_registro),
      hora: new Date(ultimo.fecha_registro).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      totalRegistrosHoy: registrosHoy.length
    };
  } catch (err) {
    return null;
  }
};

export const calcularEstadoEntrada = (minutosActuales, minEntrada, tolerancia) => {
  const tol = { ...DEFAULT_TOLERANCIA, ...tolerancia };
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const diaHoy = dias[new Date().getDay()];
  const aplicaHoy = tol.dias_aplica?.[diaHoy] !== false;
  const llegadaTarde = minutosActuales - minEntrada;
  if (llegadaTarde <= 0) return 'puntual';
  if (!aplicaHoy) return 'falta';
  const reglas = Array.isArray(tol.reglas) ? [...tol.reglas].sort((a, b) => a.limite_minutos - b.limite_minutos) : [];
  for (const r of reglas) {
    if (llegadaTarde <= r.limite_minutos) {
      return r.id;
    }
  }
  return 'falta';
};

export const validarRegistroCliente = (horario, ultimoRegistro, tolerancia) => {
  const ahora = new Date();
  const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
  const tol = { ...DEFAULT_TOLERANCIA, ...tolerancia };
  if (!horario || !horario.trabaja) {
    return {
      puedeRegistrar: false,
      mensaje: 'No tienes turnos asignados hoy',
      tipoSiguiente: 'entrada'
    };
  }
  const esEntrada = !ultimoRegistro || ultimoRegistro.tipo === 'salida';
  const tipoSiguiente = esEntrada ? 'entrada' : 'salida';
  if (esEntrada && horario.entrada) {
    const [hE, mE] = horario.entrada.split(':').map(Number);
    const minEntrada = hE * 60 + mE;
    const ventanaInicio = minEntrada - (tol.minutos_anticipado_max || 60);
    const ventanaFin = minEntrada + (tol.minutos_falta || 30);
    if (minutosActuales < ventanaInicio) {
      return {
        puedeRegistrar: false,
        mensaje: 'Aún no es hora de entrada',
        tipoSiguiente
      };
    }
    if (minutosActuales > ventanaFin) {
      return {
        puedeRegistrar: true,
        mensaje: 'Fuera de tolerancia (se registrará como falta)',
        tipoSiguiente
      };
    }
    const estado = calcularEstadoEntrada(minutosActuales, minEntrada, tol);
    const mensajes = {
      puntual: 'Puedes registrar tu entrada',
      retardo_a: `Registro con retardo menor (retardo A)`,
      retardo_b: `Registro con retardo mayor (retardo B)`,
      falta_por_retardo: 'Registro tardío (se contará como falta por retardo)',
      falta: 'Fuera de tolerancia (se registrará como falta)'
    };
    return {
      puedeRegistrar: true,
      mensaje: mensajes[estado] || 'Puedes registrar tu entrada',
      estado,
      tipoSiguiente
    };
  }
  if (!esEntrada && ultimoRegistro && horario.salida) {
    const horaUltimoRegistro = new Date(ultimoRegistro.fecha_registro);
    const diferenciaMinutos = (ahora - horaUltimoRegistro) / 1000 / 60;
    if (diferenciaMinutos < 30) {
      return {
        puedeRegistrar: false,
        mensaje: 'Espera al menos 30 minutos desde tu entrada',
        tipoSiguiente
      };
    }
    return {
      puedeRegistrar: true,
      mensaje: 'Puedes registrar tu salida',
      tipoSiguiente
    };
  }
  return {
    puedeRegistrar: true,
    mensaje: 'Puedes registrar',
    tipoSiguiente
  };
};

function getDiaSemana() {
  const diasSemana = [
    'domingo', 'lunes', 'martes', 'miercoles',
    'jueves', 'viernes', 'sabado'];

  return diasSemana[new Date().getDay()];
}

export default {
  obtenerHorarioSimplificado,
  obtenerTolerancia,
  obtenerUltimoRegistro,
  validarRegistroCliente,
  calcularEstadoEntrada,
  DEFAULT_TOLERANCIA
};