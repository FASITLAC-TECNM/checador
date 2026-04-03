import React from 'react';
import { ArrowLeft, Save, Monitor } from 'lucide-react';

const DeviceForm = ({ formData, editingDevice, onClose, onSave, onChange }) => {
    return (
        <div className="min-h-screen bg-[#FBFBFD]">
            <div className="max-w-4xl mx-auto p-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-[#6E6E73] hover:text-[#1D1D1F] mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Volver</span>
                    </button>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <Monitor className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-[#1D1D1F]">
                                {editingDevice ? 'Editar Dispositivo de Escritorio' : 'Nuevo Dispositivo de Escritorio'}
                            </h1>
                            <p className="text-[#6E6E73] mt-1">
                                Aplicación de escritorio para registro de asistencias
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-6">
                    {/* Información Básica */}
                    <div className="bg-white rounded-xl border border-[#D2D2D7] shadow-sm p-6">
                        <h2 className="text-xl font-semibold text-[#1D1D1F] mb-6 pb-3 border-b border-[#E5E5E7]">
                            Información Básica
                        </h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                    Nombre del Dispositivo *
                                </label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={onChange}
                                    className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Ej: Terminal Principal - Recepción"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Modelo del Dispositivo
                                    </label>
                                    <input
                                        type="text"
                                        name="modelo"
                                        value={formData.modelo}
                                        onChange={onChange}
                                        className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Ej: Dell OptiPlex 7090"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Número de Serie
                                    </label>
                                    <input
                                        type="text"
                                        name="serie"
                                        value={formData.serie}
                                        onChange={onChange}
                                        className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Ej: DL-2024-001"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                    Estado *
                                </label>
                                <select
                                    name="estado"
                                    value={formData.estado}
                                    onChange={onChange}
                                    className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                >
                                    <option value="Activo">Activo</option>
                                    <option value="Inactivo">Inactivo</option>
                                    <option value="En Mantenimiento">En Mantenimiento</option>
                                    <option value="Fuera de Servicio">Fuera de Servicio</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Configuración de Red */}
                    <div className="bg-white rounded-xl border border-[#D2D2D7] shadow-sm p-6">
                        <h2 className="text-xl font-semibold text-[#1D1D1F] mb-6 pb-3 border-b border-[#E5E5E7]">
                            Configuración de Red
                        </h2>
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Dirección IP
                                    </label>
                                    <input
                                        type="text"
                                        name="ipAddress"
                                        value={formData.ipAddress}
                                        onChange={onChange}
                                        className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Ej: 192.168.1.100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Dirección MAC
                                    </label>
                                    <input
                                        type="text"
                                        name="macAddress"
                                        value={formData.macAddress}
                                        onChange={onChange}
                                        className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Ej: 00:1B:63:84:45:E6"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                    Puerto de Comunicación
                                </label>
                                <input
                                    type="text"
                                    name="puerto"
                                    value={formData.puerto}
                                    onChange={onChange}
                                    className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Ej: COM3 o 3000"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Ubicación y Fechas */}
                    <div className="bg-white rounded-xl border border-[#D2D2D7] shadow-sm p-6">
                        <h2 className="text-xl font-semibold text-[#1D1D1F] mb-6 pb-3 border-b border-[#E5E5E7]">
                            Ubicación y Fechas
                        </h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                    Ubicación
                                </label>
                                <input
                                    type="text"
                                    name="ubicacion"
                                    value={formData.ubicacion}
                                    onChange={onChange}
                                    className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Ej: Entrada Principal, Piso 1"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Fecha de Registro
                                    </label>
                                    <input
                                        type="date"
                                        name="fechaAdquisicion"
                                        value={formData.fechaAdquisicion}
                                        onChange={onChange}
                                        className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Última Sincronización
                                    </label>
                                    <input
                                        type="datetime-local"
                                        name="ultimaSincronizacion"
                                        value={formData.ultimaSincronizacion}
                                        onChange={onChange}
                                        className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Observaciones */}
                    <div className="bg-white rounded-xl border border-[#D2D2D7] shadow-sm p-6">
                        <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                            Observaciones
                        </label>
                        <textarea
                            name="observaciones"
                            value={formData.observaciones}
                            onChange={onChange}
                            rows="4"
                            className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="Notas adicionales sobre el dispositivo..."
                        />
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onSave}
                            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                        >
                            <Save className="w-5 h-5" />
                            Guardar Dispositivo
                        </button>
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-[#F5F5F7] text-[#1D1D1F] rounded-lg hover:bg-[#E5E5E7] transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeviceForm;
