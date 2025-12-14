import { useState, useEffect } from 'react';
import logo from './logo.png';
import { getEstadisticas } from '../../services';
import { BarChart3, Calendar } from "lucide-react";
import HorarioSemanal from '../../components/HorarioSemanal';
import { obtenerHorariosConEmpleados } from '../../services/horariosService';

function HomePage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [horarios, setHorarios] = useState([]);
    const [loadingHorarios, setLoadingHorarios] = useState(true);
    const [showHorarioModal, setShowHorarioModal] = useState(false);

    useEffect(() => {
        const cargar = async () => {
            try {
                setLoading(true);
                const data = await getEstadisticas(); // Recibe tu JSON exacto
                setStats(data);
                setLastUpdate(new Date());
            } catch (error) {
                console.error("Error:", error);
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
                setLoadingHorarios(true);
                const data = await obtenerHorariosConEmpleados();
                setHorarios(data || []);
            } catch (error) {
                console.error("Error cargando horarios:", error);
                setHorarios([]);
            } finally {
                setLoadingHorarios(false);
            }
        };

        cargarHorarios();
    }, []);

    const getTimeAgo = () => {
        const seconds = Math.floor((new Date() - lastUpdate) / 1000);
        if (seconds < 60) return 'Hace unos segundos';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `Hace ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    };

    // Datos listos para renderizar
    const valores = stats ? [
        { label: "Total", value: Number(stats.total) },
        { label: "Activos", value: Number(stats.activos) },
        { label: "Suspendidos", value: Number(stats.suspendidos) },
        { label: "Baja", value: Number(stats.baja) },
        { label: "Conectados", value: Number(stats.conectados) },
        { label: "Desconectados", value: Number(stats.desconectados) },
    ] : [];

    const maxValue = Math.max(...valores.map(v => v.value), 1);

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="max-w-7xl mx-auto p-6 space-y-12">

                {/* HEADER */}
                <header className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                    <div className="flex items-center justify-between">

                        <div className="flex items-center gap-6">
                            <img src={logo} className="h-20 w-20 opacity-90" alt="Logo" />

                            <div>
                                <h1 className="text-4xl font-semibold text-slate-900 tracking-tight">
                                    LE FLEUR*
                                </h1>
                                <p className="text-sm text-slate-500">
                                    Panel administrativo central
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
                                Última actualización
                            </p>

                            <p className="text-lg font-medium text-slate-700 mb-2">
                                {loading ? "Cargando..." : getTimeAgo()}
                            </p>

                            <div className="inline-flex items-center gap-2 bg-green-100 
                                            text-green-700 px-3 py-1 rounded-full text-sm 
                                            border border-green-300">
                                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                                Servidor activo
                            </div>
                        </div>

                    </div>
                </header>

                {/* ESTADÍSTICAS / GRÁFICO */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-slate-800">
                            Estado general de usuarios
                        </h2>
                        <BarChart3 className="text-slate-700" />
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">

                        {/* GRAFICO DE BARRAS SIMPLE */}
                        <div className="grid grid-cols-6 gap-4 mt-6 p-4 border rounded-2xl bg-slate-50">
                            {valores.map((item) => (
                                <div key={item.label} className="flex flex-col items-center">

                                    {/* Barra */}
                                    <div className="w-6 h-32 bg-slate-200 rounded-xl relative flex items-end">
                                        <div
                                            className="bg-blue-600 rounded-xl transition-all"
                                            style={{
                                                height: `${(item.value / maxValue) * 100}%`,
                                                width: "100%"
                                            }}
                                        ></div>
                                    </div>

                                    {/* Valor y etiqueta */}
                                    <p className="text-sm font-bold text-slate-800 mt-2">
                                        {loading ? "…" : item.value}
                                    </p>
                                    <p className="text-xs text-slate-600 text-center mt-1">
                                        {item.label}
                                    </p>

                                </div>
                            ))}
                        </div>
                    </div>
                </section>

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

            </div>
        </div>
    );
}

export default HomePage;
