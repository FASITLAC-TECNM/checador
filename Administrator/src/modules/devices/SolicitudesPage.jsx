import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Monitor, Trash2, RefreshCw, Smartphone, ChevronDown, ChevronUp } from 'lucide-react';
import { getSolicitudes, aceptarSolicitud, rechazarSolicitud, deleteSolicitud } from '../../services/solicitudesService';
import { getSolicitudesMoviles, aceptarSolicitudMovil, rechazarSolicitudMovil, deleteSolicitudMovil } from '../../services/solicitudesMovilService';
import SolicitudCard from './SolicitudCard';
import SolicitudMovilCard from './SolicitudMovilCard';
import { useNotification } from '../../contexts/NotificationContext';

const SolicitudesPage = () => {
    const notification = useNotification();

    // Estados para Solicitudes de Escritorio
    const [solicitudesEscritorio, setSolicitudesEscritorio] = useState([]);
    const [showEscritorioSection, setShowEscritorioSection] = useState(true);

    // Estados para Solicitudes Móviles
    const [solicitudesMoviles, setSolicitudesMoviles] = useState([]);
    const [showMovilesSection, setShowMovilesSection] = useState(true);

    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pendientes, aceptadas, rechazadas

    useEffect(() => {
        console.log('🚀 Componente montado, cargando solicitudes...');

        cargarTodasLasSolicitudes();

        // Actualizar cada 30 segundos
        const interval = setInterval(cargarTodasLasSolicitudes, 30000);
        return () => clearInterval(interval);
    }, []);

    const cargarTodasLasSolicitudes = async () => {
        try {
            setLoading(true);
            await Promise.all([
                cargarSolicitudesEscritorio(),
                cargarSolicitudesMoviles()
            ]);
        } finally {
            setLoading(false);
        }
    };

    const cargarSolicitudesEscritorio = async () => {
        try {
            const data = await getSolicitudes();
            setSolicitudesEscritorio(data);
        } catch (error) {
            console.error('Error cargando solicitudes de escritorio:', error);
            setSolicitudesEscritorio([]);
        }
    };

    const cargarSolicitudesMoviles = async () => {
        try {
            console.log('🔍 Cargando solicitudes móviles...');
            const data = await getSolicitudesMoviles();
            console.log('✅ Datos recibidos:', data);
            console.log('✅ Cantidad de solicitudes:', data.length);
            setSolicitudesMoviles(data);
        } catch (error) {
            console.error('❌ ERROR completo:', error);
            console.error('❌ Mensaje:', error.message);
            setSolicitudesMoviles([]);
        }
    };

    // Handlers para Escritorio
    const handleAceptarEscritorio = async (solicitud) => {
        const confirmed = await notification.confirm('Aceptar solicitud', `¿Aceptar la solicitud de escritorio "${solicitud.nombre}"?`);
        if (!confirmed) return;

        try {
            const idUsuarioAprobador = 1;
            await aceptarSolicitud(solicitud.id, idUsuarioAprobador);
            notification.success('Solicitud aceptada', 'El dispositivo de escritorio ha sido creado');
            cargarSolicitudesEscritorio();
        } catch (error) {
            console.error('Error:', error);
            notification.error('Error', 'Error al aceptar la solicitud de escritorio');
        }
    };

    const handleRechazarEscritorio = async (solicitud, motivo) => {
        try {
            const idUsuarioAprobador = 1;
            await rechazarSolicitud(solicitud.id, idUsuarioAprobador, motivo);
            notification.warning('Solicitud rechazada', 'La solicitud de escritorio ha sido rechazada');
            cargarSolicitudesEscritorio();
        } catch (error) {
            console.error('Error:', error);
            notification.error('Error', 'Error al rechazar la solicitud');
        }
    };

    const handleEliminarEscritorio = async (solicitud) => {
        const confirmed = await notification.confirm('Eliminar solicitud', `¿Eliminar la solicitud de "${solicitud.nombre}"?`);
        if (!confirmed) return;

        try {
            await deleteSolicitud(solicitud.id);
            notification.success('Solicitud eliminada', 'La solicitud ha sido eliminada');
            cargarSolicitudesEscritorio();
        } catch (error) {
            console.error('Error:', error);
            notification.error('Error', error.message || 'Error al eliminar la solicitud');
        }
    };

    // Handlers para Móviles
    const handleAceptarMovil = async (solicitud) => {
        const confirmed = await notification.confirm(
            'Aceptar solicitud móvil',
            `¿Aprobar el acceso móvil para ${solicitud.nombre}?`
        );
        if (!confirmed) return;

        try {
            const idUsuarioAprobador = 1;
            await aceptarSolicitudMovil(solicitud.id, idUsuarioAprobador);
            notification.success('Solicitud aceptada', `Acceso móvil aprobado para ${solicitud.nombre}`);
            cargarSolicitudesMoviles();
        } catch (error) {
            console.error('Error:', error);
            notification.error('Error', 'Error al aceptar la solicitud móvil');
        }
    };

    const handleRechazarMovil = async (solicitud, motivo) => {
        try {
            const idUsuarioAprobador = 1;
            await rechazarSolicitudMovil(solicitud.id, idUsuarioAprobador, motivo);
            notification.warning('Solicitud rechazada', `Acceso denegado para ${solicitud.nombre}`);
            cargarSolicitudesMoviles();
        } catch (error) {
            console.error('Error:', error);
            notification.error('Error', 'Error al rechazar la solicitud móvil');
        }
    };

    const handleEliminarMovil = async (solicitud) => {
        const confirmed = await notification.confirm('Eliminar solicitud', `¿Eliminar la solicitud de "${solicitud.nombre}"?`);
        if (!confirmed) return;

        try {
            await deleteSolicitudMovil(solicitud.id);
            notification.success('Solicitud eliminada', 'La solicitud móvil ha sido eliminada');
            cargarSolicitudesMoviles();
        } catch (error) {
            console.error('Error:', error);
            notification.error('Error', error.message || 'Error al eliminar la solicitud');
        }
    };

    // Filtrar solicitudes
    const filtrarSolicitudes = (solicitudes) => {
        return solicitudes.filter(s => {
            if (filter === 'all') return true;
            if (filter === 'pendientes') return s.estado === 'Pendiente';
            if (filter === 'aceptadas') return s.estado === 'Aceptado';
            if (filter === 'rechazadas') return s.estado === 'Rechazado';
            return true;
        });
    };

    const escritorioFiltradas = filtrarSolicitudes(solicitudesEscritorio);
    const movilesFiltradas = filtrarSolicitudes(solicitudesMoviles);

    // Estadísticas globales
    const totalSolicitudes = solicitudesEscritorio.length + solicitudesMoviles.length;
    const totalPendientes = [...solicitudesEscritorio, ...solicitudesMoviles].filter(s => s.estado === 'Pendiente').length;
    const totalAceptadas = [...solicitudesEscritorio, ...solicitudesMoviles].filter(s => s.estado === 'Aceptado').length;
    const totalRechazadas = [...solicitudesEscritorio, ...solicitudesMoviles].filter(s => s.estado === 'Rechazado').length;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
                <div className="text-center">
                    <Clock className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
                    <p className="text-[#6E6E73] text-lg">Cargando solicitudes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FBFBFD]">
            {/* Header */}
            <div className="bg-white border-b border-[#E5E5E7] sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-[#1D1D1F] mb-2">Gestión de Solicitudes</h1>
                            <p className="text-[#6E6E73]">Administra las solicitudes de dispositivos de escritorio y móviles</p>
                        </div>
                        <button
                            onClick={cargarTodasLasSolicitudes}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <RefreshCw size={18} />
                            Actualizar
                        </button>
                    </div>

                    {/* Stats Globales */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                            <span className="font-semibold">{totalSolicitudes}</span>
                            <span className="text-sm">total</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200">
                            <Clock size={16} />
                            <span className="font-semibold">{totalPendientes}</span>
                            <span className="text-sm">pendientes</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                            <CheckCircle size={16} />
                            <span className="font-semibold">{totalAceptadas}</span>
                            <span className="text-sm">aceptadas</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-full border border-red-200">
                            <XCircle size={16} />
                            <span className="font-semibold">{totalRechazadas}</span>
                            <span className="text-sm">rechazadas</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Filtros */}
                <div className="mb-6 flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-[#6E6E73] border border-[#D2D2D7] hover:bg-[#F5F5F7]'
                            }`}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setFilter('pendientes')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'pendientes'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-white text-[#6E6E73] border border-[#D2D2D7] hover:bg-[#F5F5F7]'
                            }`}
                    >
                        Pendientes
                    </button>
                    <button
                        onClick={() => setFilter('aceptadas')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'aceptadas'
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-[#6E6E73] border border-[#D2D2D7] hover:bg-[#F5F5F7]'
                            }`}
                    >
                        Aceptadas
                    </button>
                    <button
                        onClick={() => setFilter('rechazadas')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'rechazadas'
                            ? 'bg-red-600 text-white'
                            : 'bg-white text-[#6E6E73] border border-[#D2D2D7] hover:bg-[#F5F5F7]'
                            }`}
                    >
                        Rechazadas
                    </button>
                </div>

                {/* SECCIÓN: SOLICITUDES DE ESCRITORIO */}
                <div className="mb-8">
                    <button
                        onClick={() => setShowEscritorioSection(!showEscritorioSection)}
                        className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-2xl shadow-sm hover:shadow-md transition-all mb-4"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-600 rounded-lg">
                                <Monitor className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-left">
                                <p className="text-blue-800 font-bold text-lg">
                                    Solicitudes de Escritorio
                                </p>
                                <p className="text-[#6E6E73] text-sm">
                                    {escritorioFiltradas.length} solicitud{escritorioFiltradas.length !== 1 ? 'es' : ''}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-blue-700 font-medium">
                                {showEscritorioSection ? 'Ocultar' : 'Mostrar'}
                            </span>
                            {showEscritorioSection ? (
                                <ChevronUp className="w-5 h-5 text-blue-700" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-blue-700" />
                            )}
                        </div>
                    </button>

                    {showEscritorioSection && (
                        <div className="space-y-4">
                            {escritorioFiltradas.length === 0 ? (
                                <div className="bg-white rounded-xl border border-[#D2D2D7] p-12 text-center">
                                    <Monitor className="w-16 h-16 text-[#6E6E73] mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">
                                        No hay solicitudes de escritorio {filter !== 'all' && filter}
                                    </h3>
                                    <p className="text-[#6E6E73]">
                                        Las solicitudes de dispositivos de escritorio aparecerán aquí
                                    </p>
                                </div>
                            ) : (
                                escritorioFiltradas.map((solicitud) => (
                                    <SolicitudCard
                                        key={solicitud.id}
                                        solicitud={solicitud}
                                        onAceptar={handleAceptarEscritorio}
                                        onRechazar={handleRechazarEscritorio}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* SECCIÓN: SOLICITUDES MÓVILES */}
                <div className="mb-8">
                    <button
                        onClick={() => setShowMovilesSection(!showMovilesSection)}
                        className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-2xl shadow-sm hover:shadow-md transition-all mb-4"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-purple-600 rounded-lg">
                                <Smartphone className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-left">
                                <p className="text-purple-800 font-bold text-lg">
                                    Solicitudes Móviles
                                </p>
                                <p className="text-[#6E6E73] text-sm">
                                    {movilesFiltradas.length} solicitud{movilesFiltradas.length !== 1 ? 'es' : ''}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-purple-700 font-medium">
                                {showMovilesSection ? 'Ocultar' : 'Mostrar'}
                            </span>
                            {showMovilesSection ? (
                                <ChevronUp className="w-5 h-5 text-purple-700" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-purple-700" />
                            )}
                        </div>
                    </button>

                    {showMovilesSection && (
                        <div className="space-y-4">
                            {movilesFiltradas.length === 0 ? (
                                <div className="bg-white rounded-xl border border-[#D2D2D7] p-12 text-center">
                                    <Smartphone className="w-16 h-16 text-[#6E6E73] mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">
                                        No hay solicitudes móviles {filter !== 'all' && filter}
                                    </h3>
                                    <p className="text-[#6E6E73]">
                                        Las solicitudes de acceso móvil aparecerán aquí
                                    </p>
                                </div>
                            ) : (
                                movilesFiltradas.map((solicitud) => (
                                    <SolicitudMovilCard
                                        key={solicitud.id}
                                        solicitud={solicitud}
                                        onAceptar={handleAceptarMovil}
                                        onRechazar={handleRechazarMovil}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Mensaje cuando no hay solicitudes en absoluto */}
                {totalSolicitudes === 0 && (
                    <div className="bg-white rounded-xl border border-[#D2D2D7] p-12 text-center">
                        <AlertCircle className="w-16 h-16 text-[#6E6E73] mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">
                            No hay solicitudes
                        </h3>
                        <p className="text-[#6E6E73]">
                            Las nuevas solicitudes de dispositivos aparecerán aquí
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SolicitudesPage;