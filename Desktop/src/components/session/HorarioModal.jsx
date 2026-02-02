import { useState, useEffect, useMemo } from "react";
import { X, Clock, Calendar, Sun, Coffee } from "lucide-react";
import {
  getHorarioPorEmpleado,
  parsearHorario,
  calcularResumenSemanal
} from "../../services/horariosService";

export default function HorarioModal({ onClose, usuario }) {
  const [horarioRaw, setHorarioRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const diasSemana = [
    { key: "Lunes", abrev: "LUN" },
    { key: "Martes", abrev: "MAR" },
    { key: "Miércoles", abrev: "MIÉ" },
    { key: "Jueves", abrev: "JUE" },
    { key: "Viernes", abrev: "VIE" },
    { key: "Sábado", abrev: "SÁB" },
    { key: "Domingo", abrev: "DOM" },
  ];

  // Obtener el día actual
  const hoy = new Date().getDay();
  const diaActualIndex = hoy === 0 ? 6 : hoy - 1;

  // Obtener empleado_id
  const empleadoId = usuario?.empleado_id || usuario?.id || usuario?.empleadoInfo?.id;
  const token = localStorage.getItem('auth_token');

  // Cargar horario
  useEffect(() => {
    const cargarHorario = async () => {
      if (!empleadoId) {
        setLoading(false);
        setError('No se encontró ID del empleado');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const horario = await getHorarioPorEmpleado(empleadoId, token);
        setHorarioRaw(horario);
      } catch (err) {
        console.error('Error cargando horario:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    cargarHorario();
  }, [empleadoId, token]);

  // Parsear horario
  const horarioParsed = useMemo(() => {
    if (!horarioRaw) return null;
    return parsearHorario(horarioRaw);
  }, [horarioRaw]);

  // Resumen semanal
  const resumen = useMemo(() => {
    if (!horarioParsed) return { diasLaborales: 0, horasTotales: '0' };
    return calcularResumenSemanal(horarioParsed);
  }, [horarioParsed]);

  // Obtener info del día
  const getDiaInfo = (nombreDia) => {
    if (!horarioParsed) return null;
    return horarioParsed.find(d => d.day === nombreDia);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Mi Horario Semanal</h3>
                <p className="text-blue-100 text-sm">{resumen.horasTotales}h semanales · {resumen.diasLaborales} días laborales</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-text-secondary ml-4">Cargando horario...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-text-primary font-semibold mb-1">Sin horario asignado</p>
              <p className="text-text-secondary text-sm">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-3">
              {diasSemana.map((dia, index) => {
                const diaInfo = getDiaInfo(dia.key);
                const activo = diaInfo?.active || false;
                const esHoy = index === diaActualIndex;
                const turnos = diaInfo?.turnos || [];

                return (
                  <div
                    key={dia.key}
                    className={`
                      rounded-xl p-4 transition-all min-h-[180px] flex flex-col
                      ${esHoy
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400'
                        : activo
                          ? 'bg-bg-secondary border border-border-subtle hover:border-blue-300'
                          : 'bg-bg-tertiary/50 border border-transparent'
                      }
                    `}
                  >
                    {/* Header del día */}
                    <div className="text-center mb-3">
                      <p className={`text-xs font-bold tracking-wider ${esHoy ? 'text-blue-100' : 'text-text-secondary'}`}>
                        {dia.abrev}
                      </p>
                      <p className={`text-sm font-semibold mt-0.5 ${esHoy ? 'text-white' : 'text-text-primary'}`}>
                        {dia.key}
                      </p>
                      {esHoy && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold text-white">
                          <Sun className="w-3 h-3" /> HOY
                        </span>
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 flex flex-col justify-center">
                      {activo ? (
                        <div className="space-y-2">
                          {turnos.map((turno, idx) => (
                            <div
                              key={idx}
                              className={`
                                text-center rounded-lg py-2 px-1
                                ${esHoy ? 'bg-white/20' : 'bg-bg-primary border border-border-subtle'}
                              `}
                            >
                              <p className={`text-xs font-medium ${esHoy ? 'text-blue-100' : 'text-text-secondary'}`}>
                                {turnos.length > 1 ? `Turno ${idx + 1}` : 'Jornada'}
                              </p>
                              <p className={`text-sm font-bold ${esHoy ? 'text-white' : 'text-text-primary'}`}>
                                {turno.entrada}
                              </p>
                              <p className={`text-[10px] ${esHoy ? 'text-blue-200' : 'text-text-secondary'}`}>a</p>
                              <p className={`text-sm font-bold ${esHoy ? 'text-white' : 'text-text-primary'}`}>
                                {turno.salida}
                              </p>
                            </div>
                          ))}
                          {/* Total horas del día */}
                          <p className={`text-center text-xs font-semibold mt-1 ${esHoy ? 'text-blue-100' : 'text-blue-600'}`}>
                            {diaInfo?.hours}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Coffee className={`w-6 h-6 mx-auto mb-1 ${esHoy ? 'text-white/60' : 'text-text-disabled'}`} />
                          <p className={`text-xs font-medium ${esHoy ? 'text-white/60' : 'text-text-disabled'}`}>
                            Descanso
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
