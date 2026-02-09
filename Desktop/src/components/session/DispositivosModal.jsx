import React, { useState, useEffect } from "react";
import { X, Smartphone, Plus, Trash2, Save, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { getApiEndpoint } from "../../config/apiEndPoint";

const API_URL = getApiEndpoint("/api");

export default function DispositivosModal({ onClose, onBack, escritorioId }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Obtener token de autenticación
  const getAuthToken = () => {
    return localStorage.getItem("auth_token");
  };

  // Cargar dispositivos desde la BD
  const fetchDevices = async () => {
    if (!escritorioId) {
      setError("No se ha especificado el ID del escritorio");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      const response = await fetch(`${API_URL}/biometrico/escritorio/${escritorioId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("Error al cargar los dispositivos");
      }

      const result = await response.json();
      const data = result.data || result;

      // Mapear los datos de la BD a la estructura del componente
      const mappedDevices = Array.isArray(data) ? data.map(d => ({
        id: d.id,
        nombre: d.nombre || "",
        tipo: d.tipo || "facial",
        puerto: d.puerto || "",
        ip: d.ip || "",
        estado: d.estado || "desconectado",
        es_activo: d.es_activo ?? true,
      })) : [];

      setDevices(mappedDevices);
    } catch (err) {
      console.error("Error al cargar dispositivos:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [escritorioId]);

  const addDevice = () => {
    setDevices([
      ...devices,
      {
        id: `NEW_${Date.now()}`,
        nombre: "",
        tipo: "facial",
        puerto: "",
        ip: "",
        estado: "desconectado",
        es_activo: true,
        isNew: true,
      },
    ]);
  };

  const updateDevice = (id, field, value) => {
    setDevices(devices.map((dev) => (dev.id === id ? { ...dev, [field]: value } : dev)));
  };

  const removeDevice = (id) => {
    setDevices(devices.filter((dev) => dev.id !== id));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = getAuthToken();

      // Guardar cambios en la BD
      for (const device of devices) {
        const payload = {
          nombre: device.nombre,
          tipo: device.tipo,
          puerto: device.puerto || null,
          ip: device.ip || null,
          estado: device.estado,
          es_activo: device.es_activo,
          escritorio_id: escritorioId,
        };

        const headers = {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        };

        if (device.isNew) {
          // Crear nuevo dispositivo
          await fetch(`${API_URL}/biometrico`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          });
        } else {
          // Actualizar dispositivo existente
          await fetch(`${API_URL}/biometrico/${device.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(payload),
          });
        }
      }

      alert("Dispositivos guardados exitosamente");
      onClose();
    } catch (err) {
      console.error("Error al guardar:", err);
      alert("Error al guardar los dispositivos");
    } finally {
      setSaving(false);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case "conectado":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "desconectado":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-500 dark:from-green-800 dark:to-green-900 p-6 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 dark:bg-white/10 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">
                  Dispositivos Biométricos
                </h3>
                <p className="text-green-100 dark:text-green-200 text-sm mt-1">
                  Gestiona los dispositivos vinculados a este nodo
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

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin mb-4" />
              <p className="text-text-secondary">Cargando dispositivos...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={fetchDevices}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {devices.length === 0 ? (
                  <div className="text-center py-8 text-text-tertiary">
                    <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No hay dispositivos registrados</p>
                  </div>
                ) : (
                  devices.map((device) => (
                    <div
                      key={device.id}
                      className="bg-bg-secondary border-2 border-green-500 dark:border-green-800 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h4 className="font-bold text-text-primary flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400" />
                            {device.id}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(device.estado)}`}>
                            {device.estado}
                          </span>
                        </div>
                        <button
                          onClick={() => removeDevice(device.id)}
                          className="text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Nombre del Dispositivo
                          </label>
                          <input
                            type="text"
                            value={device.nombre}
                            onChange={(e) =>
                              updateDevice(device.id, "nombre", e.target.value)
                            }
                            className="w-full px-4 py-2 bg-bg-primary border border-border-subtle rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-text-primary placeholder:text-text-disabled"
                            placeholder="Ej: Lector de Huella"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Tipo
                          </label>
                          <select
                            value={device.tipo}
                            onChange={(e) =>
                              updateDevice(device.id, "tipo", e.target.value)
                            }
                            className="w-full px-4 py-2 bg-bg-primary border border-border-subtle rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-text-primary"
                          >
                            <option value="facial" className="bg-bg-primary text-text-primary">Facial</option>
                            <option value="dactilar" className="bg-bg-primary text-text-primary">Dactilar</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Puerto
                          </label>
                          <input
                            type="text"
                            value={device.puerto}
                            onChange={(e) =>
                              updateDevice(device.id, "puerto", e.target.value)
                            }
                            className="w-full px-4 py-2 bg-bg-primary border border-border-subtle rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-text-primary placeholder:text-text-disabled"
                            placeholder="Ej: USB-001"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            IP
                          </label>
                          <input
                            type="text"
                            value={device.ip}
                            onChange={(e) =>
                              updateDevice(device.id, "ip", e.target.value)
                            }
                            className="w-full px-4 py-2 bg-bg-primary border border-border-subtle rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-text-primary placeholder:text-text-disabled"
                            placeholder="Ej: 192.168.1.100"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-bg-secondary p-4 border-t border-border-subtle flex-shrink-0">
          <div className="flex gap-4">
            <button
              onClick={onBack || onClose}
              className="flex-1 px-6 py-3 bg-bg-primary border-2 border-border-subtle text-text-secondary rounded-xl font-bold hover:bg-bg-secondary transition-colors"
            >
              {onBack ? "Volver" : "Cancelar"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 dark:from-green-700 dark:to-green-800 text-white rounded-xl font-bold hover:from-green-700 hover:to-green-600 dark:hover:from-green-600 dark:hover:to-green-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving ? "Guardando..." : "Guardar Dispositivos"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
