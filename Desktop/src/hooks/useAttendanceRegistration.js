import { useState, useRef, useEffect } from "react";
import { API_CONFIG, fetchApi } from "../config/apiEndPoint";
import { agregarEvento } from "../services/bitacoraService";
import {
    cargarDatosAsistencia,
    obtenerDepartamentoEmpleado,
    registrarAsistenciaEnServidor,
    obtenerInfoClasificacion,
    formatearTiempoRestante
} from "../services/asistenciaLogicService";

export const useAttendanceRegistration = (onClose, onSuccess, onLoginRequest) => {
    const [showPassword, setShowPassword] = useState(false);
    const [usuarioOCorreo, setUsuarioOCorreo] = useState("");
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [countdown, setCountdown] = useState(6);
    const [errorMessage, setErrorMessage] = useState("");

    // Refs
    const countdownRef = useRef(null);
    const onCloseRef = useRef(onClose);
    const isSubmittingRef = useRef(false);

    // Mantener referencia actualizada de onClose
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

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
    }, [result?.success, result?.noPuedeRegistrar, result?.noEsEmpleado, result?.sinHorario]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Prevenir envíos duplicados (doble clic)
        if (isSubmittingRef.current) {
            console.log("⚠️ Envío en proceso, ignorando click duplicado");
            return;
        }
        isSubmittingRef.current = true;

        // Variables para mantener contexto en caso de error
        let usuarioData = null;
        let token = null;
        let empleadoData = null;

        if (!usuarioOCorreo.trim() || !pin.trim()) {
            setErrorMessage("Por favor ingresa tu usuario/correo y PIN");
            isSubmittingRef.current = false;
            return;
        }

        setLoading(true);
        setErrorMessage("");

        try {
            console.log("🔐 Verificando credenciales...");

            // 1. Verificar credenciales con el endpoint de login por PIN
            const loginResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREDENCIALES}/pin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    usuario: usuarioOCorreo.trim(),
                    pin: pin.trim(),
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
            // Actualizar variables de contexto
            usuarioData = responseData.usuario;
            token = responseData.token;

            // Guardar token temporalmente
            if (token) {
                localStorage.setItem('auth_token', token);
                if (window.electronAPI && window.electronAPI.syncManager) {
                    try {
                        window.electronAPI.syncManager.updateToken(token);
                    } catch (e) {
                        // Silenciar errores de IPC
                    }
                }
            }

            // 2. Obtener datos del empleado
            let empleadoId = usuarioData?.empleado_id || responseData.empleado?.id;
            // Actualizar variable de contexto
            empleadoData = responseData.empleado;

            if (!empleadoId) {
                agregarEvento({
                    user: usuarioData?.nombre || usuarioData?.username || usuarioOCorreo,
                    action: "Intento de registro - Usuario no asociado a empleado",
                    type: "warning",
                });

                setResult({
                    success: false,
                    noEsEmpleado: true,
                    message: "Tu cuenta no está asociada a un empleado o no tiene credenciales",
                    usuario: usuarioData,
                    token: token,
                });
                return;
            }

            if (!empleadoData || !empleadoData.nombre) {
                const empResponse = await fetchApi(`${API_CONFIG.ENDPOINTS.EMPLEADOS}/${empleadoId}`);
                empleadoData = empResponse.data || empResponse;
            }

            console.log("👤 Empleado identificado:", empleadoData?.nombre || empleadoId);

            // 3. Verificar horario
            console.log("📅 Verificando horario...");
            const datosAsistencia = await cargarDatosAsistencia(empleadoId, usuarioData.id);
            const estadoActual = datosAsistencia.estado;

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

            // 4. Registrar asistencia
            console.log("📝 Registrando asistencia...");
            const departamentoId = await obtenerDepartamentoEmpleado(empleadoId);

            const data = await registrarAsistenciaEnServidor({
                empleadoId,
                departamentoId,
                tipoRegistro: estadoActual?.tipoRegistro || 'entrada',
                clasificacion: estadoActual?.clasificacion || 'entrada',
                estadoHorario: estadoActual?.estadoHorario || 'puntual',
                metodoRegistro: 'PIN',
                token
            });

            const clasificacionFinal = data.data?.clasificacion || estadoActual?.clasificacion || 'entrada';
            const tipoRegistro = data.data?.tipo || estadoActual?.tipoRegistro || 'entrada';
            const tipoMovimiento = tipoRegistro === 'salida' ? 'SALIDA' : 'ENTRADA';

            const { estadoTexto, tipoEvento } = obtenerInfoClasificacion(clasificacionFinal, tipoRegistro);

            agregarEvento({
                user: empleadoData?.nombre || usuarioOCorreo,
                action: `${tipoMovimiento === 'SALIDA' ? 'Salida' : 'Entrada'} registrada (${estadoTexto}) - PIN`,
                type: tipoEvento,
            });

            // Mensaje de voz estandarizado
            const tipoVoz = tipoMovimiento === 'SALIDA' ? 'salida' : 'entrada';
            const voiceMessage = `Registro ${tipoVoz} exitoso`;

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
                console.log('📴 [PinModal] Sin conexión — intentando autenticación offline...');

                try {
                    const {
                        identificarPorPinOffline,
                        cargarDatosOffline,
                        guardarAsistenciaOffline
                    } = await import('../services/offlineAuthService');

                    const empleadoIdentificado = await identificarPorPinOffline(pin.trim());

                    if (!empleadoIdentificado) {
                        throw new Error('Credenciales inválidas (Offline)');
                    }

                    console.log(`✅ [PinModal] Empleado identificado offline: ${empleadoIdentificado.nombre}`);
                    const empleadoId = empleadoIdentificado.empleado_id;

                    const empleadoFull = await window.electronAPI.offlineDB.getEmpleado(empleadoId);
                    const datosOffline = await cargarDatosOffline(empleadoId);
                    const estadoActual = datosOffline.estado;

                    if (estadoActual && !estadoActual.puedeRegistrar) {
                        console.warn(`⚠️ [PinModal] Bloqueo offline: ${estadoActual.mensaje}`);

                        const usuarioSimulado = {
                            id: empleadoIdentificado.usuario_id,
                            username: usuarioOCorreo,
                            nombre: empleadoIdentificado.nombre,
                            es_empleado: true,
                            empleado_id: empleadoId,
                            offline: true
                        };

                        setResult({
                            success: false,
                            message: estadoActual.mensaje,
                            empleado: empleadoFull || empleadoIdentificado,
                            usuario: usuarioSimulado,
                            token: null,
                            estadoHorario: estadoActual.estadoHorario,
                            noPuedeRegistrar: true,
                            minutosRestantes: estadoActual.minutosRestantes,
                            mensajeEspera: estadoActual.mensajeEspera
                        });
                        return;
                    }

                    await guardarAsistenciaOffline({
                        empleadoId,
                        tipo: estadoActual?.tipoRegistro || 'entrada',
                        estado: estadoActual?.clasificacion || 'puntual',
                        metodoRegistro: 'PIN',
                        departamentoId: datosOffline.departamento?.id || null,
                    });

                    const now = new Date();
                    const horaActual = now.toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                    });

                    const tipoMovimiento = (estadoActual?.tipoRegistro || 'entrada') === 'salida' ? 'SALIDA' : 'ENTRADA';

                    // Mensaje de voz offline estandarizado
                    const tipoVozOffline = tipoMovimiento === 'SALIDA' ? 'salida' : 'entrada';
                    const utterance = new SpeechSynthesisUtterance(
                        `Registro ${tipoVozOffline} exitoso`
                    );
                    utterance.lang = "es-MX";
                    utterance.rate = 0.9;
                    window.speechSynthesis.speak(utterance);

                    setResult({
                        success: true,
                        offline: true,
                        message: "Asistencia registrada (modo offline)",
                        empleado: empleadoFull || empleadoIdentificado,
                        tipoMovimiento,
                        hora: horaActual,
                        estado: estadoActual?.clasificacion || 'puntual',
                        estadoTexto: '📴 Modo Offline',
                        clasificacion: estadoActual?.clasificacion || 'puntual',
                        usuario: {
                            id: empleadoIdentificado.usuario_id,
                            nombre: empleadoIdentificado.nombre,
                            es_empleado: true,
                            empleado_id: empleadoId,
                            offline: true
                        }
                    });
                    return;

                } catch (offlineError) {
                    console.error('❌ [PinModal] Error en flujo offline:', offlineError);
                    setErrorMessage(offlineError.message || "Error en validación offline");
                    setResult({
                        success: false,
                        message: offlineError.message || 'Error procesando solicitud offline',
                    });
                    return;
                }
            }

            agregarEvento({
                user: usuarioOCorreo,
                action: `Error en registro con PIN - ${error.message}`,
                type: "error",
            });

            // Detectar errores de "bloque completado" para mostrar UI amarilla en lugar de roja
            const isBlockCompletedError = error.message && (
                (error.message.includes('bloque') && error.message.includes('completado')) ||
                (error.message.includes('jornada') && error.message.includes('completada'))
            );

            setErrorMessage(error.message || "Error al registrar asistencia");

            setResult({
                success: false,
                message: error.message || "Error al registrar asistencia",
                // Pasar datos recuperados para permitir login
                usuario: usuarioData,
                token: token,
                empleado: empleadoData,
                // Si es error de bloque completado, marcar como noPuedeRegistrar (UI amarilla)
                noPuedeRegistrar: isBlockCompletedError,
                // Si es UI amarilla, pasamos estadoHorario genérico si no lo tenemos
                estadoHorario: isBlockCompletedError ? 'completado' : undefined
            });
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const handleRetry = () => {
        setResult(null);
        setErrorMessage("");
        setPin("");
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleLoginRequest = (userData) => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }

        // Si userData no se pasa, intentamos construirlo desde result
        if (!userData && onLoginRequest && result) {
            if (result.noEsEmpleado) {
                userData = {
                    ...result.usuario,
                    es_empleado: false,
                    token: result.token
                };
            } else {
                userData = {
                    ...result.usuario,
                    ...result.empleado,
                    es_empleado: true,
                    empleado_id: result.empleado?.empleado_id || result.empleado?.id || result.usuario?.empleado_id,
                    nombre: result.empleado?.nombre || result.usuario?.nombre || result.usuario?.username,
                    token: result.token
                };
            }
        }

        if (userData) {
            console.log("📤 Datos para sesión:", userData);
            onLoginRequest(userData);
            if (onCloseRef.current) onCloseRef.current();
        }
    };


    return {
        showPassword,
        usuarioOCorreo,
        setUsuarioOCorreo,
        pin,
        setPin,
        loading,
        result,
        errorMessage,
        countdown,
        handleSubmit,
        handleRetry,
        togglePasswordVisibility,
        handleLoginRequest,
    };
};
