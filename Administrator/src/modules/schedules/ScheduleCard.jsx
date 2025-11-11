import { Clock, Calendar, User, Edit2, Trash2, FileText } from 'lucide-react';

const ScheduleCard = ({ schedule, usuario, onEdit, onDelete }) => {
    const diasSemanaMap = {
        'lunes': 'Lunes',
        'martes': 'Martes',
        'miercoles': 'Miércoles',
        'jueves': 'Jueves',
        'viernes': 'Viernes',
        'sabado': 'Sábado',
        'domingo': 'Domingo'
    };

    return (
        <div className="bg-white rounded-xl border border-[#E5E5E7] shadow-sm hover:shadow-md hover:border-[#D2D2D7] transition-all duration-200">
            {/* Header con color */}
            <div
                className="h-2 rounded-t-xl"
                style={{ backgroundColor: schedule.color }}
            />

            <div className="p-5">
                {/* Título e icono */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${schedule.color}20` }}
                        >
                            <Clock
                                className="w-5 h-5"
                                style={{ color: schedule.color }}
                            />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[#1D1D1F]">
                                {diasSemanaMap[schedule.dia_semana]}
                            </h3>
                            <p className="text-sm text-[#6E6E73]">
                                {schedule.hora_inicio} - {schedule.hora_fin}
                            </p>
                        </div>
                    </div>
                    {schedule.activo ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                            Activo
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                            Inactivo
                        </span>
                    )}
                </div>

                {/* Descripción */}
                {schedule.descripcion && (
                    <div className="mb-4 p-3 bg-[#F5F5F7] rounded-lg">
                        <div className="flex items-center gap-2 text-[#6E6E73] text-sm mb-1">
                            <FileText className="w-4 h-4" />
                            <span className="font-medium">Descripción</span>
                        </div>
                        <p className="text-[#1D1D1F] text-sm line-clamp-2">
                            {schedule.descripcion}
                        </p>
                    </div>
                )}

                {/* Info del usuario */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6E6E73] flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Usuario
                        </span>
                        <span className="text-[#1D1D1F] font-medium">
                            {usuario?.nombre || 'N/A'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6E6E73] flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Día
                        </span>
                        <span className="text-[#1D1D1F] font-medium">
                            {diasSemanaMap[schedule.dia_semana]}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6E6E73] flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Duración
                        </span>
                        <span className="text-[#1D1D1F] font-medium">
                            {(() => {
                                const [hI, mI] = schedule.hora_inicio.split(':').map(Number);
                                const [hF, mF] = schedule.hora_fin.split(':').map(Number);
                                const duracion = (hF * 60 + mF) - (hI * 60 + mI);
                                const horas = Math.floor(duracion / 60);
                                const minutos = duracion % 60;
                                return `${horas}h ${minutos}min`;
                            })()}
                        </span>
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-4 border-t border-[#E5E5E7]">
                    <button
                        onClick={() => onEdit(schedule)}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
                    >
                        <Edit2 className="w-4 h-4" />
                        Editar
                    </button>
                    <button
                        onClick={() => onDelete(schedule.id)}
                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScheduleCard;
