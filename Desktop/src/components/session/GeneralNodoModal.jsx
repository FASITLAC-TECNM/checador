import React, { useState, useEffect } from "react";
import { X, HardDrive, Save, RefreshCw, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { getSystemInfoAdvanced } from "../../utils/systemInfoAdvanced";
import {
  obtenerEscritorio,
  actualizarEscritorio,
  obtenerEscritorioIdGuardado,
} from "../../services/escritorioService";

export default function GeneralNodoModal({ onClose, onBack }) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [escritorioId, setEscritorioId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [nodeConfig, setNodeConfig] = useState({
    nodeName: "",
    nodeDescription: "",
    ipAddress: "",
    macAddress: "",
    operatingSystem: "",
    dispositivosBiometricos: [],
    esActivo: true,
  });

  // Cargar datos del escritorio al montar el componente
  useEffect(() => {
    cargarDatosEscritorio();
  }, []);

  // Auto-ocultar toast después de 3 segundos
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: "", type: "success" });
        // Si fue éxito, cerrar el modal
        if (toast.type === "success") {
          onClose();
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toast.show, toast.type, onClose]);

  // Mostrar toast
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  const cargarDatosEscritorio = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const id = obtenerEscritorioIdGuardado();

      if (!id) {
        setError("No se encontró el ID del escritorio. Por favor, complete el proceso de afiliación primero.");
        setIsLoading(false);
        return;
      }

      setEscritorioId(id);
      const datos = await obtenerEscritorio(id);

      setNodeConfig({
        nodeName: datos.nombre || "",
        nodeDescription: datos.descripcion || "",
        ipAddress: datos.ip || "",
        macAddress: datos.mac || "",
        operatingSystem: datos.sistema_operativo || "",
        dispositivosBiometricos: datos.dispositivos_biometricos || [],
        esActivo: datos.es_activo === true || datos.es_activo === 1,
      });

      console.log("✅ Datos del escritorio cargados:", datos);
    } catch (err) {
      console.error("❌ Error al cargar datos del escritorio:", err);
      setError(`Error al cargar los datos: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const detectSystemInfo = async () => {
    setIsDetecting(true);
    try {
      const systemInfo = await getSystemInfoAdvanced();

      setNodeConfig((prev) => ({
        ...prev,
        ipAddress: systemInfo.ipAddress || prev.ipAddress,
        macAddress: systemInfo.macAddress || prev.macAddress,
        operatingSystem: systemInfo.operatingSystem || prev.operatingSystem,
      }));

      console.log("✅ Información del sistema detectada:", {
        IP: systemInfo.ipAddress,
        MAC: systemInfo.macAddress,
        OS: systemInfo.operatingSystem,
      });
    } catch (error) {
      console.error("Error al detectar información del sistema:", error);
      showToast("Error al detectar la información del sistema", "error");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSave = async () => {
    if (!escritorioId) {
      showToast("No se puede guardar: ID del escritorio no disponible", "error");
      return;
    }

    setIsSaving(true);
    try {
      await actualizarEscritorio(escritorioId, {
        nombre: nodeConfig.nodeName,
        descripcion: nodeConfig.nodeDescription,
        ip: nodeConfig.ipAddress,
        mac: nodeConfig.macAddress,
        sistema_operativo: nodeConfig.operatingSystem,
      });

      console.log("✅ Configuración del nodo guardada:", nodeConfig);
      showToast("Configuración guardada exitosamente", "success");
    } catch (err) {
      console.error("❌ Error al guardar:", err);
      showToast(`Error al guardar: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-bg-primary rounded-3xl shadow-2xl max-w-md w-full overflow-hidden p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-text-primary font-medium">Cargando datos del escritorio...</p>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar error si no se pudo cargar
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-bg-primary rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-500 px-4 py-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-white" />
              <h3 className="text-lg font-bold text-white">Error</h3>
            </div>
          </div>
          <div className="p-6">
            <p className="text-text-secondary mb-4">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={cargarDatosEscritorio}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm bg-bg-secondary border border-border-subtle text-text-secondary rounded-xl font-semibold hover:bg-bg-primary transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Toast de notificación */}
      {toast.show && (
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}

      <div className="bg-bg-primary rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-800 dark:to-blue-900 px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 dark:bg-white/10 rounded-xl flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">General del Nodo</h3>
                <p className="text-blue-100 dark:text-blue-200 text-xs">
                  Configuración general del sistema y nodo de trabajo
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 dark:hover:bg-white/10 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-3">
          {/* ID del Escritorio */}
          <div className="mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <span className="font-semibold">ID del Escritorio:</span>{" "}
              <span className="font-mono">{escritorioId}</span>
              {nodeConfig.esActivo ? (
                <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs">
                  Activo
                </span>
              ) : (
                <span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full text-xs">
                  Inactivo
                </span>
              )}
            </p>
          </div>

          <div className="bg-bg-secondary border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                <HardDrive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Información del Nodo
              </h4>
              <button
                type="button"
                onClick={detectSystemInfo}
                disabled={isDetecting}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDetecting ? "animate-spin" : ""}`} />
                {isDetecting ? "Detectando..." : "Autodetectar"}
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Nombre del Nodo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nodeConfig.nodeName}
                  onChange={(e) =>
                    setNodeConfig({ ...nodeConfig, nodeName: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm bg-bg-primary border border-border-subtle rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-text-primary placeholder:text-text-disabled"
                  placeholder="Ej: Entrada Principal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={nodeConfig.nodeDescription}
                  onChange={(e) =>
                    setNodeConfig({ ...nodeConfig, nodeDescription: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm bg-bg-primary border border-border-subtle rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-text-primary placeholder:text-text-disabled"
                  placeholder="Descripción del nodo de trabajo"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Dirección IP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nodeConfig.ipAddress}
                    disabled
                    className="w-full px-3 py-1.5 text-sm bg-bg-secondary border border-border-subtle rounded-lg text-text-secondary cursor-not-allowed"
                    placeholder="192.168.1.100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Dirección MAC <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nodeConfig.macAddress}
                    disabled
                    className="w-full px-3 py-1.5 text-sm bg-bg-secondary border border-border-subtle rounded-lg text-text-secondary cursor-not-allowed"
                    placeholder="00:1A:2B:3C:4D:5E"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Sistema Operativo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nodeConfig.operatingSystem}
                  disabled
                  className="w-full px-3 py-1.5 text-sm bg-bg-secondary border border-border-subtle rounded-lg text-text-secondary cursor-not-allowed"
                  placeholder="Linux Debian 11"
                />
              </div>

              {/* Dispositivos Biométricos */}
              {nodeConfig.dispositivosBiometricos && nodeConfig.dispositivosBiometricos.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Dispositivos Biométricos Asociados
                  </label>
                  <div className="bg-bg-primary border border-border-subtle rounded-lg p-2 space-y-1">
                    {nodeConfig.dispositivosBiometricos.map((dispositivo, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between px-2 py-1 bg-bg-secondary rounded text-xs"
                      >
                        <span className="text-text-primary font-medium">
                          {dispositivo.nombre || `Dispositivo ${index + 1}`}
                        </span>
                        <span className="text-text-secondary">
                          {dispositivo.tipo || "biométrico"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 mt-3">
            <button
              onClick={onBack || onClose}
              className="flex-1 px-4 py-2 text-sm bg-bg-primary border-2 border-border-subtle text-text-secondary rounded-2xl font-semibold hover:bg-bg-secondary transition-colors"
            >
              {onBack ? "Volver" : "Cancelar"}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-700 dark:to-blue-800 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Configuración
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
