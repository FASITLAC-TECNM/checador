import React from "react";
import { X, Clock, Calendar, Coffee, Sun, Moon } from "lucide-react";

export default function HorarioModal({ onClose, horario, loading }) {
  const diasSemana = [
    { key: "lunes", nombre: "Lunes", abrev: "Lun" },
    { key: "martes", nombre: "Martes", abrev: "Mar" },
    { key: "miercoles", nombre: "Miércoles", abrev: "Mié" },
    { key: "jueves", nombre: "Jueves", abrev: "Jue" },
    { key: "viernes", nombre: "Viernes", abrev: "Vie" },
    { key: "sabado", nombre: "Sábado", abrev: "Sáb" },
    { key: "domingo", nombre: "Domingo", abrev: "Dom" },
  ];

  // Obtener el día actual (0 = domingo, 1 = lunes, etc.)
  const hoy = new Date().getDay();
  const diaActualIndex = hoy === 0 ? 6 : hoy - 1; // Convertir a índice donde 0 = lunes

  // Verificar si un día está activo en el horario
  const isDiaActivo = (diaKey) => {
    // Si el horario tiene días específicos definidos
    if (horario?.dias) {
      return horario.dias.includes(diaKey);
    }
    // Por defecto, lunes a viernes están activos
    return ["lunes", "martes", "miercoles", "jueves", "viernes"].includes(diaKey);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-800 dark:to-blue-900 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-white" />
              <div>
                <h3 className="text-xl font-bold text-white">Mi Horario</h3>
                {horario?.nombre && (
                  <p className="text-blue-100 dark:text-blue-200 text-sm">
                    {horario.nombre}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 dark:hover:bg-white/10 rounded-lg p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
              <p className="text-text-secondary mt-3">Cargando horario...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Aviso si no hay horario asignado */}
              {!horario && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                  <p className="text-sm text-amber-700 dark:text-amber-300 text-center">
                    No tienes un horario específico asignado. Contacta a tu administrador.
                  </p>
                </div>
              )}

              {/* Horario principal */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
                  <div className="flex items-center gap-2 mb-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold text-text-secondary uppercase">
                      Entrada
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-text-primary">
                    {horario?.hora_entrada || "--:--"}
                  </p>
                </div>
                <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
                  <div className="flex items-center gap-2 mb-2">
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-semibold text-text-secondary uppercase">
                      Salida
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-text-primary">
                    {horario?.hora_salida || "--:--"}
                  </p>
                </div>
              </div>

              {/* Horario de comida */}
              {(horario?.hora_comida_inicio || horario?.hora_comida_fin) && (
                <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
                  <div className="flex items-center gap-2 mb-2">
                    <Coffee className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-semibold text-text-secondary uppercase">
                      Horario de comida
                    </span>
                  </div>
                  <p className="text-lg font-bold text-text-primary">
                    {horario.hora_comida_inicio || "--:--"} - {horario.hora_comida_fin || "--:--"}
                  </p>
                </div>
              )}

              {/* Días de la semana */}
              <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold text-text-secondary uppercase">
                    Días laborales
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {diasSemana.map((dia, index) => {
                    const activo = isDiaActivo(dia.key);
                    const esHoy = index === diaActualIndex;

                    return (
                      <div
                        key={dia.key}
                        className={`
                          flex flex-col items-center justify-center p-2 rounded-lg transition-all
                          ${activo
                            ? esHoy
                              ? "bg-blue-500 dark:bg-blue-600 text-white shadow-md"
                              : "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                            : "bg-bg-tertiary text-text-disabled"
                          }
                        `}
                      >
                        <span className="text-xs font-bold">{dia.abrev}</span>
                        {esHoy && (
                          <span className="w-1.5 h-1.5 bg-white rounded-full mt-1"></span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Descripción */}
              {horario?.descripcion && (
                <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
                  <p className="text-sm text-text-secondary">
                    {horario.descripcion}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 pt-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-700 dark:to-blue-800 hover:from-blue-700 hover:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-xl font-bold transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
