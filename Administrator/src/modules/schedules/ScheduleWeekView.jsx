import { useMemo } from 'react';
import { Clock, Plus, AlertTriangle, Edit2, Trash2 } from 'lucide-react';

const ScheduleWeekView = ({ schedules, usuario, onAddBlock, onEditBlock, onDeleteBlock }) => {
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

    // Detectar conflictos (bloques que se solapan)
    const detectarConflictos = (bloques) => {
        const conflictos = new Set();

        for (let i = 0; i < bloques.length; i++) {
            for (let j = i + 1; j < bloques.length; j++) {
                const b1 = bloques[i];
                const b2 = bloques[j];

                // Solo comparar si son del mismo día
                if (b1.dia_semana === b2.dia_semana) {
                    const inicio1 = horaAMinutos(b1.hora_inicio);
                    const fin1 = horaAMinutos(b1.hora_fin);
                    const inicio2 = horaAMinutos(b2.hora_inicio);
                    const fin2 = horaAMinutos(b2.hora_fin);

                    // Verificar solapamiento
                    if (inicio1 < fin2 && inicio2 < fin1) {
                        conflictos.add(b1.id);
                        conflictos.add(b2.id);
                    }
                }
            }
        }

        return conflictos;
    };

    // Organizar bloques por día
    const bloquesPorDia = useMemo(() => {
        const organizados = {};
        diasSemana.forEach(dia => {
            organizados[dia] = schedules.filter(s => s.dia_semana === dia);
        });
        return organizados;
    }, [schedules]);

    // Detectar todos los conflictos
    const conflictos = useMemo(() => detectarConflictos(schedules), [schedules]);

    // Calcular posición y altura del bloque
    const calcularPosicionBloque = (schedule) => {
        const inicioMinutos = horaAMinutos(schedule.hora_inicio);
        const finMinutos = horaAMinutos(schedule.hora_fin);
        const duracionMinutos = finMinutos - inicioMinutos;

        // Posición desde las 6 AM (6*60 = 360 minutos)
        const offsetMinutos = inicioMinutos - 360;

        // Cada hora = 80px, por lo tanto cada minuto = 80/60 = 1.333px
        const top = (offsetMinutos / 60) * 80;
        const height = (duracionMinutos / 60) * 80;

        return { top, height };
    };

    // Formatear duración
    const formatearDuracion = (inicio, fin) => {
        const inicioMin = horaAMinutos(inicio);
        const finMin = horaAMinutos(fin);
        const duracion = finMin - inicioMin;
        const horas = Math.floor(duracion / 60);
        const minutos = duracion % 60;

        if (minutos === 0) return `${horas}h`;
        if (horas === 0) return `${minutos}min`;
        return `${horas}h ${minutos}min`;
    };

    // Calcular estadísticas
    const stats = useMemo(() => {
        const totalBloques = schedules.length;
        const horasTotales = schedules.reduce((acc, s) => {
            const duracion = horaAMinutos(s.hora_fin) - horaAMinutos(s.hora_inicio);
            return acc + duracion;
        }, 0);
        const diasConHorarios = new Set(schedules.map(s => s.dia_semana)).size;

        return {
            totalBloques,
            horasTotales: Math.round(horasTotales / 60 * 10) / 10,
            diasConHorarios,
            totalConflictos: conflictos.size
        };
    }, [schedules, conflictos]);

    return (
        <div className="space-y-6">
            {/* Header con info del usuario y estadísticas */}
            <div className="bg-white rounded-xl shadow-sm border border-[#D2D2D7] p-6">
                <div className="flex items-center justify-between">
                    {/* Info del usuario */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
                            {usuario.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[#1D1D1F]">{usuario.nombre}</h2>
                            <p className="text-[#6E6E73]">@{usuario.username}</p>
                        </div>
                    </div>

                    {/* Estadísticas rápidas */}
                    <div className="flex gap-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600">{stats.totalBloques}</div>
                            <div className="text-xs text-[#6E6E73]">Bloques</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">{stats.horasTotales}h</div>
                            <div className="text-xs text-[#6E6E73]">Horas/semana</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-purple-600">{stats.diasConHorarios}</div>
                            <div className="text-xs text-[#6E6E73]">Días activos</div>
                        </div>
                        {stats.totalConflictos > 0 && (
                            <div className="text-center">
                                <div className="text-3xl font-bold text-red-600">{stats.totalConflictos}</div>
                                <div className="text-xs text-[#6E6E73]">Conflictos</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Alerta de conflictos */}
                {stats.totalConflictos > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                        <AlertTriangle size={18} className="text-red-600" />
                        <span className="text-sm text-red-800">
                            <strong>¡Atención!</strong> Hay {stats.totalConflictos} bloque{stats.totalConflictos !== 1 ? 's' : ''} con conflictos de horario (se solapan).
                        </span>
                    </div>
                )}
            </div>

            {/* Calendario Semanal */}
            <div className="bg-white rounded-xl shadow-sm border border-[#D2D2D7] overflow-hidden">
                {/* Header del calendario */}
                <div className="grid grid-cols-8 border-b border-[#D2D2D7] bg-[#F5F5F7] sticky top-0 z-10">
                    {/* Columna de horas */}
                    <div className="p-4 border-r border-[#D2D2D7] flex items-center justify-center">
                        <Clock size={18} className="text-[#6E6E73]" />
                    </div>

                    {/* Días de la semana */}
                    {diasLabel.map((dia, index) => {
                        const bloquesDia = bloquesPorDia[diasSemana[index]] || [];
                        return (
                            <div key={dia} className="p-4 text-center border-r border-[#D2D2D7] last:border-r-0">
                                <div className="font-semibold text-[#1D1D1F]">{dia}</div>
                                <div className="text-xs text-[#6E6E73] mt-1">
                                    {bloquesDia.length} bloque{bloquesDia.length !== 1 ? 's' : ''}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Cuerpo del calendario */}
                <div className="overflow-auto" style={{ maxHeight: '600px' }}>
                    <div className="grid grid-cols-8 relative">
                        {/* Columna de horas */}
                        <div className="border-r border-[#E5E5E7]">
                            {horas.map((hora) => (
                                <div
                                    key={hora}
                                    className="h-[80px] border-b border-[#E5E5E7] px-3 py-2 text-sm text-[#6E6E73] font-medium"
                                >
                                    {hora}
                                </div>
                            ))}
                        </div>

                        {/* Columnas de días */}
                        {diasSemana.map(dia => (
                            <div key={dia} className="border-r border-[#E5E5E7] relative last:border-r-0">
                                {/* Grid de horas de fondo */}
                                {horas.map((hora) => (
                                    <div
                                        key={hora}
                                        className="h-[80px] border-b border-[#E5E5E7] hover:bg-blue-50 cursor-pointer transition-colors group"
                                        onClick={() => onAddBlock(dia, hora)}
                                    >
                                        <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Plus size={16} className="text-blue-600" />
                                        </div>
                                    </div>
                                ))}

                                {/* Bloques de horarios superpuestos */}
                                <div className="absolute inset-0 pointer-events-none px-1">
                                    {bloquesPorDia[dia]?.map(schedule => {
                                        const { top, height } = calcularPosicionBloque(schedule);
                                        const tieneConflicto = conflictos.has(schedule.id);

                                        return (
                                            <div
                                                key={schedule.id}
                                                className={`absolute left-1 right-1 rounded-lg shadow-md hover:shadow-xl transition-all pointer-events-auto group overflow-hidden ${
                                                    tieneConflicto ? 'ring-2 ring-red-500' : ''
                                                }`}
                                                style={{
                                                    top: `${top}px`,
                                                    height: `${height}px`,
                                                    backgroundColor: schedule.color || '#3B82F6',
                                                    minHeight: '40px'
                                                }}
                                            >
                                                <div className="p-3 text-white text-xs h-full flex flex-col justify-between relative">
                                                    {/* Contenido del bloque */}
                                                    <div>
                                                        <div className="font-bold text-sm">
                                                            {schedule.hora_inicio} - {schedule.hora_fin}
                                                        </div>
                                                        <div className="text-[10px] opacity-90 mt-0.5">
                                                            {formatearDuracion(schedule.hora_inicio, schedule.hora_fin)}
                                                        </div>
                                                        {schedule.descripcion && height > 60 && (
                                                            <div className="text-[10px] opacity-80 mt-2 line-clamp-2">
                                                                {schedule.descripcion}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Indicador de conflicto */}
                                                    {tieneConflicto && (
                                                        <div className="absolute top-1 right-1">
                                                            <AlertTriangle size={14} className="text-yellow-300" />
                                                        </div>
                                                    )}

                                                    {/* Botones de acción (aparecen en hover) */}
                                                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onEditBlock(schedule);
                                                            }}
                                                            className="p-1.5 bg-white/90 hover:bg-white text-blue-600 rounded shadow-sm transition-all"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteBlock(schedule.id);
                                                            }}
                                                            className="p-1.5 bg-white/90 hover:bg-white text-red-600 rounded shadow-sm transition-all"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>

                                                    {/* Hover overlay */}
                                                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mensaje si no hay bloques */}
            {schedules.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                    <Clock className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">
                        No hay horarios asignados
                    </h3>
                    <p className="text-[#6E6E73] mb-4">
                        Haz clic en cualquier espacio del calendario para agregar un bloque de horario
                    </p>
                </div>
            )}
        </div>
    );
};

export default ScheduleWeekView;
