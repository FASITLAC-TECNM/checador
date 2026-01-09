import { useState, useEffect } from 'react';
import logo from './logo.png';
import { getEstadisticas } from '../../services';
import { BarChart3, Calendar, FileText } from "lucide-react";
import HorarioSemanal from '../../components/HorarioSemanal';
import { obtenerHorariosConEmpleados } from '../../services/horariosService';
import ReportPanel from '../../components/ReportPanel';

function HomePage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [horarios, setHorarios] = useState([]);
    const [loadingHorarios, setLoadingHorarios] = useState(true);
    const [showHorarioModal, setShowHorarioModal] = useState(false);
    const [showReportPanel, setShowReportPanel] = useState(false);

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

                    </div>
                </header>

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
