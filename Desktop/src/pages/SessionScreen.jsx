import React, { useState, useEffect } from "react";
import {
  User,
  LogOut,
  Clock,
  Calendar,
  AlertCircle,
  Bell,
  X,
  Settings,
  Briefcase,
  Building2,
  Fingerprint,
  Camera,
  FileText,
} from "lucide-react";
import {
  formatTime,
  formatDateShort,
  formatDay,
  getDaysInMonth,
  formatDateKey,
} from "../utils/dateHelpers";
import { registrosPorDia } from "../constants/notices";
import { getAvisosDeEmpleado } from "../services/avisosService";
import HistorialModal from "../components/session/HistorialModal";
import ConfigModal from "../components/session/ConfigModal";
import GeneralNodoModal from "../components/session/GeneralNodoModal";
import DispositivosModal from "../components/session/DispositivosModal";
import PreferenciasModal from "../components/session/PreferenciasModal";
import HorarioModal from "../components/session/HorarioModal";
import EmployeeInfo from "../components/session/EmployeeInfo";
import NoEmployeeInfo from "../components/session/NoEmployeeInfo";
import AdminDashboard from "../components/session/AdminDashboard";
import BiometricEnroll from "../components/kiosk/BiometricEnroll";
import RegisterFaceModal from "../components/kiosk/RegisterFaceModal";

// Hooks
import { useEmployeeData } from "../hooks/useEmployeeData";
import { useCameraStatus } from "../hooks/useCameraStatus";

