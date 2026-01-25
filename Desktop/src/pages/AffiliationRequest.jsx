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

  const handleRetryRequest = () => {
    // Limpiar datos locales de la solicitud anterior
    limpiarSolicitudGuardada();

    // Resetear estados para permitir un nuevo envío limpio
    setError(null);
    setSolicitudId(null);
    setSolicitudToken(null);
    setRequestStatus("pending");

    // Volver al paso de afiliación (Paso 3)
    setStep(3);
  };

  const handleCancelRequest = () => {
    // Limpiar datos locales (no hay endpoint público para eliminar solicitudes)
    limpiarSolicitudGuardada();
    setSolicitudId(null);
    setSolicitudToken(null);
    setRequestStatus("pending");
    setError(null);
    // Volver al paso de afiliación
    setStep(3);
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
