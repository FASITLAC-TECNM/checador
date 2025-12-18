import React from 'react';
import { Edit2, Trash2, Monitor, Smartphone, Fingerprint, MapPin, User, Globe, RefreshCw, ChevronRight, Hash } from 'lucide-react';

const DeviceCard = ({ device, onEdit, onDelete, onClick, isNested = false }) => {
    const getDeviceIcon = (tipo) => {
        switch (tipo) {
            case 'Registro Físico': return <Monitor className="w-5 h-5" />;
            case 'Móvil': return <Smartphone className="w-5 h-5" />;
            case 'Biométrico': return <Fingerprint className="w-5 h-5" />;
            default: return <Monitor className="w-5 h-5" />;
        }
    };

    const getDeviceColor = (tipo) => {
        switch (tipo) {
            case 'Registro Físico': return 'from-blue-500 to-blue-600';
            case 'Móvil': return 'from-purple-500 to-purple-600';
            case 'Biométrico': return 'from-green-500 to-green-600';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    const isMobile = device.tipo === 'Móvil';
    const isBiometric = device.tipo === 'Biométrico';

    const handleCardClick = (e) => {
        // Si se clickea en los botones de acción, no abrir el detalle
        if (e.target.closest('button')) {
            return;
        }
        if (onClick) {
            onClick(device);
        }
    };

    return (
        <div
            onClick={handleCardClick}
            className={`bg-white rounded-2xl p-5 border-2 border-[#E5E5E7] shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 group ${onClick ? 'cursor-pointer' : ''} ${isNested ? 'ml-6 border-l-4 border-l-green-400' : ''}`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getDeviceColor(device.tipo)} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                            {getDeviceIcon(device.tipo)}
                        </div>
                        {device.estado === 'Activo' && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-md animate-pulse"></div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-[#1D1D1F] font-bold text-base truncate group-hover:text-blue-600 transition-colors">
                            {device.nombre}
                        </h3>
                        {device.modelo && (
                            <p className="text-[#86868B] text-xs mt-0.5 truncate">{device.modelo}</p>
                        )}
                    </div>
                </div>
                {onClick && (
                    <ChevronRight className="w-5 h-5 text-[#86868B] group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                )}
            </div>

            <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-[#6E6E73] bg-[#F5F5F7] rounded-lg px-3 py-2">
                    {device.tipo === 'Registro Físico' && <MapPin className="w-4 h-4 text-blue-600" />}
                    {device.tipo === 'Móvil' && <User className="w-4 h-4 text-purple-600" />}
                    {device.tipo === 'Biométrico' && <MapPin className="w-4 h-4 text-green-600" />}
                    <span className="text-[#86868B] text-xs font-medium">
                        {device.tipo === 'Registro Físico' && 'Ubicación:'}
                        {device.tipo === 'Móvil' && 'Empleado:'}
                        {device.tipo === 'Biométrico' && 'Ubicación:'}
                    </span>
                    <span className="text-[#1D1D1F] font-semibold text-xs flex-1 truncate">
                        {device.tipo === 'Móvil'
                            ? (device.usuario?.nombre || device.usuarioAsignado || '-')
                            : (device.ubicacion || '-')
                        }
                    </span>
                </div>

                {device.ipAddress && (
                    <div className="flex items-center gap-2 text-[#6E6E73] bg-[#F5F5F7] rounded-lg px-3 py-2">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <span className="text-[#86868B] text-xs font-medium">IP:</span>
                        <span className="text-[#1D1D1F] font-mono font-semibold text-xs">{device.ipAddress}</span>
                    </div>
                )}

                {device.serie && (
                    <div className="flex items-center gap-2 text-[#6E6E73] bg-[#F5F5F7] rounded-lg px-3 py-2">
                        <Hash className="w-4 h-4 text-blue-600" />
                        <span className="text-[#86868B] text-xs font-medium">Serie:</span>
                        <span className="text-[#1D1D1F] font-mono font-semibold text-xs">{device.serie}</span>
                    </div>
                )}

                {device.ultimaSincronizacion && (
                    <div className="flex items-center gap-2 text-[#6E6E73] bg-[#F5F5F7] rounded-lg px-3 py-2">
                        <RefreshCw className="w-4 h-4 text-green-600" />
                        <span className="text-[#86868B] text-xs font-medium">Sync:</span>
                        <span className="text-[#1D1D1F] font-semibold text-xs">
                            {new Date(device.ultimaSincronizacion).toLocaleString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E7]">
                <span className={`px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1.5 ${device.estado === 'Activo' || device.estado === 'activo' ? 'bg-green-50 text-green-700 border-2 border-green-200' :
                        device.estado === 'Inactivo' || device.estado === 'inactivo' ? 'bg-gray-50 text-gray-700 border-2 border-gray-200' :
                            device.estado === 'En Mantenimiento' ? 'bg-yellow-50 text-yellow-700 border-2 border-yellow-200' :
                                'bg-red-50 text-red-700 border-2 border-red-200'
                    }`}>
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                    {device.estado ? device.estado.toUpperCase() : 'DESCONOCIDO'}
                </span>

                <div className="flex gap-1">
                    {!isMobile && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(device);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-110"
                            title="Editar"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    )}
                    {!isMobile && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(device.id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110"
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    {isMobile && (
                        <span className="text-xs text-[#86868B] italic px-2 py-1 bg-[#F5F5F7] rounded">
                            Solo lectura
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeviceCard;
