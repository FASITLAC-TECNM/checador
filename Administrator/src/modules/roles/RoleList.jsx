import React from 'react';
import { Edit2, Trash2, Users, Shield, Lock, Eye } from 'lucide-react';

const RoleList = ({ roles, onEdit, onDelete, onView }) => {
    const getPermissionCount = (permisos) => {
        let count = 0;
        Object.values(permisos).forEach(modulo => {
            Object.values(modulo).forEach(permiso => {
                if (permiso) count++;
            });
        });
        return count;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => {
                const permisosActivos = getPermissionCount(role.permisos);
                const permisosTotal = 24; // 6 módulos x 4 permisos

                return (
                    <div
                        key={role.id}
                        className="bg-white rounded-xl border border-[#E5E5E7] hover:border-[#D2D2D7] hover:shadow-md transition-all duration-200"
                    >
                        {/* Header con color */}
                        <div
                            className="h-2 rounded-t-xl"
                            style={{ backgroundColor: role.color }}
                        />

                        <div className="p-5">
                            {/* Título y Badge */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: `${role.color}20` }}
                                    >
                                        <Shield
                                            className="w-5 h-5"
                                            style={{ color: role.color }}
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[#1D1D1F]">{role.nombre}</h3>
                                        {role.esDefault && (
                                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                                <Lock className="w-3 h-3" />
                                                Por defecto
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Descripción */}
                            <p className="text-[#6E6E73] text-sm mb-4 line-clamp-2">
                                {role.descripcion}
                            </p>

                            {/* Stats */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-[#6E6E73] flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Usuarios asignados
                                    </span>
                                    <span className="text-[#1D1D1F] font-medium">{role.usuariosAsignados}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-[#6E6E73]">Permisos activos</span>
                                    <span className="text-[#1D1D1F] font-medium">{permisosActivos}/{permisosTotal}</span>
                                </div>
                            </div>

                            {/* Barra de permisos */}
                            <div className="mb-4">
                                <div className="h-1.5 bg-[#F5F5F7] rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            backgroundColor: role.color,
                                            width: `${(permisosActivos / permisosTotal) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onView(role);
                                    }}
                                    className="col-span-3 flex items-center justify-center gap-2 bg-[#F5F5F7] hover:bg-[#E5E5E7] text-[#1D1D1F] px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <Eye className="w-4 h-4" />
                                    Ver Detalles
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(role);
                                    }}
                                    className="col-span-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Editar
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(role.id);
                                    }}
                                    disabled={role.esDefault || role.usuariosAsignados > 0}
                                    className={`col-span-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${role.esDefault || role.usuariosAsignados > 0
                                            ? 'bg-[#F5F5F7] text-[#86868B] cursor-not-allowed'
                                            : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                                        }`}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default RoleList;