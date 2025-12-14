import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { getEmpleados } from '../../services/empleadoService';
import { obtenerHorarioPorId } from '../../services/horariosService';

const CalendarioGlobalV2 = () => {
    const [empleados, setEmpleados] = useState([]);
    const [horariosMap, setHorariosMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [filtroNombre, setFiltroNombre] = useState('');
    const [diaSeleccionado, setDiaSeleccionado] = useState('lunes');

    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const diasLabel = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const empleadosData = await getEmpleados();
            setEmpleados(empleadosData);

            // Cargar horarios de todos los empleados
            const horariosTemp = {};
            for (const emp of empleadosData) {
                if (emp.horario_id) {
                    try {
                        const horario = await obtenerHorarioPorId(emp.horario_id);
                        horariosTemp[emp.id] = horario;
                    } catch (error) {
                        console.error(`Error cargando horario del empleado ${emp.id}:`, error);
                    }
                }
            }
            setHorariosMap(horariosTemp);
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const empleadosFiltrados = empleados.filter(emp =>
        emp.nombre?.toLowerCase().includes(filtroNombre.toLowerCase())
    );

    const getIntervalosPorDia = (empleadoId, dia) => {
        const horario = horariosMap[empleadoId];
        if (!horario) return [];

        const config = typeof horario.config_excep === 'string'
            ? JSON.parse(horario.config_excep)
            : horario.config_excep;

        return config.configuracion_semanal?.[dia] || [];
    };

    const calcularHorasDelDia = (intervalos) => {
        return intervalos.reduce((total, intervalo) => {
            const [hI, mI] = intervalo.inicio.split(':').map(Number);
            const [hF, mF] = intervalo.fin.split(':').map(Number);
            const duracion = (hF * 60 + mF - (hI * 60 + mI)) / 60;
            return total + duracion;
        }, 0);
    };

    const empleadosConIntervalosDia = empleadosFiltrados
        .map(emp => ({
            ...emp,
            intervalos: getIntervalosPorDia(emp.id, diaSeleccionado)
        }))
        .filter(emp => emp.intervalos.length > 0);

    const empleadosConHorario = empleadosFiltrados.filter(emp => horariosMap[emp.id]);

    const horasTotalesDelDia = empleadosConIntervalosDia.reduce((total, emp) => {
        return total + calcularHorasDelDia(emp.intervalos);
    }, 0);

    return (
        <div className="min-h-screen bg-[#FBFBFD] p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-[#1D1D1F] mb-2">Calendario Global de Horarios</h1>
                    <p className="text-[#6E6E73]">Vista general de los horarios de todos los empleados</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-[#D2D2D7] p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-50 rounded-xl">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-[#1D1D1F]">{empleadosConHorario.length}</div>
                                <div className="text-sm text-[#6E6E73]">Empleados con horario</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-[#D2D2D7] p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-50 rounded-xl">
                                <Calendar className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-[#1D1D1F]">{empleadosConIntervalosDia.length}</div>
                                <div className="text-sm text-[#6E6E73]">Trabajando {diasLabel[diaSeleccionado]}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-[#D2D2D7] p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-50 rounded-xl">
                                <Clock className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-[#1D1D1F]">
                                    {Math.round(horasTotalesDelDia * 10) / 10}h
                                </div>
                                <div className="text-sm text-[#6E6E73]">Horas totales</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-xl border border-[#D2D2D7] p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                <Filter size={16} className="inline mr-1" />
                                Buscar empleado
                            </label>
                            <input
                                type="text"
                                value={filtroNombre}
                                onChange={(e) => setFiltroNombre(e.target.value)}
                                placeholder="Nombre del empleado..."
                                className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Selector de día */}
                <div className="bg-white rounded-xl border border-[#D2D2D7] p-4 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-[#1D1D1F]">Seleccionar Día</h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const currentIndex = diasSemana.indexOf(diaSeleccionado);
                                    const prevIndex = currentIndex === 0 ? diasSemana.length - 1 : currentIndex - 1;
                                    setDiaSeleccionado(diasSemana[prevIndex]);
                                }}
                                className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={() => {
                                    const currentIndex = diasSemana.indexOf(diaSeleccionado);
                                    const nextIndex = (currentIndex + 1) % diasSemana.length;
                                    setDiaSeleccionado(diasSemana[nextIndex]);
                                }}
                                className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {diasSemana.map(dia => (
                            <button
                                key={dia}
                                onClick={() => setDiaSeleccionado(dia)}
                                className={`p-3 rounded-lg font-medium text-sm transition-all ${
                                    diaSeleccionado === dia
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-blue-50 hover:text-blue-600'
                                }`}
                            >
                                {diasLabel[dia].slice(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lista de empleados */}
                {loading ? (
                    <div className="text-center py-12">
                        <Clock className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
                        <p className="text-[#6E6E73]">Cargando horarios...</p>
                    </div>
                ) : empleadosConIntervalosDia.length === 0 ? (
                    <div className="bg-white rounded-xl border border-[#D2D2D7] p-12 text-center">
                        <Calendar className="w-16 h-16 text-[#6E6E73] mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">
                            No hay empleados trabajando este día
                        </h3>
                        <p className="text-[#6E6E73]">
                            Selecciona otro día para ver los horarios
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {empleadosConIntervalosDia.map(empleado => {
                            const horasDelDia = calcularHorasDelDia(empleado.intervalos);

                            return (
                                <div
                                    key={empleado.id}
                                    className="bg-white rounded-xl border border-[#D2D2D7] p-5 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
                                                {empleado.nombre?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-[#1D1D1F]">{empleado.nombre}</div>
                                                <div className="text-sm text-[#6E6E73]">{empleado.email}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-[#6E6E73]">Intervalos</div>
                                                <div className="text-lg font-bold text-blue-600">
                                                    {empleado.intervalos.length}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-sm font-medium text-[#6E6E73]">Horas</div>
                                                <div className="text-lg font-bold text-green-600">
                                                    {horasDelDia.toFixed(1)}h
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detalle de intervalos */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {empleado.intervalos.map((intervalo, idx) => {
                                            const [hI, mI] = intervalo.inicio.split(':').map(Number);
                                            const [hF, mF] = intervalo.fin.split(':').map(Number);
                                            const duracion = ((hF * 60 + mF) - (hI * 60 + mI)) / 60;

                                            return (
                                                <div key={idx} className="p-3 bg-[#F5F5F7] rounded-lg">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 bg-blue-600 text-white rounded text-xs flex items-center justify-center font-bold">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="text-sm font-semibold text-[#1D1D1F]">
                                                                {intervalo.inicio} - {intervalo.fin}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-[#6E6E73]">
                                                            {duracion.toFixed(1)}h
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
                )}
            </div>
        </div>
    );
};

export default CalendarioGlobalV2;
