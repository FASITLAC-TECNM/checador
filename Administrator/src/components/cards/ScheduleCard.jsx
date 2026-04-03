import React from 'react';
import { FiUser, FiCalendar, FiEdit2, FiTrash2, FiRefreshCw, FiClock } from 'react-icons/fi';

const ScheduleCard = ({ horario, empleadoNombre, onEdit, onDelete, onReactivar }) => {
    const getTotalHours = () => {
        if (!horario.configuracion?.configuracion_semanal) return 0;

        let totalMinutes = 0;
        const config = horario.configuracion.configuracion_semanal;

        Object.values(config).forEach(turnos => {
            if (Array.isArray(turnos)) {
                turnos.forEach(turno => {
                    const [startH, startM] = turno.inicio.split(':').map(Number);
                    const [endH, endM] = turno.fin.split(':').map(Number);
                    const start = startH * 60 + startM;
                    const end = endH * 60 + endM;
                    totalMinutes += (end - start);
                });
            }
        });

        return (totalMinutes / 60).toFixed(1);
    };

    const totalHours = getTotalHours();

    return (
        <div className="card p-0 hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/50">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="p-1.5 bg-white border border-slate-200 dark:bg-gray-700 rounded shadow-sm">
                            <FiUser className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                            {empleadoNombre}
                        </h3>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${horario.es_activo
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-slate-100 border-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-400'
                        }`}>
                        {horario.es_activo ? 'Activo' : 'Inactivo'}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
                {/* Fechas */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-gray-400">
                        <FiCalendar className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500" />
                        <span className="font-semibold text-slate-700">Inicio:</span>
                        <span>{new Date(horario.fecha_inicio).toLocaleDateString('es-MX')}</span>
                    </div>
                    {horario.fecha_fin ? (
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-gray-400">
                            <FiCalendar className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500" />
                            <span className="font-semibold text-slate-700">Fin:</span>
                            <span>{new Date(horario.fecha_fin).toLocaleDateString('es-MX')}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 italic">
                            <FiCalendar className="w-3.5 h-3.5" />
                            <span>Sin fecha de fin</span>
                        </div>
                    )}
                </div>

                {/* Total horas */}
                <div className="flex items-center gap-2 pt-2 mt-auto border-t border-slate-100 dark:border-gray-700">
                    <FiClock className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500" />
                    <span className="text-xs text-slate-600 dark:text-gray-400">
                        <span className="font-bold text-slate-900 dark:text-white">{totalHours}</span> horas/semana
                    </span>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-gray-900/50 border-t border-slate-100 dark:border-gray-700">
                <div className="flex gap-2">
                    {horario.es_activo ? (
                        <>
                            <button
                                onClick={() => onEdit(horario)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 rounded-md hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                            >
                                <FiEdit2 className="w-3.5 h-3.5" />
                                Editar
                            </button>
                            <button
                                onClick={() => onDelete(horario)}
                                className="flex items-center justify-center px-3 py-2 text-xs text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors shadow-sm"
                                title="Desactivar"
                            >
                                <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => onReactivar(horario)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-green-300 bg-white dark:bg-gray-800 border border-slate-300 dark:border-green-800 rounded-md hover:bg-slate-50 dark:hover:bg-green-900/20 transition-colors shadow-sm"
                        >
                            <FiRefreshCw className="w-3.5 h-3.5" />
                            Reactivar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScheduleCard;
