import { useState, useEffect } from "react";
import { Camera, User, ClipboardList, Bell, Fingerprint } from "lucide-react";
import { formatTime, formatDate, formatDay } from "../utils/dateHelpers";
import { useAvisosGlobales } from "../hooks/useAvisosGlobales";
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
import { obtenerOrdenCredenciales } from "../services/configuracionService";

export default function KioskScreen() {
  // Estado de orden de credenciales desde el backend
  const [ordenCredenciales, setOrdenCredenciales] = useState(null);
  const [loadingCredenciales, setLoadingCredenciales] = useState(true);

  // Hook de conectividad
  const { isInternetConnected, isDatabaseConnected } = useConnectivity();

  const [time, setTime] = useState(new Date());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null); // Almacenar datos del usuario
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBitacora, setShowBitacora] = useState(false);
  const [showBiometricReader, setShowBiometricReader] = useState(false);
  const [showAsistenciaFacial, setShowAsistenciaFacial] = useState(false);
  const [isReaderConnected, setIsReaderConnected] = useState(false); // Estado del lector biométrico
  const [activeNoticeIndex, setActiveNoticeIndex] = useState(0); // Índice del aviso activo en el carrusel

  // Obtener métodos activos ordenados desde backend
  const getActiveMethods = () => {
    if (!ordenCredenciales) return [];
    return Object.entries(ordenCredenciales)
      .filter(([, config]) => config.activo)
      .sort(([, a], [, b]) => a.prioridad - b.prioridad)
      .map(([key]) => key);
  };

  const activeMethods = getActiveMethods();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Avisos globales con polling en tiempo real (se pausa al estar en sesión)
  const { notices, loading: loadingNotices } = useAvisosGlobales({ pausado: isLoggedIn });

  // Rotación automática del aviso destacado cada 6 segundos
  useEffect(() => {
    if (notices.length === 0) return;
    const noticeTimer = setInterval(() => {
      setActiveNoticeIndex((prevIndex) => (prevIndex + 1) % notices.length);
    }, 6000);
    return () => clearInterval(noticeTimer);
  }, [notices.length]);

  // Cargar orden de credenciales desde el backend
  const cargarCredenciales = async () => {
    try {
      setLoadingCredenciales(true);
      const { ordenCredenciales: orden } = await obtenerOrdenCredenciales();
      setOrdenCredenciales(orden);
    } catch (err) {
      console.error("Error al cargar orden de credenciales:", err);
      // Fallback por defecto si falla el backend
      setOrdenCredenciales({
        facial: { prioridad: 1, activo: true },
        dactilar: { prioridad: 2, activo: true },
        pin: { prioridad: 3, activo: true },
      });
    } finally {
      setLoadingCredenciales(false);
    }
  };

  // Cargar al montar el componente
  useEffect(() => {
    cargarCredenciales();
  }, []);

  // Recargar credenciales cuando el usuario cierra sesión
  useEffect(() => {
    if (!isLoggedIn) {
      cargarCredenciales();
    }
  }, [isLoggedIn]);

  // Atajo para resetear configuración: Ctrl+Shift+R
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "R") {
        e.preventDefault();
        const confirmReset = confirm(
          "¿Está seguro que desea resetear la configuración de la aplicación? Esto eliminará todos los datos guardados y deberá volver a afiliar el equipo.",
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

  // Manejar login exitoso
  const handleLoginSuccess = (usuario) => {
    console.log("Login exitoso:", usuario);

    // IMPORTANTE: Cerrar TODOS los modales antes de cambiar el estado de login
    setShowLoginModal(false);
    setShowBiometricReader(false);
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
    console.log(
      "Inicio de sesion desde huella - Datos completos:",
      usuarioCompleto,
    );

    // IMPORTANTE: Cerrar TODOS los modales para evitar conflictos
    setShowBiometricReader(false);
    setShowLoginModal(false);
    setShowPinModal(false);
    setShowAsistenciaFacial(false);

    // Mensaje de bienvenida
    const nombreUsuario =
      usuarioCompleto?.nombre || usuarioCompleto?.username || "Usuario";
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
      action: `${data.tipo_movimiento === "SALIDA" ? "Salida" : "Entrada"} registrada - Reconocimiento facial`,
      type: "success",
    });
  };

  // Manejar solicitud de login desde el modal de asistencia facial
  const handleFacialLoginRequest = (usuarioCompleto) => {
    console.log(
      "Inicio de sesion desde facial - Datos completos:",
      usuarioCompleto,
    );

    // Cerrar todos los modales
    setShowAsistenciaFacial(false);
    setShowBiometricReader(false);
    setShowLoginModal(false);
    setShowPinModal(false);

    // Mensaje de bienvenida
    const nombreUsuario =
      usuarioCompleto?.nombre || usuarioCompleto?.username || "Usuario";
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

  // Obtener información del método (claves del backend)
  const getMethodInfo = (methodKey) => {
    const info = {
      facial: {
        icon: Camera,
        label: "Reconocimiento Facial",
        color:
          "from-blue-500 to-blue-600 dark:from-slate-700 dark:to-slate-800",
        hoverColor:
          "hover:from-blue-600 hover:to-blue-700 dark:hover:from-slate-600 dark:hover:to-slate-700",
        handler: handleFacialCheck,
      },
      dactilar: {
        icon: Fingerprint,
        label: "Huella Digital",
        color: isReaderConnected
          ? "from-blue-500 to-blue-600 dark:from-slate-700 dark:to-slate-800"
          : "from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700",
        hoverColor: "", // Sin hover porque es solo visual
        handler: null, // Solo visual, el lector está siempre activo en background
        isVisualOnly: true,
        isDisabled: !isReaderConnected, // Deshabilitar si el lector no está conectado
        disabledMessage: "Lector desconectado",
      },
      pin: {
        icon: User,
        label: "Usuario/Correo",
        color:
          "from-blue-500 to-blue-600 dark:from-slate-700 dark:to-slate-800",
        hoverColor:
          "hover:from-blue-600 hover:to-blue-700 dark:hover:from-slate-600 dark:hover:to-slate-700",
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
          disabled={!isInternetConnected || !isDatabaseConnected}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all w-16 ${!isInternetConnected || !isDatabaseConnected
            ? "text-gray-400 cursor-not-allowed opacity-50"
            : "text-blue-600 hover:bg-bg-secondary"
            }`}
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
          isReaderConnected={ordenCredenciales?.dactilar?.activo ? isReaderConnected : null}
        />
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Tarjeta principal de registro - Dinámico según métodos activos */}
        <div className="mb-4 flex-shrink-0" style={{ height: "68%" }}>
          {loadingCredenciales ? (
            <div className="bg-bg-primary rounded-3xl shadow-2xl h-full flex flex-col items-center justify-center p-8 border border-border-subtle">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-text-secondary">Cargando configuración...</p>
            </div>
          ) : activeMethods.length === 0 ? (
            /* Sin métodos activos */
            <div className="bg-bg-primary rounded-3xl shadow-2xl h-full flex flex-col items-center justify-center p-8 border border-border-subtle">
              <h2 className="text-2xl font-bold text-text-primary mb-4">
                No hay métodos de checado configurados
              </h2>
              <p className="text-text-secondary text-center">
                Configura al menos un método de checado en Configuración →
                Preferencias
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
                  className={`bg-gradient-to-br ${method.color} rounded-3xl shadow-2xl h-full text-white text-center transition-all flex flex-col items-center justify-center p-8 ${isClickable
                    ? `${method.hoverColor} cursor-pointer hover:shadow-3xl hover:scale-[1.01]`
                    : "cursor-default"
                    }`}
                >
                  <h2 className="text-3xl font-bold mb-4">
                    Registrar Asistencia
                  </h2>

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
                  const isClickable = method.handler && !method.isVisualOnly && !method.isDisabled;
                  const isDisabled = method.isDisabled;
                  return (
                    <div
                      key={methodKey}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isClickable) method.handler();
                      }}
                      title={isDisabled ? method.disabledMessage : ""}
                      className={`flex-1 backdrop-blur-md border rounded-2xl shadow-lg transition-all flex flex-col items-center justify-center p-6 ${isDisabled
                        ? "bg-gray-500/30 dark:bg-gray-600/30 border-gray-400/30 dark:border-gray-500/30 opacity-60 cursor-not-allowed"
                        : "bg-white/20 dark:bg-white/10 border-white/30 dark:border-white/20"
                        } ${isClickable && !isDisabled
                          ? "hover:bg-white/30 dark:hover:bg-white/20 hover:shadow-xl hover:scale-105 cursor-pointer"
                          : !isDisabled ? "cursor-default" : ""
                        }`}
                    >
                      <Icon
                        className={`w-16 h-16 mb-2 ${isDisabled ? "text-gray-300 dark:text-gray-400" : "text-white"}`}
                        strokeWidth={1.5}
                      />
                      <span className={`text-sm font-bold ${isDisabled ? "text-gray-300 dark:text-gray-400" : "text-white"}`}>
                        {method.label}
                      </span>
                      {isDisabled && (
                        <span className="text-xs text-gray-300 dark:text-gray-400 mt-1">
                          (Desconectado)
                        </span>
                      )}
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
            <h3 className="text-lg font-bold text-text-primary mb-3 flex-shrink-0 text-center">
              Avisos Generales
            </h3>

            <div
              className="flex-1 flex items-center overflow-hidden cursor-grab active:cursor-grabbing relative"
              onMouseDown={(e) => {
                const startX = e.clientX;
                const handleMouseMove = (moveEvent) => {
                  const diff = moveEvent.clientX - startX;
                  if (Math.abs(diff) > 50) {
                    if (diff > 0) {
                      setActiveNoticeIndex((prev) => (prev - 1 + notices.length) % notices.length);
                    } else {
                      setActiveNoticeIndex((prev) => (prev + 1) % notices.length);
                    }
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  }
                };
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
              onTouchStart={(e) => {
                const startX = e.touches[0].clientX;
                const handleTouchMove = (moveEvent) => {
                  const diff = moveEvent.touches[0].clientX - startX;
                  if (Math.abs(diff) > 50) {
                    if (diff > 0) {
                      setActiveNoticeIndex((prev) => (prev - 1 + notices.length) % notices.length);
                    } else {
                      setActiveNoticeIndex((prev) => (prev + 1) % notices.length);
                    }
                    document.removeEventListener('touchmove', handleTouchMove);
                    document.removeEventListener('touchend', handleTouchEnd);
                  }
                };
                const handleTouchEnd = () => {
                  document.removeEventListener('touchmove', handleTouchMove);
                  document.removeEventListener('touchend', handleTouchEnd);
                };
                document.addEventListener('touchmove', handleTouchMove);
                document.addEventListener('touchend', handleTouchEnd);
              }}
            >
              <div
                className="flex gap-3 items-center transition-transform duration-500 ease-in-out absolute"
                style={{
                  left: '50%',
                  transform: `translateX(calc(-${(notices.length + activeNoticeIndex) * 172 + 112}px))`
                }}
              >
                {/* Crear array infinito: avisos originales duplicados para efecto continuo */}
                {[...notices, ...notices, ...notices].map((notice, index) => {
                  // Calcular el índice real considerando el array triplicado
                  const realIndex = index % notices.length;
                  // La tarjeta central es la que coincide con activeNoticeIndex en el grupo del medio
                  const isCenterCard = index === (activeNoticeIndex + notices.length);

                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedNotice(notice)}
                      className={`flex-shrink-0 rounded-xl transition-all duration-500 ease-in-out p-3 cursor-pointer select-none ${isCenterCard
                        ? "w-56 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/20 scale-105 shadow-xl z-10 ring-2 ring-blue-400/50"
                        : "w-40 bg-bg-secondary border border-border-subtle hover:shadow-md hover:bg-bg-tertiary scale-90 opacity-60"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold ${isCenterCard ? "text-blue-600 dark:text-blue-400 text-base" : "text-text-secondary text-xs"}`}>
                          {notice.time}
                        </span>
                        {isCenterCard && <Bell className="w-6 h-6 text-blue-500 dark:text-blue-400 animate-pulse" />}
                      </div>
                      <h4 className={`font-bold leading-tight ${isCenterCard
                        ? "text-blue-800 dark:text-blue-200 text-base line-clamp-2"
                        : "text-text-primary text-sm line-clamp-2"
                        }`}>
                        {notice.subject || notice.message.substring(0, 50)}
                      </h4>
                    </div>
                  );
                })}
              </div>
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
              action: `${data.tipo_movimiento === "SALIDA" ? "Salida" : "Entrada"} registrada - PIN`,
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
            setShowAsistenciaFacial(true);
          }}
          onLoginSuccess={handleLoginSuccess}
          ordenCredenciales={ordenCredenciales}
          isReaderConnected={isReaderConnected}
        />
      )}

      {showBitacora && <BitacoraModal onClose={() => setShowBitacora(false)} />}

      {/* Modal de AsistenciaHuella para registro de asistencia con huella */}
      {/* En modo background: siempre activo escuchando, modal aparece al detectar huella */}
      {/* En modo normal: aparece solo cuando showBiometricReader es true */}
      {ordenCredenciales?.dactilar?.activo && (
        <AsistenciaHuella
          isOpen={showBiometricReader}
          backgroundMode={!showBiometricReader} // Si no está abierto manualmente, usar modo background
          onClose={() => setShowBiometricReader(false)}
          onSuccess={handleFingerprintSuccess}
          onLoginRequest={handleFingerprintLoginRequest}
          onReaderStatusChange={setIsReaderConnected}
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
