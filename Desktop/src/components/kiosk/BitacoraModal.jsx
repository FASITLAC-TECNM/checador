import { Activity, X } from "lucide-react";
import { eventLog } from "../../constants/notices";
import { obtenerBitacora } from "../../services/bitacoraService";
import { useState, useEffect } from "react";

const getRowColor = (type) => {
  switch (type) {
    case "success":
      return "hover:bg-green-50 dark:hover:bg-green-900/20";
    case "error":
      return "hover:bg-red-50 dark:hover:bg-red-900/20";
    case "info":
      return "hover:bg-blue-50 dark:hover:bg-blue-900/20";
    default:
      return "hover:bg-bg-secondary dark:hover:bg-bg-tertiary";
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
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    // Función para cargar eventos
    const cargarEventos = () => {
      const eventosDinamicos = obtenerBitacora();
      console.log("Bitácora Modal - Cargando eventos:", eventosDinamicos.length);

      // Si hay eventos en localStorage, usarlos; si no, usar los de ejemplo
      if (eventosDinamicos.length > 0) {
        setEventos(eventosDinamicos);
        console.log("Eventos cargados desde localStorage");
      } else {
        setEventos(eventLog);
        console.log("No hay eventos en localStorage, usando eventos de ejemplo");
      }
    };

    // Cargar eventos inicialmente
    cargarEventos();

    // Actualizar cada 1 segundo para reflejar nuevos eventos más rápidamente
    const interval = setInterval(() => {
      cargarEventos();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-bg-primary p-6 border-b border-border-subtle">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-text-primary" />
              <div>
                <h3 className="text-2xl font-bold text-text-primary">
                  Bitácora de Eventos
                </h3>
                <p className="text-text-secondary text-sm mt-1">
                  Registro de actividad de los empleados ({eventos.length} eventos)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:bg-bg-secondary rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="border border-border-subtle rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-bg-secondary border-b-2 border-border-subtle">
                <tr>
                  <th className="text-center py-2 px-3 font-bold text-text-secondary text-xs">
                    Hora
                  </th>
                  <th className="text-left py-2 px-3 font-bold text-text-secondary text-xs">
                    Usuario
                  </th>
                  <th className="text-left py-2 px-3 font-bold text-text-secondary text-xs">
                    Acción
                  </th>
                  <th className="text-center py-2 px-3 font-bold text-text-secondary text-xs">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((event, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-border-subtle transition-colors ${getRowColor(
                      event.type
                    )}`}
                  >
                    <td className="py-2 px-3 text-text-secondary font-mono text-center font-semibold text-xs">
                      {event.timestamp}
                    </td>
                    <td className="py-2 px-3 text-text-primary font-semibold text-xs">
                      {event.user}
                    </td>
                    <td className="py-2 px-3 text-text-secondary text-xs">
                      {event.action}
                    </td>
                    <td className="py-2 px-3">{getStatusIcon(event.type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


      </div>
    </div>
  );
}