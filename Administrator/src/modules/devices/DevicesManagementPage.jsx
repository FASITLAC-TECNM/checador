import React, { useState, useEffect } from 'react';
import { Monitor, Bell } from 'lucide-react';
import DevicePage from './DevicesPage';
import SolicitudesPage from './SolicitudesPage';
import { getSolicitudesPendientes } from '../../services/solicitudesService';
import { getSolicitudesMovilesPendientes } from '../../services/solicitudesMovilService';

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
            const [escritorio, moviles] = await Promise.all([
                getSolicitudesPendientes(),
                getSolicitudesMovilesPendientes()
            ]);
            const total = escritorio.length + moviles.length;
            setSolicitudesPendientes(total);
            console.log(`📊 Solicitudes pendientes: ${escritorio.length} escritorio + ${moviles.length} móviles = ${total} total`);
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
            {/* Header con título */}
            <div className="bg-white border-b border-[#E5E5E7] px-6 py-6">
                <h1 className="text-3xl font-bold text-[#1D1D1F]">Gestión de Dispositivos</h1>
            </div>

            {/* Tabs debajo del título */}
            <div className="bg-white border-b border-[#E5E5E7] sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-1">
                        <button
                            onClick={() => handleTabChange('devices')}
                            className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all relative ${
                                activeTab === 'devices'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                            }`}
                        >
                            <Monitor size={18} />
                            Dispositivos
                        </button>
                        <button
                            onClick={() => handleTabChange('solicitudes')}
                            className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all relative ${
                                activeTab === 'solicitudes'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                            }`}
                        >
                            <Bell size={18} />
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
