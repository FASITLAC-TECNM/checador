import { useState } from 'react';
import { Clock, ChevronLeft, ChevronRight, User, Calendar, X } from 'lucide-react';

const HorarioSemanal = ({ horarios = [], empleado = null, showEmployeeInfo = true, isOpen = false, onClose }) => {
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

    if (!isOpen) return null;

    // Obtener el inicio de la semana actual + offset
    const getStartOfWeek = (offset = 0) => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (offset * 7);
        return new Date(today.setDate(diff));
    };

    const startOfWeek = getStartOfWeek(currentWeekOffset);

    // Generar los 7 días de la semana
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        return date;
    });

    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    // Horas del día (de 6 AM a 10 PM)
    const horasDelDia = Array.from({ length: 17 }, (_, i) => i + 6);

    // Función para convertir hora "HH:MM:SS" a número decimal
    const timeToDecimal = (timeStr) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours + (minutes / 60);
    };

    // Función para formatear hora
    const formatHora = (hora) => {
        const h = Math.floor(hora);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${h12}:00 ${ampm}`;
    };

    // Función para obtener los bloques de horario para un día específico
    const getBloquesDia = (fecha) => {
        const diaSemana = diasSemana[fecha.getDay()].toLowerCase();
        const bloques = [];

        horarios.forEach(horario => {
            const configSemanal = horario.config_excep?.configuracion_semanal || horario.config_excep;
            if (!configSemanal) return;

            const intervalosDia = configSemanal[diaSemana];
            if (!intervalosDia || !Array.isArray(intervalosDia)) return;

            intervalosDia.forEach(intervalo => {
                if (intervalo.inicio && intervalo.fin) {
                    bloques.push({
                        inicio: timeToDecimal(intervalo.inicio),
                        fin: timeToDecimal(intervalo.fin),
                        tipo: 'trabajo',
                        empleado: horario.empleado_nombre || empleado?.nombre,
                        empleado_id: horario.empleado_id,
                        entrada: intervalo.inicio,
                        salida: intervalo.fin
                    });
                }
            });
        });

        return bloques;
    };

    // Función para calcular posición y altura de un bloque
    const getBloqueStyle = (bloque) => {
        const horaInicio = 6;
        const horaFin = 22;
        const rangoTotal = horaFin - horaInicio;

        const top = ((bloque.inicio - horaInicio) / rangoTotal) * 100;
        const height = ((bloque.fin - bloque.inicio) / rangoTotal) * 100;

        return {
            top: `${Math.max(0, top)}%`,
            height: `${Math.min(100 - top, height)}%`
        };
    };

    // Colores por empleado
    const getColorEmpleado = (empleadoId) => {
        const colores = [
            'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
            'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'
        ];
        if (!empleadoId) return 'bg-blue-500';
        const index = parseInt(empleadoId) % colores.length;
        return colores[index];
    };

    const prevWeek = () => setCurrentWeekOffset(currentWeekOffset - 1);
    const nextWeek = () => setCurrentWeekOffset(currentWeekOffset + 1);
    const goToThisWeek = () => setCurrentWeekOffset(0);

    const getMesYear = () => {
        const firstDay = weekDays[0];
        const lastDay = weekDays[6];

        if (firstDay.getMonth() === lastDay.getMonth()) {
            return firstDay.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
        } else {
            return `${firstDay.toLocaleDateString('es-MX', { month: 'short' })} - ${lastDay.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}`;
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full h-screen flex flex-col">
                {/* Header compacto */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-900 p-4 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Calendar size={20} />
                            Horario Semanal
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={goToThisWeek}
                                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                                Semana Actual
                            </button>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="text-white" size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <button onClick={prevWeek} className="p-1 hover:bg-white/20 rounded-lg">
                            <ChevronLeft className="text-white" size={20} />
                        </button>
                        <div className="text-center">
                            <h4 className="text-lg font-bold text-white capitalize">{getMesYear()}</h4>
                            <p className="text-white/80 text-xs">{weekDays[0].getDate()} - {weekDays[6].getDate()}</p>
                        </div>
                        <button onClick={nextWeek} className="p-1 hover:bg-white/20 rounded-lg">
                            <ChevronRight className="text-white" size={20} />
                        </button>
                    </div>
                </div>

                {/* Leyenda compacta */}
                {showEmployeeInfo && horarios.length > 0 && (
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-semibold text-gray-600">Empleados:</span>
                            {[...new Set(horarios.map(h => h.empleado_id))].map((empId) => {
                                const horario = horarios.find(h => h.empleado_id === empId);
                                const color = getColorEmpleado(empId);
                                return (
                                    <div key={empId} className="flex items-center gap-1">
                                        <div className={`w-3 h-3 rounded ${color}`}></div>
                                        <span className="text-xs text-gray-700">{horario?.empleado_nombre}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Grid - Usa todo el espacio restante */}
                <div className="flex-1 min-h-0 flex flex-col">
                    {/* Header de días - sticky */}
                    <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50 flex-shrink-0 sticky top-0 z-10">
                        <div className="p-2 text-center font-semibold text-gray-600 text-xs">Hora</div>
                        {weekDays.map((dia, index) => {
                            const esHoy = dia.toDateString() === new Date().toDateString();
                            return (
                                <div key={index} className={`p-2 text-center border-l border-gray-200 ${esHoy ? 'bg-blue-50' : ''}`}>
                                    <div className={`text-xs font-medium ${esHoy ? 'text-blue-600' : 'text-gray-500'}`}>
                                        {diasSemana[dia.getDay()].substring(0, 3)}
                                    </div>
                                    <div className={`text-sm font-bold ${esHoy ? 'text-blue-600' : 'text-gray-900'}`}>
                                        {dia.getDate()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Grid de horas - scrollable solo verticalmente */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="grid grid-cols-8 relative" style={{ minHeight: '100%' }}>
                            {/* Columna de horas */}
                            <div className="border-r border-gray-200">
                                {horasDelDia.map((hora) => (
                                    <div key={hora} className="h-16 border-b border-gray-100 px-2 py-1 text-xs text-gray-500 font-medium">
                                        {formatHora(hora)}
                                    </div>
                                ))}
                            </div>

                            {/* Columnas de días */}
                            {weekDays.map((dia, diaIndex) => {
                                const bloquesDia = getBloquesDia(dia);
                                const esHoy = dia.toDateString() === new Date().toDateString();

                                return (
                                    <div key={diaIndex} className={`relative border-l border-gray-200 ${esHoy ? 'bg-blue-50/30' : ''}`}>
                                        {/* Líneas de hora */}
                                        {horasDelDia.map((hora, horaIndex) => (
                                            <div key={horaIndex} className="h-16 border-b border-gray-100" />
                                        ))}

                                        {/* Bloques de horario */}
                                        <div className="absolute inset-0 p-1">
                                            {bloquesDia.map((bloque, bloqueIndex) => {
                                                const style = getBloqueStyle(bloque);
                                                const color = getColorEmpleado(bloque.empleado_id);

                                                return (
                                                    <div
                                                        key={bloqueIndex}
                                                        className={`absolute left-1 right-1 ${color} bg-opacity-90 rounded-lg p-1.5 shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden`}
                                                        style={style}
                                                        title={`${bloque.empleado || 'Empleado'}: ${bloque.entrada} - ${bloque.salida}`}
                                                    >
                                                        <div className="text-white text-xs font-semibold">
                                                            {showEmployeeInfo && bloque.empleado && (
                                                                <div className="flex items-center gap-1 mb-0.5">
                                                                    <User size={10} />
                                                                    <span className="truncate text-xs">{bloque.empleado}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-1">
                                                                <Clock size={10} />
                                                                <span className="text-xs">{bloque.entrada?.substring(0, 5)}</span>
                                                            </div>
                                                            <div className="text-white/80 text-xs">
                                                                {bloque.salida?.substring(0, 5)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HorarioSemanal;
