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
import { useConnectivity } from "../hooks/useConnectivity";
import { ConnectionStatusPanel } from "../components/common/ConnectionStatus";
import BiometricReader from "../components/kiosk/BiometricReader";

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

  const [time, setTime] = useState(new Date());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null); // Almacenar datos del usuario
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [employeePin, setEmployeePin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBitacora, setShowBitacora] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState("asistencia");
  const [stream, setStream] = useState(null);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const [captureFailed, setCaptureFailed] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const hasProcessedCapture = useRef(false);
  const [showBiometricReader, setShowBiometricReader] = useState(false);
  const [modalKey, setModalKey] = useState(Date.now());

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

  // Escuchar cambios en localStorage para actualizar métodos de checado
  useEffect(() => {
    const handleStorageChange = () => {
      const savedPreferences = localStorage.getItem("userPreferences");
      if (savedPreferences) {
        try {
          const parsed = JSON.parse(savedPreferences);
          if (parsed.checkMethods) {
            setCheckMethods(parsed.checkMethods);
            // Actualizar key de modales para forzar re-montaje y evitar problemas de estado
            setModalKey(Date.now());
          }
        } catch (error) {
          console.error("Error al actualizar métodos de checado:", error);
        }
      }
    };

    // Escuchar cambios en localStorage
    window.addEventListener("storage", handleStorageChange);

    // También escuchar evento personalizado para cambios en la misma ventana
    window.addEventListener("preferencesUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("preferencesUpdated", handleStorageChange);
    };
  }, []);

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

  useEffect(() => {
    if (showCamera) {
      setCaptureProgress(0);
      setCaptureSuccess(false);
      setCaptureFailed(false);
      setIsClosing(false);
      hasProcessedCapture.current = false;

      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((mediaStream) => {
          setStream(mediaStream);
          const video = document.getElementById("cameraVideo");
          if (video) {
            video.srcObject = mediaStream;
          }
        })
        .catch((err) => {
          console.error("Error al acceder a la cámara:", err);

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
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
  }, [showCamera, cameraMode]);

  // Manejar login exitoso
  const handleLoginSuccess = (usuario) => {
    console.log("✅ Login exitoso:", usuario);
    setUsuarioActual(usuario);
    setIsLoggedIn(true);
    setShowLoginModal(false);

    // Mensaje de bienvenida con el nombre del usuario
    const welcomeMessage = `Bienvenido ${usuario.nombre || usuario.username}`;
    const utterance = new SpeechSynthesisUtterance(welcomeMessage);
    utterance.lang = "es-MX";
    utterance.rate = 0.9;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  // Manejar logout
  const handleLogout = () => {
    console.log("🚪 Cerrando sesión");
    setIsLoggedIn(false);
    setUsuarioActual(null);
  };

  // Manejadores para cada método de checado
  const handleFacialCheck = () => {
    setCameraMode("asistencia");
    setShowCamera(true);
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

    setTimeout(() => {
      setShowBiometricReader(false);
    }, 2000);
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
        hoverColor: "hover:from-blue-600 hover:to-blue-700 dark:hover:from-slate-600 dark:hover:to-slate-700",
        handler: handleFingerprintCheck,
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
              return (
                <div
                  onClick={method.handler}
                  className={`bg-gradient-to-br ${method.color} ${method.hoverColor} rounded-3xl shadow-2xl h-full text-white text-center cursor-pointer hover:shadow-3xl transition-all hover:scale-[1.01] flex flex-col items-center justify-center p-8`}
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
                  return (
                    <button
                      key={methodKey}
                      onClick={(e) => {
                        e.stopPropagation();
                        method.handler();
                      }}
                      className="flex-1 backdrop-blur-md bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 border border-white/30 dark:border-white/20 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 flex flex-col items-center justify-center p-6 cursor-pointer"
                    >
                      <Icon className="w-16 h-16 mb-2 text-white" strokeWidth={1.5} />
                      <span className="text-sm font-bold text-white">
                        {method.label}
                      </span>
                    </button>
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
          key={`pin-${modalKey}`}
          employeeId={employeeId}
          setEmployeeId={setEmployeeId}
          employeePin={employeePin}
          setEmployeePin={setEmployeePin}
          showPin={showPin}
          setShowPin={setShowPin}
          onClose={() => setShowPinModal(false)}
        />
      )}

      {showLoginModal && (
        <LoginModal
          key={`login-${modalKey}`}
          onClose={() => setShowLoginModal(false)}
          onFacialLogin={() => {
            setShowLoginModal(false);
            setCameraMode("login");
            setShowCamera(true);
          }}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {showCamera && (
        <CameraModal
          key={`camera-${modalKey}`}
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

      {showBitacora && <BitacoraModal key={`bitacora-${modalKey}`} onClose={() => setShowBitacora(false)} />}

      {/* Modal de BiometricReader para registro de asistencia con huella */}
      {showBiometricReader && (
        <BiometricReader
          key={`biometric-${modalKey}`}
          isOpen={showBiometricReader}
          onClose={() => setShowBiometricReader(false)}
          onAuthSuccess={handleFingerprintSuccess}
          mode="auth"
        />
      )}
    </div>
  );
}
