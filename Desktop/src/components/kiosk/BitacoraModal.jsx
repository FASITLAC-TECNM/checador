import { Activity, X } from "lucide-react";
import { eventLog } from "../../constants/notices";

const getRowColor = (type) => {
  switch (type) {
    case "success":
      return "hover:bg-green-50";
    case "error":
      return "hover:bg-red-50";
    case "info":
      return "hover:bg-blue-50";
    default:
      return "hover:bg-gray-50";
  }
};

const getStatusIcon = (type) => {
  switch (type) {
    case "success":
      return (
        <div className="flex justify-center items-center">
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            ✓ Exitoso
          </span>
        </div>
      );
    case "error":
      return (
        <div className="flex justify-center items-center">
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
            ✕ Error
          </span>
        </div>
      );
    case "info":
      return (
        <div className="flex justify-center items-center">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
            ℹ Info
          </span>
        </div>
      );
    default:
      return null;
  }
};

export default function BitacoraModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">
                Bitácora de Eventos del Sistema
              </h3>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <Activity className="w-4 h-4" />
                <span>Registro de actividad del sistema</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="text-center py-2 px-3 font-bold text-gray-700 text-xs">
                    ⏰ Hora
                  </th>
                  <th className="text-left py-2 px-3 font-bold text-gray-700 text-xs">
                    👤 Usuario
                  </th>
                  <th className="text-left py-2 px-3 font-bold text-gray-700 text-xs">
                    📋 Acción
                  </th>
                  <th className="text-center py-2 px-3 font-bold text-gray-700 text-xs">
                    ✓ Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {eventLog.map((event, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-gray-200 transition-colors ${getRowColor(
                      event.type
                    )}`}
                  >
                    <td className="py-2 px-3 text-gray-600 font-mono text-center font-semibold text-xs">
                      {event.timestamp}
                    </td>
                    <td className="py-2 px-3 text-gray-800 font-semibold text-xs">
                      {event.user}
                    </td>
                    <td className="py-2 px-3 text-gray-700 text-xs">
                      {event.action}
                    </td>
                    <td className="py-2 px-3">{getStatusIcon(event.type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-bold text-base shadow-lg transition-all"
          >
            CERRAR
          </button>
        </div>
      </div>
    </div>
  );
}