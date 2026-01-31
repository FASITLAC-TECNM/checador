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
        return { trabaja: false, turnos: [] };
      }

      return {
        trabaja: true,
        turnos: turnosHoy,
        entrada: turnosHoy[0].entrada,
        salida: turnosHoy[turnosHoy.length - 1].salida,
        tipo: turnosHoy.length > 1 ? 'quebrado' : 'continuo'
      };
    } catch (err) {
      console.error('Error obteniendo horario:', err);
      return null;
    }
  }, []);

  const obtenerTolerancia = useCallback(async (usuarioId) => {
    const defaultTolerancia = {
      minutos_retardo: 10,
      minutos_falta: 30,
      permite_registro_anticipado: true,
      minutos_anticipado_max: 60
    };

    try {
      if (!usuarioId) return defaultTolerancia;

      const rolesResponse = await fetchApi(`${API_CONFIG.ENDPOINTS.USUARIOS}/${usuarioId}/roles`);
      const roles = rolesResponse.data || [];

      const rolConTolerancia = roles
        .filter(r => r.tolerancia_id)
        .sort((a, b) => b.posicion - a.posicion)[0];

      if (!rolConTolerancia) return defaultTolerancia;

      const toleranciaResponse = await fetchApi(`${API_CONFIG.ENDPOINTS.TOLERANCIAS}/${rolConTolerancia.tolerancia_id}`);
      return toleranciaResponse.data || toleranciaResponse;
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

  const validarEntrada = (horario, tolerancia, minutosActuales) => {
    let hayTurnoFuturo = false;

    for (const turno of horario.turnos) {
      const [hE, mE] = turno.entrada.split(':').map(Number);
      const minEntrada = hE * 60 + mE;

      const ventanaInicio = minEntrada - (tolerancia.minutos_anticipado_max || 60);
      const ventanaRetardo = minEntrada + tolerancia.minutos_retardo;
      const ventanaFalta = minEntrada + tolerancia.minutos_falta;

      if (minutosActuales >= ventanaInicio && minutosActuales <= ventanaRetardo) {
        return {
          puedeRegistrar: true,
          tipoRegistro: 'entrada',
          estadoHorario: 'puntual',
          jornadaCompleta: false
        };
      }

      if (minutosActuales > ventanaRetardo && minutosActuales <= ventanaFalta) {
        return {
          puedeRegistrar: true,
          tipoRegistro: 'entrada',
          estadoHorario: 'retardo',
          jornadaCompleta: false
        };
      }

      if (minutosActuales > ventanaFalta) {
        const [hS, mS] = turno.salida.split(':').map(Number);
        const minSalida = hS * 60 + mS;

        if (minutosActuales <= minSalida) {
          return {
            puedeRegistrar: true,
            tipoRegistro: 'entrada',
            estadoHorario: 'falta',
            jornadaCompleta: false
          };
        }
      }

      if (minutosActuales < ventanaInicio) {
        hayTurnoFuturo = true;
      }
    }

    return {
      puedeRegistrar: false,
      tipoRegistro: 'entrada',
      estadoHorario: 'fuera_horario',
      jornadaCompleta: false,
      hayTurnoFuturo: hayTurnoFuturo
    };
  };

  const validarSalida = (horario, minutosActuales) => {
    for (const turno of horario.turnos) {
      const [hS, mS] = turno.salida.split(':').map(Number);
      const minSalida = hS * 60 + mS;

      const ventanaSalidaInicio = minSalida - 10;
      const ventanaSalidaFin = minSalida + 5;

      if (minutosActuales >= ventanaSalidaInicio && minutosActuales <= ventanaSalidaFin) {
        return {
          puedeRegistrar: true,
          tipoRegistro: 'salida',
          estadoHorario: 'puntual',
          jornadaCompleta: false
        };
      }
    }

    return {
      puedeRegistrar: false,
      tipoRegistro: 'salida',
      estadoHorario: 'fuera_horario',
      jornadaCompleta: false
    };
  };

  const calcularEstadoRegistro = useCallback((ultimo, horario, tolerancia) => {
    if (!horario?.trabaja) {
      return {
        puedeRegistrar: false,
        tipoRegistro: 'entrada',
        estadoHorario: 'fuera_horario',
        jornadaCompleta: false
      };
    }

    const ahora = getMinutosDelDia();
    const totalTurnos = horario.turnos.length;

    if (!ultimo) {
      return validarEntrada(horario, tolerancia, ahora);
    }

    const registrosHoy = ultimo.totalRegistrosHoy || 1;
    const turnosCompletados = Math.floor(registrosHoy / 2);

    if (ultimo.tipo === 'entrada') {
      return validarSalida(horario, ahora);
    }

    if (ultimo.tipo === 'salida') {
      if (turnosCompletados >= totalTurnos) {
        const resultadoEntrada = validarEntrada(horario, tolerancia, ahora);

        if (!resultadoEntrada.hayTurnoFuturo) {
          return {
            puedeRegistrar: false,
            tipoRegistro: 'entrada',
            estadoHorario: 'completado',
            jornadaCompleta: true
          };
        }

        return resultadoEntrada;
      }

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

      const payload = {
        empleado_id: empleadoId,
        dispositivo_origen: 'escritorio',
        metodo_registro: 'PIN',
        departamento_id: departamentoId
      };

      console.log("📤 Enviando registro:", payload);

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
      const tipoMovimiento = data.data?.tipo === 'salida' ? 'SALIDA' : 'ENTRADA';
      let estadoTexto = '';
      let emoji = '✅';

      if (data.data?.tipo === 'salida') {
        estadoTexto = 'salida registrada';
        emoji = '✅';
      } else {
        if (data.data?.estado === 'retardo') {
          estadoTexto = 'con retardo';
          emoji = '⚠️';
        } else if (data.data?.estado === 'falta') {
          estadoTexto = 'fuera de tolerancia';
          emoji = '❌';
        } else {
          estadoTexto = 'puntual';
          emoji = '✅';
        }
      }

      agregarEvento({
        user: empleadoData?.nombre || usuarioOCorreo,
        action: `${tipoMovimiento === 'SALIDA' ? 'Salida' : 'Entrada'} registrada (${estadoTexto}) - PIN`,
        type: "success",
      });

      // Mensaje de voz
      const successMessage = `Registro exitoso, ${empleadoData?.nombre || 'empleado'}`;
      const utterance = new SpeechSynthesisUtterance(successMessage);
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
        estado: data.data?.estado || 'puntual',
        estadoTexto: estadoTexto,
      });

      // Callback de éxito
      if (onSuccess) {
        onSuccess({
          empleado: empleadoData,
          tipo_movimiento: tipoMovimiento,
          hora: horaActual,
          estado: data.data?.estado,
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
                  <CheckCircle className="w-16 h-16 mx-auto mb-3 text-green-600 dark:text-green-400" />
                  <p className="text-green-800 dark:text-green-300 font-bold text-lg mb-1">
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
                      <span
                        className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                          result.estado === "puntual"
                            ? "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300"
                            : result.estado === "retardo"
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
