import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Monitor, Trash2, RefreshCw } from 'lucide-react';
import { getSolicitudes, aceptarSolicitud, rechazarSolicitud, deleteSolicitud } from '../../services/solicitudesService';
import { useNotification } from '../../contexts/NotificationContext';

const SolicitudesPage = () => {
    const notification = useNotification();
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [filter, setFilter] = useState('all'); // all, pendientes, aceptadas, rechazadas

    useEffect(() => {
        cargarSolicitudes();
    }, []);

    const cargarSolicitudes = async () => {
        try {
            setLoading(true);
            const data = await getSolicitudes();
            setSolicitudes(data);
        } catch (error) {
            console.error('Error cargando solicitudes:', error);
            notification.error('Error de carga', 'Error al cargar las solicitudes');
        } finally {
            setLoading(false);
        }
    };

    const handleAceptar = async (solicitud) => {
        const confirmed = await notification.confirm('Aceptar solicitud', `¿Aceptar la solicitud de "${solicitud.nombre}"?`);
        if (!confirmed) return;

        try {
            // TODO: Obtener el ID del usuario actual de la sesión
            const idUsuarioAprobador = 1; // Por ahora usar 1, luego integrar con la sesión
            await aceptarSolicitud(solicitud.id, idUsuarioAprobador);
            notification.success('Solicitud aceptada', 'El dispositivo ha sido creado correctamente');
            cargarSolicitudes();
        } catch (error) {
            console.error('Error aceptando solicitud:', error);
            notification.error('Error', 'Error al aceptar la solicitud');
        }
    };

    const handleRechazar = (solicitud) => {
        setSelectedSolicitud(solicitud);
        setMotivoRechazo('');
        setShowRejectModal(true);
    };

    const confirmarRechazo = async () => {
        if (!motivoRechazo.trim()) {
            notification.warning('Motivo requerido', 'Por favor ingresa un motivo de rechazo');
            return;
        }

        try {
            // TODO: Obtener el ID del usuario actual de la sesión
            const idUsuarioAprobador = 1;
            await rechazarSolicitud(selectedSolicitud.id, idUsuarioAprobador, motivoRechazo);
            notification.success('Solicitud rechazada', 'La solicitud ha sido rechazada correctamente');
            setShowRejectModal(false);
            setSelectedSolicitud(null);
            setMotivoRechazo('');
            cargarSolicitudes();
        } catch (error) {
            console.error('Error rechazando solicitud:', error);
            notification.error('Error', 'Error al rechazar la solicitud');
        }
    };

    const handleEliminar = async (solicitud) => {
        const confirmed = await notification.confirm('Eliminar solicitud', `¿Eliminar la solicitud de "${solicitud.nombre}"? Esta acción no se puede deshacer.`);
        if (!confirmed) return;

        try {
            await deleteSolicitud(solicitud.id);
            notification.success('Solicitud eliminada', 'La solicitud ha sido eliminada correctamente');
            cargarSolicitudes();
        } catch (error) {
            console.error('Error eliminando solicitud:', error);
            notification.error('Error', error.message || 'Error al eliminar la solicitud');
        }
    };

    const solicitudesFiltradas = solicitudes.filter(s => {
        if (filter === 'all') return true;
        if (filter === 'pendientes') return s.estado === 'Pendiente';
        if (filter === 'aceptadas') return s.estado === 'Aceptado';
        if (filter === 'rechazadas') return s.estado === 'Rechazado';
        return true;
    });

    const pendientes = solicitudes.filter(s => s.estado === 'Pendiente').length;
    const aceptadas = solicitudes.filter(s => s.estado === 'Aceptado').length;
    const rechazadas = solicitudes.filter(s => s.estado === 'Rechazado').length;

    const getEstadoBadge = (estado) => {
        const badges = {
            'Pendiente': {
                bg: 'bg-yellow-100',
                text: 'text-yellow-800',
                border: 'border-yellow-300',
                icon: <Clock size={16} />
            },
            'Aceptado': {
                bg: 'bg-green-100',
                text: 'text-green-800',
                border: 'border-green-300',
                icon: <CheckCircle size={16} />
            },
            'Rechazado': {
                bg: 'bg-red-100',
                text: 'text-red-800',
                border: 'border-red-300',
                icon: <XCircle size={16} />
            }
        };
        return badges[estado] || badges['Pendiente'];
    };

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
                            <h1 className="text-3xl font-bold text-[#1D1D1F] mb-2">Solicitudes de Escritorio</h1>
                            <p className="text-[#6E6E73]">Gestiona las solicitudes de nuevos dispositivos</p>
                        </div>
                        <button
                            onClick={cargarSolicitudes}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <RefreshCw size={18} />
                            Actualizar
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                            <span className="font-semibold">{solicitudes.length}</span>
                            <span className="text-sm">total</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200">
                            <Clock size={16} />
                            <span className="font-semibold">{pendientes}</span>
                            <span className="text-sm">pendientes</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                            <CheckCircle size={16} />
                            <span className="font-semibold">{aceptadas}</span>
                            <span className="text-sm">aceptadas</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-full border border-red-200">
                            <XCircle size={16} />
                            <span className="font-semibold">{rechazadas}</span>
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
                        Todas ({solicitudes.length})
                    </button>
                    <button
                        onClick={() => setFilter('pendientes')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'pendientes'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-white text-[#6E6E73] border border-[#D2D2D7] hover:bg-[#F5F5F7]'
                            }`}
                    >
                        Pendientes ({pendientes})
                    </button>
                    <button
                        onClick={() => setFilter('aceptadas')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'aceptadas'
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-[#6E6E73] border border-[#D2D2D7] hover:bg-[#F5F5F7]'
                            }`}
                    >
                        Aceptadas ({aceptadas})
                    </button>
                    <button
                        onClick={() => setFilter('rechazadas')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'rechazadas'
                                ? 'bg-red-600 text-white'
                                : 'bg-white text-[#6E6E73] border border-[#D2D2D7] hover:bg-[#F5F5F7]'
                            }`}
                    >
                        Rechazadas ({rechazadas})
                    </button>
                </div>

                {/* Lista de solicitudes */}
                {solicitudesFiltradas.length === 0 ? (
                    <div className="bg-white rounded-xl border border-[#D2D2D7] p-12 text-center">
                        <AlertCircle className="w-16 h-16 text-[#6E6E73] mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">
                            No hay solicitudes {filter !== 'all' && filter}
                        </h3>
                        <p className="text-[#6E6E73]">
                            {filter === 'all' ? 'Las solicitudes aparecerán aquí cuando los dispositivos las envíen' : 'Cambia el filtro para ver otras solicitudes'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {solicitudesFiltradas.map((solicitud) => {
                            const badge = getEstadoBadge(solicitud.estado);
                            return (
                                <div
                                    key={solicitud.id}
                                    className="bg-white rounded-xl border border-[#D2D2D7] p-6 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="p-3 bg-blue-100 rounded-xl">
                                                <Monitor className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-semibold text-[#1D1D1F]">
                                                        {solicitud.nombre}
                                                    </h3>
                                                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-medium ${badge.bg} ${badge.text} ${badge.border}`}>
                                                        {badge.icon}
                                                        {solicitud.estado}
                                                    </span>
                                                </div>

                                                {solicitud.descripcion && (
                                                    <p className="text-[#6E6E73] mb-3">{solicitud.descripcion}</p>
                                                )}

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-[#6E6E73]">IP:</span>
                                                        <span className="ml-2 font-medium text-[#1D1D1F]">{solicitud.ip}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[#6E6E73]">MAC:</span>
                                                        <span className="ml-2 font-mono text-xs font-medium text-[#1D1D1F]">{solicitud.mac}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[#6E6E73]">SO:</span>
                                                        <span className="ml-2 font-medium text-[#1D1D1F]">{solicitud.sistema_operativo || 'N/A'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[#6E6E73]">Fecha:</span>
                                                        <span className="ml-2 font-medium text-[#1D1D1F]">
                                                            {new Date(solicitud.fecha_solicitud).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                {solicitud.estado === 'Rechazado' && solicitud.motivo_rechazo && (
                                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                        <p className="text-sm text-red-800">
                                                            <strong>Motivo de rechazo:</strong> {solicitud.motivo_rechazo}
                                                        </p>
                                                    </div>
                                                )}

                                                {solicitud.observaciones && (
                                                    <div className="mt-3 p-3 bg-[#F5F5F7] rounded-lg">
                                                        <p className="text-sm text-[#6E6E73]">
                                                            <strong>Observaciones:</strong> {solicitud.observaciones}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Acciones */}
                                        <div className="flex items-center gap-2 ml-4">
                                            {solicitud.estado === 'Pendiente' && (
                                                <>
                                                    <button
                                                        onClick={() => handleAceptar(solicitud)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                    >
                                                        <CheckCircle size={18} />
                                                        Aceptar
                                                    </button>
                                                    <button
                                                        onClick={() => handleRechazar(solicitud)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                                    >
                                                        <XCircle size={18} />
                                                        Rechazar
                                                    </button>
                                                </>
                                            )}
                                            {solicitud.estado !== 'Aceptado' && (
                                                <button
                                                    onClick={() => handleEliminar(solicitud)}
                                                    className="p-2 text-[#6E6E73] hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                                    title="Eliminar solicitud"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de rechazo */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-[#1D1D1F] mb-4">
                            Rechazar Solicitud
                        </h3>
                        <p className="text-[#6E6E73] mb-4">
                            Estás a punto de rechazar la solicitud de <strong>{selectedSolicitud?.nombre}</strong>.
                            Por favor, proporciona un motivo:
                        </p>
                        <textarea
                            value={motivoRechazo}
                            onChange={(e) => setMotivoRechazo(e.target.value)}
                            placeholder="Motivo del rechazo..."
                            className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                            rows="4"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={confirmarRechazo}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Confirmar Rechazo
                            </button>
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setSelectedSolicitud(null);
                                    setMotivoRechazo('');
                                }}
                                className="flex-1 px-4 py-2 bg-[#F5F5F7] text-[#1D1D1F] rounded-lg hover:bg-[#E5E5E7] transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SolicitudesPage;
