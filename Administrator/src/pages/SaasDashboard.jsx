import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/Apiconfig';
import { FiHome, FiUsers, FiMonitor, FiActivity, FiGlobe } from 'react-icons/fi';
import DynamicLoader from '../components/common/DynamicLoader';
import { useNavigate } from 'react-router-dom';

const API_URL = API_CONFIG.BASE_URL;

const SaasDashboard = () => {
    const [metricas, setMetricas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMetricas = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                const response = await fetch(`${API_URL}/api/saas/metricas`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const data = await response.json();

                if (data.success) {
                    setMetricas(data.data);
                } else {
                    setError('Error al obtener métricas: ' + data.message);
                }
            } catch (err) {
                console.error(err);
                setError('Error de conexión con el servidor central');
            } finally {
                setLoading(false);
            }
        };

        fetchMetricas();
    }, []);

    if (loading) return <DynamicLoader text="Obteniendo métricas globales..." />;
    if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;

    const stats = [
        {
            title: 'Empresas Registradas',
            value: metricas?.empresas?.total || 0,
            color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
            icon: FiGlobe,
            details: `${metricas?.empresas?.activas || 0} activas, ${metricas?.empresas?.inactivas || 0} suspendidas`
        },
        {
            title: 'Trabajadores Globales',
            value: metricas?.empleados || 0,
            color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
            icon: FiUsers,
            details: 'En todos los tenants'
        },
        {
            title: 'Dispositivos Conectados',
            value: metricas?.dispositivos || 0,
            color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
            icon: FiMonitor,
            details: 'Móviles y Escritorio'
        },
        {
            title: 'Usuarios del Sistema',
            value: metricas?.usuarios || 0,
            color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
            icon: FiActivity,
            details: 'Administradores y Empleados'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Panel de Control SaaS</h2>
                    <p className="text-slate-500 dark:text-gray-400 mt-1">Visión global de todo el ecosistema multi-tenant.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/saas-logs')}
                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <FiActivity className="w-4 h-4 text-slate-400" /> System Logs
                    </button>
                    <button
                        onClick={() => navigate('/empresas')}
                        className="btn-primary flex items-center gap-2"
                    >
                        <FiGlobe className="w-4 h-4" /> Gestionar Entidades (Tenants)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="card flex flex-col items-start relative overflow-hidden">
                            <div className={`p-2.5 rounded-lg mb-4 ${stat.color} bg-opacity-10 border border-current border-opacity-10`}>
                                <Icon className="w-5 h-5" />
                            </div>

                            <h3 className="text-slate-500 dark:text-gray-400 text-sm font-semibold tracking-wide uppercase mb-1">{stat.title}</h3>
                            <div className="flex items-end gap-3 mb-4">
                                <p className="text-3xl font-black text-slate-800 dark:text-white leading-none">{stat.value}</p>
                            </div>

                            <div className="mt-auto w-full pt-4 border-t border-slate-100 dark:border-gray-700">
                                <p className="text-xs text-slate-500 dark:text-gray-400 font-medium truncate">
                                    {stat.details}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Espacio para futuras graficas SaaS */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-slate-200 dark:border-gray-700 min-h-[300px] flex items-center justify-center relative">
                <div className="text-slate-400 flex flex-col items-center gap-3">
                    <FiActivity className="w-10 h-10 opacity-30 animate-pulse text-primary-600" />
                    <p className="font-medium text-sm text-slate-500">Visualización avanzada de métricas (Próximamente)</p>
                </div>
            </div>
        </div>
    );
};

export default SaasDashboard;
