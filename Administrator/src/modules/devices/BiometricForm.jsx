import React from 'react';
import { ArrowLeft, Save, Fingerprint } from 'lucide-react';

const BiometricForm = ({ formData, editingDevice, onClose, onSave, onChange, parentDevice }) => {
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
                        <div className="p-3 bg-green-100 rounded-xl">
                            <Fingerprint className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-[#1D1D1F]">
                                {editingDevice ? 'Editar Dispositivo Biométrico' : 'Nuevo Dispositivo Biométrico'}
                            </h1>
                            <p className="text-[#6E6E73] mt-1">
                                Asociado a: <span className="font-semibold text-blue-600">{parentDevice?.nombre}</span>
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
                                    className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Ej: Lector de Huella Digital RH"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Tipo de Sensor *
                                    </label>
                                    <select
                                        name="tipoSensor"
                                        value={formData.tipoSensor}
                                        onChange={onChange}
                                        className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Óptico">Óptico (Huella Digital)</option>
                                        <option value="Cámara Facial">Cámara Facial (Reconocimiento Facial)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Estado *
                                    </label>
                                    <select
                                        name="estado"
                                        value={formData.estado}
                                        onChange={onChange}
                                        className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    </div>

                    {/* Especificaciones Técnicas */}
                    <div className="bg-white rounded-xl border border-[#D2D2D7] shadow-sm p-6">
                        <h2 className="text-xl font-semibold text-[#1D1D1F] mb-6 pb-3 border-b border-[#E5E5E7]">
                            Especificaciones Técnicas
                        </h2>
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Modelo
                                    </label>
                                    <input
                                        type="text"
                                        name="modelo"
                                        value={formData.modelo}
                                        onChange={onChange}
                                        className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="Ej: Suprema BioMini Plus 2"
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
                                        className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="Ej: BMP2-2024-045"
                                    />
                                </div>
                            </div>

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
                                        className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="Ej: 192.168.1.105"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Puerto
                                    </label>
                                    <input
                                        type="text"
                                        name="puerto"
                                        value={formData.puerto}
                                        onChange={onChange}
                                        className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="Ej: 4370"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ubicación y Fechas */}
                    <div className="bg-white rounded-xl border border-[#D2D2D7] shadow-sm p-6">
                        <h2 className="text-xl font-semibold text-[#1D1D1F] mb-6 pb-3 border-b border-[#E5E5E7]">
                            Ubicación y Fechas
                        </h2>
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Ubicación Específica
                                    </label>
                                    <input
                                        type="text"
                                        name="ubicacion"
                                        value={formData.ubicacion}
                                        onChange={onChange}
                                        className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="Ej: Área de Recursos Humanos, Piso 2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Fecha de Adquisición
                                    </label>
                                    <input
                                        type="date"
                                        name="fechaAdquisicion"
                                        value={formData.fechaAdquisicion}
                                        onChange={onChange}
                                        className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                            className="w-full px-4 py-3 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                            placeholder="Notas adicionales sobre el dispositivo biométrico..."
                        />
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onSave}
                            className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
                        >
                            <Save className="w-5 h-5" />
                            Guardar Biométrico
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

export default BiometricForm;
