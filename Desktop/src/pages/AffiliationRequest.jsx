import { useState, useEffect } from "react";
import WelcomeScreen from "../components/affiliation/WelcomeScreen";
import NodeConfigStep from "../components/affiliation/NodeConfigStep";
import DevicesStep from "../components/affiliation/DevicesStep";
import AffiliationStep from "../components/affiliation/AffiliationStep";
import ApprovalStep from "../components/affiliation/ApprovalStep";
import {
  crearSolicitudAfiliacion,
  obtenerEstadoSolicitud,
  obtenerSolicitudGuardada,
  limpiarSolicitudGuardada,
  cancelarSolicitud,
  actualizarSolicitudAPendiente,
} from "../services/affiliationService";

export default function AffiliationRequest({ onComplete }) {
  const [showWelcome, setShowWelcome] = useState(true);
  const [step, setStep] = useState(1);
  const [requestStatus, setRequestStatus] = useState("pending");
  const [solicitudId, setSolicitudId] = useState(null);
  const [error, setError] = useState(null);

  const [nodeConfig, setNodeConfig] = useState({
    nodeName: "",
    description: "",
    macAddress: "",
    operatingSystem: "",
  });

  const [devices, setDevices] = useState([]);

  const [companyId, setCompanyId] = useState("");
  const [solicitudToken, setSolicitudToken] = useState(null);

  // Estado para el SDK
  const [sdkStatus, setSdkStatus] = useState({ checked: false, installed: false, installing: false });

  // Verificar e instalar SDK de DigitalPersona silenciosamente al iniciar
  useEffect(() => {
    const verificarEInstalarSdk = async () => {
      // Solo ejecutar en Electron
      if (!window.electronAPI?.checkDigitalPersonaSdk) {
        console.log("[SDK] No está en entorno Electron, omitiendo verificación");
        setSdkStatus({ checked: true, installed: true, installing: false });
        return;
      }

      try {
        console.log("[SDK] Verificando instalación del SDK DigitalPersona...");
        const result = await window.electronAPI.checkDigitalPersonaSdk();

        if (result.installed) {
          console.log("[SDK] ✅ SDK ya está instalado");
          setSdkStatus({ checked: true, installed: true, installing: false });
        } else {
          console.log("[SDK] ⚠️ SDK no instalado, archivos faltantes:", result.missingFiles);
          console.log("[SDK] 📦 Iniciando instalación silenciosa...");
          setSdkStatus({ checked: true, installed: false, installing: true });

          const installResult = await window.electronAPI.installDigitalPersonaSdk();

          if (installResult.success) {
            console.log("[SDK] ✅ Instalación exitosa:", installResult.message);
            setSdkStatus({ checked: true, installed: true, installing: false });
          } else {
            console.error("[SDK] ❌ Error en instalación:", installResult.message);
            setSdkStatus({ checked: true, installed: false, installing: false });
          }
        }
      } catch (error) {
        console.error("[SDK] Error verificando SDK:", error);
        setSdkStatus({ checked: true, installed: false, installing: false });
      }
    };

    verificarEInstalarSdk();
  }, []);

  // Verificar si hay una solicitud guardada al iniciar
  useEffect(() => {
    const solicitudGuardada = obtenerSolicitudGuardada();
    if (solicitudGuardada) {
      setSolicitudId(solicitudGuardada.id);
      setSolicitudToken(solicitudGuardada.token);
      setStep(4);
      verificarEstadoSolicitud(solicitudGuardada.token);
    }
  }, []);

  // Verificar el estado de la solicitud usando el token
  const verificarEstadoSolicitud = async (token) => {
    try {
      const solicitud = await obtenerEstadoSolicitud(token);
      console.log("📋 Estado de solicitud recibido:", solicitud);

      const estado = solicitud.estado?.toLowerCase();

      if (estado === "aceptado") {
        setRequestStatus("approved");
        // Guardar el escritorio_id que viene del backend
        if (solicitud.escritorio_id) {
          localStorage.setItem("escritorio_id", solicitud.escritorio_id);
        }
        // Guardar el auth_token si viene en la respuesta
        if (solicitud.auth_token || solicitud.token) {
          localStorage.setItem("auth_token", solicitud.auth_token || solicitud.token);
          console.log("🔑 Token de autenticación guardado");
        }
        limpiarSolicitudGuardada();
      } else if (estado === "rechazado") {
        setRequestStatus("rejected");
        setError(solicitud.observaciones || "Solicitud rechazada por el administrador");
      } else {
        setRequestStatus("pending");
      }
    } catch (error) {
      console.error("Error al verificar estado:", error);
      setError("Error al verificar el estado de la solicitud");
    }
  };

  // Polling para verificar estado cada 5 segundos
  useEffect(() => {
    if (step === 4 && requestStatus === "pending" && solicitudToken) {
      const interval = setInterval(() => {
        verificarEstadoSolicitud(solicitudToken);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [step, requestStatus, solicitudToken]);

  const handleSubmitRequest = async () => {
    try {
      setError(null);

      // Usar la información del sistema que ya se capturó en el paso 1
      // Esta información ya fue detectada y está en nodeConfig
      const solicitud = await crearSolicitudAfiliacion({
        nombre: nodeConfig.nodeName,
        descripcion: nodeConfig.description,
        ip: nodeConfig.ipAddress || '127.0.0.1',
        mac: nodeConfig.macAddress || '00:00:00:00:00:00',
        sistema_operativo: nodeConfig.operatingSystem || 'Unknown',
        empresa_id: companyId,
        dispositivos: devices,
      });

      setSolicitudId(solicitud.id);
      // Obtener el token guardado en localStorage
      const tokenGuardado = localStorage.getItem("solicitud_token");
      setSolicitudToken(tokenGuardado);
      setStep(4);
      setRequestStatus("pending");
    } catch (error) {
      console.error("Error al crear solicitud:", error);
      setError(error.message || "Error al crear la solicitud");
    }
  };

  const handleRetryRequest = async () => {
    if (!solicitudId) return;

    // 1. Cancelar la solicitud actual en backend (marcar como rechazada)
    try {
      await cancelarSolicitud(solicitudId);
    } catch (error) {
      console.error("Error al cancelar solicitud previa:", error);
      // Continuamos aunque falle, para permitir al usuario reintentar
    }

    // 2. Limpiar token/id de la solicitud anterior
    limpiarSolicitudGuardada();
    setSolicitudId(null);
    setSolicitudToken(null);
    setRequestStatus("pending");
    setError(null);

    // 3. Volver al paso 1 CON los datos preservados
    setStep(1);
  };

  const handleCancelRequest = async () => {
    // Intentar cancelar en el backend si existe ID
    if (solicitudId) {
      try {
        await cancelarSolicitud(solicitudId);
      } catch (error) {
        console.error("Error al cancelar la solicitud:", error);
        // Continuamos con el reset local aunque falle el backend
      }
    }

    // Limpiar datos locales
    limpiarSolicitudGuardada();

    // Resetear todos los estados
    setSolicitudId(null);
    setSolicitudToken(null);
    setRequestStatus("pending"); // Se reinicia a pending para la nueva solicitud
    setError(null);

    // Reiniciar formularios
    setNodeConfig({
      nodeName: "",
      description: "",
      macAddress: "",
      operatingSystem: "",
    });
    setDevices([]);
    setCompanyId("");

    // Volver al primer paso
    setStep(1);
  };

  if (showWelcome) {
    return <WelcomeScreen onClose={() => setShowWelcome(false)} />;
  }

  if (step === 1) {
    return (
      <NodeConfigStep
        nodeConfig={nodeConfig}
        setNodeConfig={setNodeConfig}
        onNext={() => setStep(2)}
        onShowWelcome={() => setShowWelcome(true)}
      />
    );
  }

  if (step === 2) {
    return (
      <DevicesStep
        devices={devices}
        setDevices={setDevices}
        onNext={() => setStep(3)}
        onPrevious={() => setStep(1)}
        onShowWelcome={() => setShowWelcome(true)}
      />
    );
  }

  if (step === 3) {
    return (
      <AffiliationStep
        companyId={companyId}
        setCompanyId={setCompanyId}
        onSubmit={handleSubmitRequest}
        onPrevious={() => setStep(2)}
        onShowWelcome={() => setShowWelcome(true)}
      />
    );
  }

  if (step === 4) {
    return (
      <ApprovalStep
        requestStatus={requestStatus}
        companyId={companyId}
        error={error}
        onRetry={handleRetryRequest}
        onCancel={handleCancelRequest}
        onGoToLogin={() => {
          // Si la solicitud fue aprobada y hay un callback, completar configuración
          if (requestStatus === "approved" && onComplete) {
            onComplete();
          } else {
            setStep(1);
            setRequestStatus("pending");
          }
        }}
        onShowWelcome={() => setShowWelcome(true)}
      />
    );
  }

  return null;
}