export default function SessionScreen({ onLogout, usuario, isReaderConnected = false }) {
  const [time, setTime] = useState(new Date());
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showGeneralNodoModal, setShowGeneralNodoModal] = useState(false);
  const [showDispositivosModal, setShowDispositivosModal] = useState(false);
  const [showPreferenciasModal, setShowPreferenciasModal] = useState(false);
  const [showBiometricReader, setShowBiometricReader] = useState(false);
  const [showRegisterFace, setShowRegisterFace] = useState(false);
  const [showAllDepartamentos, setShowAllDepartamentos] = useState(false);

  // Custom hook para datos del empleado
  const { datosCompletos, loadingEmpleado, departamentos, notices, setNotices } = useEmployeeData(usuario);

  // isReaderConnected viene como prop desde KioskScreen

  // Obtener estado de cámara registrada y conectada
  const { isCameraConnected, hasCameraRegistered } = useCameraStatus();

  const [nombreNodo, setNombreNodo] = useState("Entrada Principal");
  const [descripcionNodo, setDescripcionNodo] = useState(
    "Control de acceso principal del edificio A",
  );
  const [ipComputadora, setIpComputadora] = useState("192.168.1.100");
  const [direccionMAC, setDireccionMAC] = useState("00:1A:2B:3C:4D:5E");
  const [sistemaOperativo, setSistemaOperativo] = useState("Linux Debian 11");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor de estado online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const [dispositivos, setDispositivos] = useState([
    {
      id: 1,
      nombre: "Lector de Huella Digital",
      descripcion: "Sensor biométrico para control de acceso",
      tipo: "Biométrico",
      puerto: "USB-001",
    },
    {
      id: 2,
      nombre: "Cámara de Seguridad",
      descripcion: "Cámara HD de reconocimiento facial",
      tipo: "Cámara",
      puerto: "USB-002",
    },
  ]);

  // Datos del usuario desde la API
  const userName = datosCompletos?.nombre || "Usuario";
  const userId = datosCompletos?.id || "N/A";
  const userEmail = datosCompletos?.correo || datosCompletos?.email || "N/A";
  const userPhone = datosCompletos?.telefono || "N/A";
  const userUsername = datosCompletos?.usuario || datosCompletos?.username || "N/A";
  const userRFC = datosCompletos?.rfc;
  const userNSS = datosCompletos?.nss;
  const userDepartamento =
    datosCompletos?.departamento || datosCompletos?.departamento_nombre;
  const userHorario = datosCompletos?.horario;
  const userFechaRegistro = datosCompletos?.fecha_registro;

  // Verificar si es un empleado
  const isEmployee = datosCompletos?.es_empleado || (userRFC && userNSS);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleGuardarConfigNodo = () => {
    console.log({
      nombreNodo,
      descripcionNodo,
      ipComputadora,
      direccionMAC,
      sistemaOperativo,
    });
    setShowGeneralNodoModal(false);
    setShowConfigModal(false);
  };

  const handleEliminarDispositivo = (id) => {
    setDispositivos(dispositivos.filter((d) => d.id !== id));
  };

  const handleAgregarDispositivo = () => {
    const nuevoDispositivo = {
      id: dispositivos.length + 1,
      nombre: "Nuevo Dispositivo",
      descripcion: "",
      tipo: "Cámara",
      puerto: "",
    };
    setDispositivos([...dispositivos, nuevoDispositivo]);
  };

  const handleActualizarDispositivo = (id, campo, valor) => {
    setDispositivos(
      dispositivos.map((d) => (d.id === id ? { ...d, [campo]: valor } : d)),
    );
  };

  return (
    <div className="h-screen bg-bg-secondary p-4 overflow-hidden">
      <div className="max-w-[1600px] mx-auto h-full flex flex-col">
        {/* Sidebar Dashboard - All Users */}
        <div className="flex-1 min-h-0">
          <AdminDashboard
            escritorioId={localStorage.getItem("escritorio_id")}
            datosCompletos={datosCompletos}
            departamentos={departamentos}
            onLogout={onLogout}
            time={time}
            notices={notices}
            loadingEmpleado={loadingEmpleado}
            userHorario={userHorario}
            readerConnected={isReaderConnected}
            isCameraConnected={hasCameraRegistered && isCameraConnected}
            isOnline={isOnline}
            onShowHorario={() => setShowHorarioModal(true)}
            onShowHistorial={() => setShowHistorialModal(true)}
            onShowBiometric={() => setShowBiometricReader(true)}
            onShowRegisterFace={() => setShowRegisterFace(true)}
            onSelectNotice={(notice) => setSelectedNotice(notice)}
          />
        </div>
      </div>

      {/* MODALES */}

      {/* Historial Modal */}
      {showHistorialModal && (
        <HistorialModal
          onClose={() => setShowHistorialModal(false)}
          usuario={usuario}
        />
      )}

      {/* Config Modal - Principal */}
      {showConfigModal && (
        <ConfigModal
          onClose={() => setShowConfigModal(false)}
          onSelectOption={(option) => {
            setShowConfigModal(false);
            if (option === "general") {
              setShowGeneralNodoModal(true);
            } else if (option === "dispositivos") {
              setShowDispositivosModal(true);
            } else if (option === "preferencias") {
              setShowPreferenciasModal(true);
            }
          }}
        />
      )}

      {/* General del Nodo Modal */}
      {showGeneralNodoModal && (
        <GeneralNodoModal
          onClose={() => {
            setShowGeneralNodoModal(false);
            setShowConfigModal(false);
          }}
          onBack={() => {
            setShowGeneralNodoModal(false);
            setShowConfigModal(true);
          }}
          initialConfig={{
            nodeName: nombreNodo,
            nodeDescription: descripcionNodo,
            ipAddress: ipComputadora,
            macAddress: direccionMAC,
            operatingSystem: sistemaOperativo,
          }}
        />
      )}

      {/* Dispositivos Modal */}
      {showDispositivosModal && (
        <DispositivosModal
          onClose={() => {
            setShowDispositivosModal(false);
            setShowConfigModal(false);
          }}
          onBack={() => {
            setShowDispositivosModal(false);
            setShowConfigModal(true);
          }}
          escritorioId={localStorage.getItem("escritorio_id")}
        />
      )}

      {/* Preferencias Modal */}
      {showPreferenciasModal && (
        <PreferenciasModal
          onClose={() => {
            setShowPreferenciasModal(false);
            setShowConfigModal(false);
          }}
          onBack={() => {
            setShowPreferenciasModal(false);
            setShowConfigModal(true);
          }}
        />
      )}

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-primary rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="bg-bg-primary p-6 border-b border-border-subtle">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-8 h-8 text-[#1976D2]" />
                  <h3 className="text-2xl font-bold text-text-primary">
                    Detalle del Aviso
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="text-text-secondary hover:bg-bg-secondary rounded-lg p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-bg-secondary border border-border-subtle rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-[#1976D2]" />
                  <h4 className="font-bold text-lg text-text-primary">
                    {selectedNotice.subject}
                  </h4>
                </div>
                <p className="text-text-secondary">{selectedNotice.detail}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-secondary border border-border-subtle rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-[#1976D2]" />
                    <p className="text-xs font-semibold text-text-secondary">
                      AUTOR
                    </p>
                  </div>
                  <p className="text-sm font-medium text-text-primary">
                    {selectedNotice.author}
                  </p>
                </div>
                <div className="bg-bg-secondary border border-border-subtle rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-[#1976D2]" />
                    <p className="text-xs font-semibold text-text-secondary">
                      FECHA Y HORA
                    </p>
                  </div>
                  <p className="text-sm font-medium text-text-primary">
                    {selectedNotice.date} - {selectedNotice.time}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de registro de huella */}
      {showBiometricReader && (
        <BiometricEnroll
          isOpen={showBiometricReader}
          onClose={() => setShowBiometricReader(false)}
          onEnrollmentSuccess={(data) => {
            console.log("✅ Huella registrada:", data);
            setShowBiometricReader(false);
          }}
          idEmpleado={datosCompletos?.empleado_id}
        />
      )}

      {/* Modal de RegisterFaceModal para registro facial */}
      {showRegisterFace && (
        <RegisterFaceModal
          onClose={() => setShowRegisterFace(false)}
          empleadoId={datosCompletos?.empleado_id}
        />
      )}

      {/* HORARIO MODAL */}
      {showHorarioModal && (
        <HorarioModal
          onClose={() => setShowHorarioModal(false)}
          usuario={datosCompletos}
        />
      )}
    </div>
  );
}
