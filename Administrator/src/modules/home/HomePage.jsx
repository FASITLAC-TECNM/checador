import { useState, useEffect } from 'react';
import logo from './logo.png';
import { getEstadisticasDashboard } from '../../services/dashboardService';
import { getConfiguracion } from '../../services/settingsService';
import { BarChart3, Calendar, FileText, Users, Building2, Clock, AlertCircle, Monitor, Activity, TrendingUp } from "lucide-react";
import HorarioSemanal from '../../components/HorarioSemanal';
import { obtenerHorariosConEmpleados } from '../../services/horariosService';
import ReportPanel from '../../components/ReportPanel';

function HomePage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [horarios, setHorarios] = useState([]);
    const [showHorarioModal, setShowHorarioModal] = useState(false);
    const [showReportPanel, setShowReportPanel] = useState(false);
    const [config, setConfig] = useState({ nombre_empresa: 'FASITLAC', logo_empresa: null });

    useEffect(() => {
        const cargar = async () => {
            try {
                setLoading(true);
                const [statsData, configData] = await Promise.all([
                    getEstadisticasDashboard(),
                    getConfiguracion()
                ]);
                setStats(statsData);
                setConfig(configData);
                setLastUpdate(new Date());
            } catch (error) {
                console.error("Error cargando datos:", error);
            } finally {
                setLoading(false);
            }
        };

        cargar();
        const interval = setInterval(cargar, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const cargarHorarios = async () => {
            try {
                const data = await obtenerHorariosConEmpleados();
                setHorarios(data || []);
            } catch (error) {
                console.error("Error cargando horarios:", error);
                setHorarios([]);
            }
        };

        cargarHorarios();
    }, []);

    // Componente de tarjeta de estadística
    const StatCard = ({ title, value, subtitle, icon: Icon, color, bgColor }) => (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-600">{title}</p>
                    <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
                    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-4 ${bgColor} rounded-xl`}>
                    <Icon size={28} className={color} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="max-w-7xl mx-auto p-6 space-y-8">

                {/* HEADER */}
                <header className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <img
                                src={config.logo_empresa || logo}
                                className="h-20 w-20 opacity-90 object-contain"
                                alt={`Logo ${config.nombre_empresa || 'FASITLAC'}`}
                            />
                            <div>
                                <h1 className="text-4xl font-semibold text-slate-900 tracking-tight">
                                    {config.nombre_empresa || 'FASITLAC'}
                                </h1>
                                <p className="text-sm text-slate-500 mt-1">
                                    Sistema de Control de Asistencias - TECNM
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500">Última actualización</p>
                            <p className="text-sm font-medium text-slate-700">
                                {lastUpdate.toLocaleTimeString('es-MX')}
                            </p>
                        </div>
                    </div>
                </header>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : stats ? (
                    <>
                        {/* Sección: Usuarios */}
                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Users className="text-blue-600" size={24} />
                                Usuarios del Sistema
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <StatCard
                                    title="Total Usuarios"
                                    value={stats.usuarios.total}
                                    subtitle="Registrados en el sistema"
                                    icon={Users}
                                    color="text-blue-600"
                                    bgColor="bg-blue-50"
                                />
                                <StatCard
                                    title="Usuarios Activos"
                                    value={stats.usuarios.activos}
                                    subtitle={`${((stats.usuarios.activos / stats.usuarios.total) * 100 || 0).toFixed(1)}% del total`}
                                    icon={Activity}
                                    color="text-green-600"
                                    bgColor="bg-green-50"
                                />
                                <StatCard
                                    title="Conectados Ahora"
                                    value={stats.usuarios.conectados}
                                    subtitle="En línea"
                                    icon={TrendingUp}
                                    color="text-emerald-600"
                                    bgColor="bg-emerald-50"
                                />
                            </div>
                        </section>

                        {/* Sección: Empleados y Departamentos */}
                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Building2 className="text-indigo-600" size={24} />
                                Organización
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard
                                    title="Total Empleados"
                                    value={stats.empleados.total}
                                    subtitle="Personal registrado"
                                    icon={Users}
                                    color="text-indigo-600"
                                    bgColor="bg-indigo-50"
                                />
                                <StatCard
                                    title="Departamentos"
                                    value={stats.departamentos.total}
                                    subtitle={`${stats.departamentos.empleados_asignados} asignados`}
                                    icon={Building2}
                                    color="text-purple-600"
                                    bgColor="bg-purple-50"
                                />
                                <StatCard
                                    title="Empleados Asignados"
                                    value={stats.departamentos.empleados_asignados}
                                    subtitle="Con departamento"
                                    icon={Users}
                                    color="text-violet-600"
                                    bgColor="bg-violet-50"
                                />
                                <StatCard
                                    title="Dispositivos Activos"
                                    value={stats.dispositivos.activos}
                                    subtitle={`${stats.dispositivos.total} totales`}
                                    icon={Monitor}
                                    color="text-cyan-600"
                                    bgColor="bg-cyan-50"
                                />
                            </div>
                        </section>

                        {/* Sección: Asistencia */}
                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Clock className="text-orange-600" size={24} />
                                Asistencia
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard
                                    title="Registros Hoy"
                                    value={stats.asistencia_hoy.registros}
                                    subtitle={`${stats.asistencia_hoy.empleados} empleados`}
                                    icon={Clock}
                                    color="text-orange-600"
                                    bgColor="bg-orange-50"
                                />
                                <StatCard
                                    title="Entradas Hoy"
                                    value={stats.asistencia_hoy.entradas}
                                    subtitle="Registradas"
                                    icon={TrendingUp}
                                    color="text-green-600"
                                    bgColor="bg-green-50"
                                />
                                <StatCard
                                    title="Esta Semana"
                                    value={stats.asistencia_semana.registros}
                                    subtitle={`${stats.asistencia_semana.empleados} empleados activos`}
                                    icon={BarChart3}
                                    color="text-blue-600"
                                    bgColor="bg-blue-50"
                                />
                                <StatCard
                                    title="Incidencias Pendientes"
                                    value={stats.incidencias.pendientes}
                                    subtitle="Requieren atención"
                                    icon={AlertCircle}
                                    color="text-amber-600"
                                    bgColor="bg-amber-50"
                                />
                            </div>
                        </section>

                        {/* Sección: Dispositivos */}
                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Monitor className="text-cyan-600" size={24} />
                                Dispositivos de Registro
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard
                                    title="Biométricos"
                                    value={stats.dispositivos.biometricos}
                                    subtitle="Huella/Facial"
                                    icon={Monitor}
                                    color="text-cyan-600"
                                    bgColor="bg-cyan-50"
                                />
                                <StatCard
                                    title="Físicos"
                                    value={stats.dispositivos.fisicos}
                                    subtitle="Escritorio"
                                    icon={Monitor}
                                    color="text-slate-600"
                                    bgColor="bg-slate-50"
                                />
                                <StatCard
                                    title="Móviles"
                                    value={stats.dispositivos.moviles}
                                    subtitle="Dispositivos móviles"
                                    icon={Monitor}
                                    color="text-sky-600"
                                    bgColor="bg-sky-50"
                                />
                                <StatCard
                                    title="Total Dispositivos"
                                    value={stats.dispositivos.total}
                                    subtitle={`${stats.dispositivos.activos} activos`}
                                    icon={Monitor}
                                    color="text-teal-600"
                                    bgColor="bg-teal-50"
                                />
                            </div>
                        </section>
                    </>
                ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <AlertCircle className="mx-auto text-red-500 mb-2" size={48} />
                        <p className="text-red-700 font-semibold">Error al cargar estadísticas</p>
                        <p className="text-red-600 text-sm mt-1">Por favor, recarga la página</p>
                    </div>
                )}

                {/* Botón para abrir el horario semanal */}
                <section>
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-3">
                                    <Calendar size={28} className="text-indigo-600" />
                                    Horarios de Trabajo
                                </h2>
                                <p className="text-sm text-slate-500 mt-2">
                                    Visualiza los horarios semanales de todos los empleados
                                </p>
                            </div>
                            <button
                                onClick={() => setShowHorarioModal(true)}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors shadow-sm flex items-center gap-2"
                            >
                                <Calendar size={20} />
                                Ver Horario Semanal
                            </button>
                        </div>
                    </div>
                </section>

                {/* Modal de Horario Semanal */}
                <HorarioSemanal
                    horarios={horarios}
                    showEmployeeInfo={true}
                    isOpen={showHorarioModal}
                    onClose={() => setShowHorarioModal(false)}
                />

                {/* Botón flotante para reportes */}
                <button
                    onClick={() => setShowReportPanel(true)}
                    className="fixed bottom-8 right-8 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl transition-all hover:scale-110 z-40 flex items-center gap-2"
                    title="Generar Reporte"
                >
                    <FileText size={24} />
                    <span className="font-semibold">Reportes</span>
                </button>

                {/* Panel de Reportes */}
                <ReportPanel
                    isOpen={showReportPanel}
                    onClose={() => setShowReportPanel(false)}
                    contexto="global"
                />

            </div>
        </div>
    );
}

export default HomePage;
