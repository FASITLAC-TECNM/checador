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
  cancelarSolicitud,
  limpiarSolicitudGuardada,
  obtenerInfoSistema,
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

  const [devices, setDevices] = useState([
    { id: 1, name: "", type: "camera", ip: "", port: "", connection: "IP" },
  ]);

  const [companyId, setCompanyId] = useState("");

  // Verificar si hay una solicitud guardada al iniciar
  useEffect(() => {
    const solicitudGuardada = obtenerSolicitudGuardada();
    if (solicitudGuardada) {
      setSolicitudId(solicitudGuardada.id);
      setStep(4);
      verificarEstadoSolicitud(solicitudGuardada.id);
    }
  }, []);

  // Verificar el estado de la solicitud
  const verificarEstadoSolicitud = async (id) => {
    try {
      const solicitud = await obtenerEstadoSolicitud(id);

      if (solicitud.estado === "Aceptado") {
        setRequestStatus("approved");
        limpiarSolicitudGuardada();
      } else if (solicitud.estado === "Rechazado") {
        setRequestStatus("rejected");
        setError(solicitud.motivo_rechazo || "Solicitud rechazada por el administrador");
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
    if (step === 4 && requestStatus === "pending" && solicitudId) {
      const interval = setInterval(() => {
        verificarEstadoSolicitud(solicitudId);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [step, requestStatus, solicitudId]);

  const handleSubmitRequest = async () => {
    try {
      setError(null);

      // Obtener información del sistema
      const infoSistema = await obtenerInfoSistema();

      // Crear la solicitud
      const solicitud = await crearSolicitudAfiliacion({
        nombre: nodeConfig.nodeName,
        descripcion: nodeConfig.description,
        ip: infoSistema.ip,
        mac: infoSistema.mac,
        sistema_operativo: infoSistema.sistema_operativo,
      });

      setSolicitudId(solicitud.id);
      setStep(4);
      setRequestStatus("pending");
    } catch (error) {
      console.error("Error al crear solicitud:", error);
      setError(error.message || "Error al crear la solicitud");
    }
  };

  const handleRetryRequest = () => {
    setStep(3);
    setRequestStatus("pending");
    setError(null);
    limpiarSolicitudGuardada();
    setSolicitudId(null);
  };

  const handleCancelRequest = async () => {
    try {
      if (solicitudId) {
        await cancelarSolicitud(solicitudId);
      }
      setStep(3);
      setRequestStatus("pending");
      setError(null);
      setSolicitudId(null);
    } catch (error) {
      console.error("Error al cancelar solicitud:", error);
      setError("Error al cancelar la solicitud");
    }
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
