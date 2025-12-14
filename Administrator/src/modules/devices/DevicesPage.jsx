import React, { useState, useEffect } from 'react';
import DeviceList from './DeviceList';
import DeviceForm from './DeviceForm';
import BiometricForm from './BiometricForm';
import DeviceDetail from './DeviceDetail';
import SolicitudCard from './SolicitudCard';
import { Plus, Clock, Smartphone, ChevronDown, ChevronUp, Bell } from 'lucide-react';
import { getDevices, createDevice, updateDevice, deleteDevice, getDeviceStats } from '../../services/devicesService';
import { getSolicitudesPendientes, aceptarSolicitud, rechazarSolicitud } from '../../services/solicitudesService';

const DevicePage = () => {
    const [devices, setDevices] = useState([]);
    const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        activos: 0,
        inactivos: 0,
        fisicos: 0,
        moviles: 0,
        biometricos: 0
    });

    const [showSolicitudes, setShowSolicitudes] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showBiometricForm, setShowBiometricForm] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [formData, setFormData] = useState({
        tipo: 'Registro Físico',
        nombre: '',
        device_id: '',
        ubicacion: '',
        estado: 'Activo',
        ip_address: '',
        version_firmware: '',
        configuracion: {}
    });

    // Cargar dispositivos y solicitudes al montar
    useEffect(() => {
        cargarDatos();

        // Actualizar solicitudes cada 30 segundos
        const interval = setInterval(cargarSolicitudes, 30000);
        return () => clearInterval(interval);
    }, []);

    const cargarDatos = async () => {
        await Promise.all([cargarDispositivos(), cargarEstadisticas(), cargarSolicitudes()]);
    };

    const cargarDispositivos = async () => {
        try {
            setLoading(true);
            const data = await getDevices();
            setDevices(data);
        } catch (error) {
            console.error('Error cargando dispositivos:', error);
            // No mostrar alert, simplemente continuar con lista vacía
            setDevices([]);
        } finally {
            setLoading(false);
        }
    };

    const cargarEstadisticas = async () => {
        try {
            const data = await getDeviceStats();
            setStats(data);
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    };

    const cargarSolicitudes = async () => {
        try {
            const data = await getSolicitudesPendientes();
            setSolicitudesPendientes(data);
            // Auto-expandir si hay solicitudes
            if (data.length > 0) {
                setShowSolicitudes(true);
            }
        } catch (error) {
            console.error('Error cargando solicitudes:', error);
        }
    };

    const handleAceptarSolicitud = async (solicitud) => {
        if (!confirm(`¿Aceptar la solicitud de "${solicitud.nombre}"?\n\nEsto creará un nuevo dispositivo en el sistema.`)) return;

        try {
            const idUsuarioAprobador = 1; // TODO: Obtener de la sesión
            await aceptarSolicitud(solicitud.id, idUsuarioAprobador);
            await cargarDatos();
        } catch (error) {
            console.error('Error aceptando solicitud:', error);
            alert('Error al aceptar la solicitud. Por favor, intenta de nuevo.');
        }
    };

    const handleRechazarSolicitud = async (solicitud, motivo) => {
        try {
            const idUsuarioAprobador = 1; // TODO: Obtener de la sesión
            await rechazarSolicitud(solicitud.id, idUsuarioAprobador, motivo);
            await cargarSolicitudes();
        } catch (error) {
            console.error('Error rechazando solicitud:', error);
            alert('Error al rechazar la solicitud. Por favor, intenta de nuevo.');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAdd = () => {
        setEditingDevice(null);
        setFormData({
            tipo: 'Registro Físico',
            nombre: '',
            device_id: '',
            ubicacion: '',
            estado: 'Activo',
            ip_address: '',
            version_firmware: '',
            configuracion: {}
        });
        setShowForm(true);
        setShowBiometricForm(false);
    };

    const handleEdit = (device) => {
        if (device.tipo === 'Móvil') return;

        setEditingDevice(device);
        setFormData({
            tipo: device.tipo,
            nombre: device.nombre,
            device_id: device.device_id,
            ubicacion: device.ubicacion,
            estado: device.estado,
            ip_address: device.ip_address || '',
            version_firmware: device.version_firmware || '',
            configuracion: device.configuracion || {}
        });

        if (device.tipo === 'Biométrico') {
            setShowBiometricForm(true);
            setShowForm(false);
        } else {
            setShowForm(true);
            setShowBiometricForm(false);
        }
    };

    const handleSave = async () => {
        try {
            const deviceData = {
                device_id: formData.device_id,
                nombre: formData.nombre,
                ubicacion: formData.ubicacion,
                tipo: formData.tipo,
                estado: formData.estado,
                ip_address: formData.ip_address,
                version_firmware: formData.version_firmware,
                configuracion: formData.configuracion
            };

            if (editingDevice) {
                await updateDevice(editingDevice.id, deviceData);
            } else {
                await createDevice(deviceData);
            }

            setShowForm(false);
            setShowBiometricForm(false);
            await cargarDatos();
        } catch (error) {
            console.error('Error guardando dispositivo:', error);
            alert('Error al guardar dispositivo. Por favor, intenta de nuevo.');
        }
    };

    const handleDelete = async (id) => {
        const device = devices.find(d => d.id === id);
        if (device?.tipo === 'Móvil') return;

        if (confirm('¿Está seguro de eliminar este dispositivo?\n\nEsta acción no se puede deshacer.')) {
            try {
                await deleteDevice(id);
                await cargarDatos();
            } catch (error) {
                console.error('Error eliminando dispositivo:', error);
                alert('Error al eliminar dispositivo. Por favor, intenta de nuevo.');
            }
        }
    };

    const handleClose = () => {
        setShowForm(false);
        setShowBiometricForm(false);
        setEditingDevice(null);
    };

    const handleDeviceClick = (device) => {
        if (device.tipo === 'Registro Físico') {
            setSelectedDevice(device);
        }
    };

    const handleBackFromDetail = () => {
        setSelectedDevice(null);
    };

    const handleAddBiometric = () => {
        setFormData({
            tipo: 'Biométrico',
            nombre: '',
            device_id: '',
            ubicacion: selectedDevice?.ubicacion || '',
            estado: 'Activo',
            ip_address: '',
            version_firmware: '',
            configuracion: {}
        });
        setEditingDevice(null);
        setShowForm(false);
        setShowBiometricForm(true);
    };

    // Si está mostrando el formulario
    if (showForm) {
        return (
            <DeviceForm
                formData={formData}
                editingDevice={editingDevice}
                onClose={handleClose}
                onSave={handleSave}
                onChange={handleInputChange}
            />
        );
    }

    if (showBiometricForm) {
        return (
            <BiometricForm
                formData={formData}
                editingDevice={editingDevice}
                onClose={handleClose}
                onSave={handleSave}
                onChange={handleInputChange}
                parentDevice={selectedDevice}
            />
        );
    }

    // Si hay un dispositivo seleccionado
    if (selectedDevice) {
        const biometricDevices = devices.filter(d =>
            d.tipo === 'Biométrico' &&
            d.ubicacion &&
            selectedDevice.ubicacion &&
            d.ubicacion.toLowerCase().includes(selectedDevice.ubicacion.toLowerCase().split(' ')[0])
        );

        return (
            <DeviceDetail
                device={selectedDevice}
                biometricDevices={biometricDevices}
                onBack={handleBackFromDetail}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddBiometric={handleAddBiometric}
            />
        );
    }

    // Vista principal
    const activos = parseInt(stats.activos) || 0;
    const suspendidos = parseInt(stats.inactivos) || 0;
    const moviles = parseInt(stats.moviles) || 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <Clock className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
                    <p className="text-[#6E6E73] text-lg">Cargando dispositivos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header fijo */}
            <div className="sticky top-0 z-10 bg-white border-b border-[#E5E5E7] shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-[#1D1D1F] mb-3">Dispositivos</h1>
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                                    <span className="font-semibold">{devices.length}</span>
                                    <span className="text-sm">total</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    <span className="font-semibold">{activos}</span>
                                    <span className="text-sm">activos</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200">
                                    <span className="font-semibold">{suspendidos}</span>
                                    <span className="text-sm">suspendidos</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                                    <Smartphone className="w-4 h-4" />
                                    <span className="font-semibold">{moviles}</span>
                                    <span className="text-sm">móviles</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all duration-300 shadow-md hover:shadow-lg font-semibold"
                        >
                            <Plus className="w-5 h-5" />
                            Nuevo Dispositivo
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Sección de Solicitudes Pendientes - Colapsable */}
                {solicitudesPendientes.length > 0 && (
                    <div className="mb-8">
                        <button
                            onClick={() => setShowSolicitudes(!showSolicitudes)}
                            className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl shadow-sm hover:shadow-md transition-all mb-4"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-amber-500 rounded-lg">
                                    <Bell className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-amber-800 font-bold text-lg">
                                        {solicitudesPendientes.length} {solicitudesPendientes.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
                                    </p>
                                    <p className="text-[#6E6E73] text-sm">
                                        Dispositivos esperando aprobación
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-amber-700 font-medium">
                                    {showSolicitudes ? 'Ocultar' : 'Mostrar'}
                                </span>
                                {showSolicitudes ? (
                                    <ChevronUp className="w-5 h-5 text-amber-700" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-amber-700" />
                                )}
                            </div>
                        </button>

                        {showSolicitudes && (
                            <div className="space-y-3 animate-fadeIn">
                                {solicitudesPendientes.map((solicitud) => (
                                    <SolicitudCard
                                        key={solicitud.id}
                                        solicitud={solicitud}
                                        onAceptar={handleAceptarSolicitud}
                                        onRechazar={handleRechazarSolicitud}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <DeviceList
                    devices={devices}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDeviceClick={handleDeviceClick}
                />
            </div>
        </div>
    );
};

export default DevicePage;
