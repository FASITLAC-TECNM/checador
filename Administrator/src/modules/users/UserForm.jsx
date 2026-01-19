import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Mail, Phone, User, Lock, Shield, Briefcase, Upload, Camera, X } from 'lucide-react';
import EmployeeFormEnhanced from './EmployeeForm';
import { getEmpleadoPorUsuario } from '../../services/empleadoService';
import { useNotification } from '../../context/NotificationContext';

const UserFormEnhanced = ({ user, onSave, onCancel }) => {
    const notification = useNotification();
    const [formData, setFormData] = useState(user || {
        id: Date.now(),
        username: '',
        email: '',
        password: '',
        nombre: '',
        foto: '',
        telefono: '',
        activo: 'Activo',         // Con mayúscula inicial
        estado: 'Desconectado',   // Con mayúscula inicial
        esEmpleado: false,
        datosEmpleado: {
            nss: '',
            rfc: '',
            pin: ''
        }
    });

    const [loadingEmpleado, setLoadingEmpleado] = useState(false);
    const [previewImage, setPreviewImage] = useState(user?.foto || '');
    const [errors, setErrors] = useState({});
    const fileInputRef = useRef(null);

    useEffect(() => {
        cargarDatosEmpleado();
    }, [user]);

    const cargarDatosEmpleado = async () => {
        if (user && user.id) {
            try {
                setLoadingEmpleado(true);
                const empleado = await getEmpleadoPorUsuario(user.id);

                if (empleado) {
                    setFormData(prev => ({
                        ...prev,
                        esEmpleado: true,
                        datosEmpleado: {
                            id: empleado.id,
                            nss: empleado.nss || '',
                            rfc: empleado.rfc || '',
                            pin: empleado.pin || ''
                        }
                    }));
                }
            } catch (error) {
                if (!error.message.includes('404') && !error.message.includes('no encontrado')) {
                    console.error('Error al cargar datos de empleado:', error);
                }
            } finally {
                setLoadingEmpleado(false);
            }
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.nombre.trim()) {
            newErrors.nombre = 'El nombre es obligatorio';
        }

        if (!formData.username.trim()) {
            newErrors.username = 'El username es obligatorio';
        } else if (formData.username.length < 3) {
            newErrors.username = 'El username debe tener al menos 3 caracteres';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'El email es obligatorio';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email inválido';
        }

        if (!user && !formData.password) {
            newErrors.password = 'La contraseña es obligatoria para usuarios nuevos';
        } else if (formData.password && formData.password.length < 6) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
        }

        if (formData.telefono && !/^\d{10}$/.test(formData.telefono.replace(/\D/g, ''))) {
            newErrors.telefono = 'El teléfono debe tener 10 dígitos';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            onSave(formData);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        // Limpiar error del campo al editar
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                notification.warning('Archivo muy grande', 'La imagen no debe superar 5MB');
                return;
            }

            if (!file.type.startsWith('image/')) {
                notification.warning('Formato no válido', 'Solo se permiten imágenes');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
                setFormData(prev => ({
                    ...prev,
                    foto: reader.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setPreviewImage('');
        setFormData(prev => ({
            ...prev,
            foto: ''
        }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleEmployeeToggle = (e) => {
        setFormData(prev => ({
            ...prev,
            esEmpleado: e.target.checked
        }));
    };

    const handleEmployeeDataChange = (newEmployeeData) => {
        setFormData(prev => ({
            ...prev,
            datosEmpleado: newEmployeeData
        }));
    };

    const formatPhoneNumber = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 10) {
            return numbers.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        }
        return numbers.slice(0, 10).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    };

    return (
        <div className=" bg-[#FBFBFD]">
            <div className="mx-auto p-8">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors text-[#6E6E73] mb-4"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-bold text-[#1D1D1F]">
                            {user ? 'Editar Usuario' : 'Nuevo Usuario'}
                        </h2>
                        <p className="text-[#6E6E73] mt-2">
                            {user ? 'Actualiza la información del usuario' : 'Completa los datos para crear un nuevo usuario'}
                        </p>
                    </div>
                </div>

                {/* Formulario */}
                <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                    <div className="p-8">
                        {/* Foto de perfil */}
                        <div className="mb-8">
                            <label className="block text-sm font-semibold text-[#1D1D1F] mb-4">
                                Foto de Perfil
                            </label>
                            <div className="flex items-center gap-6">
                                {previewImage ? (
                                    <div className="relative">
                                        <img
                                            src={previewImage}
                                            alt="Preview"
                                            className="w-24 h-24 rounded-full object-cover border-4 border-[#E5E5E7] shadow-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-900 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-[#E5E5E7] shadow-sm">
                                        {formData.nombre?.charAt(0).toUpperCase() || <Camera size={32} />}
                                    </div>
                                )}
                                <div className="flex-1">
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
                                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                                    >
                                        <Upload size={18} />
                                        {previewImage ? 'Cambiar foto' : 'Subir foto'}
                                    </button>
                                    <p className="text-xs text-[#6E6E73] mt-2">
                                        JPG, PNG o GIF. Máximo 5MB.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Información básica */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7] flex items-center gap-2">
                                <User size={20} className="text-blue-600" />
                                Información Personal
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Nombre */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Nombre Completo *
                                    </label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleChange}
                                        placeholder="Ej: Juan Pérez García"
                                        className={`w-full px-4 py-3 bg-white border ${errors.nombre ? 'border-red-500' : 'border-[#D2D2D7]'} text-[#1D1D1F] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                                    />
                                    {errors.nombre && (
                                        <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        <Mail size={16} className="inline mr-1" />
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="correo@ejemplo.com"
                                        className={`w-full px-4 py-3 bg-white border ${errors.email ? 'border-red-500' : 'border-[#D2D2D7]'} text-[#1D1D1F] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                                    />
                                    {errors.email && (
                                        <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                                    )}
                                </div>

                                {/* Teléfono */}
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        <Phone size={16} className="inline mr-1" />
                                        Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        name="telefono"
                                        value={formData.telefono}
                                        onChange={(e) => {
                                            const formatted = formatPhoneNumber(e.target.value);
                                            setFormData(prev => ({ ...prev, telefono: formatted }));
                                        }}
                                        placeholder="555-123-4567"
                                        maxLength={12}
                                        className={`w-full px-4 py-3 bg-white border ${errors.telefono ? 'border-red-500' : 'border-[#D2D2D7]'} text-[#1D1D1F] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                                    />
                                    {errors.telefono && (
                                        <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Credenciales */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7] flex items-center gap-2">
                                <Lock size={20} className="text-blue-600" />
                                Credenciales de Acceso
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Username */}
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Username *
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        placeholder="usuario123"
                                        className={`w-full px-4 py-3 bg-white border ${errors.username ? 'border-red-500' : 'border-[#D2D2D7]'} text-[#1D1D1F] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                                    />
                                    {errors.username && (
                                        <p className="text-red-500 text-xs mt-1">{errors.username}</p>
                                    )}
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        Contraseña {!user && '*'}
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder={user ? 'Dejar en blanco para mantener' : 'Mínimo 6 caracteres'}
                                        className={`w-full px-4 py-3 bg-white border ${errors.password ? 'border-red-500' : 'border-[#D2D2D7]'} text-[#1D1D1F] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                                    />
                                    {errors.password && (
                                        <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                                    )}
                                </div>

                                {/* Estado */}
                                <div>
                                    <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                        <Shield size={16} className="inline mr-1" />
                                        Estado de Cuenta
                                    </label>
                                    <select
                                        name="activo"
                                        value={formData.activo}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-white border border-[#D2D2D7] text-[#1D1D1F] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    >
                                        <option value="Activo">Activo (Con acceso)</option>
                                        <option value="Suspensión">Suspensión (Acceso temporal bloqueado)</option>
                                        <option value="Baja">Baja (Sin acceso)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Toggle Empleado */}
                        <div className="mb-8">
                            <label className="flex items-center gap-3 cursor-pointer p-4 bg-[#F5F5F7] rounded-xl hover:bg-[#E5E5E7] transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.esEmpleado}
                                    onChange={handleEmployeeToggle}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Briefcase size={20} className="text-blue-600" />
                                        <span className="font-semibold text-[#1D1D1F]">
                                            Este usuario es un empleado
                                        </span>
                                    </div>
                                    <p className="text-sm text-[#6E6E73] mt-1">
                                        Activa esta opción para agregar información laboral (NSS, RFC, PIN)
                                    </p>
                                </div>
                            </label>
                        </div>

                        {/* Datos de Empleado */}
                        {formData.esEmpleado && (
                            <EmployeeFormEnhanced
                                data={formData.datosEmpleado}
                                onChange={handleEmployeeDataChange}
                                loading={loadingEmpleado}
                            />
                        )}
                    </div>

                    {/* Footer con botones */}
                    <div className="px-8 py-6 bg-[#F5F5F7] border-t border-[#E5E5E7] flex justify-end gap-3">
                        <button
                            onClick={onCancel}
                            className="px-6 py-3 bg-white text-[#6E6E73] border border-[#D2D2D7] rounded-xl hover:bg-[#F5F5F7] transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
                        >
                            <Save size={20} />
                            {user ? 'Actualizar Usuario' : 'Crear Usuario'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserFormEnhanced;
