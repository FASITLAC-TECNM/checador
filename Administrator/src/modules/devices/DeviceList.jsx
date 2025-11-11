import React, { useState } from 'react';
import DeviceCard from './DeviceCard';
import { Search, Monitor, Smartphone, ChevronDown, ChevronUp } from 'lucide-react';

const DeviceList = ({ devices, onEdit, onDelete, onDeviceClick }) => {
    const [expandedDesktops, setExpandedDesktops] = useState(new Set());

    // Separar dispositivos por tipo
    const desktopDevices = devices.filter(d => d.tipo === 'Registro Físico');
    const mobileDevices = devices.filter(d => d.tipo === 'Móvil');
    const biometricDevices = devices.filter(d => d.tipo === 'Biométrico');

    // Agrupar biométricos con sus dispositivos de escritorio (por ahora, por ubicación)
    const getRelatedBiometrics = (desktop) => {
        return biometricDevices.filter(bio =>
            bio.ubicacion && desktop.ubicacion &&
            bio.ubicacion.toLowerCase().includes(desktop.ubicacion.toLowerCase().split(' ')[0])
        );
    };

    const toggleDesktop = (deviceId) => {
        setExpandedDesktops(prev => {
            const newSet = new Set(prev);
            if (newSet.has(deviceId)) {
                newSet.delete(deviceId);
            } else {
                newSet.add(deviceId);
            }
            return newSet;
        });
    };

    return (
        <>
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#86868B] w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, modelo o ubicación..."
                        className="w-full pl-12 pr-4 py-3 bg-white border-2 border-[#D2D2D7] rounded-xl text-[#1D1D1F] placeholder-[#86868B] focus:ring-2 focus:ring-blue-500 focus:border-blue-400 shadow-sm transition-all"
                    />
                </div>
                <select className="px-4 py-3 bg-white border-2 border-[#D2D2D7] rounded-xl text-[#1D1D1F] focus:ring-2 focus:ring-blue-500 shadow-sm font-medium transition-all">
                    <option>Todos los estados</option>
                    <option>Activo</option>
                    <option>Inactivo</option>
                    <option>En Mantenimiento</option>
                </select>
                <select className="px-4 py-3 bg-white border-2 border-[#D2D2D7] rounded-xl text-[#1D1D1F] focus:ring-2 focus:ring-blue-500 shadow-sm font-medium transition-all">
                    <option>Todos los tipos</option>
                    <option>Registro Físico</option>
                    <option>Móvil</option>
                    <option>Biométrico</option>
                </select>
            </div>

            {/* Sección: Dispositivos de Escritorio */}
            {desktopDevices.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Monitor className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#1D1D1F]">Dispositivos de Escritorio</h2>
                            <p className="text-[#6E6E73] text-sm">
                                {desktopDevices.length} dispositivo{desktopDevices.length !== 1 ? 's' : ''} registrado{desktopDevices.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {desktopDevices.map((device) => {
                            const relatedBiometrics = getRelatedBiometrics(device);
                            const isExpanded = expandedDesktops.has(device.id);

                            return (
                                <div key={device.id} className="space-y-3">
                                    <div className="relative">
                                        <DeviceCard
                                            device={device}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                            onClick={onDeviceClick}
                                        />
                                        {relatedBiometrics.length > 0 && (
                                            <button
                                                onClick={() => toggleDesktop(device.id)}
                                                className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg border-2 border-green-200 transition-all font-medium text-sm shadow-sm"
                                            >
                                                <span>{relatedBiometrics.length} biométrico{relatedBiometrics.length !== 1 ? 's' : ''}</span>
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4" />
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {/* Dispositivos biométricos anidados */}
                                    {isExpanded && relatedBiometrics.length > 0 && (
                                        <div className="ml-8 space-y-3 animate-fadeIn">
                                            <div className="flex items-center gap-2 text-sm text-[#6E6E73] mb-2">
                                                <div className="h-px bg-green-300 w-6"></div>
                                                <span className="font-medium">Dispositivos biométricos asociados:</span>
                                            </div>
                                            {relatedBiometrics.map((bio) => (
                                                <DeviceCard
                                                    key={bio.id}
                                                    device={bio}
                                                    onEdit={onEdit}
                                                    onDelete={onDelete}
                                                    onClick={onDeviceClick}
                                                    isNested={true}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Sección: Dispositivos Móviles */}
            {mobileDevices.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Smartphone className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#1D1D1F]">Dispositivos Móviles</h2>
                            <p className="text-[#6E6E73] text-sm">
                                {mobileDevices.length} dispositivo{mobileDevices.length !== 1 ? 's' : ''} móvil{mobileDevices.length !== 1 ? 'es' : ''}
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {mobileDevices.map((device) => (
                            <DeviceCard
                                key={device.id}
                                device={device}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onClick={onDeviceClick}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Mensaje cuando no hay dispositivos */}
            {devices.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-[#E5E5E7]">
                    <Monitor className="w-16 h-16 text-[#86868B] mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">No hay dispositivos registrados</h3>
                    <p className="text-[#6E6E73]">Comienza agregando tu primer dispositivo</p>
                </div>
            )}
        </>
    );
};

export default DeviceList;
