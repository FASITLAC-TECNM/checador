import React, { useState, useEffect } from 'react';
import { Monitor, Bell } from 'lucide-react';
import DevicePage from './DevicesPage';
import SolicitudesPage from './SolicitudesPage';
import { getSolicitudesPendientes } from '../../services/solicitudesService';

const DevicesManagementPage = () => {
    const [activeTab, setActiveTab] = useState('devices'); // 'devices' o 'solicitudes'
    const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);

    useEffect(() => {
        cargarSolicitudesPendientes();

        // Actualizar cada 30 segundos
        const interval = setInterval(cargarSolicitudesPendientes, 30000);
        return () => clearInterval(interval);
    }, []);

    const cargarSolicitudesPendientes = async () => {
        try {
            const data = await getSolicitudesPendientes();
            setSolicitudesPendientes(data.length);
        } catch (error) {
            console.error('Error cargando solicitudes pendientes:', error);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'solicitudes') {
            cargarSolicitudesPendientes();
        }
    };

    return (
        <div className="min-h-screen bg-[#FBFBFD]">
            {/* Tabs Header */}
            <div className="bg-white border-b border-[#E5E5E7] sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-1">
                        <button
                            onClick={() => handleTabChange('devices')}
                            className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all relative ${
                                activeTab === 'devices'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                            }`}
                        >
                            <Monitor size={20} />
                            Dispositivos
                        </button>
                        <button
                            onClick={() => handleTabChange('solicitudes')}
                            className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all relative ${
                                activeTab === 'solicitudes'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                            }`}
                        >
                            <Bell size={20} />
                            Solicitudes
                            {solicitudesPendientes > 0 && (
                                <span className="absolute -top-1 -right-1 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full min-w-[20px] text-center animate-pulse">
                                    {solicitudesPendientes}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="relative">
                {activeTab === 'devices' && (
                    <DevicePage
                        onNavigateToPeticiones={() => handleTabChange('solicitudes')}
                        peticionesPendientes={solicitudesPendientes}
                    />
                )}
                {activeTab === 'solicitudes' && <SolicitudesPage />}
            </div>
        </div>
    );
};

export default DevicesManagementPage;
