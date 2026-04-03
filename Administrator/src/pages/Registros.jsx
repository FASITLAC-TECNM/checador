import { useState, useEffect } from 'react';
import {
    FiActivity, FiFilter, FiRefreshCw, FiClock, FiUser, FiUserCheck,
    FiShield, FiKey, FiCalendar, FiAlertCircle, FiUsers, FiGrid,
    FiMonitor, FiFileText, FiSettings, FiChevronDown, FiChevronRight,
    FiList, FiArrowLeft, FiArrowRight, FiSearch
} from 'react-icons/fi';

import { API_CONFIG } from '../config/Apiconfig';
const API_URL = API_CONFIG.BASE_URL;
import { useConfig } from '../context/ConfigContext';
import DynamicLoader from '../components/common/DynamicLoader';

// --- CONFIGURACIÓN DE CONSTANTES (Igual que antes) ---
const CATEGORIAS = {
    sistema: { label: 'Sistema', icon: FiSettings, color: 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' },
    usuario: { label: 'Usuarios', icon: FiUser, color: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' },
    rol: { label: 'Roles', icon: FiShield, color: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-800' },
    autenticacion: { label: 'Autenticación', icon: FiKey, color: 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30', border: 'border-indigo-200 dark:border-indigo-800' },
    asistencia: { label: 'Asistencias', icon: FiUserCheck, color: 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800' },
    incidencia: { label: 'Incidencias', icon: FiAlertCircle, color: 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-200 dark:border-yellow-800' },
    empleado: { label: 'Empleados', icon: FiUsers, color: 'text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/30', border: 'border-teal-200 dark:border-teal-800' },
    departamento: { label: 'Departamentos', icon: FiGrid, color: 'text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-900/30', border: 'border-cyan-200 dark:border-cyan-800' },
    horario: { label: 'Horarios', icon: FiCalendar, color: 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-800' },
    dispositivo: { label: 'Dispositivos', icon: FiMonitor, color: 'text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-200 dark:border-pink-800' },
    solicitud: { label: 'Solicitudes', icon: FiFileText, color: 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/30', border: 'border-rose-200 dark:border-rose-800' },
    credencial: { label: 'Credenciales', icon: FiKey, color: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800' }
};

const CATEGORIA_DEFAULT = { label: 'Otro', icon: FiActivity, color: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' };

const PRIORIDADES = {
    critica: { label: 'Crítica', color: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 ring-red-600/20' },
    alta: { label: 'Alta', color: 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 ring-orange-600/20' },
    media: { label: 'Media', color: 'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 ring-yellow-600/20' },
    baja: { label: 'Baja', color: 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 ring-green-600/20' }
};

const Registros = () => {
    const { formatDate, formatTime } = useConfig();
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ por_tipo: [], por_prioridad: [] });

    // Paginación
    const [pagina, setPagina] = useState(1);
    const ITEMS_POR_PAGINA = 50;

    // Filtros
    const [filtros, setFiltros] = useState({
        tipo_evento: '',
        prioridad: '',
        fecha_inicio: '',
        fecha_fin: ''
    });

    const [vistaAgrupada, setVistaAgrupada] = useState(false); // Cambiado default a false (Tabla)
    const [categoriasExpandidas, setCategoriasExpandidas] = useState({});

    useEffect(() => {
        fetchEventos();
        fetchStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagina]); // Recargar cuando cambia la página

    const fetchEventos = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');

            const params = new URLSearchParams();
            if (filtros.tipo_evento) params.append('tipo_evento', filtros.tipo_evento);
            if (filtros.prioridad) params.append('prioridad', filtros.prioridad);
            if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
            if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);

            // Paginación para el backend
            const offset = (pagina - 1) * ITEMS_POR_PAGINA;
            params.append('limit', ITEMS_POR_PAGINA);
            params.append('offset', offset);

            const response = await fetch(`${API_URL}/api/eventos?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                setEventos(data.data);
            }
        } catch (error) {
            console.error('Error al cargar eventos:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/eventos/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) setStats(data.data);
        } catch (error) { console.error(error); }
    };

    const handleFiltrar = () => {
        setPagina(1); // Reset a primera página al filtrar
        fetchEventos();
        fetchStats();
    };

    const handleLimpiar = () => {
        setFiltros({ tipo_evento: '', prioridad: '', fecha_inicio: '', fecha_fin: '' });
        setPagina(1);
        // Usamos setTimeout para asegurar que el estado se actualice antes de llamar a fetch
        setTimeout(() => { fetchEventos(); fetchStats(); }, 0);
    };

    const toggleCategoria = (tipo) => {
        setCategoriasExpandidas(prev => ({ ...prev, [tipo]: !prev[tipo] }));
    };

    // Agrupar eventos para vista agrupada (Forzando la normalización de categorías)
    const eventosAgrupados = eventos.reduce((acc, evento) => {
        let tipo = evento.tipo_evento;
        // Si el tipo no existe en nuestro mapeo de Iconos, forzamos que sea 'sistema'
        if (!CATEGORIAS[tipo]) {
            tipo = 'sistema';
        }

        if (!acc[tipo]) acc[tipo] = [];
        acc[tipo].push(evento);
        return acc;
    }, {});

    const getCategoriaConfig = (tipo) => CATEGORIAS[tipo] || CATEGORIA_DEFAULT;

    // --- RENDERIZADO ---

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">

            {/* Barra de Filtros */}
            <div className="card flex flex-col gap-4">

                {/* Selectores de Vista y Refresh */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex bg-slate-100 dark:bg-gray-800 rounded-lg p-1 border border-slate-200 dark:border-gray-700 w-fit">
                        <button
                            onClick={() => setVistaAgrupada(false)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${!vistaAgrupada ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-gray-300'}`}
                        >
                            <FiList className="w-4 h-4" /> Tabla
                        </button>
                        <button
                            onClick={() => setVistaAgrupada(true)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${vistaAgrupada ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-gray-300'}`}
                        >
                            <FiGrid className="w-4 h-4" /> Agrupada
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={fetchEventos} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-md transition-colors" title="Actualizar">
                            <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium text-sm">
                    <FiSearch className="w-4 h-4" /> Búsqueda Avanzada
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <select
                        value={filtros.tipo_evento}
                        onChange={(e) => setFiltros({ ...filtros, tipo_evento: e.target.value })}
                        className="input text-sm py-2 cursor-pointer"
                    >
                        <option value="">Todas las Categorías</option>
                        {Object.entries(CATEGORIAS).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>

                    <select
                        value={filtros.prioridad}
                        onChange={(e) => setFiltros({ ...filtros, prioridad: e.target.value })}
                        className="input text-sm py-2 cursor-pointer"
                    >
                        <option value="">Cualquier Prioridad</option>
                        {Object.entries(PRIORIDADES).map(([key, conf]) => <option key={key} value={key}>{conf.label}</option>)}
                    </select>

                    <input
                        type="date"
                        value={filtros.fecha_inicio}
                        onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
                        className="input text-sm py-2"
                    />
                    <input
                        type="date"
                        value={filtros.fecha_fin}
                        onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
                        className="input text-sm py-2"
                    />

                    <div className="flex gap-2">
                        <button onClick={handleFiltrar} className="btn-primary flex-1 py-1.5 text-sm">
                            Filtrar
                        </button>
                        <button onClick={handleLimpiar} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
                            Limpiar
                        </button>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            {loading ? (
                <DynamicLoader text="Cargando registros..." />
            ) : eventos.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                    <div className="bg-gray-50 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiActivity className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sin resultados</h3>
                    <p className="text-gray-500 dark:text-gray-400">No se encontraron eventos con los filtros actuales.</p>
                </div>
            ) : (
                <>
                    {vistaAgrupada ? (
                        /* VISTA AGRUPADA (Acordeón mejorado) */
                        <div className="space-y-4">
                            {Object.entries(eventosAgrupados).map(([tipo, listaEventos]) => {
                                const config = getCategoriaConfig(tipo);
                                const Icon = config.icon;
                                const expandido = categoriasExpandidas[tipo];

                                return (
                                    <div key={tipo} className="card p-0 overflow-hidden transition-all hover:shadow-md">
                                        <button
                                            onClick={() => toggleCategoria(tipo)}
                                            className="w-full flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2.5 rounded-lg ${config.color} ${config.border} border`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">{config.label}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{listaEventos.length} registros</p>
                                                </div>
                                            </div>
                                            {expandido ? <FiChevronDown className="text-gray-400" /> : <FiChevronRight className="text-gray-400" />}
                                        </button>

                                        {expandido && (
                                            <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-800">
                                                {listaEventos.map(evento => (
                                                    <div key={evento.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                                                        <EventoRowContent evento={evento} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* VISTA DE TABLA (Nueva implementación) */
                        <div className="card p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Evento</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoría</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuario</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prioridad</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                                        </tr>
                                    </thead >
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {eventos.map((evento) => {
                                            const catConfig = getCategoriaConfig(evento.tipo_evento);
                                            const priConfig = PRIORIDADES[evento.prioridad] || PRIORIDADES.media;
                                            const Icon = catConfig.icon;

                                            return (
                                                <tr key={evento.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{evento.titulo}</span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{limpiarDescripcion(evento.descripcion)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <Icon className={`w-4 h-4 ${catConfig.color.split(' ')[0]}`} />
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{catConfig.label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            {evento.empleado_nombre ? (
                                                                <>
                                                                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-bold">
                                                                        {evento.empleado_nombre.charAt(0)}
                                                                    </div>
                                                                    <span className="text-sm text-gray-600 dark:text-gray-300">{evento.empleado_nombre}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-xs text-gray-400 italic">Sistema</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${priConfig.color}`}>
                                                            {priConfig.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                                                        <div className="flex flex-col items-end">
                                                            <span>{formatDate(evento.fecha_registro)}</span>
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">{formatTime(evento.fecha_registro)}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table >
                            </div >
                        </div >
                    )}

                    {/* Paginación Simple */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Mostrando página <span className="font-medium text-gray-900 dark:text-white">{pagina}</span>
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagina(prev => Math.max(prev - 1, 1))}
                                disabled={pagina === 1 || loading}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                            >
                                <FiArrowLeft className="w-4 h-4" /> Anterior
                            </button>
                            <button
                                onClick={() => setPagina(prev => prev + 1)}
                                disabled={eventos.length < ITEMS_POR_PAGINA || loading}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                            >
                                Siguiente <FiArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div >
    );
};

// Función auxiliar para remover UUIDs (32+ caracteres) de las descripciones
const limpiarDescripcion = (texto) => {
    if (!texto) return '';
    // Expresión regular para encontrar UUIDs (v4 y similares sin guiones también)
    return texto.replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '[ID-OCULTO]')
        .replace(/[a-zA-Z0-9-]{30,}/g, '...');
};

// Componente auxiliar para el contenido de una fila (reusado en acordeón)
const EventoRowContent = ({ evento }) => {
    const { formatDate, formatTime } = useConfig();
    const priConfig = PRIORIDADES[evento.prioridad] || PRIORIDADES.media;

    return (
        <div className="flex items-start justify-between gap-4">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">{evento.titulo}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${priConfig.color}`}>
                        {priConfig.label}
                    </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{limpiarDescripcion(evento.descripcion)}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><FiClock className="w-3 h-3" /> {formatDate(evento.fecha_registro)} {formatTime(evento.fecha_registro)}</span>
                    {evento.empleado_nombre && (
                        <span className="flex items-center gap-1"><FiUser className="w-3 h-3" /> {evento.empleado_nombre}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Registros;