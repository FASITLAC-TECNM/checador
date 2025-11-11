import { Shield, Edit2, Trash2, Tag, Check, X } from 'lucide-react';

const PermissionCard = ({ permission, onEdit, onDelete }) => {
    return (
        <div className="bg-white rounded-xl border border-[#E5E5E7] shadow-sm hover:shadow-md hover:border-[#D2D2D7] transition-all duration-200">
            {/* Header con color */}
            <div
                className="h-2 rounded-t-xl"
                style={{ backgroundColor: permission.color }}
            />

            <div className="p-5">
                {/* Título e icono */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${permission.color}20` }}
                        >
                            <Shield
                                className="w-5 h-5"
                                style={{ color: permission.color }}
                            />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[#1D1D1F]">{permission.nombre}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span
                                    className="text-xs font-medium px-2 py-0.5 rounded"
                                    style={{
                                        backgroundColor: `${permission.color}20`,
                                        color: permission.color
                                    }}
                                >
                                    {permission.tipo}
                                </span>
                                {permission.activo ? (
                                    <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                                        <Check className="w-3 h-3" />
                                        Activo
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                                        <X className="w-3 h-3" />
                                        Inactivo
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Descripción */}
                {permission.descripcion && (
                    <p className="text-[#6E6E73] text-sm mb-4 line-clamp-2 min-h-[40px]">
                        {permission.descripcion}
                    </p>
                )}

                {/* Info adicional */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6E6E73] flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Módulo
                        </span>
                        <span className="text-[#1D1D1F] font-medium">{permission.modulo}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6E6E73] flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            Clave
                        </span>
                        <code className="text-[#1D1D1F] font-medium font-mono text-xs bg-[#F5F5F7] px-2 py-0.5 rounded">
                            {permission.clave}
                        </code>
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-4 border-t border-[#E5E5E7]">
                    <button
                        onClick={() => onEdit(permission)}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
                    >
                        <Edit2 className="w-4 h-4" />
                        Editar
                    </button>
                    <button
                        onClick={() => onDelete(permission.id)}
                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PermissionCard;
