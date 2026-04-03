import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    FiX, FiUser, FiMail, FiPhone, FiEye, FiEyeOff,
    FiUpload, FiTrash2, FiBriefcase, FiAlertCircle, FiCheck,
    FiPlus, FiSearch, FiCalendar
} from 'react-icons/fi';
import { validateField, validateForm } from '../../utils/validaciones';
import { compressImage } from '../../utils/imageUtils';
import ScheduleModal from './ScheduleModal'; // Importamos el modal de horarios

import { API_CONFIG } from '../../config/Apiconfig';
const API_URL = API_CONFIG.BASE_URL;

const FORM_RULES = {
    nombre: ['required'],
    usuario: ['required'],
    correo: ['required', 'email'],
    contraseña: ['required'],
    telefono: ['phone'],
    rfc: ['required', 'rfc'],
    nss: ['nss']
};

const UserModal = ({
    isOpen,
    onClose,
    mode,
    userToEdit,
    onSuccess,
    rolesList,
    horariosList: initialHorariosList, // Recibimos la lista inicial
    departamentosList
}) => {
    // --- ESTADOS ---
    const [formData, setFormData] = useState({
        usuario: '', correo: '', contraseña: '', nombre: '', foto: '',
        telefono: '', es_empleado: false, roles: [], rfc: '', nss: '',
        horario_id: '', departamentos_ids: [], regimen_laboral: 'base'
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    // Estado local para horarios (por si creamos uno nuevo, agregarlo a la lista)
    const [localHorarios, setLocalHorarios] = useState([]);
    const [showScheduleModal, setShowScheduleModal] = useState(false);

    // Estados para el buscador de departamentos
    const [deptSearch, setDeptSearch] = useState('');
    const [showDeptMenu, setShowDeptMenu] = useState(false);
    const deptMenuRef = useRef(null);

    // --- EFECTOS ---
    useEffect(() => {
        setLocalHorarios(initialHorariosList);
    }, [initialHorariosList]);

    useEffect(() => {
        // Cerrar menú departamentos al hacer click fuera
        const handleClickOutside = (event) => {
            if (deptMenuRef.current && !deptMenuRef.current.contains(event.target)) {
                setShowDeptMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setErrors({});
            setMensaje(null);
            setShowPassword(false);
            setDeptSearch('');

            if (mode === 'edit' && userToEdit) {
                setFormData({
                    usuario: userToEdit.usuario || '',
                    correo: userToEdit.correo || '',
                    contraseña: '',
                    nombre: userToEdit.nombre || '',
                    foto: userToEdit.foto || '',
                    telefono: userToEdit.telefono || '',
                    es_empleado: userToEdit.es_empleado || false,
                    roles: userToEdit.roles?.map(r => r.id) || [],
                    rfc: userToEdit.rfc || '',
                    nss: userToEdit.nss || '',
                    horario_id: userToEdit.horario_id || '',
                    departamentos_ids: userToEdit.departamentos?.map(d => d.id) || [],
                    regimen_laboral: userToEdit.regimen_laboral || 'base'
                });
            } else {
                setFormData({
                    usuario: '', correo: '', contraseña: '', nombre: '', foto: '',
                    telefono: '', es_empleado: false, roles: [], rfc: '', nss: '',
                    horario_id: '', departamentos_ids: [], regimen_laboral: 'base'
                });
            }
        }
    }, [isOpen, mode, userToEdit]);

    // --- HANDLERS ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        const finalValue = name === 'rfc' ? value.toUpperCase() : value;

        setFormData(prev => ({ ...prev, [name]: finalValue }));

        let currentRules = { ...FORM_RULES };
        if (mode === 'edit' && name === 'contraseña' && finalValue === '') {
            setErrors(prev => ({ ...prev, [name]: null }));
            return;
        }
        if (!formData.es_empleado && (name === 'rfc' || name === 'nss')) return;

        const error = validateField(name, finalValue, currentRules);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) {
            setMensaje({ tipo: 'error', texto: 'La imagen no debe superar 5MB' });
            return;
        }
        try {
            const compressed = await compressImage(file, { maxWidth: 300, maxHeight: 300, quality: 0.7 });
            setFormData(prev => ({ ...prev, foto: compressed }));
        } catch {
            setMensaje({ tipo: 'error', texto: 'Error al procesar la imagen' });
        }
    };

    const toggleRole = (id) => {
        setFormData(prev => ({
            ...prev,
            roles: prev.roles.includes(id)
                ? prev.roles.filter(x => x !== id)
                : [...prev.roles, id]
        }));
    };

    // --- HANDLERS DEPARTAMENTOS (BUSQUEDA Y SELECCION) ---
    const addDepartamento = (id) => {
        if (!formData.departamentos_ids.includes(id)) {
            setFormData(prev => ({
                ...prev,
                departamentos_ids: [...prev.departamentos_ids, id]
            }));
        }
        setDeptSearch(''); // Limpiar busqueda al seleccionar
    };

    const removeDepartamento = (id) => {
        setFormData(prev => ({
            ...prev,
            departamentos_ids: prev.departamentos_ids.filter(x => x !== id)
        }));
    };

    // --- HANDLER CREACIÓN HORARIO ---
    const handleScheduleSuccess = (newSchedule) => {
        // Agregamos el nuevo horario a la lista local
        setLocalHorarios(prev => [...prev, newSchedule]);
        // Lo seleccionamos automáticamente
        setFormData(prev => ({ ...prev, horario_id: newSchedule.id }));
        setShowScheduleModal(false);
    };

    // --- HANDLER POST NUEVO HORARIO (REPARADO API) ---
    const handleSaveSchedule = async (scheduleData) => {
        try {
            setSaving(true);
            const token = localStorage.getItem('auth_token');
            const body = {
                empleado_id: null, // Modal de usuario no puede asignar a si mismo aún
                fecha_inicio: scheduleData.fecha_inicio,
                fecha_fin: scheduleData.fecha_fin || null,
                configuracion: {
                    configuracion_semanal: scheduleData.configuracion_semanal,
                    excepciones: {}
                }
            };

            const response = await fetch(`${API_URL}/api/horarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });

            const result = await response.json();
            if (result.success) {
                // Selecciona el horario global generado
                handleScheduleSuccess(result.data);
            } else {
                setMensaje({ tipo: 'error', texto: result.message || 'Error al guardar el horario' });
            }
        } catch (error) {
            setMensaje({ tipo: 'error', texto: 'Error de red al guardar horario' });
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let rulesToValidate = { ...FORM_RULES };
        if (mode === 'edit' && !formData.contraseña) delete rulesToValidate.contraseña;
        if (!formData.es_empleado) {
            delete rulesToValidate.rfc;
            delete rulesToValidate.nss;
        }

        const { isValid, errors: newErrors } = validateForm(formData, rulesToValidate);

        if (!isValid) {
            setErrors(newErrors);
            setMensaje({ tipo: 'error', texto: 'Corrige los errores marcados.' });
            return;
        }

        try {
            setSaving(true);
            const token = localStorage.getItem('auth_token');
            const url = mode === 'create'
                ? `${API_URL}/api/usuarios`
                : `${API_URL}/api/usuarios/${userToEdit.id}`;

            const body = {
                ...formData,
                telefono: formData.telefono || null,
                rfc: formData.es_empleado ? (formData.rfc || null) : null,
                nss: formData.es_empleado ? (formData.nss || null) : null,
                horario_id: formData.es_empleado ? (formData.horario_id || null) : null,
                departamentos_ids: formData.es_empleado ? formData.departamentos_ids : [],
                regimen_laboral: formData.es_empleado ? formData.regimen_laboral : null
            };

            if (!body.contraseña) delete body.contraseña;

            const response = await fetch(url, {
                method: mode === 'create' ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.success) {
                onSuccess();
                onClose();
            } else {
                setMensaje({ tipo: 'error', texto: result.message || 'Error al guardar' });
            }
        } catch (error) {
            setMensaje({ tipo: 'error', texto: 'Error de conexión' });
        } finally {
            setSaving(false);
        }
    };

    const ErrorMessage = ({ field }) => errors[field] ? (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <FiAlertCircle className="w-3 h-3" /> {errors[field]}
        </p>
    ) : null;

    if (!isOpen) return null;

    // Filtrar departamentos para el buscador
    const departamentosFiltrados = departamentosList.filter(d =>
        !formData.departamentos_ids.includes(d.id) &&
        d.nombre.toLowerCase().includes(deptSearch.toLowerCase())
    );

    return createPortal(
        // FONDO OSCURECIDO CON BLUR, MAS LIMPIO
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
            {/* Modal Container: Shadow suave, border sutil */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-gray-700">

                {/* --- HEADER --- */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                            {mode === 'create' ? 'Registrar Nuevo Usuario' : 'Editar Usuario'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Completa la información requerida a continuación</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400">
                        <FiX className="w-6 h-6" />
                    </button>
                </div>

                {/* --- BODY --- */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-8">
                        {mensaje && (
                            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                <FiAlertCircle className="w-5 h-5" />
                                {mensaje.texto}
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                            {/* --- COLUMNA IZQUIERDA: FOTO, ROLES, ESTADO --- */}
                            <div className="lg:col-span-4 space-y-6">
                                {/* Tarjeta de Foto */}
                                <div className="card flex flex-col items-center text-center p-6 bg-slate-50/50 dark:bg-gray-900/30">
                                    <div className="relative group">
                                        {formData.foto ? (
                                            <img src={formData.foto} alt="Perfil" className="w-32 h-32 rounded-full object-cover shadow-md border-4 border-white dark:border-gray-700" />
                                        ) : (
                                            <div className="w-32 h-32 rounded-full bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center shadow-sm">
                                                <FiUser className="w-12 h-12 text-gray-300 dark:text-gray-500" />
                                            </div>
                                        )}
                                        <label htmlFor="foto-upload" className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 shadow-lg transition-transform hover:scale-105">
                                            <FiUpload className="w-4 h-4" />
                                        </label>
                                        <input type="file" id="foto-upload" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </div>
                                    <p className="mt-3 text-sm font-medium text-gray-700">Foto de Perfil</p>
                                    <p className="text-xs text-gray-400">Max 2MB (PNG, JPG)</p>
                                    {formData.foto && (
                                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, foto: '' }))} className="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                                            <FiTrash2 /> Eliminar foto
                                        </button>
                                    )}
                                </div>

                                {/* Selección de Roles */}
                                <div className="card p-5">
                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 uppercase tracking-wider">Roles de Sistema</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {rolesList.filter(r => r.nombre.toLowerCase() !== 'empleado').map(rol => {
                                            const isSelected = formData.roles.includes(rol.id);
                                            return (
                                                <button
                                                    key={rol.id}
                                                    type="button"
                                                    onClick={() => toggleRole(rol.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${isSelected
                                                        ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500 dark:border-primary-700 text-primary-700 dark:text-primary-400 shadow-sm'
                                                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                                                        }`}
                                                >
                                                    {rol.nombre}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Toggle Empleado */}
                                <div
                                    className={`rounded-xl p-5 border-2 transition-colors cursor-pointer flex items-start gap-4 ${formData.es_empleado ? 'border-primary-500 dark:border-primary-700 bg-primary-50/30 dark:bg-primary-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                    onClick={() => setFormData(p => ({ ...p, es_empleado: !p.es_empleado }))}
                                >
                                    <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.es_empleado ? 'bg-primary-600 border-primary-600' : 'bg-white dark:bg-gray-700 border-gray-400 dark:border-gray-500'}`}>
                                        {formData.es_empleado && <FiCheck className="text-white w-3.5 h-3.5" />}
                                    </div>
                                    <div>
                                        <h4 className={`font-semibold ${formData.es_empleado ? 'text-primary-800 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>Es Empleado</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Activa esto para asignar horarios, departamentos y datos fiscales.</p>
                                    </div>
                                </div>
                            </div>

                            {/* --- COLUMNA DERECHA: DATOS --- */}
                            <div className="lg:col-span-8 space-y-8">

                                {/* Credenciales y Datos Personales (Igual que antes...) */}
                                <section>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 flex items-center gap-2">
                                        <span className="bg-gray-100 dark:bg-gray-700 p-1 rounded text-gray-500 dark:text-gray-300"><FiUser className="w-4 h-4" /></span>
                                        Información General
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                        {/* Inputs resumidos para brevedad, se mantiene lógica */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Completo</label>
                                            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 ${errors.nombre ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                            <ErrorMessage field="nombre" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario</label>
                                            <input type="text" name="usuario" value={formData.usuario} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 ${errors.usuario ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                            <ErrorMessage field="usuario" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico</label>
                                            <input type="email" name="correo" value={formData.correo} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 ${errors.correo ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                            <ErrorMessage field="correo" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
                                            <div className="relative">
                                                <input type={showPassword ? 'text' : 'password'} name="contraseña" value={formData.contraseña} onChange={handleChange} className={`w-full px-4 py-2 pr-10 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 ${errors.contraseña ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600">
                                                    {showPassword ? <FiEyeOff /> : <FiEye />}
                                                </button>
                                            </div>
                                            <ErrorMessage field="contraseña" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                                            <input type="tel" name="telefono" maxLength={10} value={formData.telefono} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 ${errors.telefono ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                                        </div>
                                    </div>
                                </section>

                                {/* Sección: Datos de Empleado (Condicional) */}
                                {formData.es_empleado && (
                                    <section className="bg-gray-50 dark:bg-gray-900/50 p-5 pb-32 rounded-xl border border-gray-200 dark:border-gray-700 animate-fadeIn">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <span className="bg-primary-100 dark:bg-primary-900/30 p-1 rounded text-primary-600 dark:text-primary-400"><FiBriefcase className="w-4 h-4" /></span>
                                            Datos Laborales
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RFC</label>
                                                <input type="text" name="rfc" maxLength={13} value={formData.rfc} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg uppercase bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.rfc ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} placeholder="RFC" />
                                                <ErrorMessage field="rfc" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NSS</label>
                                                <input type="text" name="nss" maxLength={11} value={formData.nss} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.nss ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} placeholder="NSS" />
                                                <ErrorMessage field="nss" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Régimen Laboral</label>
                                                <select
                                                    name="regimen_laboral"
                                                    value={formData.regimen_laboral}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                                >
                                                    <option value="base">Base (Planta)</option>
                                                    <option value="eventual">Eventual (Temporal)</option>
                                                </select>
                                            </div>

                                            {/* --- ASIGNACIÓN DE HORARIO --- */}
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horario Laboral</label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <select
                                                            name="horario_id"
                                                            value={formData.horario_id}
                                                            onChange={handleChange}
                                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 appearance-none"
                                                        >
                                                            <option value="" className="text-gray-500 dark:text-gray-400">-- Seleccionar Horario --</option>
                                                            {localHorarios.map(h => (
                                                                <option key={h.id} value={h.id} className="text-gray-900 dark:text-white">
                                                                    {/* CORRECCIÓN: Usamos 'empleado_nombre' tal como viene de tu backend */}
                                                                    {h.empleado_nombre
                                                                        ? `${h.empleado_nombre}`
                                                                        : `Horario Sin Asignar (${new Date(h.fecha_inicio).toLocaleDateString()})`
                                                                    }
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {/* Flecha indicadora */}
                                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowScheduleModal(true)}
                                                        className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1 shadow-sm flex-shrink-0"
                                                        title="Crear nuevo horario"
                                                    >
                                                        <FiPlus className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* --- DEPARTAMENTOS (BUSCADOR Y TAGS) --- */}
                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4" ref={deptMenuRef}>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Departamentos Asignados</label>

                                            {/* Tags de seleccionados */}
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {formData.departamentos_ids.map(id => {
                                                    const dep = departamentosList.find(d => d.id === id);
                                                    if (!dep) return null;
                                                    return (
                                                        <span key={id} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 text-sm">
                                                            {dep.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dep.color }} />}
                                                            {dep.nombre}
                                                            <button type="button" onClick={() => removeDepartamento(id)} className="hover:text-red-500 ml-1">
                                                                <FiX className="w-4 h-4" />
                                                            </button>
                                                        </span>
                                                    );
                                                })}
                                                {formData.departamentos_ids.length === 0 && (
                                                    <span className="text-gray-400 text-sm italic">Sin departamentos asignados</span>
                                                )}
                                            </div>

                                            {/* Buscador Dropdown */}
                                            <div className="relative">
                                                <div className="relative">
                                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar y agregar departamento..."
                                                        value={deptSearch}
                                                        onChange={(e) => {
                                                            setDeptSearch(e.target.value);
                                                            setShowDeptMenu(true);
                                                        }}
                                                        onFocus={() => setShowDeptMenu(true)}
                                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                                                    />
                                                </div>

                                                {/* Menú Desplegable */}
                                                {showDeptMenu && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                                                        {departamentosFiltrados.length > 0 ? (
                                                            departamentosFiltrados.map(dep => (
                                                                <button
                                                                    key={dep.id}
                                                                    type="button"
                                                                    onClick={() => addDepartamento(dep.id)}
                                                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0"
                                                                >
                                                                    {dep.color && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dep.color }} />}
                                                                    <span className="text-gray-700 dark:text-gray-200">{dep.nombre}</span>
                                                                    <span className="ml-auto text-xs text-gray-400 opacity-0 group-hover:opacity-100"><FiPlus /></span>
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                                {deptSearch ? 'No se encontraron resultados' : 'Todos los departamentos agregados'}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                )}
                            </div>
                        </div>
                    </div>
                </form>

                {/* --- FOOTER --- */}
                <div className="px-8 py-5 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn-secondary">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className={`btn-primary flex items-center gap-2 ${saving ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        {saving ? 'Guardando...' : (mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios')}
                    </button>
                </div>
            </div>

            {/* Modal anidado para crear horario (Enrutamiento corregido) */}
            <ScheduleModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                onSave={handleSaveSchedule}
                empleados={[]}
                empleadoActualNombre={formData.nombre || 'Nuevo Empleado'}
                saving={saving}
            />
        </div>,
        document.body
    );
};

export default UserModal;