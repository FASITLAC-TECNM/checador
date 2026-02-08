import { useState, useEffect, useRef } from "react";
import {
  Fingerprint,
  Wifi,
  WifiOff,
  X,
  CheckCircle,
  XCircle,
  Clock,
  LogIn,
  Timer,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { guardarSesion } from "../../services/biometricAuthService";
import { API_CONFIG, fetchApi } from "../../config/apiEndPoint";
import {
  cargarDatosAsistencia,
  obtenerDepartamentoEmpleado,
  registrarAsistenciaEnServidor,
  obtenerInfoClasificacion,
  obtenerUltimoRegistro,
  calcularEstadoRegistro
} from "../../services/asistenciaLogicService";

export default function AsistenciaHuella({
  isOpen = false,
  onClose,
  onSuccess,
  onLoginRequest,
  onReaderStatusChange, // Callback para notificar cambios en el estado del lector
  backgroundMode = false // Modo silencioso: conexión activa pero sin modal visible hasta detectar huella
}) {
  // En modo normal, si no está abierto, no renderizar
  // En modo background, siempre mantener la conexión activa
  const shouldMaintainConnection = isOpen || backgroundMode;

  const [connected, setConnected] = useState(false);
  const [showModal, setShowModal] = useState(!backgroundMode); // En background, modal oculto inicialmente
  const [readerConnected, setReaderConnected] = useState(false);
  const [currentOperation, setCurrentOperation] = useState("None");
  const [status, setStatus] = useState("disconnected");
  const [statusMessage, setStatusMessage] = useState("");
  const [processingAttendance, setProcessingAttendance] = useState(false);
  const [processingLogin, setProcessingLogin] = useState(false);
  const [result, setResult] = useState(null); // { success: boolean, message: string, empleado?: object }
  const [countdown, setCountdown] = useState(6); // Contador de 6 segundos
  const [loginHabilitado, setLoginHabilitado] = useState(false); // Prevenir login automático
  const [identificando, setIdentificando] = useState(false); // Estado para mostrar pantalla de "Identificando..."

  const [messages, setMessages] = useState([]);

  // Estados para lógica de asistencia real
  const [horarioInfo, setHorarioInfo] = useState(null);
  const [toleranciaInfo, setToleranciaInfo] = useState(null);
  const [ultimoRegistroHoy, setUltimoRegistroHoy] = useState(null);
  const [puedeRegistrar, setPuedeRegistrar] = useState(false);
  const [tipoSiguienteRegistro, setTipoSiguienteRegistro] = useState('entrada');
  const [estadoHorario, setEstadoHorario] = useState(null);
  const [jornadaCompletada, setJornadaCompletada] = useState(false);
  const [cargandoDatosHorario, setCargandoDatosHorario] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const hasStartedIdentification = useRef(false);
  const countdownIntervalRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const backgroundModeRef = useRef(backgroundMode);
  const isProcessingAttendanceRef = useRef(false); // Ref para prevenir llamadas duplicadas
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Mantener las refs actualizadas
  useEffect(() => {
    onCloseRef.current = onClose;
    backgroundModeRef.current = backgroundMode;
  }, [onClose]);

  // Notificar al padre cuando cambia el estado del lector
  useEffect(() => {
    if (onReaderStatusChange) {
      onReaderStatusChange(readerConnected);
    }
  }, [readerConnected, onReaderStatusChange]);

  // Cargar datos de horario para un empleado usando el servicio compartido
  const cargarDatosHorario = async (empleadoId, usuarioId) => {
    setCargandoDatosHorario(true);

    try {
      const datosAsistencia = await cargarDatosAsistencia(empleadoId, usuarioId);

      setUltimoRegistroHoy(datosAsistencia.ultimo);
      setHorarioInfo(datosAsistencia.horario);
      setToleranciaInfo(datosAsistencia.tolerancia);

      if (datosAsistencia.estado) {
        setPuedeRegistrar(datosAsistencia.estado.puedeRegistrar);
        setTipoSiguienteRegistro(datosAsistencia.estado.tipoRegistro);
        setEstadoHorario(datosAsistencia.estado.estadoHorario);
        setJornadaCompletada(datosAsistencia.estado.jornadaCompleta);
        return datosAsistencia.estado;
      }

      return null;
    } catch (err) {
      console.error('Error cargando datos de horario:', err);
      return null;
    } finally {
      setCargandoDatosHorario(false);
    }
  };

  // Reset de loginHabilitado al montar el componente (prevenir login automático)
  useEffect(() => {
    // Solo resetear loginHabilitado al montar para prevenir login automático
    // NO resetear result aquí porque puede interferir con el flujo de registro
    setLoginHabilitado(false);
    setProcessingLogin(false);

    // En modo background, asegurar que el modal esté oculto inicialmente
    if (backgroundMode) {
      setShowModal(false);
    }

    return () => {
      // Limpiar al desmontar
      setLoginHabilitado(false);
    };
  }, []); // Solo al montar/desmontar

  // Conectar al servidor cuando shouldMaintainConnection sea true
  useEffect(() => {
    if (shouldMaintainConnection) {
      connectToServer();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [shouldMaintainConnection, backgroundMode]);

  // Ref para la función de cierre del modal (necesaria para el setInterval)
  const closeModalRef = useRef(null);

  // Actualizar la ref de cierre
  useEffect(() => {
    closeModalRef.current = () => {
      // SIEMPRE deshabilitar login al cerrar para prevenir llamadas automáticas
      setLoginHabilitado(false);
      setIdentificando(false);
      // Resetear ref de procesamiento para permitir nuevos registros
      isProcessingAttendanceRef.current = false;

      if (backgroundModeRef.current) {
        // En modo background, solo ocultar el modal y reiniciar
        setShowModal(false);
        setResult(null);
        setMessages([]);
        hasStartedIdentification.current = false;
        // Reiniciar identificación después de cerrar
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            sendCommand("startIdentification", { apiUrl: `${API_CONFIG.BASE_URL}/api` });
          }
        }, 500);
      } else {
        // En modo normal, cerrar completamente
        if (onCloseRef.current) onCloseRef.current();
      }
    };
  }, []);

  // Countdown para cerrar automáticamente después de resultado (éxito o no disponible)
  useEffect(() => {
    // Activar countdown cuando hay éxito O cuando no puede registrar (fuera de horario)
    // O error con empleado identificado O cualquier error en modo background
    // O huella no reconocida
    const debeIniciarCountdown = result?.success ||
      result?.noPuedeRegistrar ||
      result?.noReconocida || // Huella no reconocida
      (result && !result.success && result.empleadoId) ||
      (backgroundMode && result && !result.success); // En background, cerrar automáticamente cualquier error

    if (debeIniciarCountdown) {
      // Limpiar cualquier intervalo anterior
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      setCountdown(6);

      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
            // Cerrar después de mostrar 0
            setTimeout(() => {
              if (closeModalRef.current) closeModalRef.current();
            }, 500);
            return 0;
          }
          return newValue;
        });
      }, 1000);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [result?.success, result?.noPuedeRegistrar, result?.empleadoId]);

  // Habilitar login solo después de que el resultado se muestre Y el modal esté visible (prevenir login automático)
  useEffect(() => {
    // Solo habilitar login si:
    // 1. Hay un resultado con empleadoId
    // 2. El modal está visible (showModal es true)
    // 3. Después de un delay para asegurar que el usuario vea la ventana
    if (result && result.empleadoId && showModal) {
      // Resetear el estado de login habilitado
      setLoginHabilitado(false);
      // Habilitar el botón después de un delay más largo para asegurar que el usuario vea la ventana
      const timer = setTimeout(() => {
        // Verificar nuevamente que el modal sigue visible antes de habilitar
        setLoginHabilitado(true);
      }, 1000); // Aumentado a 1 segundo para dar tiempo a ver la ventana
      return () => clearTimeout(timer);
    } else {
      setLoginHabilitado(false);
    }
  }, [result, showModal]);

  const connectToServer = async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Obtener token de autenticación desde Electron
      let authToken = null;
      if (window.electronAPI?.getBiometricToken) {
        try {
          authToken = await window.electronAPI.getBiometricToken();
          console.log("🔑 [AsistenciaHuella] Token obtenido:", authToken ? "✅" : "❌ null");
        } catch (err) {
          console.warn("No se pudo obtener token biométrico:", err);
        }
      }

      addMessage("🔌 Conectando al servidor...", "info");
      const ws = new WebSocket("ws://localhost:8787/");
      wsRef.current = ws;

      // Guardar token para el closure
      const tokenToSend = authToken;

      ws.onopen = () => {
        setConnected(true);
        setStatus("connected");
        reconnectAttemptsRef.current = 0;
        addMessage("✅ Conectado al servidor biométrico", "success");

        // Enviar autenticación si hay token
        if (tokenToSend) {
          console.log("🔐 [AsistenciaHuella] Enviando autenticación...");
          ws.send(JSON.stringify({ command: "auth", token: tokenToSend }));
        } else {
          // Sin token, solicitar estado directamente
          sendCommand("getStatus");
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setReaderConnected(false);
        setStatus("disconnected");
        setCurrentOperation("None");
        addMessage("❌ Desconectado del servidor", "warning");

        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            10000
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            addMessage(
              `🔄 Reintentando conexión (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`,
              "info"
            );
            connectToServer();
          }, delay);
        } else {
          addMessage("❌ Máximo de reintentos alcanzado", "error");
        }
      };

      ws.onerror = (error) => {
        addMessage("❌ Error de conexión WebSocket", "error");
        console.error("WebSocket error:", error);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleServerMessage(data);
        } catch (error) {
          console.error("Error parsing message:", error);
          addMessage("❌ Error al procesar mensaje del servidor", "error");
        }
      };
    } catch (error) {
      addMessage("❌ Error conectando al servidor", "error");
      console.error("Connection error:", error);
    }
  };

  // Registrar asistencia después de identificación exitosa (API REAL)
  // NOTA: La protección contra duplicados se hace en handleServerMessage ANTES de llamar aquí
  const registrarAsistencia = async (empleadoId, matchScore) => {
    setProcessingAttendance(true);
    addMessage("📝 Cargando datos del empleado...", "info");

    // Declarar fuera del try para poder usarlo en catch
    let empleadoData = null;

    try {
      // Primero obtener datos del empleado desde la API
      const empleadoResponse = await fetchApi(`${API_CONFIG.ENDPOINTS.EMPLEADOS}/${empleadoId}`);
      empleadoData = empleadoResponse.data || empleadoResponse;

      if (!empleadoData) {
        throw new Error("No se encontró información del empleado");
      }

      // Usar el ID numérico real del empleado, no el código
      const empleadoIdNumerico = empleadoData.id;
      const usuarioId = empleadoData.usuario_id;

      addMessage("📅 Verificando horario...", "info");

      // Cargar datos de horario y tolerancia
      const estadoActual = await cargarDatosHorario(empleadoIdNumerico, usuarioId);

      // Obtener hora actual
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
          mensaje = estadoActual.mensajeEspera || `Debes esperar ${estadoActual.minutosRestantes || 'más'} minutos`;
        }

        addMessage(`⚠️ ${mensaje}`, "warning");

        // Preparar el resultado ANTES de mostrar el modal
        const resultadoNoPuedeRegistrar = {
          success: false,
          message: mensaje,
          empleado: empleadoData,
          empleadoId: empleadoId,
          estadoHorario: estadoActual?.estadoHorario,
          noPuedeRegistrar: true,
          minutosRestantes: estadoActual?.minutosRestantes,
        };

        console.log("📋 No puede registrar:", resultadoNoPuedeRegistrar);

        // Desactivar pantalla de identificando
        setIdentificando(false);

        // IMPORTANTE: Establecer el resultado PRIMERO, luego mostrar el modal
        setResult(resultadoNoPuedeRegistrar);

        // En modo background, mostrar modal ahora que tenemos resultado
        if (backgroundMode) {
          setTimeout(() => {
            console.log("📋 Ejecutando setShowModal(true) - No puede registrar");
            setShowModal(true);
          }, 50);
        }

        return;
      }

      addMessage("📝 Registrando asistencia...", "info");

      // Obtener departamento del empleado usando el servicio compartido
      const departamentoId = await obtenerDepartamentoEmpleado(empleadoIdNumerico);

      // Registrar asistencia usando el servicio compartido
      const data = await registrarAsistenciaEnServidor({
        empleadoId: empleadoData.id,
        departamentoId,
        tipoRegistro: estadoActual?.tipoRegistro || 'entrada',
        clasificacion: estadoActual?.clasificacion || 'entrada',
        estadoHorario: estadoActual?.estadoHorario || 'puntual',
        metodoRegistro: 'HUELLA',
        token: localStorage.getItem('auth_token') || ''
      });

      // Actualizar último registro después de registrar
      const nuevoUltimo = await obtenerUltimoRegistro(empleadoIdNumerico);
      setUltimoRegistroHoy(nuevoUltimo);

      // Recalcular estado
      if (horarioInfo && toleranciaInfo) {
        const nuevoEstado = calcularEstadoRegistro(nuevoUltimo, horarioInfo, toleranciaInfo);
        setPuedeRegistrar(nuevoEstado.puedeRegistrar);
        setTipoSiguienteRegistro(nuevoEstado.tipoRegistro);
        setEstadoHorario(nuevoEstado.estadoHorario);
        setJornadaCompletada(nuevoEstado.jornadaCompleta);
      }

      // Usar la clasificación calculada localmente o la que devuelve el servidor
      const clasificacionFinal = data.data?.clasificacion || estadoActual?.clasificacion || 'entrada';
      const tipoRegistro = data.data?.tipo || estadoActual?.tipoRegistro || 'entrada';
      const tipoMovimiento = tipoRegistro === 'salida' ? 'SALIDA' : 'ENTRADA';

      // Obtener texto y emoji según la clasificación usando el servicio compartido
      const { estadoTexto, tipoEvento } = obtenerInfoClasificacion(clasificacionFinal, tipoRegistro);

      addMessage(`${tipoMovimiento === 'SALIDA' ? 'Salida' : 'Entrada'} registrada (${estadoTexto})`, tipoEvento);

      // Preparar el resultado ANTES de mostrar el modal
      const nuevoResultado = {
        success: true,
        message: "Asistencia registrada",
        empleado: empleadoData,
        empleadoId: empleadoId,
        tipoMovimiento: tipoMovimiento,
        hora: data.data?.fecha_registro
          ? new Date(data.data.fecha_registro).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
          : horaActual,
        estado: data.data?.estado || estadoActual?.estadoHorario || 'puntual',
        estadoTexto: estadoTexto,
        clasificacion: clasificacionFinal,
      };

      console.log("📋 Asistencia registrada exitosamente:", nuevoResultado);
      console.log("📋 backgroundMode:", backgroundMode, "- Mostrando modal...");

      // Desactivar pantalla de identificando
      setIdentificando(false);

      // IMPORTANTE: Establecer el resultado PRIMERO, luego mostrar el modal
      setResult(nuevoResultado);

      // En modo background, mostrar modal ahora que tenemos resultado
      if (backgroundMode) {
        // Usar setTimeout para asegurar que el estado se actualice antes de mostrar el modal
        setTimeout(() => {
          console.log("📋 Ejecutando setShowModal(true)");
          setShowModal(true);
        }, 50);
      }

      // Callback de éxito
      if (onSuccess) {
        onSuccess({
          empleadoId,
          matchScore,
          empleado: empleadoData,
          tipo_movimiento: tipoMovimiento,
          hora: horaActual,
          estado: data.data?.estado,
        });
      }

    } catch (error) {
      console.error("Error registrando asistencia:", error);
      addMessage(`❌ Error: ${error.message}`, "error");

      // Preparar el resultado de error
      const resultadoError = {
        success: false,
        message: error.message,
        empleadoId: empleadoId,
        empleado: empleadoData,
      };

      console.log("📋 Error en registro:", resultadoError);

      // Desactivar pantalla de identificando
      setIdentificando(false);

      // IMPORTANTE: Establecer el resultado PRIMERO, luego mostrar el modal
      setResult(resultadoError);

      // En modo background, mostrar modal con el error
      if (backgroundMode) {
        setTimeout(() => {
          console.log("📋 Ejecutando setShowModal(true) - Error");
          setShowModal(true);
        }, 50);
      }
    } finally {
      // NO resetear isProcessingAttendanceRef aquí - solo se resetea cuando se cierra el modal
      // Esto previene que mensajes duplicados del servidor creen múltiples registros
      setProcessingAttendance(false);
      setCurrentOperation("None");
      setStatus("ready");
    }
  };

  // Procesar login biométrico para obtener datos completos del empleado
  const procesarLoginBiometrico = async (empleadoId) => {
    // Verificar que el login esté habilitado Y el modal esté visible (prevenir llamadas automáticas)
    if (!loginHabilitado || !showModal) {
      console.warn("⚠️ Login no habilitado o modal no visible - ignorando llamada");
      return;
    }

    setProcessingLogin(true);

    // Detener el countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    try {
      const API_BASE = "https://9dm7dqf9-3002.usw3.devtunnels.ms/api";

      // Llamar al endpoint de autenticación biométrica para obtener datos completos
      const authResponse = await fetch(`${API_BASE}/auth/biometric`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ empleado_id: empleadoId }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al autenticar");
      }

      const authResult = await authResponse.json();

      if (!authResult.success) {
        throw new Error(authResult.message || "Error en autenticación");
      }

      // Extraer datos completos de la respuesta
      const { usuario, roles, permisos, esAdmin, token } = authResult.data;
      console.log("👤 Usuario autenticado:", usuario);
      console.log("📋 Roles:", roles);

      // Guardar token en localStorage
      if (token) {
        localStorage.setItem('auth_token', token);
        console.log("🔑 Token guardado");
      }

      // Preparar datos completos del usuario para la sesión
      const usuarioCompleto = {
        ...usuario,
        roles,
        permisos,
        esAdmin,
        token,
        metodoAutenticacion: "HUELLA",
      };

      // Guardar sesión
      guardarSesion(usuarioCompleto);

      // Cerrar modal
      if (onClose) onClose();

      // Callback de login exitoso con datos completos
      if (onLoginRequest) {
        onLoginRequest(usuarioCompleto);
      }

    } catch (error) {
      console.error("Error procesando login biométrico:", error);
      addMessage(`❌ Error: ${error.message}`, "error");
      // Reiniciar countdown si hay error
      setCountdown(6);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
            setTimeout(() => {
              if (onCloseRef.current) onCloseRef.current();
            }, 500);
            return 0;
          }
          return newValue;
        });
      }, 1000);
    } finally {
      setProcessingLogin(false);
    }
  };

  const handleServerMessage = (data) => {
    console.log("📨 Mensaje recibido:", data);

    switch (data.type) {
      case "authResult":
        // Respuesta de autenticación del middleware
        if (data.success) {
          console.log("🔐 [AsistenciaHuella] Autenticado correctamente");
          addMessage("🔐 Autenticado con middleware", "success");
          // Después de autenticarnos, solicitar estado del sistema
          sendCommand("getStatus");
        } else {
          console.error("❌ [AsistenciaHuella] Error de autenticación:", data.message);
          addMessage(`❌ Error de autenticación: ${data.message}`, "error");
        }
        break;

      case "status":
        setStatus(data.status);
        setStatusMessage(data.message);

        if (data.status === "ready" || data.status === "connected") {
          setCurrentOperation("None");
        }

        addMessage(`ℹ️ ${data.message}`, "info");
        break;

      case "systemStatus":
        setReaderConnected(data.readerConnected);
        setCurrentOperation(data.currentOperation);

        if (data.readerConnected) {
          addMessage("✅ Lector de huellas conectado", "success");
          if (!hasStartedIdentification.current) {
            if (data.currentOperation === "None") {
              // Lector listo, iniciar identificación
              hasStartedIdentification.current = true;
              setTimeout(() => {
                startIdentification();
              }, 500);
            } else {
              // Servidor en otro modo (enrollment previo o Identifying huérfano), forzar reset
              sendCommand("stopCapture");
              hasStartedIdentification.current = true;
              setTimeout(() => {
                startIdentification();
              }, 800);
            }
          }
        } else {
          addMessage("⚠️ Sin lector de huellas detectado", "warning");
        }
        break;

      case "captureComplete":
        console.log("📨 captureComplete recibido:", data);

        if (data.result === "identificationSuccess") {
          // PROTECCIÓN: Verificar si ya hay un registro en proceso ANTES de hacer cualquier cosa
          if (isProcessingAttendanceRef.current) {
            console.log('⚠️ [Huella] Ignorando captureComplete duplicado - ya hay registro en proceso');
            break; // Salir del case sin hacer nada
          }

          // Marcar inmediatamente que estamos procesando (ANTES de cualquier async)
          isProcessingAttendanceRef.current = true;

          // Mostrar inmediatamente pantalla de "Identificando..." en modo background
          if (backgroundMode) {
            setIdentificando(true);
            setShowModal(true);
          }

          // Huella identificada - registrar asistencia
          addMessage(`✅ Huella reconocida: ${data.userId}`, "success");
          addMessage(`🎯 Precisión: ${data.matchScore || 100}%`, "info");

          // Extraer el ID del empleado del userId (formato: emp_EMP00003)
          const idEmpleadoMatch = data.userId?.match(/emp_([A-Z0-9]+)/i);
          if (idEmpleadoMatch) {
            const empleadoId = idEmpleadoMatch[1];
            registrarAsistencia(empleadoId, data.matchScore || 100);
          } else {
            addMessage("❌ No se pudo extraer el ID del empleado", "error");
            setIdentificando(false);
            isProcessingAttendanceRef.current = false; // Resetear solo en error

            // En modo background, mostrar modal con el error
            if (backgroundMode) {
              setShowModal(true);
            }

            setResult({
              success: false,
              message: "Error identificando empleado",
            });
            setCurrentOperation("None");
            setStatus("ready");
          }

        } else if (data.result === "identificationFailed") {
          // Huella no reconocida - mostrar mensaje y cerrar automáticamente
          console.log("⚠️ Huella no reconocida");
          addMessage("❌ Huella no reconocida en el sistema", "error");

          // Mostrar modal con mensaje de error
          if (backgroundMode) {
            setShowModal(true);
          }

          setResult({
            success: false,
            message: "Huella no reconocida en el sistema",
            noReconocida: true, // Marcador especial para huella no identificada
          });

          setCurrentOperation("None");
          setStatus("ready");
          hasStartedIdentification.current = false;
        }
        break;

      case "cacheReloaded":
        addMessage(`✅ Caché actualizado: ${data.templatesCount} huellas`, "success");
        console.log("[CACHE] Caché de templates recargado:", data);
        break;

      case "readerConnection":
        // Actualización instantánea del estado del lector (conectado/desconectado)
        console.log("🔌 Cambio de conexión del lector:", data);
        setReaderConnected(data.connected);
        if (data.connected) {
          addMessage("✅ Lector de huellas conectado", "success");
          // Reiniciar identificación si el lector se reconecta
          if (!hasStartedIdentification.current) {
            hasStartedIdentification.current = true;
            setTimeout(() => {
              startIdentification();
            }, 500);
          }
        } else {
          addMessage("⚠️ Lector de huellas desconectado", "warning");
          setCurrentOperation("None");
          hasStartedIdentification.current = false;
        }
        break;

      case "error":
        addMessage(`❌ Error: ${data.message}`, "error");
        setCurrentOperation("None");
        setStatus("error");
        break;

      default:
        console.log("Tipo de mensaje desconocido:", data.type);
    }
  };

  const sendCommand = (command, params = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        command,
        ...params,
      };
      console.log("📤 Enviando comando:", payload);
      wsRef.current.send(JSON.stringify(payload));
    } else {
      addMessage("❌ No conectado al servidor", "error");
    }
  };

  const addMessage = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString("es-MX");
    setMessages((prev) =>
      [
        {
          id: Date.now() + Math.random(),
          type,
          message,
          timestamp,
        },
        ...prev,
      ].slice(0, 50)
    );
  };

  const startIdentification = () => {
    if (currentOperation !== "None") {
      addMessage("⚠️ Ya hay una operación en curso", "warning");
      return;
    }

    setResult(null);
    setCurrentOperation("Identifying");
    addMessage("🔍 Iniciando identificación...", "info");

    // Obtener la URL del API
    const API_URL = "https://9dm7dqf9-3002.usw3.devtunnels.ms/api";

    // Enviar comando de identificación
    sendCommand("startIdentification", { apiUrl: API_URL });
  };

  const cancelOperation = () => {
    sendCommand("cancelEnrollment");
    setCurrentOperation("None");
    hasStartedIdentification.current = false;
    addMessage("⏹️ Operación cancelada", "warning");
    // Reiniciar identificación después de cancelar
    if (connected && readerConnected) {
      setTimeout(() => startIdentification(), 500);
    }
  };

  const isProcessing = currentOperation !== "None" || processingAttendance;

  // Función para cerrar el modal (diferente comportamiento en background mode)
  const handleCloseModal = () => {
    // SIEMPRE deshabilitar login al cerrar para prevenir llamadas automáticas
    setLoginHabilitado(false);
    // Resetear ref de procesamiento para permitir nuevos registros
    isProcessingAttendanceRef.current = false;

    if (backgroundMode) {
      // En modo background, solo ocultar el modal y reiniciar para siguiente lectura
      setShowModal(false);
      setResult(null);
      setMessages([]);
      hasStartedIdentification.current = false;
      // Reiniciar identificación para estar listo para la siguiente huella
      if (connected && readerConnected) {
        setTimeout(() => startIdentification(), 500);
      }
    } else {
      // En modo normal, cerrar completamente
      if (onClose) onClose();
    }
  };

  // No renderizar nada si no debe mantener conexión
  if (!shouldMaintainConnection) {
    return null;
  }

  // En modo background, no mostrar UI hasta que se detecte huella
  if (backgroundMode && !showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 p-2 rounded-lg">
                <Fingerprint className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Registro de Asistencia
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Huella Digital
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${connected
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  }`}
              >
                {connected ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                <span>{connected ? "Conectado" : "Desconectado"}</span>
              </div>

              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Reader Status */}
            <div
              className={`flex items-center justify-between p-4 rounded-xl ${readerConnected
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                }`}
            >
              <div className="flex items-center gap-3">
                <Fingerprint
                  className={`w-6 h-6 ${readerConnected
                    ? "text-green-600 dark:text-green-400"
                    : "text-yellow-600 dark:text-yellow-400"
                    }`}
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Lector de Huellas
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {readerConnected ? "Conectado y listo" : "Desconectado"}
                  </p>
                </div>
              </div>
              {!connected && (
                <button
                  onClick={connectToServer}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Conectar
                </button>
              )}
            </div>

            {/* Main Action Area */}
            {identificando ? (
              /* Pantalla de Identificando... */
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
                  <div className="relative">
                    <Fingerprint className="w-24 h-24 mx-auto mb-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 border-4 border-blue-300 dark:border-blue-600 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
                    </div>
                  </div>
                  <p className="text-gray-900 dark:text-white font-bold text-xl mb-2 mt-4">
                    Identificando...
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Por favor espera mientras verificamos tu identidad
                  </p>
                </div>
              </div>
            ) : !result ? (
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center mb-4">
                  <Fingerprint
                    className={`w-20 h-20 mx-auto mb-3 text-blue-600 dark:text-blue-400 ${connected && readerConnected ? "animate-pulse" : ""
                      }`}
                  />
                  <p className="text-gray-900 dark:text-white font-medium mb-1">
                    {!connected
                      ? "Conectando al servidor..."
                      : !readerConnected
                        ? "Esperando lector de huellas..."
                        : "Coloca tu dedo en el lector"}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {!connected
                      ? "Por favor espera"
                      : !readerConnected
                        ? "Asegúrate de que el lector esté conectado"
                        : "El sistema te identificará automáticamente"}
                  </p>
                </div>

                {(processingAttendance || cargandoDatosHorario) && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mb-4">
                    <p className="text-gray-900 dark:text-white text-center text-sm flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      {cargandoDatosHorario ? "Verificando horario..." : "Registrando asistencia..."}
                    </p>
                  </div>
                )}

                {/* Solo mostrar botón cancelar cuando hay operación en curso */}
                {currentOperation !== "None" && (
                  <div className="flex gap-3">
                    <button
                      onClick={cancelOperation}
                      className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Result Display */
              <div
                className={`rounded-xl p-6 text-center ${result.success
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

                    {/* Separador */}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-4" />

                    {/* Opción de abrir sesión */}
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                      ¿Deseas abrir tu sesión?
                    </p>

                    <button
                      onClick={() => procesarLoginBiometrico(result.empleadoId)}
                      disabled={processingLogin || !loginHabilitado}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-3"
                    >
                      {processingLogin ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Cargando datos...
                        </>
                      ) : !loginHabilitado ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Preparando...
                        </>
                      ) : (
                        <>
                          <LogIn className="w-5 h-5" />
                          Abrir Sesión
                        </>
                      )}
                    </button>

                    {/* Contador de cierre automático */}
                    {!processingLogin && (
                      <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                        <Timer className="w-4 h-4" />
                        <span>
                          Esta ventana se cerrará en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                        </span>
                      </div>
                    )}
                  </>
                ) : result.noPuedeRegistrar ? (
                  /* No puede registrar (fuera de horario o jornada completada) */
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
                    {/* Badge de estado de horario */}
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
                          ? `Espera ${result.minutosRestantes || ''} min`
                          : "Fuera de horario"}
                    </span>

                    {/* Separador */}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-4" />

                    {/* Opción de abrir sesión */}
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                      ¿Deseas abrir tu sesión de todas formas?
                    </p>

                    <button
                      onClick={() => procesarLoginBiometrico(result.empleadoId)}
                      disabled={processingLogin || !loginHabilitado}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-3"
                    >
                      {processingLogin ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Cargando datos...
                        </>
                      ) : !loginHabilitado ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Preparando...
                        </>
                      ) : (
                        <>
                          <LogIn className="w-5 h-5" />
                          Abrir Sesión
                        </>
                      )}
                    </button>

                    {/* Contador de cierre automático */}
                    {!processingLogin && (
                      <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                        <Timer className="w-4 h-4" />
                        <span>
                          Esta ventana se cerrará en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                        </span>
                      </div>
                    )}
                  </>
                ) : result.noReconocida ? (
                  /* Huella no reconocida */
                  <>
                    <XCircle className="w-16 h-16 mx-auto mb-3 text-red-600 dark:text-red-400" />
                    <p className="text-red-800 dark:text-red-300 font-bold text-lg mb-2">
                      Huella No Reconocida
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                      Tu huella no se encuentra registrada en el sistema
                    </p>

                    {/* Contador de cierre automático */}
                    <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-4">
                      <Timer className="w-4 h-4" />
                      <span>
                        Esta ventana se cerrará en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                      </span>
                    </div>

                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Intentar de nuevo
                    </button>
                  </>
                ) : (
                  /* Error real */
                  <>
                    <XCircle className="w-16 h-16 mx-auto mb-3 text-red-600 dark:text-red-400" />
                    <p className="text-red-800 dark:text-red-300 font-bold text-lg mb-1">
                      Error en el Registro
                    </p>
                    {result.empleado?.nombre && (
                      <p className="text-gray-700 dark:text-gray-300 text-lg mb-2">
                        {result.empleado.nombre}
                      </p>
                    )}
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      {result.message}
                    </p>

                    {/* Mostrar opción de abrir sesión si tenemos el empleadoId */}
                    {result.empleadoId && (
                      <>
                        {/* Separador */}
                        <div className="border-t border-gray-200 dark:border-gray-700 my-4" />

                        {/* Opción de abrir sesión */}
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                          ¿Deseas abrir tu sesión de todas formas?
                        </p>

                        <button
                          onClick={() => procesarLoginBiometrico(result.empleadoId)}
                          disabled={processingLogin || !loginHabilitado}
                          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-3"
                        >
                          {processingLogin ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Cargando datos...
                            </>
                          ) : !loginHabilitado ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Preparando...
                            </>
                          ) : (
                            <>
                              <LogIn className="w-5 h-5" />
                              Abrir Sesión
                            </>
                          )}
                        </button>

                        {/* Contador de cierre automático */}
                        {!processingLogin && (
                          <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-3">
                            <Timer className="w-4 h-4" />
                            <span>
                              Esta ventana se cerrará en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    <button
                      onClick={handleCloseModal}
                      className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Intentar de nuevo
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Logs Panel - Minimalist */}
            {messages.length > 0 && !result && (
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Registro de Eventos
                  </h3>
                  <button
                    onClick={() => setMessages([])}
                    className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Limpiar
                  </button>
                </div>

                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {messages.slice(0, 4).map((log) => (
                    <div
                      key={log.id}
                      className="text-xs text-gray-600 dark:text-gray-400 flex gap-2"
                    >
                      <span className="text-gray-400">{log.timestamp}</span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
