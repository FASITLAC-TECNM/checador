import React, { useState } from "react";
import { X, Smartphone, Plus, Trash2, Save } from "lucide-react";

export default function DispositivosModal({ onClose, initialDevices = [] }) {
  const [devices, setDevices] = useState(
    initialDevices.length > 0
      ? initialDevices
      : [
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
        ]
  );

  const addDevice = () => {
    setDevices([
      ...devices,
      {
        id: devices.length + 1,
        nombre: "",
        descripcion: "",
        tipo: "Cámara",
        puerto: "",
      },
    ]);
  };

  const updateDevice = (id, field, value) => {
    setDevices(devices.map((dev) => (dev.id === id ? { ...dev, [field]: value } : dev)));
  };

  const removeDevice = (id) => {
    setDevices(devices.filter((dev) => dev.id !== id));
  };

  const handleSave = () => {
    console.log("Dispositivos guardados:", devices);
    alert("Dispositivos guardados exitosamente");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">
                  Dispositivos Conectados
                </h3>
                <p className="text-green-100 text-sm mt-1">
                  Gestiona los dispositivos vinculados a tu cuenta
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4 mb-6">
            {devices.map((device) => (
              <div
                key={device.id}
                className="bg-green-50 border-2 border-green-200 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-4">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-green-600" />
                    Dispositivo #{device.id}
                  </h4>
                  <button
                    onClick={() => removeDevice(device.id)}
                    className="text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Dispositivo
                    </label>
                    <input
                      type="text"
                      value={device.nombre}
                      onChange={(e) =>
                        updateDevice(device.id, "nombre", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Ej: Lector de Huella"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo
                    </label>
                    <select
                      value={device.tipo}
                      onChange={(e) =>
                        updateDevice(device.id, "tipo", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="Cámara">Cámara</option>
                      <option value="Biométrico">Biométrico</option>
                      <option value="Lector RFID">Lector RFID</option>
                      <option value="Teclado">Teclado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Puerto/Conexión
                    </label>
                    <input
                      type="text"
                      value={device.puerto}
                      onChange={(e) =>
                        updateDevice(device.id, "puerto", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Ej: USB-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <input
                      type="text"
                      value={device.descripcion}
                      onChange={(e) =>
                        updateDevice(device.id, "descripcion", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Descripción breve"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addDevice}
            className="w-full py-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border-2 border-green-300 border-dashed"
          >
            <Plus className="w-5 h-5" />
            Agregar Nuevo Dispositivo
          </button>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex-shrink-0">
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold hover:from-green-700 hover:to-green-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Guardar Dispositivos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
