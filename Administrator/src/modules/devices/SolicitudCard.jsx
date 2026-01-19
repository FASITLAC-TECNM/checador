import React, { useState } from 'react';
import { Monitor, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

const SolicitudCard = ({ solicitud, onAceptar, onRechazar }) => {
    const notification = useNotification();
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [motivoRechazo, setMotivoRechazo] = useState('');

    const handleRechazar = () => {
        if (!motivoRechazo.trim()) {
            notification.warning('Motivo requerido', 'Por favor ingresa un motivo de rechazo');
            return;
        }
        onRechazar(solicitud, motivoRechazo);
        setShowRejectModal(false);
        setMotivoRechazo('');
    };

    return (
        <>
            <div className="bg-white rounded-xl border-2 border-amber-200 p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 bg-amber-100 rounded-xl">
                            <Monitor className="w-6 h-6 text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-[#1D1D1F] mb-2">
                                {solicitud.nombre}
                            </h3>
                            {solicitud.descripcion && (
                                <p className="text-[#6E6E73] text-sm mb-3">{solicitud.descripcion}</p>
                            )}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#6E6E73]">IP:</span>
                                    <span className="font-medium text-[#1D1D1F]">{solicitud.ip}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[#6E6E73]">MAC:</span>
                                    <span className="font-mono text-xs font-medium text-[#1D1D1F]">
                                        {solicitud.mac}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[#6E6E73]">SO:</span>
                                    <span className="font-medium text-[#1D1D1F]">
                                        {solicitud.sistema_operativo || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-[#6E6E73]" />
                                    <span className="font-medium text-[#1D1D1F]">
                                        {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-MX', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Acciones - Solo mostrar si está pendiente */}
                    {solicitud.estado === 'Pendiente' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onAceptar(solicitud)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all font-medium shadow-sm hover:shadow"
                                title="Aceptar solicitud"
                            >
                                <CheckCircle size={18} />
                                <span className="hidden sm:inline">Aceptar</span>
                            </button>
                            <button
                                onClick={() => setShowRejectModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all font-medium shadow-sm hover:shadow"
                                title="Rechazar solicitud"
                            >
                                <XCircle size={18} />
                                <span className="hidden sm:inline">Rechazar</span>
                            </button>
                        </div>
                    )}

                    {/* Badge de estado para solicitudes procesadas */}
                    {solicitud.estado !== 'Pendiente' && (
                        <div className={`px-4 py-2 rounded-lg font-semibold ${solicitud.estado === 'Aceptado'
                                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                                : 'bg-red-100 text-red-700 border-2 border-red-300'
                            }`}>
                            {solicitud.estado === 'Aceptado' ? '✓ Aceptado' : '✗ Rechazado'}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de rechazo */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl animate-fadeIn">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <XCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-[#1D1D1F]">
                                Rechazar Solicitud
                            </h3>
                        </div>

                        <p className="text-[#6E6E73] mb-1">
                            Estás a punto de rechazar:
                        </p>
                        <p className="font-semibold text-[#1D1D1F] mb-4">
                            {solicitud.nombre}
                        </p>

                        <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                            Motivo del rechazo *
                        </label>
                        <textarea
                            value={motivoRechazo}
                            onChange={(e) => setMotivoRechazo(e.target.value)}
                            placeholder="Ej: El equipo no cumple con los requisitos mínimos..."
                            className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                            rows="4"
                            autoFocus
                        />

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleRechazar}
                                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all font-semibold shadow-sm"
                            >
                                Confirmar Rechazo
                            </button>
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setMotivoRechazo('');
                                }}
                                className="flex-1 px-4 py-3 bg-[#F5F5F7] text-[#1D1D1F] rounded-lg hover:bg-[#E5E5E7] active:scale-95 transition-all font-semibold"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SolicitudCard;
