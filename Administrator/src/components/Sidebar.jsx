import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Book, Users, Calendar, Settings, BarChart3, AlertCircle, Menu, X, ChevronLeft, Building2, Shield, Cpu, WifiOff, MessageSquare, Globe, Activity } from 'lucide-react'
import { useRealTime } from '../hooks/useRealTime';
import { useNetwork } from '../context/NetworkContext';
import { useNotifications } from '../context/NotificationContext';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';

import { API_CONFIG } from '../config/Apiconfig';
const API_URL = API_CONFIG.BASE_URL;

// Estructura base de menú
const BASE_MENU_ITEMS = [
    { id: 'dashboard', nombre: 'Dashboard', icono: Home, ruta: '/dashboard' },
    { id: 'avisos', nombre: 'Avisos', icono: MessageSquare, ruta: '/avisos' },
    { id: 'empleados', nombre: 'Empleados', icono: Users, ruta: '/empleados' },
    { id: 'roles', nombre: 'Roles', icono: Shield, ruta: '/roles' },
    { id: 'horarios', nombre: 'Horarios', icono: Calendar, ruta: '/horarios' },
    { id: 'departamentos', nombre: 'Departamentos', icono: Building2, ruta: '/departamentos' },
    { id: 'dispositivos', nombre: 'Dispositivos', icono: Cpu, ruta: '/dispositivos' },
    { id: 'incidencias', nombre: 'Incidencias', icono: AlertCircle, ruta: '/incidencias' },
    { id: 'reportes', nombre: 'Reportes', icono: BarChart3, ruta: '/reportes' },
    { id: 'registros', nombre: 'Registros', icono: Book, ruta: '/registros' },
];


/**
 * Sidebar con menú estático y Configuración en el footer
 */
