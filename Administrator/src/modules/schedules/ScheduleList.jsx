import { Clock } from 'lucide-react';
import ScheduleCard from './ScheduleCard';

const ScheduleList = ({ schedules, usuarios, onEdit, onDelete }) => {
    if (schedules.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-20 h-20 bg-[#F5F5F7] rounded-full flex items-center justify-center mb-4">
                    <Clock className="w-10 h-10 text-[#86868B]" />
                </div>
                <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">
                    No hay horarios registrados
                </h3>
                <p className="text-[#6E6E73] text-center max-w-md">
                    Comienza agregando bloques de horario para tus usuarios
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map(schedule => {
                const usuario = usuarios.find(u => u.id === schedule.id_usuario);
                return (
                    <ScheduleCard
                        key={schedule.id}
                        schedule={schedule}
                        usuario={usuario}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                );
            })}
        </div>
    );
};

export default ScheduleList;
