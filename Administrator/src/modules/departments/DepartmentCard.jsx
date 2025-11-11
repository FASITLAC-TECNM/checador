import { Building2, Users, Edit2, Trash2, UserCircle, Eye } from 'lucide-react';

const DepartmentCard = ({ department, onEdit, onDelete, onClick }) => {
    const handleCardClick = (e) => {
        // Si el click fue en un botón de acción, no navegar
        if (e.target.closest('button')) {
            return;
        }
        if (onClick) {
            onClick(department);
        }
    };

    return (
        <div
            onClick={handleCardClick}
            className="bg-white rounded-xl border border-[#E5E5E7] shadow-sm hover:shadow-md hover:border-[#D2D2D7] transition-all duration-200 cursor-pointer"
        >
            {/* Header con color */}
            <div
                className="h-2 rounded-t-xl"
                style={{ backgroundColor: department.color }}
            />

            <div className="p-5">
                {/* Título e icono */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${department.color}20` }}
                        >
                            <Building2
                                className="w-5 h-5"
                                style={{ color: department.color }}
                            />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[#1D1D1F]">{department.nombre}</h3>
                            {department.activo && (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                                    Activo
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Descripción */}
                <p className="text-[#6E6E73] text-sm mb-4 line-clamp-2 min-h-[40px]">
                    {department.descripcion}
                </p>

                {/* Stats */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6E6E73] flex items-center gap-2">
                            <UserCircle className="w-4 h-4" />
                            Jefe
                        </span>
                        <span className="text-[#1D1D1F] font-medium">{department.jefe}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6E6E73] flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Empleados
                        </span>
                        <span className="text-[#1D1D1F] font-medium">{department.empleados}</span>
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-4 border-t border-[#E5E5E7]">
                    <button
                        onClick={() => onEdit(department)}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
                    >
                        <Edit2 className="w-4 h-4" />
                        Editar
                    </button>
                    <button
                        onClick={() => onDelete(department.id)}
                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DepartmentCard;
