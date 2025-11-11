import React, { useState } from "react";
import { X, Info } from "lucide-react";
import { calcularDiasTotales } from "../../utils/dateHelpers";

export default function AusenciaModal({ onClose, userName = "Daniel Alejandro Amaya Abarca" }) {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [motivoAusencia, setMotivoAusencia] = useState("");

  const diasTotales = calcularDiasTotales(fechaInicio, fechaFin);

  const handleEnviar = () => {
    if (!fechaInicio || !fechaFin || !motivoAusencia) {
      alert("Por favor, completa todos los campos obligatorios");
      return;
    }

    const solicitud = {
      nombre: userName,
      id: "EMP-2024-1523",
      correo: "daniel.amaya@empresa.co",
      fechaInicio,
      fechaFin,
      diasTotales,
      motivo: motivoAusencia,
      fecha: new Date().toISOString(),
    };

    console.log("Solicitud de ausencia:", solicitud);
    alert("Solicitud enviada exitosamente");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                Solicitud de Permiso de Ausencia
              </h3>
              <p className="text-purple-100 text-sm">
                Complete la información del permiso que desea solicitar
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Información del Solicitante */}
          <div className="mb-6">
            <h4 className="text-lg font-bold text-gray-800 mb-4">
              Información del Solicitante
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={userName}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ID de Usuario
                </label>
                <input
                  type="text"
                  value="EMP-2024-1523"
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Correo Electrónico
                </label>
                <input
                  type="text"
                  value="daniel.amaya@empresa.co"
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Fechas y Días Totales */}
          <div className="mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha Inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha Fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  min={fechaInicio}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  Días Totales
                  <Info className="w-4 h-4 text-blue-500" />
                </label>
                <input
                  type="text"
                  value={diasTotales}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 text-center font-bold text-xl cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Motivo de Ausencia */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Motivo de Ausencia <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivoAusencia}
              onChange={(e) => setMotivoAusencia(e.target.value)}
              placeholder="Ej: Motivos personales, cita médica, asuntos familiares..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleEnviar}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-bold hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
            >
              Enviar Solicitud →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
