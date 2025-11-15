import { useState, useEffect } from 'react';
import {
    Users,
    Wifi,
    AlertTriangle,
    Bell,
    Clock,
    TrendingUp,
    Activity
} from "lucide-react";
import logo from './logo.png';
import { getEstadisticas } from '../../services';

function HomePage() {
    const [estadisticas, setEstadisticas] = useState({
        total: 0,
        conectados: 0
    });
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    const alertas = [
        {
            id: 2,
            tipo: 'warning',
            titulo: 'Respaldo Pendiente',
            mensaje: 'La copia de seguridad diaria no se ha completado',
            tiempo: 'Hace 15 min',
            prioridad: 'media'
        },
        {
            id: 3,
            tipo: 'info',
            titulo: 'Mantenimiento Programado',
            mensaje: 'Actualización del sistema este sábado 2:00 AM',
            tiempo: 'Hace 1 hora',
            prioridad: 'baja'
        },
        {
            id: 4,
            tipo: 'critical',
            titulo: 'Nodo Caído',
            mensaje: 'El registro fisico ha fallado y requiere atención inmediata',
            tiempo: 'Hace 2 horas',
            prioridad: 'media'
        }
    ];

    const avisos = [
        {
            id: 1,
            titulo: 'Junta Administrativa',
            descripcion: 'Revisión de presupuesto trimestral y planificación',
            fecha: 'Viernes 15, 10:00 AM',
            ubicacion: 'Sala de juntas principal'
        },
        {
            id: 2,
            titulo: 'Capacitación de Seguridad',
            descripcion: 'Actualización de protocolos de seguridad informática',
            fecha: 'Lunes 18, 3:00 PM',
            ubicacion: 'Auditorio'
        },
        {
            id: 3,
            titulo: 'Nueva Política',
            descripcion: 'Implementación de nuevas políticas de trabajo remoto',
            fecha: 'Hoy',
            ubicacion: 'Ver correo electrónico'
        }
    ];

    // Cargar estadísticas desde la API
    useEffect(() => {
        const cargarEstadisticas = async () => {
            try {
                setLoading(true);
                const stats = await getEstadisticas();
                setEstadisticas({
                    total: stats.total || 0,
                    conectados: stats.conectados || 0
                });
                setLastUpdate(new Date());
            } catch (error) {
                console.error('Error al cargar estadísticas:', error);
            } finally {
                setLoading(false);
            }
        };

        cargarEstadisticas();

        // Actualizar estadísticas cada 30 segundos
        const interval = setInterval(cargarEstadisticas, 30000);

        return () => clearInterval(interval);
    }, []);

    const getAlertConfig = (tipo) => {
        const configs = {
            critical: {
                color: 'text-red-700',
                bg: 'bg-red-50',
                border: 'border-red-300',
                icon: AlertTriangle,
                badge: 'bg-red-500'
            },
            warning: {
                color: 'text-yellow-700',
                bg: 'bg-yellow-50',
                border: 'border-yellow-300',
                icon: AlertTriangle,
                badge: 'bg-yellow-500'
            },
            info: {
                color: 'text-blue-700',
                bg: 'bg-blue-50',
                border: 'border-blue-300',
                icon: Activity,
                badge: 'bg-blue-500'
            }
        };
        return configs[tipo] || configs.info;
    };

    // Calcular el tiempo transcurrido desde la última actualización
    const getTimeAgo = () => {
        const seconds = Math.floor((new Date() - lastUpdate) / 1000);
        if (seconds < 60) return 'Hace unos segundos';
        const minutes = Math.floor(seconds / 60);
        if (minutes === 1) return 'Hace 1 min';
        if (minutes < 60) return `Hace ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header simplificado */}
                <header className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <img src={logo} alt="Logo" className="h-16 w-16 object-contain" />
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">LE FLEUR*</h1>
                                <p className="text-gray-500">Panel de Control</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Última actualización</p>
                            <p className="text-base font-medium text-gray-700">{loading ? 'Cargando...' : getTimeAgo()}</p>
                        </div>
                    </div>
                </header>

                {/* Estadísticas simples */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">Usuarios Conectados</p>
                                <p className="text-4xl font-bold text-gray-900">
                                    {loading ? '...' : estadisticas.conectados}
                                </p>
                            </div>
                            <div className="bg-green-100 p-4 rounded-full">
                                <Wifi className="text-green-600" size={32} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">Total de Usuarios</p>
                                <p className="text-4xl font-bold text-gray-900">
                                    {loading ? '...' : estadisticas.total}
                                </p>
                            </div>
                            <div className="bg-blue-100 p-4 rounded-full">
                                <Users className="text-blue-600" size={32} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alertas (Prioridad alta) */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="text-red-600" size={28} />
                        <h2 className="text-2xl font-bold text-gray-900">Alertas del Sistema</h2>
                        <span className="ml-auto bg-red-100 text-red-700 text-sm font-semibold px-3 py-1 rounded-full">
                            {alertas.length} activas
                        </span>
                    </div>
                    <div className="space-y-3">
                        {alertas.map((alerta) => {
                            const config = getAlertConfig(alerta.tipo);
                            const IconComponent = config.icon;
                            return (
                                <div key={alerta.id} className={`flex items-start gap-4 p-4 ${config.bg} rounded-lg border-l-4 ${config.border} hover:shadow-md transition-all`}>
                                    <div className={`mt-1 ${config.color}`}>
                                        <IconComponent size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-1">
                                            <h3 className="font-bold text-gray-900">{alerta.titulo}</h3>
                                            <span className={`text-xs font-semibold px-2 py-1 ${config.badge} text-white rounded`}>
                                                {alerta.prioridad.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-2">{alerta.mensaje}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Clock size={12} />
                                            <span>{alerta.tiempo}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Avisos Importantes */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Bell className="text-purple-600" size={28} />
                        <h2 className="text-2xl font-bold text-gray-900">Avisos Importantes</h2>
                    </div>
                    <div className="grid gap-4">
                        {avisos.map((aviso) => (
                            <div key={aviso.id} className="p-5 border border-gray-200 rounded-lg hover:shadow-md hover:border-purple-300 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-bold text-gray-900">{aviso.titulo}</h3>
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">
                                        {aviso.fecha}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">{aviso.descripcion}</p>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <TrendingUp size={14} />
                                    <span>{aviso.ubicacion}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HomePage;