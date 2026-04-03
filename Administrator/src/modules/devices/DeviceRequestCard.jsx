import React from 'react';
import { Smartphone, Clock, ChevronRight } from 'lucide-react';

const DeviceRequestCard = ({ request, onClick }) => {
    return (
        <div
            onClick={() => onClick(request)}
            className="bg-white rounded-xl p-6 border border-amber-200 hover:border-amber-300 hover:shadow-md cursor-pointer transition-all duration-200"
        >
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                    {/* Icono del dispositivo */}
                    <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                        <Smartphone className="w-6 h-6 text-amber-600" />
                    </div>

                    {/* Información */}
                    <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h3 className="text-[#1D1D1F] font-semibold text-lg mb-1">Nueva solicitud de dispositivo móvil</h3>
                                <div className="flex items-center gap-2 text-sm text-[#6E6E73]">
                                    <Clock className="w-4 h-4" />
                                    <span>{new Date(request.fechaSolicitud).toLocaleString()}</span>
                                </div>
                            </div>
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                                PENDIENTE
                            </span>
                        </div>

                        {/* Información del empleado */}
                        <div className="mt-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[#86868B] text-sm">Empleado:</span>
                                <span className="text-[#1D1D1F] font-medium">{request.nombreEmpleado}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[#86868B] text-sm">Rol:</span>
                                <span className="text-[#6E6E73]">{request.rolEmpleado}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[#86868B] text-sm">Dispositivo:</span>
                                <span className="text-[#6E6E73]">{request.modeloDispositivo}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[#86868B] text-sm">IMEI:</span>
                                <span className="text-[#6E6E73] font-mono text-xs">{request.imei}</span>
                            </div>
                        </div>
                    </div>

                    {/* Flecha */}
                    <ChevronRight className="w-5 h-5 text-[#86868B] flex-shrink-0 mt-1" />
                </div>
            </div>
        </div>
    );
};

export default DeviceRequestCard;