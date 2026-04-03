import React from 'react';
import { FiEdit2, FiMail, FiPhone, FiChevronRight, FiTrash2, FiRefreshCw } from 'react-icons/fi';

const UserCard = ({ usuario, onEdit, onViewProfile, onDelete, onReactivar }) => {

    const getInitials = (nombre) => {
        if (!nombre) return '?';
        const parts = nombre.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return nombre.substring(0, 2).toUpperCase();
    };

    const statusBadge = {
        activo: 'bg-green-100 text-green-700',
        suspendido: 'bg-yellow-100 text-yellow-700',
        baja: 'bg-red-100 text-red-700'
    };

    return (
        <div
            onClick={() => onViewProfile(usuario.usuario)}
            className={`group relative card p-4 hover:-translate-y-1 transition-all cursor-pointer flex flex-col gap-3 ${usuario.estado_cuenta === 'baja'
                ? 'bg-slate-50 dark:bg-gray-900/50 grayscale-[50%] opacity-75'
                : usuario.estado_cuenta === 'suspendido'
                    ? 'bg-orange-50/50 dark:bg-yellow-900/10'
                    : 'bg-white dark:bg-gray-800'
                }`}
        >
            {/* Header: Avatar, Info, Actions */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                    {/* 1. Avatar */}
                    <div className="flex-shrink-0">
                        {usuario.foto ? (
                            <img
                                src={usuario.foto}
                                alt={usuario.nombre}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-gray-600 shadow-sm"
                            />
                        ) : (
                            <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 rounded-xl flex items-center justify-center text-primary-700 font-bold text-sm shadow-sm opacity-90">
                                {getInitials(usuario.nombre)}
                            </div>
                        )}
                    </div>

                    {/* 2. Información Principal */}
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate" title={usuario.nombre}>
                            {usuario.nombre}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{usuario.usuario}</p>
                    </div>
                </div>

                {/* 5. Acciones */}
                <div className="flex items-center gap-1 flex-shrink-0 -mr-2">
                    {usuario.estado_cuenta === 'baja' ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onReactivar && onReactivar(usuario);
                            }}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                            title="Reactivar usuario"
                        >
                            <FiRefreshCw className="w-4 h-4" />
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(usuario);
                                }}
                                className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 dark:hover:bg-gray-700 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                title="Editar"
                            >
                                <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete && onDelete(usuario);
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 dark:hover:bg-gray-700 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                title="Dar de baja"
                            >
                                <FiTrash2 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Body: Contacto y Badges */}
            <div className="flex flex-col gap-2 mt-1">
                {/* Contacto */}
                <div className="flex flex-col gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2 truncate" title={usuario.correo}>
                        <FiMail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{usuario.correo}</span>
                    </div>
                    {usuario.telefono && (
                        <div className="flex items-center gap-2 truncate text-[11px]">
                            <FiPhone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span>{usuario.telefono}</span>
                        </div>
                    )}
                </div>

                {/* 4. Badges de Rol y Estado */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${usuario.estado_cuenta === 'activo' ? 'bg-green-50 border border-green-200 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                        usuario.estado_cuenta === 'suspendido' ? 'bg-orange-50 border border-orange-200 dark:bg-yellow-900/30 text-orange-700 dark:text-yellow-300' :
                            'bg-red-50 border border-red-200 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}>
                        {usuario.estado_cuenta}
                    </span>
                    {usuario.es_empleado && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-blue-900/30 text-slate-700 dark:text-blue-300 border border-slate-200 dark:border-blue-900/50">
                            Empleado
                        </span>
                    )}
                </div>
            </div>

            {/* Indicador de clic (hover) */}
            <div className="absolute top-1/2 right-3 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <FiChevronRight className="w-5 h-5 text-gray-300" />
            </div>
        </div>
    );
};

export default UserCard;