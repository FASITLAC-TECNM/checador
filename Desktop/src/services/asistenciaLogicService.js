/**
 * Servicio de lógica de asistencia compartido
 * Utilizado por PinModal y AsistenciaHuella para calcular el estado de registro
 * Siguiendo la lógica de la app móvil
 */
import { API_CONFIG, fetchApi } from "../config/apiEndPoint";

// Constantes
const MINUTOS_SEPARACION_TURNOS = 15;

// === FUNCIONES DE UTILIDAD PARA HORARIOS ===

/**
 * Obtiene el día de la semana actual en español (sin acentos)
 */
export const getDiaSemana = () => {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  return dias[new Date().getDay()];
};

/**
 * Obtiene los minutos transcurridos del día
 */
export const getMinutosDelDia = (fecha = new Date()) => {
  return fecha.getHours() * 60 + fecha.getMinutes();
};

/**
 * Convierte hora en formato "HH:MM" a minutos del día
 */
export const horaAMinutos = (hora) => {
  if (!hora || typeof hora !== 'string') return 0;
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Agrupa turnos concatenados del horario.
 * Si la diferencia entre salida de un turno y entrada del siguiente es <= 15 min,
 * se consideran parte del mismo grupo (turno continuo).
 * @param {Array} turnos - Array de objetos {entrada: "HH:MM", salida: "HH:MM"}
 * @returns {Array} - Array de grupos, donde cada grupo es un array de turnos
 */
export const agruparTurnosConcatenados = (turnos) => {
  if (!turnos || !Array.isArray(turnos) || turnos.length === 0) return [];
  if (turnos.length === 1) return [[turnos[0]]];

  // Ordenar turnos por hora de entrada
  const turnosOrdenados = [...turnos].sort((a, b) => {
    return horaAMinutos(a.entrada) - horaAMinutos(b.entrada);
  });

  const grupos = [];
  let grupoActual = [turnosOrdenados[0]];

  for (let i = 1; i < turnosOrdenados.length; i++) {
    const turnoAnterior = grupoActual[grupoActual.length - 1];
    const turnoActual = turnosOrdenados[i];

    if (!turnoAnterior?.salida || !turnoActual?.entrada) {
      continue;
    }

    const minutosSalida = horaAMinutos(turnoAnterior.salida);
    const minutosEntrada = horaAMinutos(turnoActual.entrada);
    const diferencia = minutosEntrada - minutosSalida;

    // Si la diferencia es <= 15 min, se considera el mismo grupo (turno continuo)
    if (diferencia <= MINUTOS_SEPARACION_TURNOS) {
      grupoActual.push(turnoActual);
    } else {
      grupos.push(grupoActual);
      grupoActual = [turnoActual];
    }
  }

  grupos.push(grupoActual);
  return grupos;
};

/**
 * Obtiene la hora de entrada y salida de un grupo de turnos.
 * Entrada: hora de entrada del primer turno del grupo
 * Salida: hora de salida del último turno del grupo
 * @param {Array} grupo - Array de turnos que forman un grupo
 * @returns {Object} - {entrada: "HH:MM", salida: "HH:MM"}
 */
export const getEntradaSalidaGrupo = (grupo) => {
  if (!grupo || !Array.isArray(grupo) || grupo.length === 0) {
    return { entrada: '00:00', salida: '23:59' };
  }
  return {
    entrada: grupo[0]?.entrada || '00:00',
    salida: grupo[grupo.length - 1]?.salida || '23:59'
  };
};

// === FUNCIONES DE OBTENCIÓN DE DATOS ===

/**
 * Obtiene el último registro de asistencia del día para un empleado
 */
export const obtenerUltimoRegistro = async (empleadoId) => {
  try {
    if (!empleadoId) return null;

    const response = await fetchApi(`${API_CONFIG.ENDPOINTS.ASISTENCIAS}/empleado/${empleadoId}`);

    if (!response.data?.length) return null;

    const hoy = new Date().toDateString();
    const registrosHoy = response.data.filter(registro => {
      const fechaRegistro = new Date(registro.fecha_registro);
      return fechaRegistro.toDateString() === hoy;
    });

    if (!registrosHoy.length) return null;

    // Ordenar registros por fecha descendente para obtener el más reciente
    const registrosOrdenados = registrosHoy.sort((a, b) => {
      return new Date(b.fecha_registro) - new Date(a.fecha_registro);
    });

    const ultimo = registrosOrdenados[0];

    console.log('[AsistenciaLogic] Registros de hoy:', registrosOrdenados.length);
    console.log('[AsistenciaLogic] Último registro:', ultimo.tipo, '-', new Date(ultimo.fecha_registro).toLocaleTimeString());

    return {
      tipo: ultimo.tipo,
      estado: ultimo.estado,
      fecha_registro: new Date(ultimo.fecha_registro),
      hora: new Date(ultimo.fecha_registro).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      totalRegistrosHoy: registrosOrdenados.length
    };
  } catch (err) {
    console.error('[AsistenciaLogic] Error obteniendo último registro:', err);
    return null;
  }
};

/**
 * Obtiene el horario del empleado y fusiona bloques consecutivos.
 */
export const obtenerHorario = async (empleadoId) => {
  try {
    if (!empleadoId) return null;

    const response = await fetchApi(`${API_CONFIG.ENDPOINTS.EMPLEADOS}/${empleadoId}/horario`);
    const horario = response.data || response.horario || response;

    if (!horario?.configuracion) return null;

    let config = typeof horario.configuracion === 'string'
      ? JSON.parse(horario.configuracion)
      : horario.configuracion;

    const diaHoy = getDiaSemana();
    let turnosHoy = [];

    if (config.configuracion_semanal?.[diaHoy]) {
      turnosHoy = config.configuracion_semanal[diaHoy].map(t => ({
        entrada: t.inicio,
        salida: t.fin
      }));
    } else if (config.dias?.includes(diaHoy)) {
      turnosHoy = config.turnos || [];
    }

    if (!turnosHoy || !Array.isArray(turnosHoy) || turnosHoy.length === 0) {
      return { trabaja: false, turnos: [], gruposTurnos: [], turnosOriginales: [] };
    }

    // Guardar turnos originales antes de agrupar
    const turnosOriginales = [...turnosHoy];

    // Agrupar turnos concatenados (diferencia <= 15 min = mismo grupo)
    const gruposTurnos = agruparTurnosConcatenados(turnosHoy);

    console.log('[AsistenciaLogic] Turnos originales:', turnosOriginales);
    console.log('[AsistenciaLogic] Grupos de turnos:', gruposTurnos);

    // Obtener entrada del primer grupo y salida del último grupo
    const primerGrupo = gruposTurnos[0];
    const ultimoGrupo = gruposTurnos[gruposTurnos.length - 1];
    const entradaGeneral = getEntradaSalidaGrupo(primerGrupo).entrada;
    const salidaGeneral = getEntradaSalidaGrupo(ultimoGrupo).salida;

    return {
      trabaja: true,
      turnos: turnosOriginales,
      gruposTurnos: gruposTurnos,
      turnosOriginales: turnosOriginales,
      entrada: entradaGeneral,
      salida: salidaGeneral,
      tipo: gruposTurnos.length > 1 ? 'quebrado' : 'continuo'
    };
  } catch (err) {
    console.error('[AsistenciaLogic] Error obteniendo horario:', err);
    return null;
  }
};

/**
 * Obtiene la tolerancia aplicable al empleado basándose en el rol con mayor jerarquía.
 * El rol con MENOR número tiene MAYOR jerarquía.
 */
export const obtenerTolerancia = async (usuarioId) => {
  const defaultTolerancia = {
    minutos_retardo: 10,
    minutos_falta: 30,
    permite_registro_anticipado: true,
    minutos_anticipado_max: 60,
    aplica_tolerancia_entrada: true,
    aplica_tolerancia_salida: true,
    minutos_anticipado_salida: 10
  };

  try {
    if (!usuarioId) return defaultTolerancia;

    // 1. Obtener todos los roles del usuario
    const rolesResponse = await fetchApi(`${API_CONFIG.ENDPOINTS.USUARIOS}/${usuarioId}/roles`);
    const roles = rolesResponse.data || rolesResponse || [];

    if (!roles.length) {
      console.log('[AsistenciaLogic] Usuario sin roles asignados, usando tolerancia por defecto');
      return defaultTolerancia;
    }

    // 2. Identificar el rol con menor número (mayor jerarquía)
    const rolMayorJerarquia = roles.reduce((mayor, actual) => {
      const idActual = typeof actual.rol_id === 'string' ? parseInt(actual.rol_id, 10) : actual.rol_id;
      const idMayor = typeof mayor.rol_id === 'string' ? parseInt(mayor.rol_id, 10) : mayor.rol_id;

      if (isNaN(idActual) || isNaN(idMayor)) {
        return actual.rol_id < mayor.rol_id ? actual : mayor;
      }

      return idActual < idMayor ? actual : mayor;
    });

    if (!rolMayorJerarquia?.rol_id) {
      console.log('[AsistenciaLogic] No se pudo determinar rol con mayor jerarquía');
      return defaultTolerancia;
    }

    console.log('[AsistenciaLogic] Rol con mayor jerarquía:', rolMayorJerarquia.rol_id);

    // 3. Buscar en tolerancias la que corresponda a ese rol_id
    const toleranciasResponse = await fetchApi(API_CONFIG.ENDPOINTS.TOLERANCIAS);
    const tolerancias = toleranciasResponse.data || toleranciasResponse || [];

    const toleranciaDelRol = tolerancias.find(t => t.rol_id === rolMayorJerarquia.rol_id);

    if (!toleranciaDelRol) {
      console.log('[AsistenciaLogic] No se encontró tolerancia para el rol:', rolMayorJerarquia.rol_id);
      return defaultTolerancia;
    }

    console.log('[AsistenciaLogic] Tolerancia encontrada:', toleranciaDelRol);

    // Asegurar que tenga los valores de salida
    return {
      ...defaultTolerancia,
      ...toleranciaDelRol,
      minutos_anticipado_salida: toleranciaDelRol.minutos_anticipado_salida || toleranciaDelRol.minutos_retardo || 10
    };
  } catch (err) {
    console.error('[AsistenciaLogic] Error obteniendo tolerancia:', err);
    return defaultTolerancia;
  }
};

/**
 * Obtiene el departamento activo del empleado
 */
export const obtenerDepartamentoEmpleado = async (empleadoId) => {
  try {
    if (!empleadoId) return null;

    const response = await fetchApi(`${API_CONFIG.ENDPOINTS.EMPLEADOS}/${empleadoId}/departamentos`);
    const departamentos = response.data || response;

    if (!departamentos?.length) return null;

    const departamentoActivo = departamentos.find(d => d.es_activo === true || d.es_activo === 1);

    return departamentoActivo?.departamento_id || departamentos[0]?.departamento_id || null;
  } catch (err) {
    console.error('[AsistenciaLogic] Error obteniendo departamento del empleado:', err);
    return null;
  }
};

// === FUNCIONES DE VALIDACIÓN ===

/**
 * Valida si el empleado puede registrar entrada y determina la clasificación:
 * - 'entrada': Llegada dentro de la tolerancia permitida (puntual)
 * - 'retardo': Llegada después del tiempo de retardo pero antes de falta
 * - 'falta': Llegada después del tiempo de falta pero antes del fin de turno
 */
export const validarEntrada = (horario, tolerancia, minutosActuales, grupoInicio = 0) => {
  if (!horario?.gruposTurnos || !Array.isArray(horario.gruposTurnos) || horario.gruposTurnos.length === 0) {
    return {
      puedeRegistrar: false,
      tipoRegistro: 'entrada',
      clasificacion: null,
      estadoHorario: 'fuera_horario',
      jornadaCompleta: false,
      hayTurnoFuturo: false,
      mensaje: 'No hay turnos configurados'
    };
  }

  let hayTurnoFuturo = false;
  const gruposAValidar = horario.gruposTurnos.slice(grupoInicio);

  console.log('[AsistenciaLogic] Validando entrada desde grupo:', grupoInicio, 'de', horario.gruposTurnos.length);

  for (const grupo of gruposAValidar) {
    const { entrada: horaEntrada, salida: horaSalida } = getEntradaSalidaGrupo(grupo);

    const minEntrada = horaAMinutos(horaEntrada);
    const minSalida = horaAMinutos(horaSalida);

    // Ventanas de tiempo basadas en tolerancia del sistema
    const ventanaInicio = minEntrada - (tolerancia.minutos_anticipado_max || 60);
    const ventanaRetardo = minEntrada + (tolerancia.minutos_retardo || 10);
    // La ventana de falta NO puede exceder la hora de salida del turno
    const ventanaFalta = Math.min(minEntrada + (tolerancia.minutos_falta || 30), minSalida);

    console.log('   Grupo:', horaEntrada, '-', horaSalida);
    console.log('   Ventanas: inicio=', ventanaInicio, 'retardo=', ventanaRetardo, 'falta=', ventanaFalta, 'salida=', minSalida);
    console.log('   Hora actual:', minutosActuales);

    // Si ya pasó la hora de salida de este turno, este grupo ya no es válido
    if (minutosActuales > minSalida) {
      console.log('   ⏭️ Turno ya terminó, saltando...');
      continue;
    }

    // Verificar si hay un grupo/turno futuro
    if (minutosActuales < ventanaInicio) {
      hayTurnoFuturo = true;
      console.log('   ⏳ Turno futuro detectado');
      continue;
    }

    // PUNTUAL: dentro del rango anticipado hasta retardo
    if (minutosActuales >= ventanaInicio && minutosActuales <= ventanaRetardo) {
      console.log('   ✅ Entrada puntual');
      return {
        puedeRegistrar: true,
        tipoRegistro: 'entrada',
        clasificacion: 'entrada',
        estadoHorario: 'puntual',
        jornadaCompleta: false,
        hayTurnoFuturo: false,
        grupoActual: grupo
      };
    }

    // RETARDO: después del tiempo de retardo pero antes de falta
    if (minutosActuales > ventanaRetardo && minutosActuales <= ventanaFalta) {
      console.log('   ⚠️ Entrada con retardo');
      return {
        puedeRegistrar: true,
        tipoRegistro: 'entrada',
        clasificacion: 'retardo',
        estadoHorario: 'retardo',
        jornadaCompleta: false,
        hayTurnoFuturo: false,
        grupoActual: grupo
      };
    }

    // FALTA: después del tiempo de falta pero antes de fin de turno
    if (minutosActuales > ventanaFalta && minutosActuales <= minSalida) {
      console.log('   ❌ Entrada como falta');
      return {
        puedeRegistrar: true,
        tipoRegistro: 'entrada',
        clasificacion: 'falta',
        estadoHorario: 'falta',
        jornadaCompleta: false,
        hayTurnoFuturo: false,
        grupoActual: grupo
      };
    }
  }

  return {
    puedeRegistrar: false,
    tipoRegistro: 'entrada',
    clasificacion: null,
    estadoHorario: 'fuera_horario',
    jornadaCompleta: false,
    hayTurnoFuturo: hayTurnoFuturo,
    mensaje: hayTurnoFuturo ? 'Aún no es hora de entrada' : 'Fuera de horario'
  };
};

/**
 * Valida si el empleado puede registrar salida y determina la clasificación:
 * - 'salida_puntual': Salida dentro de la ventana de salida permitida
 * - 'salida_temprana': Salida antes de la ventana (pero cumple tiempo mínimo)
 * - 'tiempo_insuficiente': No ha trabajado el tiempo mínimo requerido
 */
export const validarSalida = (horario, tolerancia, minutosActuales, ultimoRegistro = null) => {
  if (!horario?.gruposTurnos || !Array.isArray(horario.gruposTurnos) || horario.gruposTurnos.length === 0) {
    return {
      puedeRegistrar: false,
      tipoRegistro: 'salida',
      clasificacion: null,
      estadoHorario: 'fuera_horario',
      jornadaCompleta: false,
      mensaje: 'No hay turnos configurados'
    };
  }

  // Calcular el grupo actual basado en registros completados
  const totalRegistros = ultimoRegistro?.totalRegistrosHoy || 1;
  const gruposCompletados = Math.floor(totalRegistros / 2);

  const grupoActualIndex = gruposCompletados;
  const grupoActual = horario.gruposTurnos[grupoActualIndex] || horario.gruposTurnos[0];
  const { entrada: horaEntrada, salida: horaSalida } = getEntradaSalidaGrupo(grupoActual);

  const minEntrada = horaAMinutos(horaEntrada);
  const minSalida = horaAMinutos(horaSalida);
  const duracionTurno = minSalida - minEntrada;

  console.log('[AsistenciaLogic] Validando salida:');
  console.log('   - Grupo actual:', grupoActualIndex);
  console.log('   - Entrada grupo:', horaEntrada, '(', minEntrada, 'min)');
  console.log('   - Salida grupo:', horaSalida, '(', minSalida, 'min)');
  console.log('   - Hora actual:', minutosActuales, 'min');

  // Validación: Tiempo mínimo trabajado basado en TOLERANCIA
  if (ultimoRegistro && ultimoRegistro.tipo === 'entrada') {
    const ahora = new Date();
    const horaUltimoRegistro = ultimoRegistro.fecha_registro instanceof Date
      ? ultimoRegistro.fecha_registro
      : new Date(ultimoRegistro.fecha_registro);
    const diferenciaMinutos = (ahora - horaUltimoRegistro) / 1000 / 60;

    // USAR TOLERANCIA DEL SISTEMA
    const toleranciaSalidaAnticipada = tolerancia.aplica_tolerancia_salida === false
      ? 0
      : (tolerancia.minutos_anticipado_salida || tolerancia.minutos_retardo || 10);

    const tiempoMinimoRequerido = Math.max(5, duracionTurno - toleranciaSalidaAnticipada);

    console.log('   - Tiempo trabajado:', Math.round(diferenciaMinutos), 'min');
    console.log('   - Tiempo mínimo requerido:', tiempoMinimoRequerido, 'min');

    // Si no ha trabajado el tiempo mínimo, NO puede salir
    if (diferenciaMinutos < tiempoMinimoRequerido) {
      const minutosRestantes = Math.ceil(tiempoMinimoRequerido - diferenciaMinutos);
      console.log('   ❌ Tiempo insuficiente, faltan:', minutosRestantes, 'min');
      return {
        puedeRegistrar: false,
        tipoRegistro: 'salida',
        clasificacion: null,
        estadoHorario: 'tiempo_insuficiente',
        jornadaCompleta: false,
        mensajeEspera: `Espera ${minutosRestantes} min más`,
        minutosRestantes: minutosRestantes
      };
    }
  }

  // Validación de ventana de salida
  const toleranciaSalida = tolerancia?.aplica_tolerancia_salida === false
    ? 0
    : (tolerancia?.minutos_anticipado_salida || tolerancia?.minutos_retardo || 10);

  const ventanaSalidaInicio = minSalida - toleranciaSalida;
  const ventanaSalidaFin = minSalida + 60; // 60 min después de hora de salida (más permisivo)

  console.log('   - Ventana salida:', ventanaSalidaInicio, '-', ventanaSalidaFin, 'min');

  // Salida puntual: dentro de la ventana de salida
  if (minutosActuales >= ventanaSalidaInicio && minutosActuales <= ventanaSalidaFin) {
    console.log('   ✅ Salida puntual');
    return {
      puedeRegistrar: true,
      tipoRegistro: 'salida',
      clasificacion: 'salida_puntual',
      estadoHorario: 'puntual',
      jornadaCompleta: false,
      grupoActual: grupoActual
    };
  }

  // Salida tardía: después de la ventana de fin pero en el mismo día
  if (minutosActuales > ventanaSalidaFin) {
    console.log('   ✅ Salida tardía (permitida)');
    return {
      puedeRegistrar: true,
      tipoRegistro: 'salida',
      clasificacion: 'salida_puntual', // Se considera puntual aunque sea tarde
      estadoHorario: 'puntual',
      jornadaCompleta: false,
      grupoActual: grupoActual
    };
  }

  // Salida temprana: antes de la ventana pero después de la entrada
  if (minutosActuales >= minEntrada && minutosActuales < ventanaSalidaInicio) {
    console.log('   ⚠️ Salida temprana');
    return {
      puedeRegistrar: true,
      tipoRegistro: 'salida',
      clasificacion: 'salida_temprana',
      estadoHorario: 'temprana',
      jornadaCompleta: false,
      grupoActual: grupoActual
    };
  }

  console.log('   ❌ Fuera de horario');
  return {
    puedeRegistrar: false,
    tipoRegistro: 'salida',
    clasificacion: null,
    estadoHorario: 'fuera_horario',
    jornadaCompleta: false
  };
};

/**
 * Calcula el estado actual del registro basándose en:
 * - Último registro del día (si existe)
 * - Horario con grupos de turnos concatenados
 * - Tolerancia según rol de mayor jerarquía
 */
export const calcularEstadoRegistro = (ultimo, horario, tolerancia) => {
  if (!horario?.trabaja) {
    console.log('[AsistenciaLogic] No trabaja hoy');
    return {
      puedeRegistrar: false,
      tipoRegistro: 'entrada',
      clasificacion: null,
      estadoHorario: 'fuera_horario',
      jornadaCompleta: false,
      mensaje: 'No tienes horario configurado para hoy'
    };
  }

  if (!horario?.gruposTurnos || !Array.isArray(horario.gruposTurnos) || horario.gruposTurnos.length === 0) {
    console.log('[AsistenciaLogic] No hay grupos de turnos');
    return {
      puedeRegistrar: false,
      tipoRegistro: 'entrada',
      clasificacion: null,
      estadoHorario: 'fuera_horario',
      jornadaCompleta: false,
      mensaje: 'No hay turnos configurados'
    };
  }

  const ahora = getMinutosDelDia();
  const totalGrupos = horario.gruposTurnos.length;

  console.log('[AsistenciaLogic] Estado actual:');
  console.log('   - Hora actual (minutos):', ahora);
  console.log('   - Total grupos:', totalGrupos);
  console.log('   - Último registro:', ultimo ? `${ultimo.tipo} - ${ultimo.hora}` : 'ninguno');

  // Si no hay registro previo hoy, debe registrar entrada
  if (!ultimo) {
    console.log('[AsistenciaLogic] Sin registros hoy, validando entrada desde grupo 0');
    return validarEntrada(horario, tolerancia, ahora, 0);
  }

  const registrosHoy = ultimo.totalRegistrosHoy || 1;
  const gruposCompletados = Math.floor(registrosHoy / 2);

  console.log('   - Registros hoy:', registrosHoy);
  console.log('   - Grupos completados:', gruposCompletados);

  // Si última fue ENTRADA → debe registrar SALIDA
  if (ultimo.tipo === 'entrada') {
    console.log('[AsistenciaLogic] Último fue entrada, validando salida');
    return validarSalida(horario, tolerancia, ahora, ultimo);
  }

  // Si última fue SALIDA → debe registrar ENTRADA del siguiente grupo
  if (ultimo.tipo === 'salida') {
    console.log('[AsistenciaLogic] Último fue salida, verificando si hay más grupos');

    // Verificar si completó todos los grupos de turnos
    if (gruposCompletados >= totalGrupos) {
      console.log('[AsistenciaLogic] Todos los grupos completados (', gruposCompletados, '>=', totalGrupos, ')');

      const resultadoEntrada = validarEntrada(horario, tolerancia, ahora, 0);

      // Si estamos dentro de alguna ventana de entrada válida, permitir
      if (resultadoEntrada.puedeRegistrar) {
        console.log('[AsistenciaLogic] Aún hay ventana de entrada disponible, permitiendo registro');
        return resultadoEntrada;
      }

      // Si no hay turno futuro y no puede registrar, jornada completa
      if (!resultadoEntrada.hayTurnoFuturo) {
        console.log('[AsistenciaLogic] Jornada realmente completada');
        return {
          puedeRegistrar: false,
          tipoRegistro: 'entrada',
          clasificacion: null,
          estadoHorario: 'completado',
          jornadaCompleta: true,
          mensaje: 'Jornada completada por hoy'
        };
      }

      console.log('[AsistenciaLogic] Hay turno futuro, esperando...');
      return resultadoEntrada;
    }

    // Aún hay grupos pendientes
    console.log('[AsistenciaLogic] Validando entrada para grupo', gruposCompletados);
    return validarEntrada(horario, tolerancia, ahora, gruposCompletados);
  }

  return validarEntrada(horario, tolerancia, ahora, 0);
};

/**
 * Carga todos los datos necesarios para calcular el estado del registro
 * @param {string|number} empleadoId - ID del empleado
 * @param {string|number} usuarioId - ID del usuario
 * @returns {Object} - { ultimo, horario, tolerancia, estado }
 */
export const cargarDatosAsistencia = async (empleadoId, usuarioId) => {
  try {
    const [ultimo, horario, tolerancia] = await Promise.all([
      obtenerUltimoRegistro(empleadoId),
      obtenerHorario(empleadoId),
      obtenerTolerancia(usuarioId)
    ]);

    let estado = null;
    if (horario && tolerancia) {
      estado = calcularEstadoRegistro(ultimo, horario, tolerancia);
    }

    return {
      ultimo,
      horario,
      tolerancia,
      estado
    };
  } catch (err) {
    console.error('[AsistenciaLogic] Error cargando datos de asistencia:', err);
    return {
      ultimo: null,
      horario: null,
      tolerancia: null,
      estado: null
    };
  }
};

/**
 * Registra la asistencia en el servidor
 * @param {Object} params - Parámetros del registro
 * @returns {Object} - Resultado del registro
 */
export const registrarAsistenciaEnServidor = async ({
  empleadoId,
  departamentoId,
  tipoRegistro,
  clasificacion,
  estadoHorario,
  metodoRegistro = 'PIN',
  token
}) => {
  const payload = {
    empleado_id: empleadoId,
    dispositivo_origen: 'escritorio',
    metodo_registro: metodoRegistro,
    departamento_id: departamentoId,
    ubicacion: null, // Siempre null para escritorio
    tipo: tipoRegistro || 'entrada',
    clasificacion: clasificacion || 'entrada',
    estado: estadoHorario || 'puntual'
  };

  console.log('[AsistenciaLogic] Enviando registro:', payload);

  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ASISTENCIAS}/registrar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || localStorage.getItem('auth_token') || ''}`,
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  let data;

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (parseError) {
    throw new Error('Error del servidor: respuesta inválida');
  }

  if (!response.ok) {
    const errorMsg = data.message || data.error || `Error del servidor (${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
};

/**
 * Obtiene el texto y emoji según la clasificación
 */
export const obtenerInfoClasificacion = (clasificacion, tipoRegistro) => {
  let estadoTexto = '';
  let emoji = '✅';
  let tipoEvento = 'success';

  switch (clasificacion) {
    case 'entrada':
      estadoTexto = 'puntual';
      emoji = '✅';
      break;
    case 'retardo':
      estadoTexto = 'con retardo';
      emoji = '⚠️';
      tipoEvento = 'warning';
      break;
    case 'falta':
      estadoTexto = 'fuera de tolerancia (falta)';
      emoji = '❌';
      tipoEvento = 'warning';
      break;
    case 'salida_puntual':
      estadoTexto = 'salida puntual';
      emoji = '✅';
      break;
    case 'salida_temprana':
      estadoTexto = 'salida anticipada';
      emoji = '⚠️';
      tipoEvento = 'warning';
      break;
    default:
      estadoTexto = tipoRegistro === 'salida' ? 'salida registrada' : 'entrada registrada';
      emoji = '✅';
  }

  return { estadoTexto, emoji, tipoEvento };
};

export default {
  getDiaSemana,
  getMinutosDelDia,
  horaAMinutos,
  agruparTurnosConcatenados,
  getEntradaSalidaGrupo,
  obtenerUltimoRegistro,
  obtenerHorario,
  obtenerTolerancia,
  obtenerDepartamentoEmpleado,
  validarEntrada,
  validarSalida,
  calcularEstadoRegistro,
  cargarDatosAsistencia,
  registrarAsistenciaEnServidor,
  obtenerInfoClasificacion
};
