import React, { useState } from 'react';
import { Edit2, Trash2, Users, Shield, Lock, Eye, GripVertical } from 'lucide-react';

const RoleList = ({
    roles,
    onEdit,
    onDelete,
    onView,
    isReordering = false,
    onDragStart,
    onDragOver,
    onDrop
}) => {
    const [draggedIndex, setDraggedIndex] = useState(null);
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
        <div className="space-y-3">
            {roles.map((role, index) => {
                const permisosActivos = getPermissionCount(role.permisos);
                const permisosTotal = 24; // 6 módulos x 4 permisos

                return (
                    <div
                        key={role.id}
                        draggable={isReordering}
                        onDragStart={(e) => {
                            if (isReordering) {
                                setDraggedIndex(index);
                                onDragStart(e, index);
                            }
                        }}
                        onDragOver={(e) => {
                            if (isReordering) {
                                onDragOver(e, index);
                            }
                        }}
                        onDrop={(e) => {
                            if (isReordering) {
                                onDrop(e, index);
                                setDraggedIndex(null);
                            }
                        }}
                        onDragEnd={() => setDraggedIndex(null)}
                        className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
                            isReordering
                                ? 'cursor-move border-purple-300 hover:border-purple-400'
                                : 'border-[#E5E5E7] hover:border-[#D2D2D7]'
                        } ${draggedIndex === index ? 'opacity-50' : ''}`}
                        style={{
                            boxShadow: isReordering
                                ? `0 4px 6px -1px ${role.color}40, 0 2px 4px -1px ${role.color}20`
                                : `0 4px 6px -1px ${role.color}20, 0 2px 4px -1px ${role.color}10`
                        }}
                    >
                        <div className="flex items-center gap-4 p-5">
                            {/* Drag handle */}
                            {isReordering && (
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <GripVertical className="w-6 h-6 text-purple-500" />
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                                        {index + 1}
                                    </div>
                                </div>
                            )}
                            {/* Color indicator */}
                            <div
                                className="w-2 h-16 rounded-full flex-shrink-0"
                                style={{ backgroundColor: role.color }}
                            />

                            {/* Icon */}
                            <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${role.color}20` }}
                            >
                                <Shield
                                    className="w-7 h-7"
                                    style={{ color: role.color }}
                                />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-lg text-[#1D1D1F]">{role.nombre}</h3>
                                            {role.esDefault && (
                                                <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                                    <Lock className="w-3 h-3" />
                                                    Por defecto
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[#6E6E73] text-sm line-clamp-1">
                                            {role.descripcion || 'Sin descripción'}
                                        </p>
                                    </div>
                                </div>

                                {/* Stats y barra */}
                                <div className="flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-2 text-[#6E6E73]">
                                        <Users className="w-4 h-4" />
                                        <span className="font-medium text-[#1D1D1F]">{role.usuariosAsignados}</span>
                                        <span>usuarios</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[#6E6E73]">
                                        <Shield className="w-4 h-4" />
                                        <span className="font-medium text-[#1D1D1F]">{permisosActivos}/{permisosTotal}</span>
                                        <span>permisos</span>
                                    </div>
                                    <div className="flex-1 max-w-xs">
                                        <div className="h-2 bg-[#F5F5F7] rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    backgroundColor: role.color,
                                                    width: `${(permisosActivos / permisosTotal) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Acciones */}
                            {!isReordering && (
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onView(role);
                                        }}
                                        className="flex items-center gap-2 bg-[#F5F5F7] hover:bg-[#E5E5E7] text-[#1D1D1F] px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Ver Detalles
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(role);
                                        }}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
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
                                        className={`flex items-center justify-center p-2 rounded-lg transition-colors ${role.esDefault || role.usuariosAsignados > 0
                                                ? 'bg-[#F5F5F7] text-[#86868B] cursor-not-allowed'
                                                : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                                            }`}
                                        title={role.esDefault || role.usuariosAsignados > 0 ? 'No se puede eliminar' : 'Eliminar rol'}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            {isReordering && (
                                <div className="flex-shrink-0 text-purple-600 font-semibold">
                                    Jerarquía: {index + 1}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default RoleList;