const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { unreadCount } = useNotifications();
    const { empresa, loading: loadingEmpresa } = useCompany();
    const { user } = useAuth();

    // Opciones Exclusivas del Panel SaaS
    const SAAS_MENU_ITEMS = [
        { id: 'dashboard', nombre: 'Dashboard SaaS', icono: Home, ruta: '/dashboard' },
        { id: 'saas-empresas', nombre: 'Empresas Cliente', icono: Globe, ruta: '/empresas' },
        { id: 'saas-master', nombre: 'Super Administradores', icono: Shield, ruta: '/super-administradores' },
        { id: 'saas-logs', nombre: 'System Logs', icono: Activity, ruta: '/saas-logs' },
    ];

    // Determinar items del menú basado en rol y filtrar por permisos (opcional pero recomendado)
    const unfilteredMenuItems = user?.esPropietarioSaaS
        ? SAAS_MENU_ITEMS
        : BASE_MENU_ITEMS;

    // Filtrar items: un empleado normal no debería ver "Roles", "Departamentos", etc. si no es admin
    const menuItems = unfilteredMenuItems.filter(item => {
        if (user?.esPropietarioSaaS) return true;

        // Si no es admin, solo puede ver Dashboard, Avisos, Incidencias (y Perfil si existiera)
        // Esta es una solución simple para limpiar la consola de 403s
        const adminOnlyItems = ['empleados', 'roles', 'horarios', 'departamentos', 'dispositivos', 'reportes', 'registros'];
        if (!user?.esAdmin && adminOnlyItems.includes(item.id)) return false;

        return true;
    });

    const handleMenuClick = (ruta) => {
        setIsMobileOpen(false);
        navigate(ruta);
    };

    const toggleMobile = () => setIsMobileOpen(!isMobileOpen);
    const toggleCollapsed = () => setIsCollapsed(!isCollapsed);

    // Renderiza un botón de menú (reutilizable para la lista y el footer)
    const renderMenuButton = (item) => {
        const IconComponent = item.icono;
        const isActive = location.pathname === item.ruta;

        return (
            <button
                key={item.id}
                onClick={() => handleMenuClick(item.ruta)}
                className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-200 group relative font-medium
                    ${isActive
                        ? 'bg-blue-50/70 dark:bg-primary-900/20 text-blue-700 dark:text-primary-400 border border-blue-100/50 dark:border-primary-800/50 shadow-sm'
                        : 'text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? item.nombre : ''}
            >

                <IconComponent
                    className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-blue-600 dark:text-primary-400' : 'text-slate-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-primary-400'
                        }`}
                />

                {!isCollapsed && (
                    <div className="flex-1 text-left min-w-0">
                        <div className={`font-semibold text-[13px] tracking-wide truncate ${isActive ? 'text-blue-800 dark:text-primary-300' : 'text-slate-600 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white'
                            }`}>
                            {item.nombre}
                        </div>
                    </div>
                )}

                {/* Badge de notificaciones para Dispositivos */}
                {item.id === 'dispositivos' && unreadCount > 0 && (
                    <div className={`
                        flex items-center justify-center bg-red-500 text-white font-bold rounded-full
                        ${isCollapsed ? 'absolute top-2 right-2 w-2.5 h-2.5 p-0' : 'w-5 h-5 text-xs ml-2'}
                    `}>
                        {!isCollapsed && (unreadCount > 9 ? '+9' : unreadCount)}
                    </div>
                )}

                {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                        {item.nombre}
                    </div>
                )}
            </button>
        );
    };

    return (
        <>
            {/* Botón hamburguesa móvil */}
            <button
                onClick={toggleMobile}
                className="select-none lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.15)] border border-gray-200 dark:border-gray-700">
                {isMobileOpen ? (
                    <X className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                ) : (
                    <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                )}
            </button>

            {/* Overlay móvil */}
            {isMobileOpen && (
                <div
                    className="select-none lg:hidden fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-30"
                    onClick={toggleMobile}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          select-none fixed lg:sticky top-0 left-0 h-screen bg-white dark:bg-gray-800 border-r border-slate-100 dark:border-gray-800 
          transition-all duration-300 z-40 flex flex-col shadow-[2px_0_8px_-3px_rgba(0,0,0,0.02)]
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                {/* Offline Indicator */}


                {/* Header con logo y nombre de empresa */}
                <div className={`h-[72px] flex items-center border-b border-transparent flex-shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between px-6'}`}>
                    {!isCollapsed ? (
                        <>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                {empresa?.logo ? (
                                    <img
                                        src={empresa.logo}
                                        alt={empresa.nombre}
                                        className="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-slate-100 dark:border-gray-600 shadow-sm"
                                    />
                                ) : (
                                    <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-500">
                                        <span className="text-white font-bold text-sm">
                                            {empresa?.nombre?.charAt(0) || '?'}
                                        </span>
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <span className="font-bold text-sm text-slate-800 dark:text-white block leading-tight truncate tracking-tight">
                                        {loadingEmpresa ? (
                                            <span className="block h-3.5 w-28 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                                        ) : (
                                            empresa?.nombre || user?.usuario?.nombre || 'Mi Empresa'
                                        )}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={toggleCollapsed}
                                className="hidden lg:block p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={toggleCollapsed}
                            className="hidden lg:flex w-12 h-12 items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                            title={empresa?.nombre || 'Expandir'}
                        >
                            {empresa?.logo ? (
                                <img
                                    src={empresa.logo}
                                    alt={empresa.nombre}
                                    className="w-10 h-10 rounded object-cover border border-gray-100 dark:border-gray-600"
                                />
                            ) : (
                                <div className="w-10 h-10 bg-primary-600 rounded flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">
                                        {empresa?.nombre?.charAt(0) || '?'}
                                    </span>
                                </div>
                            )}
                        </button>
                    )}
                </div>

                {/* Contenido del Menú (Scrollable) */}
                <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'py-2' : 'py-4'}`}>
                    <nav className={`space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
                        {menuItems.map((item) => renderMenuButton(item))}
                    </nav>
                </div>

                {/* Footer del Sidebar (Configuración) */}
                {!user?.esPropietarioSaaS && (
                    <div className={`flex-shrink-0 bg-white dark:bg-gray-800 ${isCollapsed ? 'px-2 py-2' : 'px-4 py-4'}`}>
                        <OfflineIndicator isCollapsed={isCollapsed} />
                        <nav className="space-y-1">
                            {renderMenuButton({
                                id: 'configuracion',
                                nombre: 'Configuración',
                                icono: Settings,
                                ruta: '/configuracion'
                            })}
                        </nav>
                    </div>
                )}
            </aside>
        </>
    );
};

const OfflineIndicator = ({ isCollapsed }) => {
    const { isOffline } = useNetwork();

    if (!isOffline) return null;

    return (
        <div className={`
            bg-red-500 text-white flex items-center justify-center
            transition-all duration-300 overflow-hidden
            ${isCollapsed ? 'h-8' : 'h-8 px-2'}
        `}
            title="Sin conexión a internet"
        >
            <WifiOff className="w-4 h-4" />
            {!isCollapsed && (
                <span className="ml-2 text-xs font-bold whitespace-nowrap">
                    MODO OFFLINE
                </span>
            )}
        </div>
    );
};

export default Sidebar;