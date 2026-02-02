import { useState, useEffect, useRef } from "react";
import { Camera, User, ClipboardList, Bell, Fingerprint } from "lucide-react";
import { formatTime, formatDate, formatDay } from "../utils/dateHelpers";
import { notices } from "../constants/notices";
import CameraModal from "../components/kiosk/CameraModal";
import PinModal from "../components/kiosk/PinModal";
import LoginModal from "../components/kiosk/LoginModal";
import BitacoraModal from "../components/kiosk/BitacoraModal";
import NoticeDetailModal from "../components/kiosk/NoticeDetailModal";
import SessionScreen from "./SessionScreen";
import { agregarEvento } from "../services/bitacoraService";
import { cerrarSesion } from "../services/biometricAuthService";
import { useConnectivity } from "../hooks/useConnectivity";
import { ConnectionStatusPanel } from "../components/common/ConnectionStatus";
import AsistenciaHuella from "../components/kiosk/AsistenciaHuella";
import AsistenciaFacial from "../components/kiosk/AsistenciaFacial";
import { useCamera } from "../context/CameraContext";

export default function KioskScreen() {
  // Leer configuración de métodos de checado
  const [checkMethods, setCheckMethods] = useState(() => {
    const savedPreferences = localStorage.getItem("userPreferences");
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        return parsed.checkMethods || {
          facial: { enabled: true, order: 1 },
          fingerprint: { enabled: false, order: 2 },
          userLogin: { enabled: false, order: 3 },
        };
      } catch (error) {
        return {
          facial: { enabled: true, order: 1 },
          fingerprint: { enabled: false, order: 2 },
          userLogin: { enabled: false, order: 3 },
        };
      }
    }
    return {
      facial: { enabled: true, order: 1 },
      fingerprint: { enabled: false, order: 2 },
      userLogin: { enabled: false, order: 3 },
    };
  });

  // Hook de conectividad
  const { isInternetConnected, isDatabaseConnected } = useConnectivity();

  // Hook de cámara singleton
  const { initCamera, releaseCamera, attachToVideo } = useCamera();

  const [time, setTime] = useState(new Date());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null); // Almacenar datos del usuario
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBitacora, setShowBitacora] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState("asistencia");
  const [captureProgress, setCaptureProgress] = useState(0);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const [captureFailed, setCaptureFailed] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const hasProcessedCapture = useRef(false);
  const [showBiometricReader, setShowBiometricReader] = useState(false);
  const [showAsistenciaFacial, setShowAsistenciaFacial] = useState(false);

  // Obtener métodos activos ordenados
  const getActiveMethods = () => {
    return Object.entries(checkMethods)
      .filter(([, config]) => config.enabled)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([key]) => key);
  };

  const activeMethods = getActiveMethods();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Recargar preferencias cuando el usuario cierra sesión (isLoggedIn cambia a false)
  useEffect(() => {
    if (!isLoggedIn) {
      const savedPreferences = localStorage.getItem("userPreferences");
      if (savedPreferences) {
        try {
          const parsed = JSON.parse(savedPreferences);
          if (parsed.checkMethods) {
            setCheckMethods(parsed.checkMethods);
          }
        } catch (error) {
          console.error("Error al cargar métodos de checado:", error);
        }
      }
    }
  }, [isLoggedIn]);

  // Escuchar cambios desde otras ventanas/pestañas
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Solo responder a cambios de userPreferences desde otras ventanas
      if (e.key === "userPreferences" && !isLoggedIn) {
        const savedPreferences = e.newValue;
        if (savedPreferences) {
          try {
            const parsed = JSON.parse(savedPreferences);
            if (parsed.checkMethods) {
              setCheckMethods(parsed.checkMethods);
            }
          } catch (error) {
            console.error("Error al actualizar métodos de checado:", error);
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [isLoggedIn]);

  // Atajo para resetear configuración: Ctrl+Shift+R
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "R") {
        e.preventDefault();
        const confirmReset = confirm(
          "¿Está seguro que desea resetear la configuración de la aplicación? Esto eliminará todos los datos guardados y deberá volver a afiliar el equipo."
        );
        if (confirmReset) {
          localStorage.clear();
          if (window.electronAPI && window.electronAPI.configRemove) {
            window.electronAPI.configRemove("appConfigured");
          }
          alert("Configuración reseteada. La aplicación se recargará.");
          window.location.reload();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Manejar detección de rostro exitosa
  const handleFaceDetected = async (descriptor) => {
    if (hasProcessedCapture.current) return;
    hasProcessedCapture.current = true;

    setCaptureProgress(100);

    try {
      console.log("🔍 Verificando rostro con el servidor...");

      // Verificar si estamos en Electron
      if (!window.electronAPI) {
        throw new Error("Esta funcionalidad requiere Electron");
      }

      // Verificar usuario mediante Electron (que se comunica con el backend)
      const result = await window.electronAPI.verificarUsuario(descriptor);

      if (result.success) {
        // ✅ Rostro identificado correctamente
        const nombreUsuario = result.empleado.nombre || "Usuario";
        const empleadoId = result.empleado.id;

        // Si es modo asistencia, registrar la asistencia
        if (cameraMode === "asistencia") {
          console.log("📝 Registrando asistencia para empleado:", empleadoId);
          const asistenciaResult = await window.electronAPI.registrarAsistenciaFacial(empleadoId);

          if (!asistenciaResult.success) {
            throw new Error(`Error registrando asistencia: ${asistenciaResult.message}`);
          }

          console.log("✅ Asistencia registrada:", asistenciaResult.data);
        }

        setCaptureSuccess(true);

        agregarEvento({
          user: nombreUsuario,
          action: `${
            cameraMode === "asistencia"
              ? "Registro de asistencia"
              : "Inicio de sesión"
          } exitoso - Reconocimiento facial`,
          type: "success",
        });

        const successMessage =
          cameraMode === "asistencia"
            ? `Registro exitoso, ${nombreUsuario}`
            : `Acceso concedido, ${nombreUsuario}`;

        const utterance = new SpeechSynthesisUtterance(successMessage);
        utterance.lang = "es-MX";
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);

        setTimeout(() => {
          setIsClosing(true);
          setTimeout(() => {
            setShowCamera(false);
            if (cameraMode === "login") {
              setUsuarioActual(result.empleado);
              setIsLoggedIn(true);
            }
          }, 500);
        }, 3000);
      } else {
        // ❌ Rostro no identificado
        setCaptureFailed(true);

        agregarEvento({
          user: "Sistema",
          action: `Intento de ${
            cameraMode === "asistencia" ? "registro de asistencia" : "acceso"
          } - Rostro no identificado`,
          type: "error",
        });

        const errorMessage = "Rostro no identificado. Intenta de nuevo.";
        const utterance = new SpeechSynthesisUtterance(errorMessage);
        utterance.lang = "es-MX";
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);

        setTimeout(() => {
          setIsClosing(true);
          setTimeout(() => {
            setShowCamera(false);
          }, 500);
        }, 2000);
      }
    } catch (error) {
      console.error("❌ Error verificando rostro:", error);
      setCaptureFailed(true);

      agregarEvento({
        user: "Sistema",
        action: `Error en reconocimiento facial: ${error.message}`,
        type: "error",
      });

      setTimeout(() => {
        setIsClosing(true);
        setTimeout(() => {
          setShowCamera(false);
        }, 500);
      }, 2000);
    }
  };

  // Manejar cámara usando el contexto singleton
  useEffect(() => {
    if (showCamera) {
      setCaptureProgress(0);
      setCaptureSuccess(false);
      setCaptureFailed(false);
      setIsClosing(false);
      hasProcessedCapture.current = false;

      // Inicializar cámara usando el contexto (reutiliza stream existente)
      initCamera()
        .then((mediaStream) => {
          const video = document.getElementById("cameraVideo");
          if (video) {
            video.srcObject = mediaStream;
          }
        })
        .catch((err) => {
          agregarEvento({
            user: "Sistema",
            action: "Error al acceder a la cámara - Permisos denegados",
            type: "error",
          });

          alert(
            "No se pudo acceder a la cámara. Por favor, verifica los permisos."
          );
        });
    } else {
      // Liberar uso de cámara (solo se detiene si nadie más la usa)
      releaseCamera();
    }
  }, [showCamera, cameraMode, initCamera, releaseCamera]);

  // Manejar login exitoso
  const handleLoginSuccess = (usuario) => {
    console.log("Login exitoso:", usuario);

    // IMPORTANTE: Cerrar TODOS los modales antes de cambiar el estado de login
    setShowLoginModal(false);
    setShowBiometricReader(false);
    setShowCamera(false);
    setShowPinModal(false);
    setShowAsistenciaFacial(false);

    setUsuarioActual(usuario);
    setIsLoggedIn(true);

    // Mensaje de bienvenida con el nombre del usuario
    const welcomeMessage = `Bienvenido ${usuario.nombre || usuario.username}`;
    const utterance = new SpeechSynthesisUtterance(welcomeMessage);
    utterance.lang = "es-MX";
    utterance.rate = 0.9;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  // Manejar logout
  const handleLogout = async () => {
    console.log("Cerrando sesion");
    // IMPORTANTE: Cerrar todos los modales para evitar que queden abiertos
    setShowLoginModal(false);
    setShowBiometricReader(false);
    setShowCamera(false);
    setShowPinModal(false);
    setShowBitacora(false);
    setShowAsistenciaFacial(false);

    // Limpiar estado de React
    setIsLoggedIn(false);
    setUsuarioActual(null);
    // Limpiar localStorage para evitar restauración automática de sesión
    try {
      await cerrarSesion(usuarioActual?.id);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Limpiar manualmente si falla
      localStorage.removeItem("usuarioActual");
      localStorage.removeItem("ultimoLogin");
      localStorage.removeItem("metodoAutenticacion");
      localStorage.removeItem("auth_token");
    }
  };

  // Manejadores para cada método de checado
  const handleFacialCheck = () => {
    setShowAsistenciaFacial(true);
  };

  const handleFingerprintCheck = () => {
    setShowBiometricReader(true);
  };

  const handleUserLoginCheck = () => {
    setShowPinModal(true);
  };

  // Manejar registro exitoso de huella
  const handleFingerprintSuccess = async (data) => {
    console.log("✅ Asistencia registrada con huella:", data);

    agregarEvento({
      user: data.nombre || "Empleado",
      action: "Registro de asistencia exitoso - Huella digital",
      type: "success",
    });

    const successMessage = `Registro exitoso, ${data.nombre || "Empleado"}`;
    const utterance = new SpeechSynthesisUtterance(successMessage);
    utterance.lang = "es-MX";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Manejar solicitud de login desde el modal de asistencia
  const handleFingerprintLoginRequest = (usuarioCompleto) => {
    console.log("Inicio de sesion desde huella - Datos completos:", usuarioCompleto);

    // IMPORTANTE: Cerrar TODOS los modales para evitar conflictos
    setShowBiometricReader(false);
    setShowLoginModal(false);
    setShowCamera(false);
    setShowPinModal(false);
    setShowAsistenciaFacial(false);

    // Mensaje de bienvenida
    const nombreUsuario = usuarioCompleto?.nombre || usuarioCompleto?.username || "Usuario";
    const welcomeMessage = `Bienvenido ${nombreUsuario}`;
    const utterance = new SpeechSynthesisUtterance(welcomeMessage);
    utterance.lang = "es-MX";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);

    // Establecer usuario y abrir sesión (datos ya vienen completos del API)
    setUsuarioActual(usuarioCompleto);
    setIsLoggedIn(true);

    agregarEvento({
      user: nombreUsuario,
      action: "Inicio de sesión exitoso - Huella digital",
      type: "success",
    });
  };

  // Manejar registro exitoso de facial
  const handleFacialSuccess = async (data) => {
    console.log("Asistencia registrada con facial:", data);

    agregarEvento({
      user: data.empleado?.nombre || "Empleado",
      action: `${data.tipo_movimiento === 'SALIDA' ? 'Salida' : 'Entrada'} registrada - Reconocimiento facial`,
      type: "success",
    });
  };

  // Manejar solicitud de login desde el modal de asistencia facial
  const handleFacialLoginRequest = (usuarioCompleto) => {
    console.log("Inicio de sesion desde facial - Datos completos:", usuarioCompleto);

    // Cerrar todos los modales
    setShowAsistenciaFacial(false);
    setShowBiometricReader(false);
    setShowLoginModal(false);
    setShowCamera(false);
    setShowPinModal(false);

    // Mensaje de bienvenida
    const nombreUsuario = usuarioCompleto?.nombre || usuarioCompleto?.username || "Usuario";
    const welcomeMessage = `Bienvenido ${nombreUsuario}`;
    const utterance = new SpeechSynthesisUtterance(welcomeMessage);
    utterance.lang = "es-MX";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);

    // Establecer usuario y abrir sesion
    setUsuarioActual(usuarioCompleto);
    setIsLoggedIn(true);

    agregarEvento({
      user: nombreUsuario,
      action: "Inicio de sesion exitoso - Reconocimiento facial",
      type: "success",
    });
  };

  // Obtener información del método
  const getMethodInfo = (methodKey) => {
    const info = {
      facial: {
        icon: Camera,
        label: "Reconocimiento Facial",
        color: "from-blue-500 to-blue-600 dark:from-slate-700 dark:to-slate-800",
        hoverColor: "hover:from-blue-600 hover:to-blue-700 dark:hover:from-slate-600 dark:hover:to-slate-700",
        handler: handleFacialCheck,
      },
      fingerprint: {
        icon: Fingerprint,
        label: "Huella Digital",
        color: "from-blue-500 to-blue-600 dark:from-slate-700 dark:to-slate-800",
        hoverColor: "", // Sin hover porque es solo visual
        handler: null, // Solo visual, el lector está siempre activo en background
        isVisualOnly: true,
      },
      userLogin: {
        icon: User,
        label: "Usuario/Correo",
        color: "from-blue-500 to-blue-600 dark:from-slate-700 dark:to-slate-800",
        hoverColor: "hover:from-blue-600 hover:to-blue-700 dark:hover:from-slate-600 dark:hover:to-slate-700",
        handler: handleUserLoginCheck,
      },
    };
    return info[methodKey];
  };

  // Si está logueado, mostrar SessionScreen
  if (isLoggedIn) {
    return <SessionScreen onLogout={handleLogout} usuario={usuarioActual} />;
  }

  return (
    <div className="h-screen bg-bg-secondary flex overflow-hidden">
      {/* Barra lateral izquierda */}
      <div className="w-20 bg-bg-primary shadow-lg flex flex-col items-center py-6 gap-4">
        <button
          onClick={() => setShowLoginModal(true)}
          className="flex flex-col items-center gap-1 text-blue-600 hover:bg-bg-secondary p-2 rounded-lg transition-all w-16"
        >
          <User className="w-5 h-5" />
          <span className="text-xs font-semibold">Usuario</span>
        </button>

        <button
          onClick={() => setShowBitacora(true)}
          className="flex flex-col items-center gap-1 text-blue-600 hover:bg-bg-secondary p-2 rounded-lg transition-all w-16"
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-xs font-semibold">Bitácora</span>
        </button>

        <div className="flex-1"></div>

        <ConnectionStatusPanel
          isInternetConnected={isInternetConnected}
          isDatabaseConnected={isDatabaseConnected}
        />
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Tarjeta principal de registro - Dinámico según métodos activos */}
        <div className="mb-4 flex-shrink-0" style={{ height: "68%" }}>
          {activeMethods.length === 0 ? (
            /* Sin métodos activos */
            <div className="bg-bg-primary rounded-3xl shadow-2xl h-full flex flex-col items-center justify-center p-8 border border-border-subtle">
              <h2 className="text-2xl font-bold text-text-primary mb-4">
                No hay métodos de checado configurados
              </h2>
              <p className="text-text-secondary text-center">
                Configura al menos un método de checado en Configuración → Preferencias
              </p>
            </div>
          ) : activeMethods.length === 1 ? (
            /* Un solo método - Botón grande */
            (() => {
              const method = getMethodInfo(activeMethods[0]);
              const Icon = method.icon;
              const isClickable = method.handler && !method.isVisualOnly;
              return (
                <div
                  onClick={isClickable ? method.handler : undefined}
                  className={`bg-gradient-to-br ${method.color} rounded-3xl shadow-2xl h-full text-white text-center transition-all flex flex-col items-center justify-center p-8 ${
                    isClickable
                      ? `${method.hoverColor} cursor-pointer hover:shadow-3xl hover:scale-[1.01]`
                      : "cursor-default"
                  }`}
                >
                  <h2 className="text-3xl font-bold mb-4">Registrar Asistencia</h2>

                  <div className="flex justify-center mb-4">
                    <Icon className="w-32 h-32 text-white" strokeWidth={1.5} />
                  </div>

                  <div className="mb-3">
                    <div
                      className="text-7xl font-bold mb-2 tracking-wider"
                      style={{ letterSpacing: "0.1em" }}
                    >
                      {formatTime(time).replace(/\s/g, "\u00A0")}
                    </div>
                  </div>

                  <div className="text-xl">
                    <div className="font-semibold text-2xl mb-1">
                      {formatDate(time)}
                    </div>
                    <div className="text-white/80 capitalize text-lg">
                      {formatDay(time)}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            /* Múltiples métodos - Botón grande con mini-botones dentro */
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-slate-700 dark:to-slate-800 rounded-3xl shadow-2xl h-full text-white text-center flex flex-col items-center justify-center p-8">
              <h2 className="text-3xl font-bold mb-6">Registrar Asistencia</h2>

              {/* Mini-botones con fondo blur */}
              <div className="flex gap-4 w-full max-w-2xl mb-6">
                {activeMethods.map((methodKey) => {
                  const method = getMethodInfo(methodKey);
                  const Icon = method.icon;
                  const isClickable = method.handler && !method.isVisualOnly;
                  return (
                    <div
                      key={methodKey}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isClickable) method.handler();
                      }}
                      className={`flex-1 backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 rounded-2xl shadow-lg transition-all flex flex-col items-center justify-center p-6 ${
                        isClickable
                          ? "hover:bg-white/30 dark:hover:bg-white/20 hover:shadow-xl hover:scale-105 cursor-pointer"
                          : "cursor-default"
                      }`}
                    >
                      <Icon className="w-16 h-16 mb-2 text-white" strokeWidth={1.5} />
                      <span className="text-sm font-bold text-white">
                        {method.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mb-3">
                <div
                  className="text-7xl font-bold mb-2 tracking-wider"
                  style={{ letterSpacing: "0.1em" }}
                >
                  {formatTime(time).replace(/\s/g, "\u00A0")}
                </div>
              </div>

              <div className="text-xl">
                <div className="font-semibold text-2xl mb-1">
                  {formatDate(time)}
                </div>
                <div className="text-white/80 dark:text-white/70 capitalize text-lg">
                  {formatDay(time)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sección de avisos - Compacta */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="animated-border bg-bg-primary rounded-2xl shadow-sm p-4 h-full flex flex-col border border-border-subtle">
            <h3 className="text-lg font-bold text-text-primary mb-3 flex-shrink-0">
              Avisos Generales
            </h3>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {notices.map((notice, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedNotice(notice)}
                  className="flex-shrink-0 w-56 bg-bg-secondary rounded-xl shadow-sm border border-border-subtle hover:shadow-md transition-all p-3 cursor-pointer hover:bg-bg-tertiary"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-accent">
                      {notice.time}
                    </span>
                    <Bell className="w-4 h-4 text-accent" />
                  </div>
                  <h4 className="font-bold text-text-primary text-sm leading-tight line-clamp-2">
                    {notice.subject || notice.message.substring(0, 50)}
                  </h4>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      {selectedNotice && (
        <NoticeDetailModal
          notice={selectedNotice}
          onClose={() => setSelectedNotice(null)}
        />
      )}

      {showPinModal && (
        <PinModal
          onClose={() => setShowPinModal(false)}
          onSuccess={(data) => {
            console.log("✅ Asistencia registrada con PIN:", data);
            agregarEvento({
              user: data.empleado?.nombre || "Empleado",
              action: `${data.tipo_movimiento === 'SALIDA' ? 'Salida' : 'Entrada'} registrada - PIN`,
              type: "success",
            });
          }}
          onLoginRequest={(usuarioData) => {
            // Login directo con los datos del usuario autenticado
            console.log("🔐 Login directo desde PIN:", usuarioData);
            setShowPinModal(false);
            // Llamar directamente a handleLoginSuccess con los datos del usuario
            handleLoginSuccess(usuarioData);
          }}
        />
      )}

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onFacialLogin={() => {
            setShowLoginModal(false);
            setCameraMode("login");
            setShowCamera(true);
          }}
          onLoginSuccess={handleLoginSuccess}
          checkMethods={checkMethods}
        />
      )}

      {showCamera && (
        <CameraModal
          cameraMode={cameraMode}
          captureProgress={captureProgress}
          captureSuccess={captureSuccess}
          captureFailed={captureFailed}
          isClosing={isClosing}
          onFaceDetected={handleFaceDetected}
          onClose={() => {
            setIsClosing(true);
            setTimeout(() => {
              setShowCamera(false);
            }, 500);
          }}
        />
      )}

      {showBitacora && <BitacoraModal onClose={() => setShowBitacora(false)} />}

      {/* Modal de AsistenciaHuella para registro de asistencia con huella */}
      {/* En modo background: siempre activo escuchando, modal aparece al detectar huella */}
      {/* En modo normal: aparece solo cuando showBiometricReader es true */}
      {checkMethods.fingerprint?.enabled && (
        <AsistenciaHuella
          isOpen={showBiometricReader}
          backgroundMode={!showBiometricReader} // Si no está abierto manualmente, usar modo background
          onClose={() => setShowBiometricReader(false)}
          onSuccess={handleFingerprintSuccess}
          onLoginRequest={handleFingerprintLoginRequest}
        />
      )}

      {/* Modal de AsistenciaFacial para registro de asistencia con reconocimiento facial */}
      {showAsistenciaFacial && (
        <AsistenciaFacial
          isOpen={showAsistenciaFacial}
          onClose={() => setShowAsistenciaFacial(false)}
          onSuccess={handleFacialSuccess}
          onLoginRequest={handleFacialLoginRequest}
        />
      )}
    </div>
  );
}
