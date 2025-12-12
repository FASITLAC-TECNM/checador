import React, { useState, useEffect, useRef } from "react";
import { Camera, User, Activity, Bell } from "lucide-react";
import { formatTime, formatDate, formatDay } from "../utils/dateHelpers";
import { notices } from "../constants/notices";
import CameraModal from "../components/kiosk/CameraModal";
import PinModal from "../components/kiosk/PinModal";
import LoginModal from "../components/kiosk/LoginModal";
import BitacoraModal from "../components/kiosk/BitacoraModal";
import NoticeDetailModal from "../components/kiosk/NoticeDetailModal";
import SessionScreen from "./SessionScreen";
import { cerrarSesion } from "../services/authService";
import { agregarEvento } from "../services/bitacoraService";
import { useConnectivity } from "../hooks/useConnectivity";
import { ConnectionStatusPanel } from "../components/common/ConnectionStatus";

export default function KioskScreen() {
  const methodsEnabled = {
    facial: true,
    fingerprint: false,
    pin: false,
  };

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

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (showCamera) {
      setCaptureProgress(0);
      setCaptureSuccess(false);
      setCaptureFailed(false);
      setIsClosing(false);
      hasProcessedCapture.current = false; // Resetear el flag

      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((mediaStream) => {
          setStream(mediaStream);
          const video = document.getElementById("cameraVideo");
          if (video) {
            video.srcObject = mediaStream;
          }

          setTimeout(() => {
            const interval = setInterval(() => {
              setCaptureProgress((prev) => {
                if (prev >= 100 && !hasProcessedCapture.current) {
                  clearInterval(interval);
                  hasProcessedCapture.current = true; // Marcar como procesado

                  // Simular reconocimiento fallido aleatoriamente (20% de probabilidad)
                  const reconocimientoFallido = Math.random() < 0.2;

                  if (reconocimientoFallido) {
                    // Reconocimiento fallido
                    setCaptureFailed(true);
                    const nombreUsuarioDesconocido = "Usuario no identificado";

                    agregarEvento({
                      user: nombreUsuarioDesconocido,
                      action: `Intento de ${cameraMode === "asistencia" ? "registro de asistencia" : "acceso"} - Rostro no identificado`,
                      type: "error",
                    });

                    const errorMessage = "Rostro no identificado. Intenta de nuevo.";
                    const utterance = new SpeechSynthesisUtterance(errorMessage);
                    utterance.lang = "es-MX";
                    utterance.rate = 0.9;
                    window.speechSynthesis.speak(utterance);

                    // Cerrar modal después de mostrar error
                    setTimeout(() => {
                      setIsClosing(true);
                      setTimeout(() => {
                        setShowCamera(false);
                      }, 500);
                    }, 2000);
                  } else {
                    // Reconocimiento exitoso
                    setCaptureSuccess(true);

                    // Registrar evento en la bitácora
                    const nombreUsuario = usuarioActual?.nombre || "Amaya Abarca";
                    const metodoReconocimiento = "Reconocimiento facial";

                    agregarEvento({
                      user: nombreUsuario,
                      action: `Registro de ${cameraMode === "asistencia" ? "asistencia" : "entrada"} exitoso - ${metodoReconocimiento}`,
                      type: "success",
                    });

                    const successMessage =
                      cameraMode === "asistencia"
                        ? `Registro exitoso, ${nombreUsuario}`
                        : `Acceso concedido, ${nombreUsuario}`;
                    const utterance = new SpeechSynthesisUtterance(
                      successMessage
                    );
                    utterance.lang = "es-MX";
                    utterance.rate = 0.9;
                    window.speechSynthesis.speak(utterance);

                    setTimeout(() => {
                      setIsClosing(true);
                      setTimeout(() => {
                        setShowCamera(false);
                        if (cameraMode === "login") {
                          setIsLoggedIn(true);
                        }
                      }, 500);
                    }, 3000);
                  }

                  return 100;
                }
                return prev >= 100 ? 100 : prev + 4;
              });
            }, 80);
          }, 1500);
        })
        .catch((err) => {
          console.error("Error al acceder a la cámara:", err);

          // Registrar evento de error en la bitácora
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
          <Activity className="w-5 h-5" />
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
        {/* Tarjeta principal de registro - Más grande */}
        <div className="mb-4 flex-shrink-0" style={{ height: "68%" }}>
          <div
            onClick={() => {
              setCameraMode("asistencia");
              setShowCamera(true);
            }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-slate-700 dark:to-slate-800 dark:hover:from-slate-600 dark:hover:to-slate-700 rounded-3xl shadow-2xl h-full text-white text-center cursor-pointer hover:shadow-3xl transition-all hover:scale-[1.01] flex flex-col items-center justify-center p-8"
          >
            <h2 className="text-3xl font-bold mb-4">Registrar Asistencia</h2>

            <div className="flex justify-center mb-4">
              <Camera className="w-32 h-32 text-white" strokeWidth={1.5} />
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
              <div className="text-blue-100 capitalize text-lg">
                {formatDay(time)}
              </div>
            </div>
          </div>
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
          cameraMode={cameraMode}
          captureProgress={captureProgress}
          captureSuccess={captureSuccess}
          captureFailed={captureFailed}
          isClosing={isClosing}
          onClose={() => {
            setIsClosing(true);
            setTimeout(() => {
              setShowCamera(false);
            }, 500);
          }}
        />
      )}

      {showBitacora && <BitacoraModal onClose={() => setShowBitacora(false)} />}
    </div>
  );
}
