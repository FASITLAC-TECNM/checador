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
import { useConnectivity } from "./useConnectivity";

export const useAttendanceRegistration = (onClose, onSuccess, onLoginRequest) => {
    const [showPassword, setShowPassword] = useState(false);
    const [usuarioOCorreo, setUsuarioOCorreo] = useState("");
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [countdown, setCountdown] = useState(6);
    const [errorMessage, setErrorMessage] = useState("");
    
    // Conectividad global
    const { isDatabaseConnected } = useConnectivity();

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

        if (result) {
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
            
            // SHORt-CIRCUIT: Si sabemos globalmente que la BD central/API está desconectada,
            // forzamos tiro al catch del offline instantáneamente, sin esperar el fetch.
            if (!isDatabaseConnected) {
                 const offlineForceError = new Error("Server Error (Offline mode forced)");
                 offlineForceError.isApiOffline = true;
                 throw offlineForceError;
            }

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
                // Si la API responde pero con error de servidor (ej. 500, 502, 503, 504)
                if (loginResponse.status >= 500) {
                    // Despachar evento para notificar al contexto de la caida instantanea
                    window.dispatchEvent(new CustomEvent("api-offline"));
                    const error = new Error(`Server Error: ${loginResponse.status}`);
                    error.isApiOffline = true;
                    throw error;
                }
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
            usuarioData = responseData.usuario || responseData;
            token = responseData.token;

            // Asegurar que los campos de admin/roles se preserven desde responseData
            if (responseData.esAdmin !== undefined && usuarioData.esAdmin === undefined) {
                usuarioData.esAdmin = responseData.esAdmin;
            }
            if (responseData.es_admin !== undefined && usuarioData.es_admin === undefined) {
                usuarioData.es_admin = responseData.es_admin;
            }
            if (responseData.roles && !usuarioData.roles) {
                usuarioData.roles = responseData.roles;
            }
            if (responseData.permisos && !usuarioData.permisos) {
                usuarioData.permisos = responseData.permisos;
            }

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

            // 3. Registrar asistencia (Validaciones ahora en Backend)
            console.log("📝 Registrando asistencia...");
            const departamentoId = await obtenerDepartamentoEmpleado(empleadoId);

            const now = new Date();
            const horaActual = now.toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
            });

            const data = await registrarAsistenciaEnServidor({
                empleadoId,
                departamentoId,
                metodoRegistro: 'PIN',
                token
            });

            const clasificacionFinal = data.data?.estado || 'puntual';
            const tipoRegistro = data.data?.tipo || 'entrada';
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
                || error.message.includes('ERR_INTERNET_DISCONNECTED')
                || error.isApiOffline // API server returned 500+ error
                || error.message.includes('Server Error'); // Propagated from custom throws

            if (isNetworkError && window.electronAPI && window.electronAPI.offlineDB) {
                console.log('📴 [PinModal] Sin conexión — intentando autenticación offline...');

                try {
                    const {
                        identificarPorPinOffline,
                        cargarDatosOffline,
                        guardarAsistenciaOffline
                    } = await import('../services/offlineAuthService');
                    const empleadoIdentificado = await identificarPorPinOffline(usuarioOCorreo.trim(), pin.trim());

                    if (!empleadoIdentificado) {
                        throw new Error('Credenciales inválidas (Offline)');
                    }

                    console.log(`✅ [PinModal] Empleado identificado offline: ${empleadoIdentificado.nombre}`);
                    const empleadoId = empleadoIdentificado.empleado_id;

                    const empleadoFull = await window.electronAPI.offlineDB.getEmpleado(empleadoId);

                    // 1. LOGIN OFFLINE SILENCIOSO (Solo identificamos)
                    // Si viene desde un flujo de login a sesión, esto proveerá el context.
                    // 2. Si es registro de asistencia directa (sin UI intermedio), se va por la cola cruda:
                    await guardarAsistenciaOffline({
                        empleadoId,
                        metodoRegistro: 'PIN',
                    });

                    // Mensaje de voz offline neutral genérico
                    const utterance = new SpeechSynthesisUtterance(
                        `Asistencia guardada localmente`
                    );
                    utterance.lang = "es-MX";
                    utterance.rate = 0.9;
                    window.speechSynthesis.speak(utterance);

                    setResult({
                        success: true,
                        offline: true,
                        message: "Asistencia guardada en dispositivo (Offline). Se sincronizará en automático",
                        empleado: empleadoFull || empleadoIdentificado,
                        tipoMovimiento: "OFFLINE", // No sabemos si es entrada/salida
                        hora: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
                        estado: "Pendiente",
                        estadoTexto: '📴 Modo Offline',
                        clasificacion: 'guardado local',
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

            // Detectar errores devueltos por la API para mostrar UI amarilla
            const responseData = error.responseData;
            const isBlockCompletedError = error.message && (
                (error.message.includes('bloque') && error.message.includes('completado')) ||
                (error.message.includes('jornada') && error.message.includes('completada'))
            );

            let finalErrorMessage = error.message || "Error al registrar asistencia";
            let isFaltaDirecta = false;
            if (finalErrorMessage.includes("falta directa")) {
                finalErrorMessage = "Registro denegado: Se te ha registrado una falta directa en este turno. No puedes registrar asistencia.";
                isFaltaDirecta = true;
            }

            setErrorMessage(finalErrorMessage);

            setResult({
                success: false,
                message: finalErrorMessage,
                usuario: usuarioData,
                token: token,
                empleado: empleadoData,
                noPuedeRegistrar: responseData?.noPuedeRegistrar || isBlockCompletedError,
                estadoHorario: responseData?.estadoHorario || (isBlockCompletedError ? 'completado' : undefined),
                minutosRestantes: responseData?.minutosRestantes
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

    const handleLoginRequest = async (userData) => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }

        // Si userData no se pasa, obtener datos completos para la sesión
        if (!userData && onLoginRequest && result) {
            const empleadoId = result.empleado?.id || result.empleado?.empleado_id || result.usuario?.empleado_id;
            const isOffline = result.offline || !navigator.onLine;

            // Solo llamar a /api/auth/biometric si hay conexión (en offline no se necesitan permisos de admin)
            if (empleadoId && !isOffline) {
                try {
                    console.log("🔐 Obteniendo datos completos de sesión vía /api/auth/biometric...");
                    const authResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH}/biometric`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ empleado_id: empleadoId }),
                    });

                    if (authResponse.ok) {
                        const authResult = await authResponse.json();
                        if (authResult.success && authResult.data) {
                            const { usuario, roles, permisos, esAdmin, token: authToken } = authResult.data;

                            if (authToken) {
                                localStorage.setItem('auth_token', authToken);
                            }

                            userData = {
                                ...usuario,
                                roles,
                                permisos,
                                esAdmin,
                                token: authToken,
                                metodoAutenticacion: "PIN",
                            };
                            console.log("✅ Datos completos obtenidos:", userData);
                        }
                    }
                } catch (error) {
                    console.error("❌ Error obteniendo datos completos:", error);
                }
            }

            // Fallback: construir desde result (offline o si la llamada falló)
            if (!userData) {
                userData = {
                    ...result.usuario,
                    rfc: result.empleado?.rfc || result.usuario?.rfc,
                    nss: result.empleado?.nss || result.usuario?.nss,
                    horario_id: result.empleado?.horario_id || result.usuario?.horario_id,
                    es_empleado: result.noEsEmpleado ? false : true,
                    empleado_id: empleadoId,
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
