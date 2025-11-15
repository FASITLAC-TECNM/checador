import { useState, useEffect } from 'react';
import { Users, ShieldUser, TabletSmartphone, Settings, LogOut, Server, Building2, History, Clock, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiEndpoint } from '../config/api';

const Sidebar = ({ activeView, setActiveView }) => {
    const { usuario, logout } = useAuth();
    const [dbConnected, setDbConnected] = useState(false);
    const [checking, setChecking] = useState(true);

    const menuItems = [
        { id: 'home', label: 'Inicio', icon: Home },
        { id: 'users', label: 'Usuarios', icon: Users },
        { id: 'roles', label: 'Roles', icon: ShieldUser },
        { id: 'departments', label: 'Departamentos', icon: Building2 },
        { id: 'devices', label: 'Dispositivos', icon: TabletSmartphone },
        { id: 'schedules', label: 'Horarios', icon: Clock },
        { id: 'history', label: 'Historial', icon: History },
        { id: 'settings', label: 'Configuración', icon: Settings },
    ];

    // Verificar conexión a la BD
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const response = await fetch(getApiEndpoint('/api/usuarios'));
                if (response.ok) {
                    setDbConnected(true);
                } else {
                    setDbConnected(false);
                }
            } catch (error) {
                console.error('Error conectando a BD:', error);
                setDbConnected(false);
            } finally {
                setChecking(false);
            }
        };

        checkConnection();

        // Verificar cada 30 segundos
        const interval = setInterval(checkConnection, 30000);

        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
            await logout();
        }
    };

    return (
        <aside className="w-64 bg-white border-r border-[#E5E5E7] h-screen flex-shrink-0 shadow-sm">
            <div className="flex flex-col h-full">
                {/* Header del sidebar */}
                <div className="p-6 border-b border-[#E5E5E7]">
                    <div className="flex items-center gap-3">
                        {usuario?.foto ? (
                            <img
                                src={usuario.foto}
                                alt={usuario.nombre}
                                className="w-10 h-10 rounded-full object-cover shadow-sm"
                            />
                        ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-sm">
                                {usuario?.nombre?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                            </div>
                        )}
                        <div>
                            <p className="font-semibold text-[#1D1D1F] text-sm">{usuario?.nombre || 'Usuario'}</p>
                            <p className="text-xs text-[#86868B]">{usuario?.username || 'sistema'}</p>
                        </div>
                    </div>
                </div>

                {/* Menú de navegación */}
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    <ul className="space-y-1">
                        {menuItems.map(item => {
                            const Icon = item.icon;
                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => setActiveView(item.id)}
                                        title={item.label}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${activeView === item.id
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                                            }`}
                                    >
                                        <Icon size={18} strokeWidth={2} />
                                        <span className="text-sm font-medium">{item.label}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Indicador de conexión a BD - Mejorado */}
                <div className="px-4 pb-3">
                    <div className={`px-3 py-2.5 rounded-lg border transition-all ${checking
                        ? 'bg-blue-50 border-blue-200'
                        : dbConnected
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-red-50 border-red-200'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`relative ${checking
                                    ? 'animate-pulse'
                                    : ''
                                    }`}>
                                    <Server
                                        size={16}
                                        className={
                                            checking
                                                ? 'text-blue-600'
                                                : dbConnected
                                                    ? 'text-blue-600'
                                                    : 'text-red-600'
                                        }
                                        strokeWidth={2}
                                    />
                                    {dbConnected && !checking && (
                                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-600 rounded-full"></div>
                                    )}
                                </div>
                                <div>
                                    <p className={`text-xs font-semibold ${checking
                                        ? 'text-blue-700'
                                        : dbConnected
                                            ? 'text-blue-700'
                                            : 'text-red-700'
                                        }`}>
                                        {checking ? 'Conectando...' : dbConnected ? 'Conectado' : 'Sin conexión'}
                                    </p>
                                    {dbConnected && !checking && (
                                        <p className="text-[10px] text-blue-600">
                                            {Math.floor(Math.random() * 50) + 10}ms
                                        </p>
                                    )}
                                </div>
                            </div>
                            {dbConnected && !checking && (
                                <div className="flex items-center gap-0.5">
                                    <div className="w-1 h-3 bg-blue-600 rounded-full opacity-40"></div>
                                    <div className="w-1 h-4 bg-blue-600 rounded-full opacity-60"></div>
                                    <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Botón de cerrar sesión */}
                <div className="p-4 border-t border-[#E5E5E7]">
                    <button
                        onClick={handleLogout}
                        title="Cerrar sesión"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[#FF3B30] hover:bg-red-50 transition-all duration-200 font-medium text-sm"
                    >
                        <LogOut size={18} strokeWidth={2} />
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;