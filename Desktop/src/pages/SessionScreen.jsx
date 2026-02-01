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
} from "lucide-react";
import {
  formatTime,
  formatDateShort,
  formatDay,
  getDaysInMonth,
  formatDateKey,
} from "../utils/dateHelpers";
import { notices, registrosPorDia } from "../constants/notices";
import HistorialModal from "../components/session/HistorialModal";
import ConfigModal from "../components/session/ConfigModal";
import GeneralNodoModal from "../components/session/GeneralNodoModal";
import DispositivosModal from "../components/session/DispositivosModal";
import PreferenciasModal from "../components/session/PreferenciasModal";
import HorarioModal from "../components/session/HorarioModal";
import EmployeeInfo from "../components/session/EmployeeInfo";
import NoEmployeeInfo from "../components/session/NoEmployeeInfo";
import BiometricReader from "../components/kiosk/BiometricReader";
import RegisterFaceModal from "../components/kiosk/RegisterFaceModal";
import AsistenciaHuella from "../components/kiosk/AsistenciaHuella";
import { useAuth } from "../context/AuthContext";
import { getEmpleadoConHorario, getDepartamentosPorEmpleadoId } from "../services/empleadoService";

export default function SessionScreen({ onLogout, usuario }) {
  const { updateEmpleadoData } = useAuth();
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
  const [empleadoData, setEmpleadoData] = useState(null);
  const [loadingEmpleado, setLoadingEmpleado] = useState(false);
  const [departamentos, setDepartamentos] = useState([]);
  const [showAllDepartamentos, setShowAllDepartamentos] = useState(false);

  const [nombreNodo, setNombreNodo] = useState("Entrada Principal");
  const [descripcionNodo, setDescripcionNodo] = useState(
    "Control de acceso principal del edificio A",
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

  // Cargar datos completos del empleado al montar el componente
  useEffect(() => {
    const cargarDatosEmpleado = async () => {
      // Solo cargar si es empleado y no tenemos ya el horario
      if (usuario?.es_empleado && !usuario?.horario && usuario?.horario_id) {
        setLoadingEmpleado(true);
        try {
          const datos = await getEmpleadoConHorario(usuario);
          if (datos) {
            setEmpleadoData(datos);
            console.log("✅ Datos del empleado cargados:", datos);
          }
        } catch (error) {
          console.error("❌ Error cargando datos del empleado:", error);
        } finally {
          setLoadingEmpleado(false);
        }
      } else if (usuario?.horario) {
        // Ya tenemos el horario, no necesitamos cargar
        setEmpleadoData(usuario);
      }
    };

    cargarDatosEmpleado();
  }, [usuario]);

  // Cargar departamentos del empleado
  useEffect(() => {
    const cargarDepartamentos = async () => {
      const empleadoId = usuario?.empleado_id;

      if (empleadoId) {
        try {
          const deptos = await getDepartamentosPorEmpleadoId(empleadoId);
          setDepartamentos(deptos);
        } catch (error) {
          console.error("❌ Error cargando departamentos:", error);
        }
      }
    };

    if (usuario?.es_empleado) {
      cargarDepartamentos();
    }
  }, [usuario]);

  // Combinar datos del usuario con los datos del empleado cargados
  const datosCompletos = empleadoData || usuario;

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
        {/* Header con información del usuario */}
        <div className="bg-bg-primary rounded-2xl shadow-lg p-5 mb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              {/* Foto del usuario con borde degradado */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 rounded-full p-[3px]">
                  <div className="w-full h-full bg-bg-primary rounded-full" />
                </div>
                {usuario?.foto ? (
                  <img
                    src={usuario.foto}
                    alt={userName}
                    className="relative w-20 h-20 rounded-full object-cover border-[3px] border-transparent"
                    style={{
                      background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4) border-box'
                    }}
                  />
                ) : (
                  <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600 via-purple-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                    <User className="w-10 h-10 text-white" />
                  </div>
                )}
                {/* Indicador de estado online */}
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-bg-primary" />
              </div>

              {/* Información del usuario */}
              <div className="flex flex-col">
                {/* Nombre y badges */}
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-text-primary">
                    {userName}
                  </h1>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-sm">
                      {datosCompletos?.estado || "CONECTADO"}
                    </span>
                    {isEmployee && (
                      <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-violet-500 text-white text-xs font-bold rounded-full shadow-sm">
                        Empleado
                      </span>
                    )}
                  </div>
                </div>

                {/* Grid de datos */}
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {/* Usuario */}
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center justify-center w-7 h-7 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs">Usuario</span>
                      <p className="text-text-primary font-medium -mt-0.5">{userUsername}</p>
                    </div>
                  </div>

                  {/* Teléfono */}
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center justify-center w-7 h-7 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs">Teléfono</span>
                      <p className="text-text-primary font-medium -mt-0.5">{userPhone}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center justify-center w-7 h-7 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs">Email</span>
                      <p className="text-text-primary font-medium -mt-0.5">{userEmail}</p>
                    </div>
                  </div>

                  {/* Departamentos - Diseño compacto con popover */}
                  {(departamentos.length > 0 || userDepartamento) && (
                    <div className="flex items-center gap-2 text-sm relative">
                      <div className="flex items-center justify-center w-7 h-7 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <span className="text-text-tertiary text-xs">
                          {departamentos.length > 1 ? `Departamentos (${departamentos.length})` : "Departamento"}
                        </span>
                        {departamentos.length > 0 ? (
                          <div className="flex items-center gap-1 -mt-0.5">
                            {/* Mostrar máximo 2 departamentos */}
                            {departamentos.slice(0, 2).map((depto, index) => (
                              <span
                                key={depto.id || index}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold max-w-[120px] truncate"
                                style={{
                                  backgroundColor: depto.color ? `${depto.color}20` : 'rgb(147, 51, 234, 0.1)',
                                  color: depto.color || 'rgb(147, 51, 234)'
                                }}
                                title={depto.nombre}
                              >
                                {depto.nombre}
                              </span>
                            ))}
                            {/* Mostrar badge +X si hay más de 2 */}
                            {departamentos.length > 2 && (
                              <div className="relative">
                                <button
                                  onClick={() => setShowAllDepartamentos(!showAllDepartamentos)}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors cursor-pointer"
                                >
                                  +{departamentos.length - 2}
                                </button>
                                {/* Popover con todos los departamentos */}
                                {showAllDepartamentos && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-40"
                                      onClick={() => setShowAllDepartamentos(false)}
                                    />
                                    <div className="absolute top-full left-0 mt-2 z-50 bg-bg-primary border border-border-subtle rounded-xl shadow-xl p-3 min-w-[280px] max-w-[400px]">
                                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-border-subtle">
                                        <span className="text-sm font-bold text-text-primary">
                                          Todos los departamentos ({departamentos.length})
                                        </span>
                                        <button
                                          onClick={() => setShowAllDepartamentos(false)}
                                          className="text-text-tertiary hover:text-text-primary"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
                                        {departamentos.map((depto, index) => (
                                          <span
                                            key={depto.id || index}
                                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                                            style={{
                                              backgroundColor: depto.color ? `${depto.color}20` : 'rgb(147, 51, 234, 0.1)',
                                              color: depto.color || 'rgb(147, 51, 234)'
                                            }}
                                          >
                                            {depto.nombre}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-purple-600 dark:text-purple-400 font-semibold -mt-0.5">{userDepartamento}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* RFC - Solo empleados */}
                  {isEmployee && userRFC && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center justify-center w-7 h-7 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                        <Briefcase className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div>
                        <span className="text-text-tertiary text-xs">RFC</span>
                        <p className="text-text-primary font-medium -mt-0.5">{userRFC}</p>
                      </div>
                    </div>
                  )}

                  {/* NSS - Solo empleados */}
                  {isEmployee && userNSS && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center justify-center w-7 h-7 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                        <svg className="w-4 h-4 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-text-tertiary text-xs">NSS</span>
                        <p className="text-text-primary font-medium -mt-0.5">{userNSS}</p>
                      </div>
                    </div>
                  )}

                  {/* Horario - Solo empleados */}
                  {isEmployee && userHorario && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center justify-center w-7 h-7 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <span className="text-text-tertiary text-xs">Horario</span>
                        <p className="text-text-primary font-medium -mt-0.5">{userHorario.hora_entrada} - {userHorario.hora_salida}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-3">
              {!isEmployee && (
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-bg-secondary hover:bg-bg-tertiary text-text-primary rounded-xl font-semibold transition-all border border-border-subtle hover:border-blue-300 hover:shadow-md text-sm"
                >
                  <Settings className="w-4 h-4" />
                  Configuración
                </button>
              )}
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg text-sm"
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
              <EmployeeInfo
                time={time}
                empleado={datosCompletos}
                horario={userHorario}
                loading={loadingEmpleado}
              />
            </div>

            {/* Columna 2 - Avisos Personales */}
            <div className="flex flex-col gap-3 min-h-0">
              {/* Avisos Personales */}
              <div className="bg-bg-primary rounded-2xl shadow-lg p-4 flex flex-col flex-1 min-h-0">
                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-text-primary">
                    Avisos Personales
                  </h2>
                </div>
                <div className="space-y-2 flex-1 min-h-0 overflow-auto">
                  {notices.slice(0, 4).map((notice, index) => (
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

              {/* Registro Biométrico - Grid 2 columnas */}
              <div className="grid grid-cols-2 gap-3 flex-1">
                {/* Registro Biométrico - Huella */}
                <button
                  onClick={() => setShowBiometricReader(true)}
                  className="w-full bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 dark:from-orange-800 dark:to-orange-900 dark:hover:from-orange-700 dark:hover:to-orange-800 rounded-2xl shadow-lg p-5 text-white transition-all hover:shadow-xl"
                >
                  <Fingerprint className="w-12 h-12 mx-auto mb-2" />
                  <h3 className="text-base font-bold mb-1">Registrar Huella</h3>
                  <p className="text-xs text-orange-100">
                    Vincular huella digital
                  </p>
                </button>

                {/* Registro Biométrico - Rostro */}
                <button
                  onClick={() => setShowRegisterFace(true)}
                  className="w-full bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 dark:from-cyan-800 dark:to-cyan-900 dark:hover:from-cyan-700 dark:hover:to-cyan-800 rounded-2xl shadow-lg p-5 text-white transition-all hover:shadow-xl"
                >
                  <Camera className="w-12 h-12 mx-auto mb-2" />
                  <h3 className="text-base font-bold mb-1">Registrar Rostro</h3>
                  <p className="text-xs text-cyan-100">
                    Vincular reconocimiento facial
                  </p>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <NoEmployeeInfo />
          </div>
        )}
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
          <div className="bg-bg-primary rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-800 dark:to-blue-900 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">
                    Detalle del Aviso
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="text-white hover:bg-white/20 dark:hover:bg-white/10 rounded-lg p-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-bg-secondary border-l-4 border-blue-500 dark:border-blue-600 rounded-lg p-4">
                <h4 className="font-bold text-lg text-blue-800 dark:text-blue-300 mb-2">
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
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-700 dark:to-blue-800 hover:from-blue-700 hover:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-xl font-bold transition-all"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de BiometricReader para registro de huella */}
      {showBiometricReader && (
        <BiometricReader
          isOpen={showBiometricReader}
          onClose={() => setShowBiometricReader(false)}
          onEnrollmentSuccess={(data) => {
            console.log("✅ Huella registrada:", data);
            setShowBiometricReader(false);
          }}
          idEmpleado={datosCompletos?.empleado_id}
          mode="enroll"
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
          horario={userHorario}
          loading={loadingEmpleado}
        />
      )}

      {/* Lector de huella en modo background - siempre activo */}
      <AsistenciaHuella
        isOpen={true}
        backgroundMode={true}
        onSuccess={(data) => {
          console.log("✅ Asistencia registrada:", data);
        }}
        onLoginRequest={(usuarioData) => {
          console.log("🔐 Login solicitado:", usuarioData);
          // Actualizar datos del empleado si es necesario
          if (updateEmpleadoData) {
            updateEmpleadoData(usuarioData);
          }
        }}
      />
    </div>
  );
}
