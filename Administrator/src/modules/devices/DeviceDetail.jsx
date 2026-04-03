import React from 'react';
import { ArrowLeft, Monitor, MapPin, Globe, Hash, Calendar, RefreshCw, Fingerprint, Plus, Edit2 } from 'lucide-react';
import DeviceCard from './DeviceCard';

const DeviceDetail = ({ device, biometricDevices, onBack, onEdit, onDelete, onAddBiometric }) => {
    return (
        <div className="min-h-screen bg-white">
            {/* Header fijo */}
            <div className="sticky top-0 z-10 bg-white border-b border-[#E5E5E7] shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-[#6E6E73] hover:text-blue-600 transition-all group mb-3"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Volver a dispositivos</span>
                    </button>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                                    <Monitor size={32} />
                                </div>
                                {device.estado === 'Activo' && (
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-md animate-pulse"></div>
                                )}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-[#1D1D1F] mb-1">{device.nombre}</h1>
                                <p className="text-[#6E6E73]">🖥️ Dispositivo de Escritorio</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-4 py-2 text-sm font-bold rounded-full flex items-center gap-2 ${
                                device.estado === 'Activo' ? 'bg-green-50 text-green-700 border-2 border-green-200' :
                                device.estado === 'Inactivo' ? 'bg-gray-50 text-gray-700 border-2 border-gray-200' :
                                device.estado === 'En Mantenimiento' ? 'bg-yellow-50 text-yellow-700 border-2 border-yellow-200' :
                                'bg-red-50 text-red-700 border-2 border-red-200'
                            }`}>
                                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                                {device.estado.toUpperCase()}
                            </span>
                            <button
                                onClick={() => onEdit(device)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-110"
                                title="Editar dispositivo"
                            >
                                <Edit2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="space-y-6">
                    {/* Información del Dispositivo */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg">
                                    <Monitor size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#1D1D1F]">Información del Dispositivo</h2>
                                    <p className="text-sm text-[#6E6E73]">Detalles técnicos y de ubicación</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">Modelo</p>
                                    <p className="text-[#1D1D1F] text-lg font-semibold">{device.modelo || 'N/A'}</p>
                                </div>
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">Número de Serie</p>
                                    <div className="flex items-center gap-2">
                                        <Hash size={18} className="text-blue-600" />
                                        <p className="text-[#1D1D1F] font-mono font-semibold">{device.serie || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">Ubicación</p>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={18} className="text-blue-600" />
                                        <p className="text-[#1D1D1F] font-semibold">{device.ubicacion || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">Dirección IP</p>
                                    <div className="flex items-center gap-2">
                                        <Globe size={18} className="text-blue-600" />
                                        <p className="text-[#1D1D1F] font-mono font-semibold">{device.ipAddress || 'N/A'}</p>
                                    </div>
                                </div>
                                {device.macAddress && (
                                    <div className="bg-[#F5F5F7] rounded-xl p-4">
                                        <p className="text-[#6E6E73] text-sm mb-2 font-medium">Dirección MAC</p>
                                        <p className="text-[#1D1D1F] font-mono font-semibold">{device.macAddress}</p>
                                    </div>
                                )}
                                {device.fechaAdquisicion && (
                                    <div className="bg-[#F5F5F7] rounded-xl p-4">
                                        <p className="text-[#6E6E73] text-sm mb-2 font-medium">Fecha de Adquisición</p>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={18} className="text-blue-600" />
                                            <p className="text-[#1D1D1F] font-semibold">
                                                {new Date(device.fechaAdquisicion).toLocaleDateString('es-MX', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {device.ultimaSincronizacion && (
                                <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-xl p-4">
                                    <div className="flex items-center gap-3">
                                        <RefreshCw size={20} className="text-green-600" />
                                        <div>
                                            <p className="text-[#6E6E73] text-sm font-medium">Última Sincronización</p>
                                            <p className="text-[#1D1D1F] font-semibold">
                                                {new Date(device.ultimaSincronizacion).toLocaleString('es-MX', {
                                                    dateStyle: 'long',
                                                    timeStyle: 'short'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {device.observaciones && (
                                <div className="mt-6 bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm font-medium mb-2">Observaciones</p>
                                    <p className="text-[#1D1D1F]">{device.observaciones}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dispositivos Biométricos Asociados */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                        <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-green-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-600 rounded-lg">
                                        <Fingerprint size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-[#1D1D1F]">Dispositivos Biométricos</h2>
                                        <p className="text-sm text-[#6E6E73]">
                                            {biometricDevices.length} dispositivo{biometricDevices.length !== 1 ? 's' : ''} asociado{biometricDevices.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                {onAddBiometric && (
                                    <button
                                        onClick={onAddBiometric}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm hover:shadow-md font-medium"
                                    >
                                        <Plus size={18} />
                                        Agregar Biométrico
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="p-6">
                            {biometricDevices.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {biometricDevices.map((bioDevice) => (
                                        <DeviceCard
                                            key={bioDevice.id}
                                            device={bioDevice}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                            onClick={null}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F5F5F7] rounded-full mb-4">
                                        <Fingerprint size={32} className="text-[#86868B]" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">
                                        No hay dispositivos biométricos asociados
                                    </h3>
                                    <p className="text-[#6E6E73] mb-4">
                                        Este nodo de escritorio no tiene dispositivos biométricos registrados
                                    </p>
                                    {onAddBiometric && (
                                        <button
                                            onClick={onAddBiometric}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm font-medium"
                                        >
                                            <Plus size={18} />
                                            Agregar Primer Biométrico
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Espaciado inferior */}
            <div className="h-8"></div>
        </div>
    );
};

export default DeviceDetail;
