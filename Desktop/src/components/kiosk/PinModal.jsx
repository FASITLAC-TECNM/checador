import { User, Lock, Eye, EyeOff, X, Clock, CheckCircle, XCircle, Loader2, Timer, AlertTriangle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { API_CONFIG, fetchApi } from "../../config/apiEndPoint";
import { agregarEvento } from "../../services/bitacoraService";

export default function PinModal({ onClose, onSuccess }) {
  const [showPassword, setShowPassword] = useState(false);
  const [usuarioOCorreo, setUsuarioOCorreo] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [countdown, setCountdown] = useState(6);
  const [errorMessage, setErrorMessage] = useState("");

  // Estados para lógica de asistencia
  const [horarioInfo, setHorarioInfo] = useState(null);
  const [toleranciaInfo, setToleranciaInfo] = useState(null);
  const [ultimoRegistroHoy, setUltimoRegistroHoy] = useState(null);

  // === FUNCIONES DE UTILIDAD PARA HORARIOS ===

  const getDiaSemana = () => {
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return dias[new Date().getDay()];
  };

  const getMinutosDelDia = (fecha = new Date()) => {
    return fecha.getHours() * 60 + fecha.getMinutes();
  };

  /**
   * Convierte hora en formato "HH:MM" a minutos del día
   */
  const horaAMinutos = (hora) => {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  };

  /**
   * Fusiona bloques consecutivos del horario.
   * Si el fin de un bloque coincide con el inicio del siguiente, se fusionan.
   * @param {Array} bloques - Array de objetos {entrada: "HH:MM", salida: "HH:MM"}
   * @returns {Array} - Array de bloques fusionados
   */
  const fusionarBloquesConsecutivos = (bloques) => {
    if (!bloques || bloques.length === 0) return [];
    if (bloques.length === 1) return bloques;

    // Ordenar bloques por hora de entrada
    const bloquesOrdenados = [...bloques].sort((a, b) => {
      return horaAMinutos(a.entrada) - horaAMinutos(b.entrada);
    });

    const bloquesFusionados = [];
    let bloqueActual = { ...bloquesOrdenados[0] };

    for (let i = 1; i < bloquesOrdenados.length; i++) {
      const bloqueSiguiente = bloquesOrdenados[i];

      // Verificar si son consecutivos (fin del actual = inicio del siguiente)
      if (bloqueActual.salida === bloqueSiguiente.entrada) {
        // Fusionar: mantener entrada del actual, actualizar salida al del siguiente
        bloqueActual.salida = bloqueSiguiente.salida;
      } else {
        // No son consecutivos, guardar el actual y empezar uno nuevo
        bloquesFusionados.push(bloqueActual);
        bloqueActual = { ...bloqueSiguiente };
      }
    }

    // Agregar el último bloque
    bloquesFusionados.push(bloqueActual);

    return bloquesFusionados;
  };

  // === FUNCIONES DE OBTENCIÓN DE DATOS ===

  const obtenerUltimoRegistro = useCallback(async (empleadoId) => {
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
      console.error('Error obteniendo último registro:', err);
      return null;
    }
  }, []);

  /**
   * Obtiene el horario del empleado y fusiona bloques consecutivos.
   * Después de fusionar, solo se requiere una entrada al inicio del primer bloque
   * y una salida al fin del último bloque fusionado.
   */
  const obtenerHorario = useCallback(async (empleadoId) => {
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

      if (!turnosHoy.length) {
        return { trabaja: false, turnos: [], turnosOriginales: [] };
      }

      // Guardar turnos originales antes de fusionar (para referencia)
      const turnosOriginales = [...turnosHoy];

      // Fusionar bloques consecutivos
      const turnosFusionados = fusionarBloquesConsecutivos(turnosHoy);

      console.log('Turnos originales:', turnosOriginales);
      console.log('Turnos fusionados:', turnosFusionados);

      return {
        trabaja: true,
        turnos: turnosFusionados, // Usamos los turnos fusionados
        turnosOriginales: turnosOriginales, // Guardamos los originales por referencia
        entrada: turnosFusionados[0].entrada,
        salida: turnosFusionados[turnosFusionados.length - 1].salida,
        tipo: turnosFusionados.length > 1 ? 'quebrado' : 'continuo'
      };
    } catch (err) {
      console.error('Error obteniendo horario:', err);
      return null;
    }
  }, []);

  /**
   * Obtiene la tolerancia aplicable al empleado basándose en el rol con mayor jerarquía.
   * El rol con MENOR número tiene MAYOR jerarquía.
   * Busca en la tabla tolerancias la que corresponda a ese rol_id.
   */
  const obtenerTolerancia = useCallback(async (usuarioId) => {
    const defaultTolerancia = {
      minutos_retardo: 10,
      minutos_falta: 30,
      permite_registro_anticipado: true,
      minutos_anticipado_max: 60,
      aplica_tolerancia_entrada: true,
      aplica_tolerancia_salida: true
    };

    try {
      if (!usuarioId) return defaultTolerancia;

      // 1. Obtener todos los roles del usuario
      const rolesResponse = await fetchApi(`${API_CONFIG.ENDPOINTS.USUARIOS}/${usuarioId}/roles`);
      const roles = rolesResponse.data || rolesResponse || [];

      if (!roles.length) {
        console.log('Usuario sin roles asignados, usando tolerancia por defecto');
        return defaultTolerancia;
      }

      // 2. Identificar el rol con menor número (mayor jerarquía)
      // Convertimos el rol_id a número para comparar correctamente
      const rolMayorJerarquia = roles.reduce((mayor, actual) => {
        const idActual = typeof actual.rol_id === 'string' ? parseInt(actual.rol_id, 10) : actual.rol_id;
        const idMayor = typeof mayor.rol_id === 'string' ? parseInt(mayor.rol_id, 10) : mayor.rol_id;

        // Si el ID es alfanumérico, comparamos como string
        if (isNaN(idActual) || isNaN(idMayor)) {
          return actual.rol_id < mayor.rol_id ? actual : mayor;
        }

        return idActual < idMayor ? actual : mayor;
      });

      if (!rolMayorJerarquia?.rol_id) {
        console.log('No se pudo determinar rol con mayor jerarquía');
        return defaultTolerancia;
      }

      console.log('Rol con mayor jerarquía:', rolMayorJerarquia.rol_id);

      // 3. Buscar en tolerancias la que corresponda a ese rol_id
      const toleranciasResponse = await fetchApi(API_CONFIG.ENDPOINTS.TOLERANCIAS);
      const tolerancias = toleranciasResponse.data || toleranciasResponse || [];

      // Buscar tolerancia que tenga el rol_id correspondiente
      const toleranciaDelRol = tolerancias.find(t => t.rol_id === rolMayorJerarquia.rol_id);

      if (!toleranciaDelRol) {
        console.log('No se encontró tolerancia para el rol:', rolMayorJerarquia.rol_id);
        return defaultTolerancia;
      }

      console.log('Tolerancia encontrada:', toleranciaDelRol);

      return {
        ...defaultTolerancia,
        ...toleranciaDelRol
      };
    } catch (err) {
      console.error('Error obteniendo tolerancia:', err);
      return defaultTolerancia;
    }
  }, []);

  const obtenerDepartamentoEmpleado = useCallback(async (empleadoId) => {
    try {
      if (!empleadoId) return null;

      const response = await fetchApi(`${API_CONFIG.ENDPOINTS.EMPLEADOS}/${empleadoId}/departamentos`);
      const departamentos = response.data || response;

      if (!departamentos?.length) return null;

      const departamentoActivo = departamentos.find(d => d.es_activo === true || d.es_activo === 1);

      return departamentoActivo?.departamento_id || departamentos[0]?.departamento_id || null;
    } catch (err) {
      console.error('Error obteniendo departamento del empleado:', err);
      return null;
    }
  }, []);

  // === FUNCIONES DE VALIDACIÓN ===

  /**
   * Valida si el empleado puede registrar entrada y determina la clasificación:
   * - 'entrada': Llegada dentro de la tolerancia permitida
   * - 'retardo': Llegada después del tiempo máximo de tolerancia de entrada
   * - 'falta': No registra entrada dentro del tiempo límite definido por minutos_falta
   */
  const validarEntrada = (horario, tolerancia, minutosActuales) => {
    let hayTurnoFuturo = false;
    const aplicaToleranciaEntrada = tolerancia.aplica_tolerancia_entrada !== false;

    for (const turno of horario.turnos) {
      const minEntrada = horaAMinutos(turno.entrada);
      const minSalida = horaAMinutos(turno.salida);

      // Calcular ventanas de tiempo
      const ventanaAnticipada = minEntrada - (tolerancia.minutos_anticipado_max || 60);
      const ventanaRetardo = minEntrada + (aplicaToleranciaEntrada ? tolerancia.minutos_retardo : 0);
      const ventanaFalta = minEntrada + tolerancia.minutos_falta;

      // Verificar si hay un turno futuro
      if (minutosActuales < ventanaAnticipada) {
        hayTurnoFuturo = true;
        continue;
      }

      // Caso 1: Llegada puntual (dentro de tolerancia de entrada)
      // Desde registro anticipado hasta fin de tolerancia de retardo
      if (minutosActuales >= ventanaAnticipada && minutosActuales <= ventanaRetardo) {
        return {
          puedeRegistrar: true,
          tipoRegistro: 'entrada',
          clasificacion: 'entrada', // Clasificación según requisitos
          estadoHorario: 'puntual',
          jornadaCompleta: false,
          turnoActual: turno
        };
      }

      // Caso 2: Retardo (después de tolerancia pero antes de falta)
      if (minutosActuales > ventanaRetardo && minutosActuales <= ventanaFalta) {
        return {
          puedeRegistrar: true,
          tipoRegistro: 'entrada',
          clasificacion: 'retardo', // Clasificación según requisitos
          estadoHorario: 'retardo',
          jornadaCompleta: false,
          turnoActual: turno
        };
      }

      // Caso 3: Falta (después del límite de falta pero aún en horario de trabajo)
      if (minutosActuales > ventanaFalta && minutosActuales <= minSalida) {
        return {
          puedeRegistrar: true,
          tipoRegistro: 'entrada',
          clasificacion: 'falta', // Clasificación según requisitos
          estadoHorario: 'falta',
          jornadaCompleta: false,
          turnoActual: turno
        };
      }
    }

    return {
      puedeRegistrar: false,
      tipoRegistro: 'entrada',
      clasificacion: null,
      estadoHorario: 'fuera_horario',
      jornadaCompleta: false,
      hayTurnoFuturo: hayTurnoFuturo
    };
  };

  /**
   * Valida si el empleado puede registrar salida y determina la clasificación:
   * - 'salida_puntual': Salida dentro de la tolerancia de salida permitida
   * - 'salida_temprana': Salida antes del horario (fuera de la tolerancia permitida)
   */
  const validarSalida = (horario, tolerancia, minutosActuales) => {
    const aplicaToleranciaSalida = tolerancia.aplica_tolerancia_salida !== false;

    for (const turno of horario.turnos) {
      const minEntrada = horaAMinutos(turno.entrada);
      const minSalida = horaAMinutos(turno.salida);

      // Verificar que estamos dentro del rango del turno (después de entrada)
      if (minutosActuales < minEntrada) {
        continue;
      }

      // Calcular ventanas de salida
      // Tolerancia de salida: se puede salir X minutos antes sin penalización
      const toleranciaSalidaMinutos = aplicaToleranciaSalida ? (tolerancia.minutos_retardo || 10) : 0;
      const ventanaSalidaPuntualInicio = minSalida - toleranciaSalidaMinutos;
      const ventanaSalidaFin = minSalida + 30; // Margen después de hora de salida

      // Caso 1: Salida puntual (dentro de la tolerancia de salida)
      if (minutosActuales >= ventanaSalidaPuntualInicio && minutosActuales <= ventanaSalidaFin) {
        return {
          puedeRegistrar: true,
          tipoRegistro: 'salida',
          clasificacion: 'salida_puntual', // Clasificación según requisitos
          estadoHorario: 'puntual',
          jornadaCompleta: false,
          turnoActual: turno
        };
      }

      // Caso 2: Salida temprana (antes de la tolerancia de salida)
      if (minutosActuales >= minEntrada && minutosActuales < ventanaSalidaPuntualInicio) {
        return {
          puedeRegistrar: true,
          tipoRegistro: 'salida',
          clasificacion: 'salida_temprana', // Clasificación según requisitos
          estadoHorario: 'temprana',
          jornadaCompleta: false,
          turnoActual: turno
        };
      }
    }

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
   * - Horario con bloques fusionados
   * - Tolerancia según rol de mayor jerarquía
   */
  const calcularEstadoRegistro = useCallback((ultimo, horario, tolerancia) => {
    if (!horario?.trabaja) {
      return {
        puedeRegistrar: false,
        tipoRegistro: 'entrada',
        clasificacion: null,
        estadoHorario: 'fuera_horario',
        jornadaCompleta: false
      };
    }

    const ahora = getMinutosDelDia();
    const totalTurnos = horario.turnos.length;

    // Si no hay registros hoy, debe registrar entrada
    if (!ultimo) {
      return validarEntrada(horario, tolerancia, ahora);
    }

    const registrosHoy = ultimo.totalRegistrosHoy || 1;
    const turnosCompletados = Math.floor(registrosHoy / 2);

    // Si el último registro fue entrada, debe registrar salida
    if (ultimo.tipo === 'entrada') {
      return validarSalida(horario, tolerancia, ahora);
    }

    // Si el último registro fue salida
    if (ultimo.tipo === 'salida') {
      // Verificar si ya completó todos los turnos (bloques fusionados)
      if (turnosCompletados >= totalTurnos) {
        const resultadoEntrada = validarEntrada(horario, tolerancia, ahora);

        if (!resultadoEntrada.hayTurnoFuturo) {
          return {
            puedeRegistrar: false,
            tipoRegistro: 'entrada',
            clasificacion: null,
            estadoHorario: 'completado',
            jornadaCompleta: true
          };
        }

        return resultadoEntrada;
      }

      // Aún hay turnos pendientes, verificar si puede registrar entrada
      return validarEntrada(horario, tolerancia, ahora);
    }

    return validarEntrada(horario, tolerancia, ahora);
  }, []);

  const cargarDatosHorario = useCallback(async (empleadoId, usuarioId) => {
    try {
      const [ultimo, horario, tolerancia] = await Promise.all([
        obtenerUltimoRegistro(empleadoId),
        obtenerHorario(empleadoId),
        obtenerTolerancia(usuarioId)
      ]);

      setUltimoRegistroHoy(ultimo);
      setHorarioInfo(horario);
      setToleranciaInfo(tolerancia);

      if (horario && tolerancia) {
        const estado = calcularEstadoRegistro(ultimo, horario, tolerancia);
        return estado;
      }

      return null;
    } catch (err) {
      console.error('Error cargando datos de horario:', err);
      return null;
    }
  }, [obtenerUltimoRegistro, obtenerHorario, obtenerTolerancia, calcularEstadoRegistro]);

  // === VERIFICAR PIN Y REGISTRAR ASISTENCIA ===

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!usuarioOCorreo.trim() || !pin.trim()) {
      setErrorMessage("Por favor ingresa tu usuario/correo y PIN");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      console.log("🔐 Verificando credenciales...");

      // 1. Verificar credenciales con el endpoint de login
      const loginResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario: usuarioOCorreo.trim(),
          contraseña: pin.trim(),
        }),
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json().catch(() => ({}));
        throw new Error(errorData.message || "Credenciales inválidas");
      }

      const loginData = await loginResponse.json();

      if (!loginData.success) {
        throw new Error(loginData.message || "Error en la autenticación");
      }

      console.log("✅ Credenciales verificadas");

      const responseData = loginData.data || loginData;
      const usuarioData = responseData.usuario || responseData;
      const token = responseData.token;

      // Guardar token temporalmente para las peticiones
      if (token) {
        localStorage.setItem('auth_token', token);
      }

      // 2. Obtener datos del empleado
      let empleadoId = usuarioData.empleado_id;
      let empleadoData = null;

      if (!empleadoId && usuarioData.es_empleado) {
        // Buscar el empleado por usuario_id
        const empleadosResponse = await fetchApi(API_CONFIG.ENDPOINTS.EMPLEADOS);
        const empleados = empleadosResponse.data || empleadosResponse;
        empleadoData = empleados.find(emp => emp.usuario_id === usuarioData.id);
        empleadoId = empleadoData?.id;
      }

      if (!empleadoId) {
        throw new Error("No se encontró información del empleado");
      }

      // Obtener datos completos del empleado si no los tenemos
      if (!empleadoData) {
        const empResponse = await fetchApi(`${API_CONFIG.ENDPOINTS.EMPLEADOS}/${empleadoId}`);
        empleadoData = empResponse.data || empResponse;
      }

      console.log("👤 Empleado identificado:", empleadoData?.nombre || empleadoId);

      // 3. Verificar horario
      console.log("📅 Verificando horario...");
      const estadoActual = await cargarDatosHorario(empleadoId, usuarioData.id);

      const now = new Date();
      const horaActual = now.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Verificar si puede registrar
      if (estadoActual && !estadoActual.puedeRegistrar) {
        let mensaje = "No puedes registrar en este momento";
        if (estadoActual.jornadaCompleta) {
          mensaje = "Ya completaste tu jornada de hoy";
        } else if (estadoActual.estadoHorario === 'fuera_horario') {
          mensaje = "Estás fuera del horario de registro";
        }

        agregarEvento({
          user: empleadoData?.nombre || usuarioOCorreo,
          action: `Intento de registro - ${mensaje}`,
          type: "warning",
        });

        setResult({
          success: false,
          message: mensaje,
          empleado: empleadoData,
          estadoHorario: estadoActual?.estadoHorario,
          noPuedeRegistrar: true,
        });

        return;
      }

      // 4. Obtener departamento y registrar asistencia
      console.log("📝 Registrando asistencia...");
      const departamentoId = await obtenerDepartamentoEmpleado(empleadoId);

      // Construir payload con clasificación según las reglas de negocio
      // La clasificación determina el tipo de registro:
      // - Para entradas: 'entrada', 'retardo', 'falta'
      // - Para salidas: 'salida_puntual', 'salida_temprana'
      const payload = {
        empleado_id: empleadoId,
        dispositivo_origen: 'escritorio', // Siempre en minúsculas
        metodo_registro: 'PIN',
        departamento_id: departamentoId,
        tipo: estadoActual?.tipoRegistro || 'entrada', // 'entrada' o 'salida'
        clasificacion: estadoActual?.clasificacion || 'entrada', // Clasificación específica
        estado: estadoActual?.estadoHorario || 'puntual' // Estado del horario
      };

      console.log("📤 Enviando registro:", payload);
      console.log("📊 Clasificación:", estadoActual?.clasificacion);

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

      // 5. Procesar resultado exitoso
      // Usar la clasificación calculada localmente o la que devuelve el servidor
      const clasificacionFinal = data.data?.clasificacion || estadoActual?.clasificacion || 'entrada';
      const tipoRegistro = data.data?.tipo || estadoActual?.tipoRegistro || 'entrada';
      const tipoMovimiento = tipoRegistro === 'salida' ? 'SALIDA' : 'ENTRADA';

      // Determinar texto y emoji según la clasificación
      let estadoTexto = '';
      let emoji = '✅';
      let tipoEvento = 'success';

      switch (clasificacionFinal) {
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

      agregarEvento({
        user: empleadoData?.nombre || usuarioOCorreo,
        action: `${tipoMovimiento === 'SALIDA' ? 'Salida' : 'Entrada'} registrada (${estadoTexto}) - PIN`,
        type: tipoEvento,
      });

      // Mensaje de voz con información de la clasificación
      let voiceMessage = `Registro exitoso, ${empleadoData?.nombre || 'empleado'}`;
      if (clasificacionFinal === 'retardo') {
        voiceMessage = `Registro con retardo, ${empleadoData?.nombre || 'empleado'}`;
      } else if (clasificacionFinal === 'falta') {
        voiceMessage = `Registro fuera de tolerancia, ${empleadoData?.nombre || 'empleado'}`;
      } else if (clasificacionFinal === 'salida_temprana') {
        voiceMessage = `Salida anticipada, ${empleadoData?.nombre || 'empleado'}`;
      }

      const utterance = new SpeechSynthesisUtterance(voiceMessage);
      utterance.lang = "es-MX";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);

      setResult({
        success: true,
        message: "Asistencia registrada",
        empleado: empleadoData,
        tipoMovimiento: tipoMovimiento,
        hora: data.data?.fecha_registro
          ? new Date(data.data.fecha_registro).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
          : horaActual,
        estado: data.data?.estado || estadoActual?.estadoHorario || 'puntual',
        estadoTexto: estadoTexto,
        clasificacion: clasificacionFinal,
      });

      // Callback de éxito con clasificación
      if (onSuccess) {
        onSuccess({
          empleado: empleadoData,
          tipo_movimiento: tipoMovimiento,
          hora: horaActual,
          estado: data.data?.estado,
          clasificacion: clasificacionFinal,
          dispositivo_origen: 'escritorio',
        });
      }

    } catch (error) {
      console.error("❌ Error:", error);

      agregarEvento({
        user: usuarioOCorreo,
        action: `Error en registro con PIN - ${error.message}`,
        type: "error",
      });

      setErrorMessage(error.message || "Error al registrar asistencia");
      setResult({
        success: false,
        message: error.message || "Error al registrar asistencia",
      });
    } finally {
      setLoading(false);
    }
  };

  // Countdown para cierre automático
  useEffect(() => {
    if (result?.success || result?.noPuedeRegistrar) {
      setCountdown(6);

      const interval = setInterval(() => {
        setCountdown((prev) => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            clearInterval(interval);
            setTimeout(() => {
              onClose();
            }, 500);
            return 0;
          }
          return newValue;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [result?.success, result?.noPuedeRegistrar, onClose]);

  // Reintentar después de error
  const handleRetry = () => {
    setResult(null);
    setErrorMessage("");
    setPin("");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center mb-3">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Checador</h2>
            <p className="text-white/80 text-sm">
              Sistema de Control de Asistencias
            </p>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {!result ? (
            /* Formulario */
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-xl font-semibold text-text-primary text-center mb-4">
                Ingresa tu usuario/correo y PIN
              </h3>

              {errorMessage && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
                  <p className="text-red-600 dark:text-red-400 text-sm">{errorMessage}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Usuario o Correo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-text-disabled" />
                  </div>
                  <input
                    type="text"
                    value={usuarioOCorreo}
                    onChange={(e) => setUsuarioOCorreo(e.target.value)}
                    placeholder="tu.usuario o correo@ejemplo.com"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 border border-border-subtle rounded-lg bg-bg-secondary text-text-primary placeholder-text-disabled focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  PIN
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-text-disabled" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-2.5 border border-border-subtle rounded-lg bg-bg-secondary text-text-primary placeholder-text-disabled focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-disabled hover:text-text-secondary"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-400 disabled:to-blue-400 text-white rounded-lg font-semibold text-base shadow-lg transition-all mt-2 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Registrar Asistencia"
                )}
              </button>
            </form>
          ) : (
            /* Resultado */
            <div
              className={`rounded-xl p-6 text-center ${
                result.success
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : result.noPuedeRegistrar
                  ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              }`}
            >
              {result.success ? (
                <>
                  {/* Icono según clasificación */}
                  {result.clasificacion === 'retardo' || result.clasificacion === 'salida_temprana' ? (
                    <AlertTriangle className="w-16 h-16 mx-auto mb-3 text-yellow-600 dark:text-yellow-400" />
                  ) : result.clasificacion === 'falta' ? (
                    <XCircle className="w-16 h-16 mx-auto mb-3 text-red-600 dark:text-red-400" />
                  ) : (
                    <CheckCircle className="w-16 h-16 mx-auto mb-3 text-green-600 dark:text-green-400" />
                  )}

                  <p className={`font-bold text-lg mb-1 ${
                    result.clasificacion === 'falta'
                      ? "text-red-800 dark:text-red-300"
                      : result.clasificacion === 'retardo' || result.clasificacion === 'salida_temprana'
                      ? "text-yellow-800 dark:text-yellow-300"
                      : "text-green-800 dark:text-green-300"
                  }`}>
                    Asistencia Registrada
                  </p>
                  {result.empleado?.nombre && (
                    <p className="text-gray-700 dark:text-gray-300 text-lg">
                      {result.empleado.nombre}
                    </p>
                  )}
                  {result.tipoMovimiento && (
                    <div className="mt-2">
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {result.tipoMovimiento === "ENTRADA" ? "Entrada" : "Salida"}{" "}
                        registrada {result.hora && `a las ${result.hora}`}
                      </p>
                      {/* Badge de clasificación */}
                      <span
                        className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                          result.clasificacion === "entrada" || result.clasificacion === "salida_puntual"
                            ? "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300"
                            : result.clasificacion === "retardo" || result.clasificacion === "salida_temprana"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300"
                            : result.clasificacion === "falta"
                            ? "bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300"
                            : result.estado === "puntual"
                            ? "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300"
                            : result.estado === "retardo" || result.estado === "temprana"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300"
                            : result.estado === "falta"
                            ? "bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300"
                        }`}
                      >
                        {result.estadoTexto || result.estado || "Registrado"}
                      </span>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>
                      Esta ventana se cerrará en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                    </span>
                  </div>
                </>
              ) : result.noPuedeRegistrar ? (
                <>
                  <AlertTriangle className="w-16 h-16 mx-auto mb-3 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-yellow-800 dark:text-yellow-300 font-bold text-lg mb-1">
                    No Disponible
                  </p>
                  {result.empleado?.nombre && (
                    <p className="text-gray-700 dark:text-gray-300 text-lg mb-2">
                      {result.empleado.nombre}
                    </p>
                  )}
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    {result.message}
                  </p>
                  <span
                    className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold ${
                      result.estadoHorario === "completado"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300"
                    }`}
                  >
                    {result.estadoHorario === "completado"
                      ? "Jornada completada"
                      : "Fuera de horario"}
                  </span>

                  <div className="mt-4 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>
                      Esta ventana se cerrará en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-16 h-16 mx-auto mb-3 text-red-600 dark:text-red-400" />
                  <p className="text-red-800 dark:text-red-300 font-bold text-lg mb-1">
                    Error en el Registro
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                    {result.message}
                  </p>
                  <button
                    onClick={handleRetry}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Intentar de nuevo
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
