import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Palette, Clock, Globe, Shield, Key, Save, AlertTriangle, CheckCircle, Building2, Image } from 'lucide-react';
import { getConfiguracion, updateConfiguracion, toggleMantenimiento } from '../../services/settingsService';
import { useNotification } from '../../contexts/NotificationContext';

const SettingsPage = () => {
    const notification = useNotification();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        nombre_empresa: 'FASITLAC',
        logo_empresa: null,
        paleta_colores: {
            primary: '#4F46E5',
            secondary: '#10B981',
            accent: '#F59E0B'
        },
        mantenimiento: false,
        formato_fecha: 'DD/MM/YYYY',
        formato_hora: '24',
        zona_horaria: 'America/Mexico_City',
        idioma: 'es',
        max_intentos: 3,
        credenciales_orden: ['facial', 'huella', 'pin']
    });

    useEffect(() => {
        cargarConfiguracion();
    }, []);

    const cargarConfiguracion = async () => {
        try {
            setLoading(true);
            const data = await getConfiguracion();
            setConfig(data);
        } catch (error) {
            console.error('Error cargando configuración:', error);
            notification.error('Error al cargar configuración', 'No se pudo cargar la configuración del sistema');
        } finally {
            setLoading(false);
        }
    };

    const handleColorChange = (colorType, value) => {
        setConfig(prev => ({
            ...prev,
            paleta_colores: {
                ...prev.paleta_colores,
                [colorType]: value
            }
        }));
    };

    const handleInputChange = (field, value) => {
        setConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleCredencialesOrdenChange = (index, newValue) => {
        const newOrden = [...config.credenciales_orden];
        newOrden[index] = newValue;
        setConfig(prev => ({
            ...prev,
            credenciales_orden: newOrden
        }));
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            notification.error('Archivo inválido', 'Por favor selecciona una imagen válida');
            return;
        }

        // Validar tamaño (máximo 2MB)
        if (file.size > 2 * 1024 * 1024) {
            notification.error('Archivo muy grande', 'El logo debe ser menor a 2MB');
            return;
        }

        // Convertir a base64
        const reader = new FileReader();
        reader.onload = (event) => {
            setConfig(prev => ({
                ...prev,
                logo_empresa: event.target.result
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        setConfig(prev => ({
            ...prev,
            logo_empresa: null
        }));
    };

    const handleToggleMantenimiento = async () => {
        const confirmed = await notification.confirm(
            `¿${config.mantenimiento ? 'Desactivar' : 'Activar'} modo mantenimiento?`,
            config.mantenimiento
                ? 'Los usuarios podrán acceder al sistema normalmente'
                : 'Los usuarios no podrán acceder al sistema temporalmente'
        );

        if (!confirmed) return;

        try {
            const result = await toggleMantenimiento();
            setConfig(prev => ({
                ...prev,
                mantenimiento: result.mantenimiento
            }));
            notification.success(
                'Modo mantenimiento actualizado',
                result.message
            );
        } catch (error) {
            console.error('Error al cambiar modo mantenimiento:', error);
            notification.error('Error', 'No se pudo cambiar el modo mantenimiento');
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await updateConfiguracion(config);
            notification.success(
                'Configuración guardada',
                'Los cambios se han aplicado correctamente'
            );
        } catch (error) {
            console.error('Error guardando configuración:', error);
            notification.error('Error al guardar', 'No se pudo guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <SettingsIcon className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
                    <p className="text-[#6E6E73] text-lg">Cargando configuración...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header fijo */}
            <div className="sticky top-0 z-10 bg-white border-b border-[#E5E5E7] shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-[#1D1D1F] mb-2">Configuración del Sistema</h1>
                            <p className="text-[#6E6E73]">Personaliza y administra la configuración global de FASITLAC</p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all duration-300 shadow-md hover:shadow-lg font-semibold disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Información de la Empresa */}
                <div className="mb-8 bg-white rounded-2xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-[#E5E5E7]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-lg">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-[#1D1D1F]">Información de la Empresa</h2>
                                <p className="text-sm text-[#6E6E73]">Configura el nombre y logo de la organización</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-[#6E6E73] mb-2">Nombre de la Empresa</label>
                                <input
                                    type="text"
                                    value={config.nombre_empresa || ''}
                                    onChange={(e) => handleInputChange('nombre_empresa', e.target.value)}
                                    placeholder="Ej: FASITLAC - TECNM"
                                    className="w-full px-4 py-3 border-2 border-[#D2D2D7] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                                />
                                <p className="text-xs text-[#6E6E73] mt-2">
                                    Este nombre se mostrará en el panel de administración
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#6E6E73] mb-2">Logo de la Empresa</label>
                                <div className="space-y-3">
                                    {config.logo_empresa ? (
                                        <div className="relative w-32 h-32 border-2 border-[#D2D2D7] rounded-lg overflow-hidden">
                                            <img
                                                src={config.logo_empresa}
                                                alt="Logo empresa"
                                                className="w-full h-full object-contain"
                                            />
                                            <button
                                                onClick={handleRemoveLogo}
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-32 h-32 border-2 border-dashed border-[#D2D2D7] rounded-lg flex items-center justify-center">
                                            <Image className="w-12 h-12 text-[#86868B]" />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        id="logo-upload"
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor="logo-upload"
                                        className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors text-sm font-medium"
                                    >
                                        {config.logo_empresa ? 'Cambiar Logo' : 'Subir Logo'}
                                    </label>
                                    <p className="text-xs text-[#6E6E73]">
                                        PNG, JPG o GIF (máximo 2MB)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modo Mantenimiento */}
                <div className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${config.mantenimiento ? 'bg-red-500' : 'bg-green-500'}`}>
                                {config.mantenimiento ? (
                                    <AlertTriangle className="w-6 h-6 text-white" />
                                ) : (
                                    <CheckCircle className="w-6 h-6 text-white" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[#1D1D1F]">Modo Mantenimiento</h3>
                                <p className="text-[#6E6E73] text-sm">
                                    {config.mantenimiento
                                        ? 'El sistema está en modo mantenimiento. Los usuarios no pueden acceder.'
                                        : 'El sistema está funcionando normalmente.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleMantenimiento}
                            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                                config.mantenimiento ? 'bg-red-500' : 'bg-green-500'
                            }`}
                        >
                            <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                    config.mantenimiento ? 'translate-x-9' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Paleta de Colores */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-[#E5E5E7]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-600 rounded-lg">
                                    <Palette className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#1D1D1F]">Paleta de Colores</h2>
                                    <p className="text-sm text-[#6E6E73]">Personaliza los colores del sistema</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-[#6E6E73] mb-2">Color Primario</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={config.paleta_colores.primary}
                                            onChange={(e) => handleColorChange('primary', e.target.value)}
                                            className="w-16 h-16 rounded-lg cursor-pointer border-2 border-[#E5E5E7]"
                                        />
                                        <input
                                            type="text"
                                            value={config.paleta_colores.primary}
                                            onChange={(e) => handleColorChange('primary', e.target.value)}
                                            className="flex-1 px-4 py-2 border-2 border-[#D2D2D7] rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#6E6E73] mb-2">Color Secundario</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={config.paleta_colores.secondary}
                                            onChange={(e) => handleColorChange('secondary', e.target.value)}
                                            className="w-16 h-16 rounded-lg cursor-pointer border-2 border-[#E5E5E7]"
                                        />
                                        <input
                                            type="text"
                                            value={config.paleta_colores.secondary}
                                            onChange={(e) => handleColorChange('secondary', e.target.value)}
                                            className="flex-1 px-4 py-2 border-2 border-[#D2D2D7] rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#6E6E73] mb-2">Color de Acento</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={config.paleta_colores.accent}
                                            onChange={(e) => handleColorChange('accent', e.target.value)}
                                            className="w-16 h-16 rounded-lg cursor-pointer border-2 border-[#E5E5E7]"
                                        />
                                        <input
                                            type="text"
                                            value={config.paleta_colores.accent}
                                            onChange={(e) => handleColorChange('accent', e.target.value)}
                                            className="flex-1 px-4 py-2 border-2 border-[#D2D2D7] rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Formato de Fecha y Hora */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 border-b border-[#E5E5E7]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg">
                                    <Clock className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#1D1D1F]">Fecha y Hora</h2>
                                    <p className="text-sm text-[#6E6E73]">Configura el formato de fecha y hora</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-[#6E6E73] mb-2">Formato de Fecha</label>
                                    <select
                                        value={config.formato_fecha}
                                        onChange={(e) => handleInputChange('formato_fecha', e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-[#D2D2D7] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white"
                                    >
                                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#6E6E73] mb-2">Formato de Hora</label>
                                    <select
                                        value={config.formato_hora}
                                        onChange={(e) => handleInputChange('formato_hora', e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-[#D2D2D7] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white"
                                    >
                                        <option value="12">12 horas (AM/PM)</option>
                                        <option value="24">24 horas</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Región e Idioma */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-[#E5E5E7]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-600 rounded-lg">
                                    <Globe className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#1D1D1F]">Región e Idioma</h2>
                                    <p className="text-sm text-[#6E6E73]">Configura la zona horaria y el idioma</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-[#6E6E73] mb-2">Zona Horaria</label>
                                    <select
                                        value={config.zona_horaria}
                                        onChange={(e) => handleInputChange('zona_horaria', e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-[#D2D2D7] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white"
                                    >
                                        <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                                        <option value="America/Tijuana">Tijuana (GMT-8)</option>
                                        <option value="America/Cancun">Cancún (GMT-5)</option>
                                        <option value="America/Monterrey">Monterrey (GMT-6)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#6E6E73] mb-2">Idioma</label>
                                    <select
                                        value={config.idioma}
                                        onChange={(e) => handleInputChange('idioma', e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-[#D2D2D7] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white"
                                    >
                                        <option value="es">Español</option>
                                        <option value="en">English</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seguridad */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                        <div className="bg-gradient-to-r from-red-50 to-pink-50 px-6 py-4 border-b border-[#E5E5E7]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-600 rounded-lg">
                                    <Shield className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#1D1D1F]">Seguridad</h2>
                                    <p className="text-sm text-[#6E6E73]">Configura las opciones de seguridad</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div>
                                <label className="block text-sm font-medium text-[#6E6E73] mb-2">
                                    Máximo de Intentos de Inicio de Sesión
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={config.max_intentos}
                                    onChange={(e) => handleInputChange('max_intentos', parseInt(e.target.value))}
                                    className="w-full md:w-1/3 px-4 py-3 border-2 border-[#D2D2D7] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                                />
                                <p className="text-xs text-[#6E6E73] mt-2">
                                    Número de intentos fallidos antes de bloquear la cuenta
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Orden de Credenciales */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 px-6 py-4 border-b border-[#E5E5E7]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-600 rounded-lg">
                                    <Key className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#1D1D1F]">Orden de Credenciales</h2>
                                    <p className="text-sm text-[#6E6E73]">Define el orden de autenticación</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {config.credenciales_orden.map((credencial, index) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <span className="text-lg font-bold text-[#6E6E73] w-8">{index + 1}.</span>
                                        <select
                                            value={credencial}
                                            onChange={(e) => handleCredencialesOrdenChange(index, e.target.value)}
                                            className="flex-1 px-4 py-3 border-2 border-[#D2D2D7] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white"
                                        >
                                            <option value="facial">Reconocimiento Facial</option>
                                            <option value="huella">Huella Digital</option>
                                            <option value="pin">PIN</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
