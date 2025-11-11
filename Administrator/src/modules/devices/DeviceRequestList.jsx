import React from 'react';
import DeviceRequestCard from './DeviceRequestCard';
import { Search, AlertCircle } from 'lucide-react';

const DeviceRequestList = ({ requests, onRequestClick }) => {
    return (
        <>
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#86868B] w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre de empleado..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                    />
                </div>
                <select className="px-4 py-3 bg-white border border-[#D2D2D7] rounded-lg text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
                    <option>Todas las peticiones</option>
                    <option>Últimas 24 horas</option>
                    <option>Última semana</option>
                    <option>Último mes</option>
                </select>
            </div>

            {requests.length === 0 ? (
                <div className="bg-white rounded-xl p-12 border border-[#D2D2D7] shadow-sm text-center">
                    <AlertCircle className="w-12 h-12 text-[#86868B] mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">No hay peticiones pendientes</h3>
                    <p className="text-[#6E6E73]">Las nuevas solicitudes de dispositivos móviles aparecerán aquí</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => (
                        <DeviceRequestCard
                            key={request.id}
                            request={request}
                            onClick={onRequestClick}
                        />
                    ))}
                </div>
            )}
        </>
    );
};

export default DeviceRequestList;