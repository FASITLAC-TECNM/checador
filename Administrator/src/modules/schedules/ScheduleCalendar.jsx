import { useMemo } from 'react';
import { Clock, User } from 'lucide-react';

const ScheduleCalendar = ({ schedules, usuarios, onBlockClick, onEmptySlotClick }) => {
    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const diasLabel = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // Generar horas del día (6 AM - 11 PM)
    const horas = useMemo(() => {
        const horasArray = [];
        for (let i = 6; i <= 23; i++) {
            horasArray.push(`${i.toString().padStart(2, '0')}:00`);
        }
        return horasArray;
    }, []);

    // Convertir hora a minutos desde medianoche
    const horaAMinutos = (hora) => {
        const [h, m] = hora.split(':').map(Number);
        return h * 60 + m;
    };

    // Obtener color del usuario
    const getColorUsuario = (usuarioId) => {
        const colores = [
            '#3B82F6', // Azul
            '#10B981', // Verde
            '#F59E0B', // Amarillo
            '#EF4444', // Rojo
            '#8B5CF6', // Morado
            '#EC4899', // Rosa
            '#06B6D4', // Cyan
            '#84CC16', // Lima
        ];
        const index = usuarioId % colores.length;
        return colores[index];
    };

    // Organizar bloques por día
    const bloquesPorDia = useMemo(() => {
        const organizados = {};
        diasSemana.forEach(dia => {
            organizados[dia] = schedules.filter(s => s.dia_semana === dia);
        });
        return organizados;
    }, [schedules]);

    // Calcular posición y altura del bloque
    const calcularPosicionBloque = (schedule) => {
        const inicioMinutos = horaAMinutos(schedule.hora_inicio);
        const finMinutos = horaAMinutos(schedule.hora_fin);
        const duracionMinutos = finMinutos - inicioMinutos;

        // Posición desde las 6 AM (6*60 = 360 minutos)
        const offsetMinutos = inicioMinutos - 360;

        // Cada hora = 60px, por lo tanto cada minuto = 1px
        const top = offsetMinutos;
        const height = duracionMinutos;

        return { top, height };
    };

    // Obtener usuario por ID
    const getUsuario = (usuarioId) => {
        return usuarios.find(u => u.id === usuarioId);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-[#D2D2D7] overflow-hidden">
            {/* Header del calendario */}
            <div className="grid grid-cols-8 border-b border-[#D2D2D7] bg-[#F5F5F7]">
                {/* Columna de horas */}
                <div className="p-4 border-r border-[#D2D2D7] flex items-center justify-center">
                    <Clock size={18} className="text-[#6E6E73]" />
                </div>

                {/* Días de la semana */}
                {diasLabel.map((dia, index) => (
                    <div key={dia} className="p-4 text-center border-r border-[#D2D2D7] last:border-r-0">
                        <div className="font-semibold text-[#1D1D1F]">{dia}</div>
                        <div className="text-xs text-[#6E6E73] mt-1">
                            {bloquesPorDia[diasSemana[index]]?.length || 0} bloques
                        </div>
                    </div>
                ))}
            </div>

            {/* Cuerpo del calendario con scroll */}
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                <div className="grid grid-cols-8 relative">
                    {/* Columna de horas */}
                    <div className="border-r border-[#E5E5E7]">
                        {horas.map((hora, index) => (
                            <div
                                key={hora}
                                className="h-[60px] border-b border-[#E5E5E7] px-2 py-1 text-xs text-[#6E6E73] font-medium"
                            >
                                {hora}
                            </div>
                        ))}
                    </div>

                    {/* Columnas de días */}
                    {diasSemana.map(dia => (
                        <div key={dia} className="border-r border-[#E5E5E7] relative last:border-r-0">
                            {/* Grid de horas de fondo */}
                            {horas.map((hora, index) => (
                                <div
                                    key={hora}
                                    className="h-[60px] border-b border-[#E5E5E7] hover:bg-[#F5F5F7] cursor-pointer transition-colors"
                                    onClick={() => onEmptySlotClick && onEmptySlotClick(dia, hora)}
                                />
                            ))}

                            {/* Bloques de horarios superpuestos */}
                            <div className="absolute inset-0 pointer-events-none">
                                {bloquesPorDia[dia]?.map(schedule => {
                                    const { top, height } = calcularPosicionBloque(schedule);
                                    const usuario = getUsuario(schedule.id_usuario);
                                    const color = schedule.color || getColorUsuario(schedule.id_usuario);

                                    return (
                                        <div
                                            key={schedule.id}
                                            className="absolute left-1 right-1 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer pointer-events-auto group overflow-hidden"
                                            style={{
                                                top: `${top}px`,
                                                height: `${height}px`,
                                                backgroundColor: color,
                                                minHeight: '30px'
                                            }}
                                            onClick={() => onBlockClick && onBlockClick(schedule)}
                                        >
                                            <div className="p-2 text-white text-xs h-full flex flex-col justify-between">
                                                <div>
                                                    <div className="font-semibold truncate">
                                                        {usuario?.nombre || 'Usuario'}
                                                    </div>
                                                    <div className="opacity-90 text-[10px] mt-0.5">
                                                        {schedule.hora_inicio} - {schedule.hora_fin}
                                                    </div>
                                                </div>
                                                {schedule.descripcion && height > 60 && (
                                                    <div className="text-[10px] opacity-80 truncate mt-1">
                                                        {schedule.descripcion}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Hover effect */}
                                            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Leyenda de colores por usuario */}
            {usuarios.length > 0 && (
                <div className="border-t border-[#D2D2D7] bg-[#F5F5F7] p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-xs font-medium text-[#6E6E73]">Usuarios:</span>
                        {usuarios.slice(0, 8).map(usuario => {
                            const color = getColorUsuario(usuario.id);
                            const bloques = schedules.filter(s => s.id_usuario === usuario.id);

                            return (
                                <div key={usuario.id} className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: color }}
                                    />
                                    <span className="text-xs text-[#1D1D1F]">
                                        {usuario.nombre}
                                    </span>
                                    <span className="text-xs text-[#6E6E73]">
                                        ({bloques.length})
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleCalendar;
