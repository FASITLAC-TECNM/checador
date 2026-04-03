import React from 'react';
import { FiEdit2, FiTrash2, FiMapPin, FiUsers, FiRefreshCw } from 'react-icons/fi';

const DepartamentsCard = ({ depto, onEdit, onDelete, onReactivar, onFocus }) => {

    const getInitials = (nombre) => {
        if (!nombre) return '--';
        const parts = nombre.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return nombre.substring(0, 2).toUpperCase();
    };

    // Formatear color
    const hexColor = depto.es_activo === false
        ? '#EF4444'
        : (depto.color?.startsWith('#') ? depto.color : `#${depto.color || '6B7280'}`);

    return (
        <div
            onClick={() => onFocus(depto)}
            className={`relative rounded-2xl p-[1px] transition-all duration-300 flex flex-col h-full overflow-hidden group cursor-pointer
                ${depto.es_activo === false ? 'opacity-75 grayscale-[40%]' : 'hover:-translate-y-1 hover:shadow-lg'}
            `}
        >
            {/* Contenedor interior - Crea el efecto de borde 1px y el glassmorphism */}
            <div className={`relative flex-1 flex flex-col p-5 rounded-[15px] z-10 border border-slate-200 dark:border-gray-700
                ${depto.es_activo === false
                    ? 'bg-slate-50 dark:bg-gray-800'
                    : 'bg-white dark:bg-gray-800'
                }
            `}>

                {/* Header (Línea de color, Título y Acciones) */}
                <div className="flex justify-between items-start mb-3 relative z-20">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Indicador de Color */}
                        <div
                            className="w-2.5 h-10 rounded-full flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: hexColor }}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className={`font-bold text-lg leading-tight truncate ${depto.es_activo === false ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-white'}`} title={depto.nombre}>
                                    {depto.nombre}
                                </h3>
                                {depto.es_activo === false && (
                                    <span className="flex-shrink-0 text-[10px] font-bold text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/40 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800/50">
                                        Inactivo
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Botones de acción - Visibles al hover */}
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2 relative z-20">
                        {depto.es_activo === false ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); onReactivar && onReactivar(depto); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                                title="Reactivar"
                            >
                                <FiRefreshCw className="w-3.5 h-3.5" /> Reactivar
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(depto); }}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg transition-all"
                                    title="Editar"
                                >
                                    <FiEdit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(depto); }}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/40 rounded-lg transition-all"
                                    title="Desactivar"
                                >
                                    <FiTrash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Descripción */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 line-clamp-2 min-h-[2.5em] relative z-20">
                    {depto.descripcion || 'Sin descripción detallada para este departamento.'}
                </p>

                {/* Footer (Jefes y Badges) */}
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700/50 relative z-20">
                    {/* Avatares de Jefes */}
                    <div className="flex -space-x-2.5 overflow-hidden">
                        {depto.jefes?.slice(0, 3).map((jefe, i) => (
                            jefe.foto ? (
                                <img key={i} src={jefe.foto} alt={jefe.nombre || 'Jefe'} title={jefe.nombre || 'Sin nombre'} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800 object-cover shadow-sm transition-transform hover:-translate-y-1 hover:z-10" />
                            ) : (
                                <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 shadow-sm transition-transform hover:-translate-y-1 hover:z-10" title={jefe.nombre || 'Sin nombre'}>
                                    {getInitials(jefe.nombre)}
                                </div>
                            )
                        ))}
                        {(depto.jefes?.length || 0) > 3 && (
                            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 shadow-sm relative z-0">
                                +{depto.jefes.length - 3}
                            </div>
                        )}
                        {(depto.jefes?.length || 0) === 0 && (
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 italic px-2 py-0.5 bg-gray-50 dark:bg-gray-800/50 rounded-full border border-gray-100 dark:border-gray-700">Sin jefes asignados</span>
                        )}
                    </div>

                    {/* Badges de Métricas */}
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-slate-200 dark:bg-gray-800 dark:border-gray-700 text-slate-700 dark:text-gray-300 font-semibold text-[11px]" title="Empleados asignados">
                            <FiUsers className="w-3.5 h-3.5 text-primary-500" />
                            <span>{depto.empleados_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-slate-200 dark:bg-gray-800 dark:border-gray-700 text-slate-700 dark:text-gray-300 font-semibold text-[11px]" title="Zonas Geográficas vinculadas">
                            <FiMapPin className="w-3.5 h-3.5 text-orange-500" />
                            <span>{depto.ubicacion?.zonas?.length || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepartamentsCard;