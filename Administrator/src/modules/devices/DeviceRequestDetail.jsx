import React from 'react';
import { ArrowLeft, Smartphone, User, Briefcase, Calendar, Hash, Phone, Check, X, AlertCircle } from 'lucide-react';

const DeviceRequestDetail = ({ request, onClose, onApprove, onReject }) => {
    return (
        <div className="min-h-screen bg-white">
            {/* Header fijo */}
            <div className="sticky top-0 z-10 bg-white border-b border-[#E5E5E7] shadow-sm">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-[#6E6E73] hover:text-blue-600 transition-all group mb-3"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Volver a la lista</span>
                    </button>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-[#1D1D1F] mb-1">Solicitud de Dispositivo Móvil</h1>
                            <p className="text-[#6E6E73]">Revise la información y tome una decisión</p>
                        </div>
                        <span className="px-4 py-2 text-sm font-semibold rounded-full bg-yellow-50 text-yellow-700 border-2 border-yellow-200">
                            PENDIENTE
                        </span>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="space-y-6">
                    {/* Fecha de Solicitud */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg">
                                    <Calendar size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#1D1D1F]">Información de la Solicitud</h2>
                                    <p className="text-sm text-[#6E6E73]">Detalles de la petición</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">Fecha de solicitud</p>
                                    <p className="text-[#1D1D1F] text-lg font-semibold">
                                        {new Date(request.fechaSolicitud).toLocaleString('es-MX', {
                                            dateStyle: 'long',
                                            timeStyle: 'short'
                                        })}
                                    </p>
                                </div>
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">ID de solicitud</p>
                                    <p className="text-[#1D1D1F] text-lg font-semibold font-mono">
                                        #{request.id.toString().padStart(6, '0')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Información del Empleado */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-purple-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-600 rounded-lg">
                                    <User size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#1D1D1F]">Información del Empleado</h2>
                                    <p className="text-sm text-[#6E6E73]">Datos del solicitante</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">Nombre completo</p>
                                    <p className="text-[#1D1D1F] text-lg font-semibold">{request.nombreEmpleado}</p>
                                </div>
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">Email</p>
                                    <p className="text-[#1D1D1F] font-medium">{request.emailEmpleado}</p>
                                </div>
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">Rol</p>
                                    <div className="flex items-center gap-2">
                                        <Briefcase size={18} className="text-purple-600" />
                                        <p className="text-[#1D1D1F] font-medium">{request.rolEmpleado}</p>
                                    </div>
                                </div>
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">Teléfono</p>
                                    <div className="flex items-center gap-2">
                                        <Phone size={18} className="text-purple-600" />
                                        <p className="text-[#1D1D1F] font-medium">{request.telefonoEmpleado}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Información del Dispositivo */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                        <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-green-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-600 rounded-lg">
                                    <Smartphone size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#1D1D1F]">Información del Dispositivo</h2>
                                    <p className="text-sm text-[#6E6E73]">Especificaciones técnicas</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">Modelo</p>
                                    <p className="text-[#1D1D1F] text-lg font-semibold">{request.modeloDispositivo}</p>
                                </div>
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">Sistema Operativo</p>
                                    <p className="text-[#1D1D1F] font-medium">{request.sistemaOperativo}</p>
                                </div>
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">IMEI</p>
                                    <div className="flex items-center gap-2">
                                        <Hash size={18} className="text-green-600" />
                                        <p className="text-[#1D1D1F] font-mono font-medium">{request.imei}</p>
                                    </div>
                                </div>
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">Número de teléfono</p>
                                    <p className="text-[#1D1D1F] font-medium">{request.numeroTelefono}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Observaciones */}
                    {request.observaciones && (
                        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-orange-200">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-600 rounded-lg">
                                        <AlertCircle size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-[#1D1D1F]">Observaciones del Empleado</h2>
                                        <p className="text-sm text-[#6E6E73]">Motivo de la solicitud</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#1D1D1F] leading-relaxed">{request.observaciones}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Botones de Acción */}
                    <div className="sticky bottom-0 bg-white border-t border-[#E5E5E7] py-6 -mx-6 px-6 shadow-lg">
                        <div className="flex gap-4">
                            <button
                                onClick={() => onApprove(request)}
                                className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl font-semibold text-lg"
                            >
                                <Check className="w-6 h-6" />
                                Aprobar Solicitud
                            </button>
                            <button
                                onClick={() => onReject(request)}
                                className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl font-semibold text-lg"
                            >
                                <X className="w-6 h-6" />
                                Rechazar Solicitud
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Espaciado inferior */}
            <div className="h-8"></div>
        </div>
    );
};

export default DeviceRequestDetail;
