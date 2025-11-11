import React, { useState } from 'react';
import DeviceList from './DeviceList';
import DeviceForm from './DeviceForm';
import BiometricForm from './BiometricForm';
import DeviceDetail from './DeviceDetail';
import { Plus, Info, Bell, AlertCircle, Smartphone } from 'lucide-react';

const DevicePage = ({ onNavigateToPeticiones, peticionesPendientes = 0 }) => {
    const [devices, setDevices] = useState([
        {
            id: 1,
            tipo: 'Registro Físico',
            nombre: 'Terminal Principal',
            modelo: 'ZKTeco F18',
            serie: 'ZK2023001',
            macAddress: '00:1B:63:84:45:E6',
            ipAddress: '192.168.1.100',
            ubicacion: 'Entrada Principal',
            estado: 'Activo',
            fechaAdquisicion: '2024-01-15',
            ultimaSincronizacion: '2024-11-02T08:30',
            observaciones: 'Funciona correctamente'
        },
        {
            id: 2,
            tipo: 'Móvil',
            nombre: 'App Móvil - Juan Pérez',
            modelo: 'Android 13',
            usuarioAsignado: 'Juan Pérez',
            imei: '356938035643809',
            numeroTelefono: '+52 753 123 4567',
            estado: 'Activo',
            fechaActivacion: '2024-06-20',
            ultimaSincronizacion: '2024-11-02T09:15',
            observaciones: 'Samsung Galaxy S21'
        },
        {
            id: 3,
            tipo: 'Móvil',
            nombre: 'App Móvil - María García',
            modelo: 'iOS 17',
            usuarioAsignado: 'María García',
            imei: '356938035643810',
            numeroTelefono: '+52 753 123 4568',
            estado: 'Activo',
            fechaActivacion: '2024-07-15',
            ultimaSincronizacion: '2024-11-02T09:20',
            observaciones: 'iPhone 14'
        },
        {
            id: 4,
            tipo: 'Biométrico',
            nombre: 'Lector de Huella Digital',
            modelo: 'Suprema BioMini Plus 2',
            serie: 'BMP2-2024-045',
            ipAddress: '192.168.1.105',
            ubicacion: 'Área de Recursos Humanos',
            estado: 'Activo',
            fechaAdquisicion: '2024-03-10',
            capacidadHuellas: '10000',
            tipoSensor: 'Óptico',
            observaciones: 'Alta precisión'
        }
    ]);

    const [showForm, setShowForm] = useState(false);
    const [showBiometricForm, setShowBiometricForm] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [formData, setFormData] = useState({
        tipo: 'Registro Físico',
        nombre: '',
        modelo: '',
        serie: '',
        macAddress: '',
        ipAddress: '',
        puerto: '',
        ubicacion: '',
        estado: 'Activo',
        fechaAdquisicion: '',
        ultimaSincronizacion: '',
        usuarioAsignado: '',
        imei: '',
        numeroTelefono: '',
        fechaActivacion: '',
        capacidadHuellas: '',
        tipoSensor: '',
        observaciones: ''
    });

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
            modelo: '',
            serie: '',
            macAddress: '',
            ipAddress: '',
            puerto: '',
            ubicacion: '',
            estado: 'Activo',
            fechaAdquisicion: '',
            ultimaSincronizacion: '',
            usuarioAsignado: '',
            imei: '',
            numeroTelefono: '',
            fechaActivacion: '',
            capacidadHuellas: '',
            tipoSensor: '',
            observaciones: ''
        });
        setShowForm(true);
        setShowBiometricForm(false);
    };

    const handleEdit = (device) => {
        // No permitir editar móviles
        if (device.tipo === 'Móvil') {
            return;
        }
        setEditingDevice(device);
        setFormData(device);

        // Determinar qué formulario mostrar según el tipo
        if (device.tipo === 'Biométrico') {
            setShowBiometricForm(true);
            setShowForm(false);
        } else {
            setShowForm(true);
            setShowBiometricForm(false);
        }
    };

    const handleSave = () => {
        if (editingDevice) {
            setDevices(devices.map(d => d.id === editingDevice.id ? { ...formData, id: d.id } : d));
        } else {
            setDevices([...devices, { ...formData, id: Date.now() }]);
        }
        setShowForm(false);
        setShowBiometricForm(false);
        // Si se agregó un biométrico desde el detalle, volver al detalle
        // (selectedDevice se mantiene, así que volverá a la vista de detalle)
    };

    const handleDelete = (id) => {
        const device = devices.find(d => d.id === id);
        // No permitir eliminar móviles
        if (device?.tipo === 'Móvil') {
            return;
        }
        if (confirm('¿Está seguro de eliminar este dispositivo?')) {
            setDevices(devices.filter(d => d.id !== id));
        }
    };

    const handleClose = () => {
        setShowForm(false);
        setShowBiometricForm(false);
        setEditingDevice(null);
        // No limpiar selectedDevice para que vuelva a la página de detalle si estaba ahí
    };

    const handleDeviceClick = (device) => {
        // Solo permitir ver detalles de dispositivos de escritorio
        if (device.tipo === 'Registro Físico') {
            setSelectedDevice(device);
        }
    };

    const handleBackFromDetail = () => {
        setSelectedDevice(null);
    };

    const handleAddBiometric = () => {
        // Agregar un dispositivo biométrico asociado al dispositivo de escritorio
        setFormData({
            tipo: 'Biométrico',
            nombre: '',
            modelo: '',
            serie: '',
            macAddress: '',
            ipAddress: '',
            puerto: '',
            ubicacion: selectedDevice?.ubicacion || '',
            estado: 'Activo',
            fechaAdquisicion: '',
            ultimaSincronizacion: '',
            usuarioAsignado: '',
            imei: '',
            numeroTelefono: '',
            fechaActivacion: '',
            capacidadHuellas: '',
            tipoSensor: '',
            observaciones: ''
        });
        setEditingDevice(null);
        setShowForm(false);
        setShowBiometricForm(true);
    };

    // Si está mostrando el formulario de dispositivo de escritorio
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

    // Si está mostrando el formulario de biométrico
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

    // Si hay un dispositivo seleccionado, mostrar el detalle
    if (selectedDevice) {
        // Filtrar los dispositivos biométricos asociados
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

    // Si no, muestra la lista
    const registrosFisicos = devices.filter(d => d.tipo === 'Registro Físico').length;
    const moviles = devices.filter(d => d.tipo === 'Móvil').length;
    const biometricos = devices.filter(d => d.tipo === 'Biométrico').length;
    const activos = devices.filter(d => d.estado === 'Activo').length;
    const suspendidos = devices.filter(d => d.estado === 'Inactivo' || d.estado === 'Fuera de Servicio').length;

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
                {/* Alerta de peticiones pendientes */}
                {peticionesPendientes > 0 && onNavigateToPeticiones && (
                    <div className="mb-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl shadow-sm animate-pulse">
                        <div className="flex items-center justify-between">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-amber-500 rounded-lg">
                                    <AlertCircle className="w-6 h-6 text-white flex-shrink-0" />
                                </div>
                                <div>
                                    <p className="text-amber-800 font-bold text-lg">
                                        {peticionesPendientes} {peticionesPendientes === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
                                    </p>
                                    <p className="text-[#6E6E73] text-sm mt-1">
                                        Hay empleados esperando la aprobación de dispositivos móviles. Revisa las peticiones para aprobar o rechazar.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onNavigateToPeticiones}
                                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl transition-all font-semibold whitespace-nowrap ml-4 shadow-md hover:shadow-lg"
                            >
                                <Bell className="w-5 h-5" />
                                Ver Peticiones
                            </button>
                        </div>
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