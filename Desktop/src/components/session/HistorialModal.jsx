import React, { useState } from "react";
import { X, Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { formatDateShort } from "../../utils/dateHelpers";

export default function HistorialModal({ onClose, usuario }) {
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear());

  // Datos de ejemplo de historial de asistencias
  const historialAsistencias = [
    {
      fecha: "2025-12-18",
      entrada: "08:45",
      salida: "17:30",
      horasTrabajadas: "8h 45m",
      estado: "completo",
      tipo: "Normal",
    },
    {
      fecha: "2025-12-17",
      entrada: "08:30",
      salida: "17:15",
      horasTrabajadas: "8h 45m",
      estado: "completo",
      tipo: "Normal",
    },
    {
      fecha: "2025-12-16",
      entrada: "09:15",
      salida: "17:30",
      horasTrabajadas: "8h 15m",
      estado: "tarde",
      tipo: "Retardo",
    },
    {
      fecha: "2025-12-15",
      entrada: "--:--",
      salida: "--:--",
      horasTrabajadas: "0h 0m",
      estado: "ausente",
      tipo: "Fin de semana",
    },
    {
      fecha: "2025-12-14",
      entrada: "--:--",
      salida: "--:--",
      horasTrabajadas: "0h 0m",
      estado: "ausente",
      tipo: "Fin de semana",
    },
    {
      fecha: "2025-12-13",
      entrada: "08:35",
      salida: "17:20",
      horasTrabajadas: "8h 45m",
      estado: "completo",
      tipo: "Normal",
    },
    {
      fecha: "2025-12-12",
      entrada: "08:40",
      salida: "17:25",
      horasTrabajadas: "8h 45m",
      estado: "completo",
      tipo: "Normal",
    },
  ];

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const getEstadoColor = (estado) => {
    switch (estado) {
      case "completo":
        return "bg-green-100 text-green-700 border-green-200";
      case "tarde":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "ausente":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case "completo":
        return <CheckCircle className="w-4 h-4" />;
      case "tarde":
        return <AlertCircle className="w-4 h-4" />;
      case "ausente":
        return <X className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                Historial de Registros
              </h3>
              <p className="text-green-100 text-sm">
                Consulta tus entradas y salidas de días anteriores
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

        {/* Filtros */}
        <div className="p-6 bg-bg-secondary border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-text-secondary" />
              <label className="text-sm font-semibold text-text-secondary">
                Período:
              </label>
            </div>
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
              className="px-4 py-2 bg-bg-primary border border-border-subtle rounded-lg text-text-primary font-medium focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {meses.map((mes, index) => (
                <option key={index} value={index}>
                  {mes}
                </option>
              ))}
            </select>
            <select
              value={añoSeleccionado}
              onChange={(e) => setAñoSeleccionado(parseInt(e.target.value))}
              className="px-4 py-2 bg-bg-primary border border-border-subtle rounded-lg text-text-primary font-medium focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
              <option value={2023}>2023</option>
            </select>
          </div>
        </div>

        {/* Tabla de Historial */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="border border-border-subtle rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-bg-secondary border-b-2 border-border-subtle">
                <tr>
                  <th className="text-left py-3 px-4 font-bold text-text-secondary text-sm">
                    Fecha
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-text-secondary text-sm">
                    Entrada
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-text-secondary text-sm">
                    Salida
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-text-secondary text-sm">
                    Horas Trabajadas
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-text-secondary text-sm">
                    Tipo
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-text-secondary text-sm">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {historialAsistencias.map((registro, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border-subtle hover:bg-bg-secondary transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-text-secondary" />
                        <span className="font-semibold text-text-primary text-sm">
                          {new Date(registro.fecha).toLocaleDateString('es-MX', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="font-mono font-semibold text-text-primary text-sm">
                          {registro.entrada}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4 text-red-600" />
                        <span className="font-mono font-semibold text-text-primary text-sm">
                          {registro.salida}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-semibold text-blue-600 text-sm">
                        {registro.horasTrabajadas}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-text-secondary text-sm">
                        {registro.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${getEstadoColor(
                            registro.estado
                          )}`}
                        >
                          {getEstadoIcon(registro.estado)}
                          {registro.estado === "completo" && "Completo"}
                          {registro.estado === "tarde" && "Retardo"}
                          {registro.estado === "ausente" && "Ausente"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumen */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-bold text-green-700">Días Completos</h4>
              </div>
              <p className="text-3xl font-bold text-green-700">
                {historialAsistencias.filter(r => r.estado === "completo").length}
              </p>
              <p className="text-xs text-green-600">días trabajados</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <h4 className="font-bold text-yellow-700">Retardos</h4>
              </div>
              <p className="text-3xl font-bold text-yellow-700">
                {historialAsistencias.filter(r => r.estado === "tarde").length}
              </p>
              <p className="text-xs text-yellow-600">días con retardo</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <X className="w-5 h-5 text-gray-600" />
                <h4 className="font-bold text-gray-700">Ausencias</h4>
              </div>
              <p className="text-3xl font-bold text-gray-700">
                {historialAsistencias.filter(r => r.estado === "ausente").length}
              </p>
              <p className="text-xs text-gray-600">días ausentes</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-bg-secondary border-t border-border-subtle flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-xl font-bold text-base shadow-lg transition-all"
          >
            CERRAR
          </button>
        </div>
      </div>
    </div>
  );
}
