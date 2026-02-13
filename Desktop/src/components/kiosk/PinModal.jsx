import { User, UserX, CalendarX, Lock, Eye, EyeOff, X, Clock, CheckCircle, XCircle, Loader2, Timer, AlertTriangle, LogIn } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { API_CONFIG, fetchApi } from "../../config/apiEndPoint";
import { agregarEvento } from "../../services/bitacoraService";
import {
  cargarDatosAsistencia,
  obtenerDepartamentoEmpleado,
  registrarAsistenciaEnServidor,
  obtenerInfoClasificacion,
  formatearTiempoRestante,
  normalizarRespuestaRegistro
} from "../../services/asistenciaLogicService";


export default function PinModal({ onClose, onSuccess, onLoginRequest }) {
  const [showPassword, setShowPassword] = useState(false);
  const [usuarioOCorreo, setUsuarioOCorreo] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [countdown, setCountdown] = useState(6);
  const [errorMessage, setErrorMessage] = useState("");

  // Refs para el countdown
  const countdownRef = useRef(null);
  const onCloseRef = useRef(onClose);
  // Ref para prevenir envíos duplicados
  const isSubmittingRef = useRef(false);

  // Mantener referencia actualizada de onClose
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // === VERIFICAR PIN Y REGISTRAR ASISTENCIA ===

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevenir envíos duplicados (doble clic)
    if (isSubmittingRef.current) {
      console.log("⚠️ Envío en proceso, ignorando click duplicado");
      return;
    }
    isSubmittingRef.current = true;

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
        // Enviar token al SyncManager para que pueda hacer Pull autenticado
        if (window.electronAPI && window.electronAPI.syncManager) {
          try {
            window.electronAPI.syncManager.updateToken(token);
          } catch (e) {
            // Silenciar errores de IPC
          }
        }
      }

      // 2. Obtener datos del empleado
      let empleadoId = usuarioData.empleado_id;
      let empleadoData = null;

      // Verificar si el usuario es empleado
      if (!usuarioData.es_empleado && !empleadoId) {
        // Usuario autenticado pero no es empleado
        agregarEvento({
          user: usuarioData.nombre || usuarioData.username || usuarioOCorreo,
          action: "Intento de registro - Usuario no es empleado",
          type: "warning",
        });

        setResult({
          success: false,
          noEsEmpleado: true,
          message: "Tu cuenta no está asociada a un empleado",
          usuario: usuarioData,
          token: token,
        });
        return;
      }

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

      // 3. Verificar horario usando el servicio compartido
      console.log("📅 Verificando horario...");
      const datosAsistencia = await cargarDatosAsistencia(empleadoId, usuarioData.id);
      const estadoActual = datosAsistencia.estado;

      // Verificar si el empleado tiene horario asignado
      if (!datosAsistencia.horario) {
        agregarEvento({
          user: empleadoData?.nombre || usuarioOCorreo,
          action: "Intento de registro - Empleado sin horario asignado",
          type: "warning",
        });

        setResult({
          success: false,
          sinHorario: true,
          message: "No tienes un horario asignado",
          empleado: empleadoData,
          usuario: usuarioData,
          token: token,
        });
        return;
      }

      const now = new Date();
      const horaActual = now.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Verificar si puede registrar
      if (estadoActual && !estadoActual.puedeRegistrar) {
        let mensaje = "No puedes registrar en este momento";
        if (estadoActual.jornadaCompleta) {
          mensaje = estadoActual.mensaje || "Ya completaste tu jornada de hoy";
        } else if (estadoActual.estadoHorario === 'fuera_horario') {
          mensaje = "Estás fuera del horario de registro";
        } else if (estadoActual.estadoHorario === 'tiempo_insuficiente') {
          const tiempoRestante = formatearTiempoRestante(estadoActual.minutosRestantes);
          mensaje = estadoActual.mensajeEspera || `Faltan ${tiempoRestante} para habilitar tu salida`;
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
          usuario: usuarioData,
          token: token,
          estadoHorario: estadoActual?.estadoHorario,
          noPuedeRegistrar: true,
          minutosRestantes: estadoActual?.minutosRestantes,
        });

        return;
      }

      // 4. Obtener departamento y registrar asistencia usando el servicio compartido
      console.log("📝 Registrando asistencia...");
      const departamentoId = await obtenerDepartamentoEmpleado(empleadoId);

      // Registrar asistencia usando el servicio compartido
      const data = await registrarAsistenciaEnServidor({
        empleadoId,
        departamentoId,
        tipoRegistro: estadoActual?.tipoRegistro || 'entrada',
        clasificacion: estadoActual?.clasificacion || 'entrada',
        estadoHorario: estadoActual?.estadoHorario || 'puntual',
        metodoRegistro: 'PIN',
        token
      });

      // 5. Procesar resultado exitoso
      const clasificacionFinal = data.data?.clasificacion || estadoActual?.clasificacion || 'entrada';
      const tipoRegistro = data.data?.tipo || estadoActual?.tipoRegistro || 'entrada';
      const tipoMovimiento = tipoRegistro === 'salida' ? 'SALIDA' : 'ENTRADA';

      // Obtener texto y emoji según la clasificación usando el servicio compartido
      const { estadoTexto, tipoEvento } = obtenerInfoClasificacion(clasificacionFinal, tipoRegistro);

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
        usuario: usuarioData,
        token: token,
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

      // === FALLBACK OFFLINE ===
      const isNetworkError = error.name === 'TypeError'
        || error.message.includes('Failed to fetch')
        || error.message.includes('NetworkError')
        || error.message.includes('ERR_INTERNET_DISCONNECTED');

      if (isNetworkError && window.electronAPI && window.electronAPI.offlineDB) {
        console.log('📴 [PinModal] Sin conexión — intentando registro offline...');

        try {
          // 1. Buscar empleado en caché local por usuario, correo o nombre
          const { cargarDatosOffline, guardarAsistenciaOffline } =
            await import('../../services/offlineAuthService');

          // Obtener todos los empleados cacheados (incluye usuario, correo, nombre)
          const allEmpleados = await window.electronAPI.offlineDB.getAllEmpleados();

          // Buscar por usuario, correo o nombre (case-insensitive)
          const userInput = usuarioOCorreo.trim().toLowerCase();
          let matchedEmpleado = allEmpleados.find(emp => {
            const usuario = (emp.usuario || '').toLowerCase();
            const correo = (emp.correo || '').toLowerCase();
            const nombre = (emp.nombre || '').toLowerCase();
            return usuario === userInput
              || correo === userInput
              || nombre === userInput
              || nombre.includes(userInput);
          });

          if (!matchedEmpleado) {
            throw new Error('Empleado no encontrado en caché offline. Necesitas conexión a internet para el primer registro.');
          }

          const empleadoId = matchedEmpleado.empleado_id;

          console.log(`✅ [PinModal] Empleado encontrado offline: ${matchedEmpleado.nombre}`);

          // 2. Cargar datos de horario y determinar tipo de registro
          const datosOffline = await cargarDatosOffline(empleadoId);
          const registrosHoy = datosOffline.registrosHoy || [];
          const tipoRegistro = registrosHoy.length % 2 === 0 ? 'entrada' : 'salida';

          // 3. Guardar en cola offline (sin estado — el servidor lo calculará al hacer Push)
          await guardarAsistenciaOffline({
            empleadoId,
            tipo: tipoRegistro,
            estado: tipoRegistro === 'entrada' ? 'puntual' : 'salida_puntual',
            metodoRegistro: 'PIN',
            departamentoId: null,
          });

          const now = new Date();
          const horaActual = now.toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          });

          const tipoMovimiento = tipoRegistro === 'salida' ? 'SALIDA' : 'ENTRADA';

          // Mensaje de voz
          const utterance = new SpeechSynthesisUtterance(
            `Registro offline exitoso, ${matchedEmpleado.nombre}`
          );
          utterance.lang = "es-MX";
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);

          setResult({
            success: true,
            offline: true,
            message: "Asistencia registrada (modo offline)",
            empleado: matchedEmpleado,
            tipoMovimiento,
            hora: horaActual,
            estado: 'pendiente_sync',
            estadoTexto: '📴 Modo Offline',
            clasificacion: tipoRegistro === 'salida' ? 'salida_puntual' : 'entrada',
          });
          return;
        } catch (offlineError) {
          console.error('❌ [PinModal] Offline fallback también falló:', offlineError);
          // Mostrar error original si el offline también falla
          setErrorMessage(offlineError.message || error.message);
          setResult({
            success: false,
            message: offlineError.message || 'Sin conexión a internet. No se pudo registrar.',
          });
          return;
        }
      }

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
      isSubmittingRef.current = false;
    }
  };

  // Countdown para cierre automático
  useEffect(() => {
    // Limpiar intervalo anterior si existe
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (result?.success || result?.noPuedeRegistrar || result?.noEsEmpleado || result?.sinHorario) {
      let count = 6;
      setCountdown(count);

      countdownRef.current = setInterval(() => {
        count -= 1;
        setCountdown(count);

        if (count <= 0) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          // Usar la referencia actualizada
          if (onCloseRef.current) {
            onCloseRef.current();
          }
        }
      }, 1000);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [result?.success, result?.noPuedeRegistrar]);

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
              className={`rounded-xl p-6 text-center ${result.success
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                : result.noPuedeRegistrar
                  ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                  : result.noEsEmpleado
                    ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                    : result.sinHorario
                      ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
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

                  <p className={`font-bold text-lg mb-1 ${result.clasificacion === 'falta'
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
                        className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${result.clasificacion === "entrada" || result.clasificacion === "salida_puntual"
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

                  {/* Botón para iniciar sesión */}
                  {onLoginRequest && (
                    <button
                      onClick={() => {
                        if (countdownRef.current) {
                          clearInterval(countdownRef.current);
                          countdownRef.current = null;
                        }
                        // Construir objeto usuario con la estructura que espera SessionScreen
                        const usuarioParaSesion = {
                          // Datos del usuario autenticado
                          ...result.usuario,
                          // Datos del empleado
                          ...result.empleado,
                          // Asegurar que es_empleado esté definido
                          es_empleado: true,
                          // Asegurar empleado_id
                          empleado_id: result.empleado?.empleado_id || result.empleado?.id || result.usuario?.empleado_id,
                          // Nombre para mostrar
                          nombre: result.empleado?.nombre || result.usuario?.nombre || result.usuario?.username,
                          // Token de autenticación
                          token: result.token
                        };
                        console.log("📤 Datos para sesión:", usuarioParaSesion);
                        onLoginRequest(usuarioParaSesion);
                        onClose();
                      }}
                      className="mt-4 w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <LogIn className="w-4 h-4" />
                      Iniciar Sesión
                    </button>
                  )}
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
                    className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold ${result.estadoHorario === "completado"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300"
                      : result.estadoHorario === "tiempo_insuficiente"
                        ? "bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-300"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300"
                      }`}
                  >
                    {result.estadoHorario === "completado"
                      ? "Jornada completada"
                      : result.estadoHorario === "tiempo_insuficiente"
                        ? `Espera ${formatearTiempoRestante(result.minutosRestantes)}`
                        : "Fuera de horario"}
                  </span>

                  <div className="mt-4 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>
                      Esta ventana se cerrará en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                    </span>
                  </div>

                  {/* Botón para iniciar sesión */}
                  {onLoginRequest && (
                    <button
                      onClick={() => {
                        if (countdownRef.current) {
                          clearInterval(countdownRef.current);
                          countdownRef.current = null;
                        }
                        // Construir objeto usuario con la estructura que espera SessionScreen
                        const usuarioParaSesion = {
                          // Datos del usuario autenticado
                          ...result.usuario,
                          // Datos del empleado
                          ...result.empleado,
                          // Asegurar que es_empleado esté definido
                          es_empleado: true,
                          // Asegurar empleado_id
                          empleado_id: result.empleado?.empleado_id || result.empleado?.id || result.usuario?.empleado_id,
                          // Nombre para mostrar
                          nombre: result.empleado?.nombre || result.usuario?.nombre || result.usuario?.username,
                          // Token de autenticación
                          token: result.token
                        };
                        console.log("📤 Datos para sesión:", usuarioParaSesion);
                        onLoginRequest(usuarioParaSesion);
                        onClose();
                      }}
                      className="mt-4 w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <LogIn className="w-4 h-4" />
                      Iniciar Sesión
                    </button>
                  )}
                </>
              ) : result.noEsEmpleado ? (
                <>
                  <UserX className="w-16 h-16 mx-auto mb-3 text-orange-600 dark:text-orange-400" />
                  <p className="text-orange-800 dark:text-orange-300 font-bold text-lg mb-1">
                    Usuario sin Acceso
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-lg mb-2">
                    {result.usuario?.nombre || result.usuario?.username || "Usuario"}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Tu cuenta no está registrada como empleado en el sistema de asistencias.
                  </p>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-300">
                    Solo empleados pueden registrar asistencia
                  </span>

                  <div className="mt-4 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>
                      Esta ventana se cerrará en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                    </span>
                  </div>

                  {/* Botón para iniciar sesión si tiene permisos */}
                  {onLoginRequest && (
                    <button
                      onClick={() => {
                        const usuarioParaSesion = {
                          ...result.usuario,
                          es_empleado: false,
                          token: result.token
                        };
                        onLoginRequest(usuarioParaSesion);
                        onClose();
                      }}
                      className="mt-4 w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <LogIn className="w-4 h-4" />
                      Iniciar Sesión
                    </button>
                  )}
                </>
              ) : result.sinHorario ? (
                <>
                  <CalendarX className="w-16 h-16 mx-auto mb-3 text-purple-600 dark:text-purple-400" />
                  <p className="text-purple-800 dark:text-purple-300 font-bold text-lg mb-1">
                    Sin Horario Asignado
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-lg mb-2">
                    {result.empleado?.nombre || result.usuario?.username || "Empleado"}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    No tienes un horario configurado en el sistema. Contacta a tu administrador.
                  </p>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-800/30 dark:text-purple-300">
                    Requiere asignación de horario
                  </span>

                  <div className="mt-4 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>
                      Esta ventana se cerrará en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                    </span>
                  </div>

                  {/* Botón para iniciar sesión si tiene permisos */}
                  {onLoginRequest && (
                    <button
                      onClick={() => {
                        const usuarioParaSesion = {
                          ...result.usuario,
                          ...result.empleado,
                          es_empleado: true,
                          empleado_id: result.empleado?.empleado_id || result.empleado?.id,
                          token: result.token
                        };
                        onLoginRequest(usuarioParaSesion);
                        onClose();
                      }}
                      className="mt-4 w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <LogIn className="w-4 h-4" />
                      Iniciar Sesión
                    </button>
                  )}
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
