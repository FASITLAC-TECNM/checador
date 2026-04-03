import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import ConfirmBox from '../components/ConfirmBox';
import { useSolicitudesSSE } from '../hooks/useSolicitudesSSE';
import {
    Monitor,
    Smartphone,
    Search,
    X,
    AlertCircle,
    Check,
    XCircle,
    Clock,
    Wifi,
    Cpu,
    Calendar,
    Mail,
    Shield,
    FileText,
    Server,
    Info,
    ChevronDown,
    ChevronUp,
    Fingerprint,
    Laptop,
    Trash2,
    RefreshCw,
    Inbox,
    AlertTriangle,
    Settings,
    CheckCircle,
    ScanFace
} from 'lucide-react';

import EscritorioProfile from '../components/EscritorioProfile';
import DynamicLoader from '../components/common/DynamicLoader';
import { useTour } from '../hooks/useTour';

import { API_CONFIG } from '../config/Apiconfig';
const API_URL = API_CONFIG.BASE_URL;

const ESTADOS = {
    pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    aceptado: { label: 'Aceptado', color: 'bg-green-100 text-green-800', icon: Check },
    rechazado: { label: 'Rechazado', color: 'bg-red-100 text-red-800', icon: XCircle }
};

const Dispositivos = () => {
    // Estado para Solicitudes
    const [solicitudes, setSolicitudes] = useState([]);

    // Estados para Dispositivos Activos
    const [movilesActivos, setMovilesActivos] = useState([]);
    const [escritoriosActivos, setEscritoriosActivos] = useState([]);

    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('activo');
    const [vistaActiva, setVistaActiva] = useState('escritorio'); // ('escritorio', 'movil', 'pendientes', 'historial')

    // Modal de aceptar/rechazar
    const [modalOpen, setModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState('');
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);
    const [procesando, setProcesando] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    // Modal de detalles
    const [modalDetalles, setModalDetalles] = useState(false);
    const [dispositivoDetalles, setDispositivoDetalles] = useState(null);

    const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [alertMsg, setAlertMsg] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

    // Definición del Tour
    const tourSteps = [
        { element: '#devices-metrics', popover: { title: 'Resumen de Flota', description: 'Visualiza rápidamente cuántos equipos tienes activos y si hay solicitudes de vinculación esperando.', side: "bottom" } },
        { element: '#devices-tabs', popover: { title: 'Navegación por Tipo', description: 'Filtra entre dispositivos de escritorio (plantas), móviles de empleados o revisa el historial.', side: "bottom" } },
        { element: '#devices-search', popover: { title: 'Buscador Técnico', description: 'Busca por nombre, IP, MAC o sistema operativo.', side: "bottom" } },
        { element: '#devices-list', popover: { title: 'Control de Terminales', description: 'Gestiona la Ficha Técnica de cada equipo. Recuerda que para vincular nuevos nodos de escritorio se requiere la "Llave de Empresa" y estar conectando desde una IP autorizada.', side: "top" } }
    ];

    useTour('dispositivos', tourSteps, !loading);

    const fetchData = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            const token = localStorage.getItem('auth_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const promises = [
                fetch(`${API_URL}/api/solicitudes`, { headers }),
                fetch(`${API_URL}/api/empleados`, { headers }),
                fetch(`${API_URL}/api/movil`, { headers }),
                fetch(`${API_URL}/api/escritorio`, { headers })
            ];

            const responses = await Promise.all(promises);
            const [solicitudesData, empleadosData, movilesData, escritoriosData] = await Promise.all(responses.map(r => r.json()));

            if (solicitudesData.success) setSolicitudes(solicitudesData.data);
            if (empleadosData.success) setEmpleados(empleadosData.data.filter(emp => emp.id));
            if (movilesData.success) setMovilesActivos(movilesData.data);
            if (escritoriosData.success) setEscritoriosActivos(escritoriosData.data);

        } catch (error) {
            console.error('Error al cargar datos:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Polling cada 30s para actualizar contadores de biométricos en tiempo real
    useEffect(() => {
        const interval = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Notificaciones en tiempo real via SSE (reemplaza polling)
    useSolicitudesSSE({
        onNuevaSolicitud: () => fetchData(true),
        onSolicitudActualizada: () => fetchData(true)
    });

    // --- Lógica de Enrutado (Deep Linking) ---
    const [searchParams, setSearchParams] = useSearchParams();
    const solicitudIdParam = searchParams.get('solicitudId');
    const tipoParam = searchParams.get('tipo');

    useEffect(() => {
        if (solicitudIdParam && tipoParam) {
            // Cambiar de tab si es necesario
            if (tipoParam !== vistaActiva && (tipoParam === 'escritorio' || tipoParam === 'movil')) {
                setVistaActiva(tipoParam);
                return; // Esperar a que cambie el tab y se recarguen los datos
            }

            // Buscar la solicitud en la lista cargada
            if (!loading && solicitudes.length > 0) {
                const solicitud = solicitudes.find(s => s.id.toString() === solicitudIdParam);
                if (solicitud) {
                    // Abrir modal de detalles automáticamente
                    openDetallesModal(solicitud, true);
                    // Limpiar URL para no reabrir al recargar
                    setSearchParams({});
                }
            }
        }
    }, [solicitudIdParam, tipoParam, vistaActiva, loading, solicitudes, setSearchParams]);

    // --- Lógica Modales ---
    const openAceptarModal = (solicitud) => {
        setSelectedSolicitud(solicitud);
        setModalAction('aceptar');
        setObservaciones('');
        setModalOpen(true);
        setMensaje(null);

        const empleadoCoincidente = empleados.find(emp =>
            emp.correo && solicitud.correo &&
            emp.correo.toLowerCase().trim() === solicitud.correo.toLowerCase().trim()
        );

        if (empleadoCoincidente) {
            setEmpleadoSeleccionado(empleadoCoincidente.id);
        } else {
            setEmpleadoSeleccionado('');
        }
    };

    const openRechazarModal = (solicitud) => {
        setSelectedSolicitud(solicitud);
        setModalAction('rechazar');
        setEmpleadoSeleccionado('');
        setObservaciones('');
        setModalOpen(true);
        setMensaje(null);
    };

    const openDetallesModal = (item, esSolicitud = true) => {
        let detalles = { ...item };

        if (!esSolicitud) {
            detalles.tipo = vistaActiva === 'movil' || vistaActiva === 'escritorio' ? vistaActiva : item.tipo || 'escritorio';
            detalles.estado = 'aceptado';
            if (detalles.tipo === 'escritorio') {
                detalles.correo = 'Dispositivo de Planta';
            } else {
                detalles.nombre = item.empleado_nombre;
                detalles.correo = item.empleado_correo;
            }
        }

        setDispositivoDetalles(detalles);
        setModalDetalles(true);
    };

    const handleAceptar = async () => {
        if (selectedSolicitud.tipo === 'movil' && !empleadoSeleccionado) {
            setMensaje({ tipo: 'error', texto: 'Debes seleccionar un empleado para dispositivos móviles' });
            return;
        }

        try {
            setProcesando(true);
            const token = localStorage.getItem('auth_token');

            const body = selectedSolicitud.tipo === 'movil'
                ? { empleado_id: empleadoSeleccionado }
                : {};

            const response = await fetch(`${API_URL}/api/solicitudes/${selectedSolicitud.id}/aceptar`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.success) {
                setModalOpen(false);
                fetchData();
                setMensaje(null);
            } else {
                setMensaje({ tipo: 'error', texto: result.message || 'Error al aceptar solicitud' });
            }
        } catch (error) {
            console.error('Error:', error);
            setMensaje({ tipo: 'error', texto: 'Error al procesar la solicitud' });
        } finally {
            setProcesando(false);
        }
    };

    const handleRechazar = async () => {
        if (!observaciones.trim()) {
            setMensaje({ tipo: 'error', texto: 'Debes proporcionar observaciones para rechazar' });
            return;
        }

        try {
            setProcesando(true);
            const token = localStorage.getItem('auth_token');

            const response = await fetch(`${API_URL}/api/solicitudes/${selectedSolicitud.id}/rechazar`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ observaciones })
            });

            const result = await response.json();

            if (result.success) {
                setModalOpen(false);
                fetchData();
                setMensaje(null);
            } else {
                setMensaje({ tipo: 'error', texto: result.message || 'Error al rechazar solicitud' });
            }
        } catch (error) {
            console.error('Error:', error);
            setMensaje({ tipo: 'error', texto: 'Error al procesar la solicitud' });
        } finally {
            setProcesando(false);
        }
    };

    // --- Filtros ---
    const filtrarLista = (lista, usarCamposControllerMovil = false) => {
        return lista.filter(item => {
            if (!busqueda) return true;
            const searchLower = busqueda.toLowerCase();

            const nombre = usarCamposControllerMovil ? item.empleado_nombre : item.nombre;
            const correo = usarCamposControllerMovil ? item.empleado_correo : (item.correo || '');
            const ip = item.ip || '';
            const mac = item.mac || '';

            return (
                nombre?.toLowerCase().includes(searchLower) ||
                correo?.toLowerCase().includes(searchLower) ||
                item.sistema_operativo?.toLowerCase().includes(searchLower) ||
                ip.includes(searchLower) ||
                mac.toLowerCase().includes(searchLower)
            );
        });
    };

    const handleDesactivarDispositivo = (dispositivo, tipoForzado) => {
        const tipo = tipoForzado || vistaActiva;
        setConfirmAction({
            message: '¿Desactivar este dispositivo?',
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    const token = localStorage.getItem('auth_token');
                    const response = await fetch(`${API_URL}/api/${tipo}/${dispositivo.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const result = await response.json();
                    if (result.success) fetchData();
                    else setAlertMsg(result.message || 'Error al desactivar');
                } catch (error) { console.error(error); }
            }
        });
    };

    const handleReactivarDispositivo = (dispositivo, tipoForzado) => {
        const tipo = tipoForzado || vistaActiva;
        setConfirmAction({
            message: '¿Reactivar este dispositivo?',
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    const token = localStorage.getItem('auth_token');
                    const response = await fetch(`${API_URL}/api/${tipo}/${dispositivo.id}/reactivar`, {
                        method: 'PATCH',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const result = await response.json();
                    if (result.success) fetchData();
                    else setAlertMsg(result.message || 'Error al reactivar');
                } catch (error) { console.error(error); }
            }
        });
    };

    const solicitudesFiltradas = filtrarLista(solicitudes);
    const pendientesList = solicitudesFiltradas.filter(s => s.estado === 'pendiente');
    const historialList = solicitudesFiltradas.filter(s => s.estado !== 'pendiente');

    let activosList = vistaActiva === 'movil'
        ? filtrarLista(movilesActivos, true)
        : filtrarLista(escritoriosActivos, false);

    // Aplicar filtro de estado
    if (filtroEstado === 'activo') {
        activosList = activosList.filter(d => d.es_activo !== false);
    } else if (filtroEstado === 'inactivo') {
        activosList = activosList.filter(d => d.es_activo === false);
    }

    return (
        <div className="space-y-6">
            {/* Métricas Principales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="devices-metrics">
                <div onClick={() => setVistaActiva('escritorio')} className={`card p-6 cursor-pointer transition-all ${vistaActiva === 'escritorio' ? 'ring-2 ring-primary-500 shadow-md' : 'hover:-translate-y-1 hover:shadow-md'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Escritorios Activos</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{escritoriosActivos.filter(d => d.es_activo !== false).length}</h3>
                        </div>
                        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                            <Monitor className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        </div>
                    </div>
                </div>
                <div onClick={() => setVistaActiva('movil')} className={`card p-6 cursor-pointer transition-all ${vistaActiva === 'movil' ? 'ring-2 ring-blue-500 shadow-md' : 'hover:-translate-y-1 hover:shadow-md'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Móviles Asignados</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{movilesActivos.filter(d => d.es_activo !== false).length}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <Smartphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>
                <div onClick={() => setVistaActiva('pendientes')} className={`card p-6 cursor-pointer transition-all relative overflow-hidden ${vistaActiva === 'pendientes' || vistaActiva === 'historial' ? 'ring-2 ring-orange-500 shadow-md' : 'hover:-translate-y-1 hover:shadow-md'}`}>
                    {pendientesList.length > 0 && <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-100/50 dark:from-orange-900/10 to-transparent -mr-8 -mt-8 rounded-full pointer-events-none"></div>}
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Solicitudes Pendientes</p>
                            <div className="flex items-center gap-3 mt-1">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{pendientesList.length}</h3>
                                {pendientesList.length > 0 && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full animate-pulse border border-orange-200 dark:border-orange-800">
                                        <AlertTriangle className="w-3 h-3"/> Reclamo Acción
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                            <Inbox className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Controles y Navegación (Pills) */}
            <div className="flex flex-col lg:flex-row justify-between gap-4 items-center bg-white dark:bg-gray-800 p-2 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm">
                <div id="devices-tabs" className="flex w-full lg:w-auto overflow-x-auto bg-slate-50 dark:bg-gray-900 p-1 rounded-lg">
                    {[
                        { id: 'escritorio', label: 'Escritorios Activos', icon: Monitor },
                        { id: 'movil', label: 'Móviles Asignados', icon: Smartphone },
                        { id: 'pendientes', label: 'Pendientes de Aprobar', icon: Clock },
                        { id: 'historial', label: 'Historial', icon: FileText }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setVistaActiva(tab.id)}
                            className={`whitespace-nowrap flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${vistaActiva === tab.id ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}
                        >
                            <tab.icon className={`w-4 h-4 ${vistaActiva === tab.id ? (tab.id === 'escritorio' ? 'text-primary-600' : tab.id === 'movil' ? 'text-blue-500' : tab.id === 'pendientes' ? 'text-orange-500' : 'text-gray-500') : ''}`} />
                            {tab.label}
                            {tab.id === 'pendientes' && pendientesList.length > 0 && <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{pendientesList.length}</span>}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64" id="devices-search">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar dispositivo..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="input pl-9 py-2 text-sm"
                        />
                    </div>
                    {/* Filtro extra solo para activos */}
                    {(vistaActiva === 'escritorio' || vistaActiva === 'movil') && (
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                            className="input py-2 text-sm w-full lg:w-36"
                        >
                            <option value="">Status: Todos</option>
                            <option value="activo">Activos</option>
                            <option value="inactivo">Inactivos</option>
                        </select>
                    )}
                </div>
            </div>

            {loading ? (
                <DynamicLoader text="Actualizando información..." />
            ) : (
                <div className="space-y-4">
                    {/* VISTA ESCRITORIO O MOVIL */}
                    {(vistaActiva === 'escritorio' || vistaActiva === 'movil') && (
                        activosList.length === 0 ? (
                            <div className="text-center py-16 bg-slate-50 dark:bg-gray-900 rounded-2xl border border-dashed border-slate-200 dark:border-gray-700">
                                <p className="text-gray-500 dark:text-gray-400">No hay dispositivos {filtroEstado === 'activo' ? 'activos' : filtroEstado === 'inactivo' ? 'inactivos' : 'registrados aún'}</p>
                            </div>
                        ) : (
                            <div id="devices-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {activosList.map((dispositivo) => (
                                    <div key={dispositivo.id} className={`card p-5 relative overflow-hidden flex flex-col ${dispositivo.es_activo === false ? 'opacity-70 bg-slate-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800' : 'hover:-translate-y-1 hover:shadow-lg transition-all dark:bg-gray-800'}`}>
                                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${dispositivo.es_activo === false ? 'from-gray-100/50 dark:from-gray-800' : vistaActiva === 'escritorio' ? 'from-primary-100/30 dark:from-primary-900/10' : 'from-blue-100/30 dark:from-blue-900/10'} to-transparent -mr-8 -mt-8 rounded-full pointer-events-none`}></div>
                                        <div className="flex items-start justify-between mb-4 relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-xl ${dispositivo.es_activo === false ? 'bg-gray-100 dark:bg-gray-800' : vistaActiva === 'escritorio' ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                                                    {vistaActiva === 'escritorio' ? (
                                                        <Laptop className={`w-5 h-5 ${dispositivo.es_activo === false ? 'text-gray-400' : 'text-primary-600 dark:text-primary-400'}`} />
                                                    ) : (
                                                        <Smartphone className={`w-5 h-5 ${dispositivo.es_activo === false ? 'text-gray-400' : 'text-blue-600 dark:text-blue-400'}`} />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className={`font-semibold text-sm line-clamp-1 ${dispositivo.es_activo === false ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{vistaActiva === 'escritorio' ? dispositivo.nombre : dispositivo.empleado_nombre}</h3>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono break-all">{vistaActiva === 'escritorio' ? dispositivo.ip : dispositivo.empleado_correo}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {dispositivo.es_activo === false && <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-slate-200 dark:border-gray-600">Off</span>}
                                                {dispositivo.es_root && <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-red-100 text-red-700 border border-red-200">ROOT</span>}
                                                {parseInt(dispositivo.biometricos_count) > 0 && vistaActiva === 'escritorio' && (
                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/30" title="Biométricos conectados">
                                                        <Fingerprint className="w-3 h-3" />
                                                        <span className="text-[10px] font-bold">{dispositivo.biometricos_count}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-gray-600 dark:text-gray-400 bg-slate-50/50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-gray-700">
                                            <div className="flex flex-col"><span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">OS</span> <span className="font-semibold">{dispositivo.sistema_operativo}</span></div>
                                            <div className="flex flex-col"><span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{vistaActiva === 'escritorio' ? 'MAC' : 'Reg'}</span> <span className="font-semibold font-mono truncate">{vistaActiva === 'escritorio' ? dispositivo.mac : new Date(dispositivo.fecha_registro).toLocaleDateString()}</span></div>
                                        </div>
                                        <div className="flex gap-2 mt-auto">
                                            <button onClick={() => openDetallesModal(dispositivo, false)} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors border ${vistaActiva === 'escritorio' ? 'bg-white dark:bg-gray-800 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800/50 hover:bg-primary-50 dark:hover:bg-primary-900/20' : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}>
                                                Ver Ficha Técnica
                                            </button>
                                            {dispositivo.es_activo === false ? (
                                                <button onClick={() => handleReactivarDispositivo(dispositivo)} className="px-3 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg border border-slate-200 hover:border-green-200 transition-colors bg-white dark:bg-gray-800" title="Reactivar">
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button onClick={() => handleDesactivarDispositivo(dispositivo)} className="px-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 hover:border-red-200 transition-colors bg-white dark:bg-gray-800" title="Desactivar">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* VISTA PENDIENTES */}
                    {vistaActiva === 'pendientes' && (
                        <div className="bg-orange-50/30 dark:bg-orange-900/5 border border-orange-100 dark:border-orange-900/30 rounded-2xl p-6">
                            {pendientesList.length === 0 ? (
                                <div className="text-center py-12">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">Todo al día</h3>
                                    <p className="text-sm text-gray-500">No hay equipos pendientes de aprobación actualmente.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {pendientesList.map((solicitud) => {
                                        const isMovil = solicitud.tipo === 'movil';
                                        const IconoTipo = isMovil ? Smartphone : Monitor;
                                        return (
                                            <div key={solicitud.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-orange-200 dark:border-orange-900/50 p-5 hover:shadow-md transition-shadow relative">
                                                <div className="absolute top-5 right-5 w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping opacity-75"></div>
                                                <div className="absolute top-5 right-5 w-2.5 h-2.5 bg-orange-500 rounded-full"></div>
                                                
                                                <div className="flex items-start gap-3 mb-4 pr-6">
                                                    <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                                                        <IconoTipo className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">{solicitud.nombre}</h3>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{solicitud.correo}</p>
                                                        <span className="inline-block px-2 py-0.5 mt-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 text-[10px] font-bold uppercase rounded border border-orange-200 dark:border-orange-800/50">Nuevo Request</span>
                                                    </div>
                                                </div>

                                                {(solicitud.biometricos_count > 0) && (
                                                    <div className="mb-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30 text-xs font-medium">
                                                        <Fingerprint className="w-4 h-4" />
                                                        Detecta {solicitud.biometricos_count} biométricos
                                                    </div>
                                                )}

                                                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-gray-700">
                                                    <button onClick={() => openDetallesModal(solicitud, true)} className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-600 border border-slate-200 dark:border-gray-600 transition-colors" title="Detalles">
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => openAceptarModal(solicitud)} className="flex-1 py-2 px-3 text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center justify-center gap-1">
                                                        <Check className="w-4 h-4" /> Aprobar
                                                    </button>
                                                    <button onClick={() => openRechazarModal(solicitud)} className="flex-1 py-2 px-3 text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-1">
                                                        <X className="w-4 h-4" /> Declinar
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* VISTA HISTORIAL */}
                    {vistaActiva === 'historial' && (
                        <div className="card p-0 overflow-hidden">
                            <div className="p-4 bg-slate-50 dark:bg-gray-800/50 border-b border-slate-100 dark:border-gray-700">
                                <h3 className="font-bold text-gray-800 dark:text-gray-200">Registro de Solicitudes Pasadas</h3>
                            </div>
                            <div className="p-4 max-h-[600px] overflow-y-auto">
                                {historialList.length === 0 ? (
                                    <p className="text-center text-sm text-gray-500 py-8">No hay historial disponible.</p>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {historialList.map(solicitud => (
                                            <div key={solicitud.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition-shadow">
                                                <div className="flex items-start gap-4">
                                                    <div className={`p-2.5 rounded-xl ${solicitud.estado === 'aceptado' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                                                        {solicitud.estado === 'aceptado' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{solicitud.nombre}</h4>
                                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${solicitud.estado === 'aceptado' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{solicitud.estado}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">{solicitud.correo} • {new Date(solicitud.fecha_registro).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => openDetallesModal(solicitud, true)} className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-gray-700 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-600 hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors">
                                                    Ver Detalles
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL DETALLES ACTUALIZADO */}
            {modalDetalles && dispositivoDetalles && createPortal(
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-gray-700 max-w-4xl w-full max-h-[95vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-2xl flex-shrink-0">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                Ficha Técnica del Dispositivo
                            </h2>
                            <button onClick={() => setModalDetalles(false)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-8 overflow-y-auto w-full">
                            {/* FICHA TÉCNICA - RENDERIZADO CONDICIONAL */}
                            {dispositivoDetalles.tipo === 'escritorio' ? (
                                <EscritorioProfile dispositivo={dispositivoDetalles} />
                            ) : (
                                <>
                                    <div className="flex flex-col lg:flex-row gap-8">
                                        {/* Columna Izquierda: Identidad y Resumen */}
                                        <div className="w-full lg:w-1/3 space-y-6">
                                            <div className="bg-slate-50 dark:bg-gray-900/50 rounded-2xl p-6 text-center border border-slate-100 dark:border-gray-800">
                                                <div className={`mx-auto w-24 h-24 flex items-center justify-center rounded-2xl mb-5 shadow-sm border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 ${dispositivoDetalles.tipo === 'movil' ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                                    <Smartphone className="w-12 h-12" />
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{dispositivoDetalles.nombre}</h3>
                                                {dispositivoDetalles.correo && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{dispositivoDetalles.correo}</p>}
                                                
                                                <div className="flex flex-wrap justify-center gap-2 mb-6">
                                                    <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${dispositivoDetalles.estado === 'activo' || dispositivoDetalles.estado === 'aceptado' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800/50 dark:text-green-400' : dispositivoDetalles.estado === 'pendiente' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800/50 dark:text-orange-400' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-400'}`}>
                                                        {dispositivoDetalles.estado === 'activo' ? 'App Activa' : dispositivoDetalles.estado === 'inactivo' ? 'App Inactiva' : dispositivoDetalles.estado}
                                                    </span>
                                                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700">
                                                        {dispositivoDetalles.tipo === 'movil' ? 'App Móvil' : dispositivoDetalles.tipo}
                                                    </span>
                                                </div>

                                                <div className="w-full h-px bg-slate-200 dark:bg-gray-700 mb-6"></div>

                                                <div className="space-y-4 text-left">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-gray-500 dark:text-gray-400 font-medium">SO</span>
                                                        <span className="font-semibold text-gray-900 dark:text-gray-200">{dispositivoDetalles.sistema_operativo || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-gray-500 dark:text-gray-400 font-medium">Registro</span>
                                                        <span className="font-semibold text-gray-900 dark:text-gray-200">{dispositivoDetalles.fecha_registro ? new Date(dispositivoDetalles.fecha_registro).toLocaleDateString() : 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {dispositivoDetalles.descripcion && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Notas Adicionales</h4>
                                                    <div className="bg-slate-50 dark:bg-gray-900 p-4 rounded-xl border border-slate-100 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300">
                                                        {dispositivoDetalles.descripcion}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Columna Derecha: Detalles Técnicos */}
                                        <div className="w-full lg:w-2/3 space-y-8">
                                            
                                            {/* Redes */}
                                            <section>
                                                <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <Wifi className="w-4 h-4" /> Interfaces de Red
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="card p-4 flex flex-col gap-1.5">
                                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">IP Address Local</span>
                                                        <span className="text-sm font-mono font-bold text-gray-900 dark:text-white break-all">{dispositivoDetalles.ip || 'No asignada'}</span>
                                                    </div>
                                                    <div className="card p-4 flex flex-col gap-1.5">
                                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Physical MAC</span>
                                                        <span className="text-sm font-mono font-bold text-gray-900 dark:text-white break-all">{dispositivoDetalles.mac || 'No rastreada'}</span>
                                                    </div>
                                                </div>
                                            </section>

                                            {/* Capacidades del Móvil */}
                                            <section>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                        <Settings className="w-4 h-4" /> Especificaciones del Dispositivo
                                                    </h4>
                                                </div>

                                                <div className="card p-0 overflow-hidden divide-y divide-slate-100 dark:divide-gray-800">
                                                    <div className="p-5 grid grid-cols-1 gap-4">
                                                        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center p-3 rounded-lg border border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/30">
                                                            <div>
                                                                <h5 className="font-medium text-sm text-gray-800 dark:text-gray-200">Hardware Root / Jailbreak</h5>
                                                                <p className="text-xs text-gray-500">Indica si el dispositivo ha sido modificado por el usuario.</p>
                                                            </div>
                                                            <div>
                                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${dispositivoDetalles.es_root ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                                                    {dispositivoDetalles.es_root ? <AlertTriangle className="w-3.5 h-3.5"/> : <CheckCircle className="w-3.5 h-3.5"/>}
                                                                    {dispositivoDetalles.es_root ? 'Root Detectado' : 'Seguro'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {parseInt(dispositivoDetalles.biometricos_count) > 0 && (
                                                            <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center p-3 rounded-lg border border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/30">
                                                                <div>
                                                                    <h5 className="font-medium text-sm text-gray-800 dark:text-gray-200">Biometría Nativa (Sensor Móvil)</h5>
                                                                    <p className="text-xs text-gray-500">Uso de la biometría del teléfono para validar registro.</p>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg border border-primary-100 dark:border-primary-800/30 text-sm font-semibold">
                                                                    <ScanFace className="w-4 h-4" /> Disponible
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800 rounded-b-2xl flex-shrink-0">
                            <button onClick={() => setModalDetalles(false)} className="btn-secondary">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL DE ACEPTAR/RECHAZAR */}
            {modalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-gray-700 max-w-md w-full max-h-[95vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-2xl flex-shrink-0">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                {modalAction === 'aceptar' ? 'Aceptar Solicitud' : 'Rechazar Solicitud'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            {mensaje && (
                                <div className={`p-4 rounded-lg flex items-start gap-3 ${mensaje.tipo === 'error' ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/50' : 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900/50'}`}>
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>{mensaje.texto}</span>
                                </div>
                            )}
                            {selectedSolicitud && (
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">{selectedSolicitud.nombre}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">Tipo: {selectedSolicitud.tipo}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedSolicitud.correo}</p>
                                </div>
                            )}
                            {modalAction === 'aceptar' && selectedSolicitud?.tipo === 'movil' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Asignar a empleado * {empleadoSeleccionado && <span className="text-green-600 dark:text-green-400 text-xs ml-2 font-normal">(Reconocido por correo)</span>}
                                    </label>
                                    <select
                                        value={empleadoSeleccionado}
                                        onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                                        className={`input ${empleadoSeleccionado ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20' : ''}`}
                                    >
                                        <option value="">Seleccionar empleado</option>
                                        {empleados.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.nombre} {emp.rfc ? `(${emp.rfc})` : ''} - {emp.correo}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {modalAction === 'rechazar' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Observaciones *</label>
                                    <textarea
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        className="input"
                                        rows="4"
                                        placeholder="Explica el motivo del rechazo..."
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800 rounded-b-2xl flex-shrink-0">
                            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
                            <button
                                onClick={modalAction === 'aceptar' ? handleAceptar : handleRechazar}
                                disabled={procesando}
                                className={`flex items-center gap-2 ${modalAction === 'aceptar' ? 'btn-primary bg-green-600 hover:bg-green-700 text-white' : 'btn-primary bg-red-600 hover:bg-red-700 text-white shadow-none'} ${procesando ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {procesando ? <DynamicLoader size="tiny" layout="row" /> : (modalAction === 'aceptar' ? 'Aceptar' : 'Rechazar')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {alertMsg && <ConfirmBox message={alertMsg} onConfirm={() => setAlertMsg(null)} />}
            {confirmAction && <ConfirmBox message={confirmAction.message} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />}
        </div>
    );
};

export default Dispositivos;