import React, { useState, useEffect } from 'react';
import DeviceRequestList from './DeviceRequestList';
import DeviceRequestDetail from './DeviceRequestDetail';
import { Bell, ArrowLeft } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';

const DeviceRequestPage = ({ onNavigateToDevices, onUpdatePeticiones }) => {
    const notification = useNotification();
    const [selectedRequest, setSelectedRequest] = useState(null);

    useEffect(() => {
        if (onUpdatePeticiones) {
            onUpdatePeticiones(requests.length);
        }
    }, [requests.length, onUpdatePeticiones]);

    const handleRequestClick = (request) => {
        setSelectedRequest(request);
    };

    const handleClose = () => {
        setSelectedRequest(null);
    };

    const handleApprove = async (request) => {
        const confirmed = await notification.confirm('Aprobar solicitud', `¿Está seguro de aprobar la solicitud de ${request.nombreEmpleado}?`);
        if (confirmed) {
            // Aquí iría la lógica para aprobar y registrar el dispositivo
            setRequests(requests.filter(r => r.id !== request.id));
            setSelectedRequest(null);
            notification.success('Solicitud aprobada', 'El dispositivo ha sido registrado correctamente');
        }
    };

    const handleReject = async (request) => {
        const motivo = await notification.confirm('Rechazar solicitud', `¿Por qué desea rechazar la solicitud de ${request.nombreEmpleado}?`);
        if (motivo) {
            // Aquí iría la lógica para rechazar y notificar al usuario
            setRequests(requests.filter(r => r.id !== request.id));
            setSelectedRequest(null);
            notification.success('Solicitud rechazada', 'Se ha notificado al empleado');
        }
    };

    // Si hay una solicitud seleccionada, mostrar el detalle
    if (selectedRequest) {
        return (
            <DeviceRequestDetail
                request={selectedRequest}
                onClose={handleClose}
                onApprove={handleApprove}
                onReject={handleReject}
            />
        );
    }

    // Mostrar la lista de peticiones
    return (
        <div className="min-h-screen bg-white">
            {/* Header fijo */}
            <div className="sticky top-0 z-10 bg-white border-b border-[#E5E5E7] shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            {/* Botón de regreso */}
                            {onNavigateToDevices && (
                                <button
                                    onClick={onNavigateToDevices}
                                    className="flex items-center gap-2 text-[#6E6E73] hover:text-blue-600 transition-all mb-4 group"
                                >
                                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                    <span className="font-medium">Volver a Dispositivos</span>
                                </button>
                            )}
                            <h1 className="text-3xl font-bold text-[#1D1D1F] mb-3">Peticiones Pendientes</h1>
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                                    <span className="font-semibold">{requests.length}</span>
                                    <span className="text-sm">solicitud{requests.length !== 1 ? 'es' : ''} pendiente{requests.length !== 1 ? 's' : ''}</span>
                                </div>
                                {requests.length > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200">
                                        <Bell className="w-4 h-4 animate-pulse" />
                                        <span className="text-sm font-medium">Requieren atención</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <DeviceRequestList
                    requests={requests}
                    onRequestClick={handleRequestClick}
                />
            </div>
        </div>
    );
};

export default DeviceRequestPage;