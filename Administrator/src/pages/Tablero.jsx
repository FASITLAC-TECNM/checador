import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiUsers,
    FiCheckCircle,
    FiClock,
    FiAlertCircle,
    FiCalendar
} from 'react-icons/fi';
import { API_CONFIG } from '../config/Apiconfig';
import Pagination from '../components/Pagination';
import { useRealTime } from '../hooks/useRealTime';
import DynamicLoader from '../components/common/DynamicLoader';
import { useTour } from '../hooks/useTour';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import SaasDashboard from './SaasDashboard';

const API_URL = API_CONFIG.BASE_URL;

const Dashboard = () => {
    const { user } = useAuth();
    const { formatTime } = useConfig();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalEmpleados: 0,
        asistenciasHoy: 0,
        retardos: 0,
        puntuales: 0
    });
    const [ultimasAsistencias, setUltimasAsistencias] = useState([]);
    const [paginaAsistencias, setPaginaAsistencias] = useState(1);
    const asistenciasPorPagina = 4;

    // Definición del Tour
    const tourSteps = [
        { element: '#dash-metrics', popover: { title: 'Indicadores en Vivo', description: 'Monitorea el total de empleados, asistencias, puntualidad y retardos del día actual.', side: "bottom" } },
        { element: '#dash-attendance-table', popover: { title: 'Registros Recientes', description: 'Visualiza las últimas entradas y salidas procesadas por el sistema en tiempo real.', side: "top" } },
        { element: '#dash-quick-actions', popover: { title: 'Accesos Directos', description: 'Navega rápidamente a la gestión de personal, horarios o incidencias.', side: "left" } },
        { element: '#dash-day-summary', popover: { title: 'Resumen de Operación', description: 'Gráficas comparativas de asistencia y puntualidad para una toma de decisiones rápida.', side: "left" } }
    ];

    useTour('dashboard', tourSteps, !loading);

    useEffect(() => {
        if (!user?.esPropietarioSaaS) {
            fetchDashboardData();
        }
    }, [user]);

    // Actualización en tiempo real (Solo si no es SaaS)
    useRealTime(user?.esPropietarioSaaS ? {} : {
        'nueva-asistencia': () => {
            fetchDashboardData();
        }
    });

    if (user?.esPropietarioSaaS) {
        return <SaasDashboard />;
    }

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Fecha de hoy para filtrar asistencias (formato local YYYY-MM-DD)
            const hoy = new Date();
            const fechaInicio = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

            // Cargar empleados y asistencias en paralelo
            const [empleadosRes, asistenciasRes] = await Promise.all([
                fetch(`${API_URL}/api/empleados`, { headers }),
                fetch(`${API_URL}/api/asistencias?fecha_inicio=${fechaInicio}&limit=100`, { headers })
            ]);

            const empleadosData = await empleadosRes.json();
            const asistenciasData = await asistenciasRes.json();

            // Contar estadísticas
            const totalEmpleados = empleadosData.success ? empleadosData.data.length : 0;
            const asistenciasHoy = asistenciasData.success ? asistenciasData.data : [];

            // Contar empleados únicos que registraron asistencia (no registros duplicados)
            const empleadosUnicos = new Set(asistenciasHoy.map(a => a.empleado_id || a.empleado_usuario)).size;

            // Tomar solo la primera entrada de cada empleado (deduplicar)
            const entradasMap = new Map();
            asistenciasHoy
                .filter(a => a.tipo === 'entrada')
                .forEach(a => {
                    const key = a.empleado_id || a.empleado_usuario;
                    if (!entradasMap.has(key)) {
                        entradasMap.set(key, a);
                    }
                });
            const entradasUnicas = Array.from(entradasMap.values());
            const puntuales = entradasUnicas.filter(a => a.estado === 'puntual').length;
            const retardos = entradasUnicas.filter(a => a.estado === 'retardo').length;

            setStats({
                totalEmpleados,
                asistenciasHoy: empleadosUnicos,
                puntuales,
                retardos
            });

            setUltimasAsistencias(asistenciasHoy);

        } catch (error) {
            console.error('Error al cargar dashboard:', error);
        } finally {
            setLoading(false);
        }
    };


    // Calcular porcentaje de asistencia
    const porcentajeAsistencia =
        stats.totalEmpleados > 0 && stats.asistenciasHoy > 0
            ? Math.round((stats.asistenciasHoy / stats.totalEmpleados) * 100)
            : 0;

    // Calcular porcentaje de puntualidad
    const porcentajePuntualidad = stats.asistenciasHoy > 0
        ? Math.round((stats.puntuales / stats.asistenciasHoy) * 100)
        : 0;

    // Paginación de asistencias
    const totalPaginasAsistencias = Math.ceil(ultimasAsistencias.length / asistenciasPorPagina);
    const asistenciasPaginadas = ultimasAsistencias.slice(
        (paginaAsistencias - 1) * asistenciasPorPagina,
        paginaAsistencias * asistenciasPorPagina
    );

    if (loading) {
        return <DynamicLoader text="Cargando tablero..." />;
    }

    return (
        <div className="select-none space-y-6 s">
            {/* Fecha actual */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString('es-MX', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}
            </p>

            {/* Tarjetas de estadísticas */}
            <div id="dash-metrics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Empleados */}
                <div
                    className="card cursor-pointer hover:-translate-y-1 transition-transform p-5"
                    onClick={() => navigate('/empleados')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Empleados</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalEmpleados}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Empleados activos</p>
                        </div>
                        <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                            <FiUsers className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>

                {/* Asistencias Hoy */}
                <div className="card cursor-pointer hover:-translate-y-1 transition-transform p-5"
                    onClick={() => navigate('/reportes')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Asistencias Hoy</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.asistenciasHoy}</p>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                {porcentajeAsistencia}% del total
                            </p>
                        </div>
                        <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                            <FiCheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                {/* Puntuales */}
                <div className="card cursor-pointer hover:-translate-y-1 transition-transform p-5"
                    onClick={() => navigate('/reportes')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Puntuales</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.puntuales}</p>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                {porcentajePuntualidad}% de asistencias
                            </p>
                        </div>
                        <div className="p-4 bg-emerald-100 dark:bg-emerald-900/20 rounded-full">
                            <FiCheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                </div>

                {/* Retardos */}
                <div className="card cursor-pointer hover:-translate-y-1 transition-transform p-5"
                    onClick={() => navigate('/reportes')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Retardos</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.retardos}</p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                                {stats.asistenciasHoy > 0 ? Math.round((stats.retardos / stats.asistenciasHoy) * 100) : 0}% de asistencias
                            </p>
                        </div>
                        <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                            <FiClock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sección de últimas asistencias */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[420px]">
                {/* Últimas asistencias */}
                <div id="dash-attendance-table" className="lg:col-span-2 card p-0 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Últimas Asistencias Registradas
                        </h3>
                    </div>

                    <div className="flex-1">
                        {ultimasAsistencias.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <FiClock className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                <p>No hay asistencias registradas hoy</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden w-full">
                                <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[35%]">
                                                Empleado
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[15%]">
                                                Tipo
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[15%]">
                                                Hora
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[20%]">
                                                Estado
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[15%]">
                                                Dispositivo
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {asistenciasPaginadas.map((asistencia) => (
                                            <tr key={asistencia.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => navigate(`/empleados/usuario/${asistencia.empleado_usuario}`)}>
                                                {/* Empleado */}
                                                <td className="px-4 py-4 max-w-0 overflow-hidden">
                                                    <div className="flex items-center min-w-0">
                                                        <div className="ml-2 min-w-0">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate" title={asistencia.empleado_nombre}>
                                                                {asistencia.empleado_nombre}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Tipo */}
                                                <td className="px-4 py-4 overflow-hidden">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${asistencia.tipo === 'entrada'
                                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                                        }`}>
                                                        {asistencia.tipo === 'entrada' ? '→' : '←'}
                                                        {asistencia.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                                                    </span>
                                                </td>

                                                {/* Hora */}
                                                <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden">
                                                    {formatTime(asistencia.fecha_registro)}
                                                </td>

                                                {/* Estado */}
                                                <td className="px-4 py-4 max-w-0 overflow-hidden">
                                                    {(() => {
                                                        const e = asistencia.estado;
                                                        const map = {
                                                            puntual: { cls: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', icon: <FiCheckCircle className="w-3 h-3 shrink-0" />, label: 'Puntual' },
                                                            salida_puntual: { cls: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', icon: <FiCheckCircle className="w-3 h-3 shrink-0" />, label: 'S. puntual' },
                                                            salida_temprana: { cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300', icon: <FiClock className="w-3 h-3 shrink-0" />, label: 'S. temprana' },
                                                            salida_fuera_horario: { cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300', icon: <FiAlertCircle className="w-3 h-3 shrink-0" />, label: 'Fuera horario' },
                                                            entrada_temprana: { cls: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300', icon: <FiClock className="w-3 h-3 shrink-0" />, label: 'E. temprana' },
                                                            retardo: { cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300', icon: <FiClock className="w-3 h-3 shrink-0" />, label: 'Retardo' },
                                                            falta: { cls: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300', icon: <FiAlertCircle className="w-3 h-3 shrink-0" />, label: 'Falta' },
                                                        };
                                                        const info = map[e] || { cls: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300', icon: <FiClock className="w-3 h-3 shrink-0" />, label: e };
                                                        return (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium max-w-full truncate ${info.cls}`} title={info.label}>
                                                                {info.icon} {info.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>

                                                {/* Dispositivo */}
                                                <td className="px-4 py-4 max-w-0 overflow-hidden text-sm text-gray-500 dark:text-gray-400 capitalize">
                                                    <span className="truncate block" title={asistencia.dispositivo_origen}>
                                                        {asistencia.dispositivo_origen}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <Pagination
                        pagina={paginaAsistencias}
                        totalPaginas={totalPaginasAsistencias}
                        total={ultimasAsistencias.length}
                        porPagina={asistenciasPorPagina}
                        onChange={setPaginaAsistencias}
                    />
                </div>

                {/* Panel lateral */}
                <div className="space-y-6">
                    {/* Acciones rápidas */}
                    <div id="dash-quick-actions" className="card">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Acciones Rápidas
                        </h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/empleados')}
                                className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
                            >
                                <FiUsers className="w-4 h-4" />
                                Ver Empleados
                            </button>
                            <button
                                onClick={() => navigate('/horarios')}
                                className="w-full bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-300 font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <FiCalendar className="w-4 h-4" />
                                Gestionar Horarios
                            </button>
                            <button
                                onClick={() => navigate('/incidencias')}
                                className="w-full bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-300 font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <FiAlertCircle className="w-4 h-4" />
                                Ver Incidencias
                            </button>
                        </div>
                    </div>

                    {/* Resumen del día */}
                    <div id="dash-day-summary" className="card">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 w-max-xl">
                            Resumen del Día
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Asistencia</span>
                                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{porcentajeAsistencia}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${porcentajeAsistencia}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Puntualidad</span>
                                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">{porcentajePuntualidad}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${porcentajePuntualidad}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
