import React, { useState, useEffect } from 'react';
import DeviceRequestList from './DeviceRequestList';
import DeviceRequestDetail from './DeviceRequestDetail';
import { Bell, ArrowLeft } from 'lucide-react';

const DeviceRequestPage = ({ onNavigateToDevices, onUpdatePeticiones }) => {
    const [requests, setRequests] = useState([
        {
            id: 1,
            nombreEmpleado: 'Carlos Ramírez',
            emailEmpleado: 'carlos.ramirez@empresa.com',
            rolEmpleado: 'Supervisor de Producción',
            telefonoEmpleado: '+52 753 456 7890',
            modeloDispositivo: 'Samsung Galaxy S23',
            sistemaOperativo: 'Android 14',
            imei: '356938035643811',
            numeroTelefono: '+52 753 456 7890',
            fechaSolicitud: '2024-11-02T10:30:00',
            estado: 'Pendiente',
            observaciones: 'Necesito el dispositivo para gestionar el equipo de producción en campo'
        },
        {
            id: 2,
            nombreEmpleado: 'Ana López',
            emailEmpleado: 'ana.lopez@empresa.com',
            rolEmpleado: 'Gerente de Ventas',
            telefonoEmpleado: '+52 753 456 7891',
            modeloDispositivo: 'iPhone 15 Pro',
            sistemaOperativo: 'iOS 17.1',
            imei: '356938035643812',
            numeroTelefono: '+52 753 456 7891',
            fechaSolicitud: '2024-11-02T09:15:00',
            estado: 'Pendiente',
            observaciones: 'Requiero acceso móvil para gestionar clientes y visitas comerciales'
        },
        {
            id: 3,
            nombreEmpleado: 'Roberto Fernández',
            emailEmpleado: 'roberto.fernandez@empresa.com',
            rolEmpleado: 'Técnico de Mantenimiento',
            telefonoEmpleado: '+52 753 456 7892',
            modeloDispositivo: 'Motorola Edge 40',
            sistemaOperativo: 'Android 13',
            imei: '356938035643813',
            numeroTelefono: '+52 753 456 7892',
            fechaSolicitud: '2024-11-01T16:45:00',
            estado: 'Pendiente',
            observaciones: 'Para reportar incidencias y registrar mantenimientos en tiempo real'
        }
    ]);

    const [selectedRequest, setSelectedRequest] = useState(null);

    // Actualizar el contador de peticiones cuando cambie el estado
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

    const handleApprove = (request) => {
        if (confirm(`¿Está seguro de aprobar la solicitud de ${request.nombreEmpleado}?`)) {
            // Aquí iría la lógica para aprobar y registrar el dispositivo
            setRequests(requests.filter(r => r.id !== request.id));
            setSelectedRequest(null);
            alert('Solicitud aprobada. El dispositivo ha sido registrado.');
        }
    };

    const handleReject = (request) => {
        const motivo = prompt(`¿Por qué desea rechazar la solicitud de ${request.nombreEmpleado}?`);
        if (motivo) {
            // Aquí iría la lógica para rechazar y notificar al usuario
            setRequests(requests.filter(r => r.id !== request.id));
            setSelectedRequest(null);
            alert('Solicitud rechazada. Se ha notificado al empleado.');
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