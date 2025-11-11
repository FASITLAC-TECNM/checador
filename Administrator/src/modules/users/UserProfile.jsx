import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Mail, Phone, User, Shield, Edit, IdCard, Key, Briefcase, Calendar, Info, Save, X, Upload, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import { getEmpleadoPorUsuario, cambiarEstadoEmpleado, actualizarEmpleado } from '../../services/empleadoService';
import { actualizarUsuario } from '../../services/api';

const ESTADOS_EMPLEADO = {
    ACTIVO: {
        label: 'Activo',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        icon: '✓',
        description: 'Trabajando normalmente'
    },
    LICENCIA: {
        label: 'Licencia',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        icon: '🏥',
        description: 'Licencia médica o personal'
    },
    VACACIONES: {
        label: 'Vacaciones',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-200',
        icon: '🏖️',
        description: 'Periodo vacacional'
    },
    BAJA_TEMPORAL: {
        label: 'Baja Temporal',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200',
        icon: '⏸️',
        description: 'Suspensión temporal'
    },
    BAJA_DEFINITIVA: {
        label: 'Baja Definitiva',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        icon: '✕',
        description: 'Ya no trabaja en la empresa'
    }
};

const UserProfileEnhanced2 = ({ user, onEdit, onBack, onUpdate }) => {
    const [empleadoData, setEmpleadoData] = useState(null);
    const [loadingEmpleado, setLoadingEmpleado] = useState(true);
    const [editingUser, setEditingUser] = useState(false);
    const [editingEmpleado, setEditingEmpleado] = useState(false);
    const [showEstadoSelector, setShowEstadoSelector] = useState(false);
    const [motivo, setMotivo] = useState('');
    const [changingEstado, setChangingEstado] = useState(false);
    const [previewImage, setPreviewImage] = useState(user?.foto || '');
    const fileInputRef = useRef(null);

    // Estados de edición
    const [userForm, setUserForm] = useState({
        nombre: user?.nombre || '',
        email: user?.email || '',
        telefono: user?.telefono || '',
        foto: user?.foto || '',
        activo: user?.activo || 'ACTIVO',
        estado: user?.estado || 'DESCONECTADO',
        username: user?.username || ''
    });

    const [empleadoForm, setEmpleadoForm] = useState({
        nss: '',
        rfc: '',
        pin: ''
    });

    const [validation, setValidation] = useState({
        nss: { valid: true, message: '' },
        rfc: { valid: true, message: '' },
        pin: { valid: true, message: '' }
    });

    useEffect(() => {
        cargarDatosEmpleado();
        setPreviewImage(user?.foto || '');
    }, [user]);

    const cargarDatosEmpleado = async () => {
        if (!user?.id) return;

        try {
            setLoadingEmpleado(true);
            const data = await getEmpleadoPorUsuario(user.id);
            setEmpleadoData(data);
            setEmpleadoForm({
                nss: data.nss || '',
                rfc: data.rfc || '',
                pin: data.pin || ''
            });
        } catch (error) {
            setEmpleadoData(null);
        } finally {
            setLoadingEmpleado(false);
        }
    };

    // Validaciones
    const validateNSS = (nss) => {
        const clean = nss.replace(/\D/g, '');
        if (!clean) return { valid: true, message: '' };
        if (clean.length !== 11) return { valid: false, message: 'El NSS debe tener 11 dígitos' };
        return { valid: true, message: '✓ NSS válido' };
    };

    const validateRFC = (rfc) => {
        const clean = rfc.toUpperCase().trim();
        if (!clean) return { valid: true, message: '' };
        const rfcPattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
        if (clean.length !== 13) return { valid: false, message: 'El RFC debe tener 13 caracteres' };
        if (!rfcPattern.test(clean)) return { valid: false, message: 'Formato de RFC inválido' };
        return { valid: true, message: '✓ RFC válido' };
    };

    const validatePIN = (pin) => {
        const clean = pin.replace(/\D/g, '');
        if (!clean) return { valid: true, message: '' };
        if (clean.length !== 4) return { valid: false, message: 'El PIN debe tener 4 dígitos' };
        return { valid: true, message: '✓ PIN válido' };
    };

    // Formateo
    const formatNSS = (value) => {
        const numbers = value.replace(/\D/g, '').slice(0, 11);
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 4) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
        if (numbers.length <= 6) return `${numbers.slice(0, 2)}-${numbers.slice(2, 4)}-${numbers.slice(4)}`;
        if (numbers.length <= 10) return `${numbers.slice(0, 2)}-${numbers.slice(2, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6)}`;
        return `${numbers.slice(0, 2)}-${numbers.slice(2, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 10)}-${numbers.slice(10)}`;
    };

    const formatPhoneNumber = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 10) {
            return numbers.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        }
        return numbers.slice(0, 10).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    };

    const formatFecha = (fecha) => {
        if (!fecha) return 'N/A';
        return new Date(fecha).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Handlers
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('La imagen no debe superar 5MB');
                return;
            }
            if (!file.type.startsWith('image/')) {
                alert('Solo se permiten imágenes');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
                setUserForm(prev => ({ ...prev, foto: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setPreviewImage('');
        setUserForm(prev => ({ ...prev, foto: '' }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleCambiarEstado = async (nuevoEstado) => {
        if (!empleadoData) return;

        setChangingEstado(true);
        try {
            await cambiarEstadoEmpleado(empleadoData.id, nuevoEstado, motivo);
            await cargarDatosEmpleado();
            setShowEstadoSelector(false);
            setMotivo('');
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error cambiando estado:', error);
            alert('Error al cambiar el estado del empleado');
        } finally {
            setChangingEstado(false);
        }
    };

    const handleSaveUser = async () => {
        try {
            await actualizarUsuario(user.id, userForm);
            setEditingUser(false);
            if (onUpdate) onUpdate();
            alert('Usuario actualizado correctamente');
        } catch (error) {
            console.error('Error:', error);
            alert('Error al actualizar usuario');
        }
    };

    const handleSaveEmpleado = async () => {
        if (!empleadoData) return;

        // Validar antes de guardar
        const nssValid = validateNSS(empleadoForm.nss);
        const rfcValid = validateRFC(empleadoForm.rfc);
        const pinValid = validatePIN(empleadoForm.pin);

        if (!nssValid.valid || !rfcValid.valid || !pinValid.valid) {
            alert('Por favor corrige los errores antes de guardar');
            return;
        }

        try {
            await actualizarEmpleado(empleadoData.id, empleadoForm);
            await cargarDatosEmpleado();
            setEditingEmpleado(false);
            if (onUpdate) onUpdate();
            alert('Datos de empleado actualizados correctamente');
        } catch (error) {
            console.error('Error:', error);
            alert('Error al actualizar empleado');
        }
    };

    const getActivoBadgeColor = (activo) => {
        switch (activo) {
            case 'ACTIVO':
                return 'bg-green-100 text-green-700 border border-green-200';
            case 'SUSPENDIDO':
                return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
            case 'BAJA':
                return 'bg-red-100 text-red-700 border border-red-200';
            default:
                return 'bg-gray-100 text-gray-700 border border-gray-200';
        }
    };

    const getEstadoColor = (estado) => {
        return estado === 'CONECTADO' ? 'bg-green-500' : 'bg-gray-400';
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-[#FBFBFD] p-6 flex items-center justify-center">
                <div className="text-[#6E6E73]">No se encontró el usuario</div>
            </div>
        );
    }

    const estadoActual = empleadoData ? ESTADOS_EMPLEADO[empleadoData.estado_empleado] || ESTADOS_EMPLEADO.ACTIVO : null;

    return (
        <div className="max-h-screen bg-[#FBFBFD]">
            <div className="mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors text-[#6E6E73]"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-[#1D1D1F]">Perfil de Usuario</h2>
                        <p className="text-[#6E6E73] mt-1">
                            {empleadoData ? 'Usuario con datos de empleado' : 'Usuario del sistema'}
                        </p>
                    </div>
                </div>

                {/* Tarjeta principal */}
                <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E7] overflow-hidden mb-6">
                    {/* Banner */}
                    <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>

                    <div className="px-8 pb-8">
                        {/* Avatar y nombre */}
                        <div className="flex items-start gap-6 -mt-16 mb-6 pt-5">
                            <div className="relative">
                                {editingUser ? (
                                    <>
                                        {previewImage ? (
                                            <div className="relative">
                                                <img
                                                    src={previewImage}
                                                    alt="Preview"
                                                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveImage}
                                                    className="absolute top-0 right-0 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-indigo-900 rounded-full flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg">
                                                {userForm.nombre?.charAt(0).toUpperCase() || <Camera size={40} />}
                                            </div>
                                        )}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md"
                                        >
                                            <Upload size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {user.foto ? (
                                            <img
                                                src={user.foto}
                                                alt={user.nombre}
                                                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                                            />
                                        ) : (
                                            <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-indigo-900 rounded-2xl flex items-center justify-center text-white text-5xl font-bold border-4 border-white shadow-lg">
                                                {user.nombre?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                        )}
                                        <div
                                            className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white ${getEstadoColor(user.estado)}`}
                                            title={user.estado}
                                        ></div>
                                    </>
                                )}
                            </div>

                            <div className="flex-1 pt-16">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h1 className="text-3xl font-bold text-[#1D1D1F] mb-1">{user.nombre}</h1>
                                        <p className="text-lg text-[#6E6E73]">@{user.username}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${getActivoBadgeColor(user.activo)}`}>
                                            <Shield size={16} />
                                            {user.activo}
                                        </span>
                                        {empleadoData && (
                                            <span className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${estadoActual.bgColor} ${estadoActual.borderColor} border-2`}>
                                                {estadoActual.icon} {estadoActual.label}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Información de Usuario */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-[#1D1D1F] pb-2 border-b border-[#E5E5E7]">
                                    Información de Usuario
                                </h3>
                                {!editingUser ? (
                                    <button
                                        onClick={() => setEditingUser(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                                    >
                                        <Edit size={16} />
                                        Editar
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveUser}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                                        >
                                            <Save size={16} />
                                            Guardar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingUser(false);
                                                setUserForm({
                                                    nombre: user.nombre,
                                                    email: user.email,
                                                    telefono: user.telefono,
                                                    foto: user.foto,
                                                    activo: user.activo,
                                                    estado: user.estado,
                                                    username: user.username
                                                });
                                                setPreviewImage(user.foto);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                                        >
                                            <X size={16} />
                                            Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>

                            {editingUser ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                            Nombre Completo
                                        </label>
                                        <input
                                            type="text"
                                            value={userForm.nombre}
                                            onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                                            placeholder="Ej: Juan Pérez García"
                                            className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                            <Mail size={16} className="inline mr-1" />
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={userForm.email}
                                            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                                            placeholder="correo@ejemplo.com"
                                            className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                            <Phone size={16} className="inline mr-1" />
                                            Teléfono
                                        </label>
                                        <input
                                            type="tel"
                                            value={userForm.telefono}
                                            onChange={(e) => {
                                                const formatted = formatPhoneNumber(e.target.value);
                                                setUserForm({ ...userForm, telefono: formatted });
                                            }}
                                            placeholder="555-123-4567"
                                            maxLength={12}
                                            className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                            <Shield size={16} className="inline mr-1" />
                                            Estado de Cuenta
                                        </label>
                                        <select
                                            value={userForm.activo}
                                            onChange={(e) => setUserForm({ ...userForm, activo: e.target.value })}
                                            className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="ACTIVO">✓ Activo (Con acceso)</option>
                                            <option value="SUSPENDIDO">⏸ Suspendido (Acceso bloqueado)</option>
                                            <option value="BAJA">✕ Baja (Sin acceso)</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <Mail size={20} className="text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-[#6E6E73] mb-1">Email</p>
                                            <p className="text-sm font-medium text-[#1D1D1F]">{user.email}</p>
                                        </div>
                                    </div>

                                    {user.telefono && (
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-green-50 rounded-lg">
                                                <Phone size={20} className="text-green-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-[#6E6E73] mb-1">Teléfono</p>
                                                <p className="text-sm font-medium text-[#1D1D1F]">{user.telefono}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-purple-50 rounded-lg">
                                            <User size={20} className="text-purple-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-[#6E6E73] mb-1">Username</p>
                                            <p className="text-sm font-medium text-[#1D1D1F]">@{user.username}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-gray-50 rounded-lg">
                                            <Shield size={20} className="text-gray-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-[#6E6E73] mb-1">ID</p>
                                            <p className="text-sm font-medium text-[#1D1D1F] font-mono">{user.id}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Información de Empleado */}
                        {loadingEmpleado ? (
                            <div className="text-center py-8 text-[#6E6E73]">Cargando datos de empleado...</div>
                        ) : empleadoData ? (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-[#1D1D1F] pb-2 border-b border-[#E5E5E7] flex items-center gap-2">
                                        <Briefcase size={20} className="text-blue-600" />
                                        Información de Empleado
                                    </h3>
                                    {!editingEmpleado ? (
                                        <button
                                            onClick={() => setEditingEmpleado(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                                        >
                                            <Edit size={16} />
                                            Editar
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSaveEmpleado}
                                                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                                            >
                                                <Save size={16} />
                                                Guardar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingEmpleado(false);
                                                    setEmpleadoForm({
                                                        nss: empleadoData.nss,
                                                        rfc: empleadoData.rfc,
                                                        pin: empleadoData.pin
                                                    });
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                                            >
                                                <X size={16} />
                                                Cancelar
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Estado del empleado */}
                                {empleadoData.fecha_cambio_estado && (
                                    <div className="mb-4 p-4 bg-[#F5F5F7] rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-[#6E6E73] mb-1 flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    Último cambio de estado
                                                </p>
                                                <p className="text-sm font-medium text-[#1D1D1F]">
                                                    {formatFecha(empleadoData.fecha_cambio_estado)}
                                                </p>
                                                {empleadoData.motivo_cambio_estado && (
                                                    <p className="text-xs text-[#6E6E73] mt-2 flex items-center gap-1">
                                                        <Info size={12} />
                                                        {empleadoData.motivo_cambio_estado}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setShowEstadoSelector(!showEstadoSelector)}
                                                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                                            >
                                                {showEstadoSelector ? 'Cancelar' : 'Cambiar Estado'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Selector de estado */}
                                {showEstadoSelector && (
                                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <h4 className="text-sm font-semibold text-[#1D1D1F] mb-3">Cambiar Estado Laboral</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                                            {Object.entries(ESTADOS_EMPLEADO).map(([key, config]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => handleCambiarEstado(key)}
                                                    disabled={changingEstado || key === empleadoData.estado_empleado}
                                                    className={`p-3 rounded-lg border-2 transition-all text-left ${key === empleadoData.estado_empleado
                                                        ? `${config.bgColor} ${config.borderColor} opacity-50 cursor-not-allowed`
                                                        : `${config.bgColor} ${config.borderColor} hover:shadow-md hover:scale-105`
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-base">{config.icon}</span>
                                                        <span className={`text-sm font-semibold ${config.textColor}`}>
                                                            {config.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-[#6E6E73]">{config.description}</p>
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            value={motivo}
                                            onChange={(e) => setMotivo(e.target.value)}
                                            placeholder="Motivo del cambio (opcional)..."
                                            className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows="2"
                                        />
                                    </div>
                                )}

                                {editingEmpleado ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* NSS */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                                <IdCard size={16} className="inline mr-1" />
                                                NSS
                                            </label>
                                            <input
                                                type="text"
                                                value={formatNSS(empleadoForm.nss)}
                                                onChange={(e) => {
                                                    const formatted = formatNSS(e.target.value);
                                                    const clean = formatted.replace(/\D/g, '');
                                                    setEmpleadoForm({ ...empleadoForm, nss: clean });
                                                    setValidation(prev => ({ ...prev, nss: validateNSS(clean) }));
                                                }}
                                                placeholder="12-34-56-7890-1"
                                                maxLength={15}
                                                className={`w-full px-4 py-3 border ${validation.nss.valid ? 'border-[#D2D2D7]' : 'border-red-500'
                                                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono`}
                                            />
                                            {validation.nss.message && (
                                                <div className={`flex items-center gap-1 mt-1 text-xs ${validation.nss.valid ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {validation.nss.valid ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                    <span>{validation.nss.message}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* RFC */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                                <Shield size={16} className="inline mr-1" />
                                                RFC
                                            </label>
                                            <input
                                                type="text"
                                                value={empleadoForm.rfc}
                                                onChange={(e) => {
                                                    const value = e.target.value.toUpperCase().slice(0, 13);
                                                    setEmpleadoForm({ ...empleadoForm, rfc: value });
                                                    setValidation(prev => ({ ...prev, rfc: validateRFC(value) }));
                                                }}
                                                placeholder="ABCD123456XYZ"
                                                maxLength={13}
                                                className={`w-full px-4 py-3 border ${validation.rfc.valid ? 'border-[#D2D2D7]' : 'border-red-500'
                                                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase`}
                                            />
                                            {validation.rfc.message && (
                                                <div className={`flex items-center gap-1 mt-1 text-xs ${validation.rfc.valid ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {validation.rfc.valid ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                    <span>{validation.rfc.message}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* PIN */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                                <Key size={16} className="inline mr-1" />
                                                PIN
                                            </label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={empleadoForm.pin}
                                                onChange={(e) => {
                                                    const numbers = e.target.value.replace(/\D/g, '').slice(0, 4);
                                                    setEmpleadoForm({ ...empleadoForm, pin: numbers });
                                                    setValidation(prev => ({ ...prev, pin: validatePIN(numbers) }));
                                                }}
                                                placeholder="1234"
                                                maxLength={4}
                                                className={`w-full px-4 py-3 border ${validation.pin.valid ? 'border-[#D2D2D7]' : 'border-red-500'
                                                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-2xl tracking-widest text-center`}
                                            />
                                            {validation.pin.message && (
                                                <div className={`flex items-center gap-1 mt-1 text-xs ${validation.pin.valid ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {validation.pin.valid ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                    <span>{validation.pin.message}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-blue-50 rounded-lg">
                                                <IdCard size={20} className="text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-[#6E6E73] mb-1">NSS</p>
                                                <p className="text-sm font-medium text-[#1D1D1F] font-mono">
                                                    {formatNSS(empleadoData.nss)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-green-50 rounded-lg">
                                                <Shield size={20} className="text-green-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-[#6E6E73] mb-1">RFC</p>
                                                <p className="text-sm font-medium text-[#1D1D1F] font-mono">
                                                    {empleadoData.rfc?.toUpperCase()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-purple-50 rounded-lg">
                                                <Key size={20} className="text-purple-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-[#6E6E73] mb-1">PIN</p>
                                                <p className="text-sm font-medium text-[#1D1D1F] font-mono">••••</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 border-2 border-dashed border-[#E5E5E7] rounded-xl">
                                <Briefcase size={48} className="mx-auto text-[#86868B] mb-2" />
                                <p className="text-[#6E6E73]">Este usuario no tiene datos de empleado</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfileEnhanced2;
