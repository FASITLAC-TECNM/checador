import React, { useState, useEffect } from "react";
import {
  User,
  LogOut,
  Clock,
  Calendar,
  AlertCircle,
  Bell,
  X,
  FileText,
  Settings,
} from "lucide-react";
import {
  formatTime,
  formatDateShort,
  formatDay,
  getDaysInMonth,
  formatDateKey,
  calcularDiasTotales,
} from "../utils/dateHelpers";
import { notices, registrosPorDia } from "../constants/notices";
import AusenciaModal from "../components/session/AusenciaModal";
import ConfigModal from "../components/session/ConfigModal";
import GeneralNodoModal from "../components/session/GeneralNodoModal";
import DispositivosModal from "../components/session/DispositivosModal";
import PreferenciasModal from "../components/session/PreferenciasModal";
import EmployeeInfo from "../components/session/EmployeeInfo";
import NoEmployeeInfo from "../components/session/NoEmployeeInfo";

export default function SessionScreen({ onLogout, usuario }) {
  const [time, setTime] = useState(new Date());
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [showAusenciaModal, setShowAusenciaModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showGeneralNodoModal, setShowGeneralNodoModal] = useState(false);
  const [showDispositivosModal, setShowDispositivosModal] = useState(false);
  const [showPreferenciasModal, setShowPreferenciasModal] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [motivoAusencia, setMotivoAusencia] = useState("");

  const [nombreNodo, setNombreNodo] = useState("Entrada Principal");
  const [descripcionNodo, setDescripcionNodo] = useState(
    "Control de acceso principal del edificio A"
  );
  const [ipComputadora, setIpComputadora] = useState("192.168.1.100");
  const [direccionMAC, setDireccionMAC] = useState("00:1A:2B:3C:4D:5E");
  const [sistemaOperativo, setSistemaOperativo] = useState("Linux Debian 11");

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
  const userName = usuario?.nombre || "Usuario";
  const userId = usuario?.id || "N/A";
  const userEmail = usuario?.email || "N/A";
  const userPhone = usuario?.telefono || "N/A";
  const userUsername = usuario?.username || "N/A";
  const userRFC = usuario?.rfc;
  const userNSS = usuario?.nss;

  // Verificar si es un empleado (tiene RFC y NSS)
  const isEmployee = userRFC && userNSS;

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleEnviarSolicitud = () => {
    console.log({
      nombre: userName,
      id: userId,
      correo: userEmail,
      fechaInicio,
      fechaFin,
      diasTotales: calcularDiasTotales(fechaInicio, fechaFin),
      motivo: motivoAusencia,
    });
    setFechaInicio("");
    setFechaFin("");
    setMotivoAusencia("");
    setShowAusenciaModal(false);
  };

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
      dispositivos.map((d) => (d.id === id ? { ...d, [campo]: valor } : d))
    );
  };

  return (
    <div className="h-screen bg-bg-secondary p-4 overflow-hidden">
      <div className="max-w-[1600px] mx-auto h-full flex flex-col">
        {/* Header con información del usuario */}
        <div className="bg-bg-primary rounded-2xl shadow-lg p-4 mb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Foto del usuario */}
              {usuario?.foto ? (
                <img
                  src={usuario.foto}
                  alt={userName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-blue-300"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-400 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-text-primary">
                    {userName}
                  </h1>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                    {usuario?.activo === "ACTIVO" ? "Activo" : "Inactivo"}
                  </span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">
                    {usuario?.estado || "Estado"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 mt-1 text-xs text-text-secondary">
                  <div>
                    <span className="font-medium">Usuario:</span> {userUsername}
                  </div>
                  <div>
                    <span className="font-medium">Tel:</span> {userPhone}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {userEmail}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfigModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-bg-secondary hover:bg-bg-tertiary text-text-primary rounded-xl font-semibold transition-all border-2 border-border-subtle text-sm"
              >
                <Settings className="w-4 h-4" />
                Configuración
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-bg-secondary hover:bg-bg-tertiary text-text-primary rounded-xl font-semibold transition-all border-2 border-border-subtle text-sm"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - 3 Columnas */}
        {isEmployee ? (
          <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
            {/* Columna 1 - Estado Actual y Estadísticas */}
            <div className="flex flex-col gap-3 min-h-0">
              <EmployeeInfo time={time} />
            </div>

            {/* Columna 2 - Avisos Personales */}
            <div className="flex flex-col min-h-0">
              <div className="bg-bg-primary rounded-2xl shadow-lg p-4 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-text-primary">
                    Avisos Personales
                  </h2>
                </div>
                <div className="space-y-2 flex-1 min-h-0 overflow-auto">
                  {notices.slice(0, 5).map((notice, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedNotice(notice)}
                      className="bg-bg-primary rounded-xl p-3 border border-border-subtle cursor-pointer hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bell className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-blue-600 font-bold mb-1">
                            <span>{notice.time}</span>
                          </div>
                          <h4 className="font-bold text-text-primary text-sm leading-tight truncate">
                            {notice.subject}
                          </h4>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna 3 - Acciones Rápidas */}
            <div className="flex flex-col gap-3 min-h-0">
              {/* Ver Horario */}
              <button
                onClick={() => setShowHorarioModal(true)}
                className="w-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-800 dark:to-blue-900 dark:hover:from-blue-700 dark:hover:to-blue-800 rounded-2xl shadow-lg p-5 text-white transition-all hover:shadow-xl flex-1"
              >
                <Calendar className="w-12 h-12 mx-auto mb-2" />
                <h3 className="text-base font-bold mb-1">Ver Horario</h3>
                <p className="text-xs text-blue-100">Lunes a Domingo</p>
              </button>

              {/* Historial de Registros */}
              <button
                onClick={() => setShowHistorialModal(true)}
                className="w-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 dark:from-green-800 dark:to-green-900 dark:hover:from-green-700 dark:hover:to-green-800 rounded-2xl shadow-lg p-5 text-white transition-all hover:shadow-xl flex-1"
              >
                <Calendar className="w-12 h-12 mx-auto mb-2" />
                <h3 className="text-base font-bold mb-1">
                  Historial de Registros
                </h3>
                <p className="text-xs text-green-100">
                  Consultar días anteriores
                </p>
              </button>

              {/* Solicitar Ausencia */}
              <button
                onClick={() => setShowAusenciaModal(true)}
                className="w-full bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 dark:from-purple-800 dark:to-purple-900 dark:hover:from-purple-700 dark:hover:to-purple-800 rounded-2xl shadow-lg p-5 text-white transition-all hover:shadow-xl flex-1"
              >
                <FileText className="w-12 h-12 mx-auto mb-2" />
                <h3 className="text-base font-bold mb-1">Solicitar Ausencia</h3>
                <p className="text-xs text-purple-100">Permisos y vacaciones</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <NoEmployeeInfo />
          </div>
        )}
      </div>

      {/* MODALES */}

      {/* Ausencia Modal */}
      {showAusenciaModal && (
        <AusenciaModal
          onClose={() => setShowAusenciaModal(false)}
          userName={userName}
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
          onClose={() => setShowGeneralNodoModal(false)}
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
          onClose={() => setShowDispositivosModal(false)}
          initialDevices={dispositivos}
        />
      )}

      {/* Preferencias Modal */}
      {showPreferenciasModal && (
        <PreferenciasModal onClose={() => setShowPreferenciasModal(false)} />
      )}

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-primary rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">
                    Detalle del Aviso
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="text-white hover:bg-bg-primary/20 rounded-lg p-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-bg-secondary border-l-4 border-blue-500 rounded-lg p-4">
                <h4 className="font-bold text-lg text-blue-800 mb-2">
                  {selectedNotice.subject}
                </h4>
                <p className="text-text-secondary">{selectedNotice.detail}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-secondary rounded-lg p-4">
                  <p className="text-xs font-semibold text-text-secondary mb-1">
                    AUTOR
                  </p>
                  <p className="text-sm font-medium text-text-primary">
                    {selectedNotice.author}
                  </p>
                </div>
                <div className="bg-bg-secondary rounded-lg p-4">
                  <p className="text-xs font-semibold text-text-secondary mb-1">
                    FECHA Y HORA
                  </p>
                  <p className="text-sm font-medium text-text-primary">
                    {selectedNotice.date} - {selectedNotice.time}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotice(null)}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HORARIO MODAL */}
      {showHorarioModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-primary rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Mi Horario</h3>
                <button
                  onClick={() => setShowHorarioModal(false)}
                  className="text-white hover:bg-bg-primary/20 rounded-lg p-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="bg-bg-secondary rounded-lg p-4">
                  <p className="text-sm font-semibold text-text-secondary mb-2">
                    HORARIO REGULAR
                  </p>
                  <p className="font-bold text-text-primary">
                    Lunes a Viernes: 8:00 AM - 5:00 PM
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    Comida: 1:00 PM - 2:00 PM
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHorarioModal(false)}
                className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
