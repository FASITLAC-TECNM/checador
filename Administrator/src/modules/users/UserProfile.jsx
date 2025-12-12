import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Mail, Phone, User, Shield, Edit, CreditCard, Briefcase, Save, Camera, Users, Key, Calendar } from 'lucide-react';
import { getEmpleadoPorUsuario, actualizarEmpleado, crearEmpleado } from '../../services/empleadoService';
import { actualizarUsuario } from '../../services/api';
import { crearCredenciales, actualizarCredenciales, getCredencialesPorEmpleado } from '../../services/credencialesService';
import { obtenerHorarioPorId, actualizarHorario } from '../../services/horariosService';
import UserRolesModal from './UserRolesModal';
import HorarioEditor from './HorarioEditorV2';

const UserProfileEnhanced2 = ({ user, onEdit, onBack, onUpdate, onEditSchedule, onEditRoles }) => {
    const [empleadoData, setEmpleadoData] = useState(null);
    const [loadingEmpleado, setLoadingEmpleado] = useState(false);
    const [editingUser, setEditingUser] = useState(false);
    const [editingEmpleado, setEditingEmpleado] = useState(false);
    const [previewImage, setPreviewImage] = useState(user?.foto || '');
    const [showRolesModal, setShowRolesModal] = useState(false);
    const [showHorarioEditor, setShowHorarioEditor] = useState(false);
    const [horarioData, setHorarioData] = useState(null);
    const fileInputRef = useRef(null);

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
        if (!user?.id) {
            setLoadingEmpleado(false);
            return;
        }

        try {
            setLoadingEmpleado(true);
            const data = await getEmpleadoPorUsuario(user.id);

            // Intentar cargar las credenciales (PIN)
            let credenciales = null;
            if (data?.id) {
                try {
                    credenciales = await getCredencialesPorEmpleado(data.id);
                } catch (error) {
                    console.log('No se encontraron credenciales para este empleado');
                }
            }

            // Combinar datos de empleado con credenciales
            const empleadoCompleto = {
                ...data,
                pin: credenciales?.pin || null
            };

            setEmpleadoData(empleadoCompleto);

            setEmpleadoForm({
                nss: data.nss || '',
                rfc: data.rfc || '',
                pin: credenciales?.pin || ''
            });
        } catch (error) {
            console.error('Error cargando datos de empleado:', error);
            setEmpleadoData(null);
        } finally {
            setLoadingEmpleado(false);
        }
    };

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

    const formatNSS = (value) => {
        if (!value) return '';
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

    const formatPIN = (value) => {
        return value.replace(/\D/g, '').slice(0, 4);
    };

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
        if (!empleadoForm.nss || !empleadoForm.nss.trim()) {
            alert('El NSS es obligatorio');
            return;
        }
        if (!empleadoForm.rfc || !empleadoForm.rfc.trim()) {
            alert('El RFC es obligatorio');
            return;
        }

        const nssValid = validateNSS(empleadoForm.nss);
        const rfcValid = validateRFC(empleadoForm.rfc);

        // Validar PIN solo si existe y no está vacío
        let pinValid = { valid: true, message: '' };
        const pinValue = empleadoForm.pin || '';
        if (pinValue && typeof pinValue === 'string' && pinValue.trim()) {
            pinValid = validatePIN(pinValue);
        }

        if (!nssValid.valid || !rfcValid.valid || !pinValid.valid) {
            alert('Por favor corrige los errores antes de guardar');
            return;
        }

        try {
            let empleadoGuardado;

            if (empleadoData) {
                const dataToUpdate = {
                    nss: empleadoForm.nss,
                    rfc: empleadoForm.rfc
                };
                console.log('📤 Enviando datos de actualización:', dataToUpdate);
                empleadoGuardado = await actualizarEmpleado(empleadoData.id, dataToUpdate);
                console.log('✅ Datos de empleado actualizados');

                // Actualizar PIN solo si se proporcionó un valor válido
                if (pinValue && typeof pinValue === 'string' && pinValue.trim()) {
                    try {
                        await actualizarCredenciales(empleadoData.id, { pin: pinValue.trim() });
                        console.log('✅ PIN actualizado');
                    } catch (credError) {
                        if (credError.message.includes('404') || credError.message.includes('no encontrado')) {
                            await crearCredenciales({
                                id_empleado: empleadoData.id,
                                pin: pinValue.trim()
                            });
                            console.log('✅ Credenciales creadas');
                        } else {
                            throw credError;
                        }
                    }
                }
            } else {
                if (!user?.id) {
                    alert('Error: No se puede crear empleado sin un usuario asociado');
                    return;
                }

                empleadoGuardado = await crearEmpleado({
                    id_usuario: user.id,
                    nss: empleadoForm.nss,
                    rfc: empleadoForm.rfc
                });
                console.log('✅ Empleado creado');

                // Crear credenciales solo si se proporcionó un PIN válido
                if (pinValue && typeof pinValue === 'string' && pinValue.trim()) {
                    await crearCredenciales({
                        id_empleado: empleadoGuardado.id,
                        pin: pinValue.trim()
                    });
                    console.log('✅ Credenciales creadas');
                }
            }

            await cargarDatosEmpleado();
            setEditingEmpleado(false);
            if (onUpdate) onUpdate();
            alert(empleadoData ? 'Datos de empleado actualizados correctamente' : 'Empleado creado correctamente');
        } catch (error) {
            console.error('Error:', error);
            alert(empleadoData ? 'Error al actualizar empleado: ' + error.message : 'Error al crear empleado: ' + error.message);
        }
    };

    const handleEditarHorario = async () => {
        if (!empleadoData?.horario_id) {
            alert('Este empleado no tiene un horario asignado');
            return;
        }

        try {
            const horario = await obtenerHorarioPorId(empleadoData.horario_id);
            setHorarioData(horario);
            setShowHorarioEditor(true);
        } catch (error) {
            console.error('Error cargando horario:', error);
            alert('Error al cargar el horario');
        }
    };

    const handleGuardarHorario = async (configActualizada) => {
        try {
            await actualizarHorario(empleadoData.horario_id, {
                config_excep: configActualizada
            });

            alert('Horario actualizado correctamente');
            setShowHorarioEditor(false);
            await cargarDatosEmpleado();
        } catch (error) {
            console.error('Error guardando horario:', error);
            alert('Error al guardar el horario');
        }
    };

    const getActivoBadgeColor = (activo) => {
        switch (activo) {
            case 'ACTIVO': return 'bg-green-100 text-green-800 border-green-200';
            case 'SUSPENDIDO': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'BAJA': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const InfoField = ({ icon: Icon, label, value, subValue, variant = 'blue' }) => {
        const colors = {
            blue: 'bg-blue-50 text-blue-600',
            green: 'bg-green-50 text-green-600',
            purple: 'bg-purple-50 text-purple-600',
            orange: 'bg-orange-50 text-orange-600',
            gray: 'bg-gray-100 text-gray-600'
        };

        return (
            <div className="flex items-start gap-4 p-2 rounded-lg transition-colors hover:bg-gray-50">
                <div className={`p-3 rounded-xl ${colors[variant]}`}>
                    <Icon size={20} />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-black">{label}</p>
                    <p className="text-base font-light text-gray-900 break-all">{value || 'No definido'}</p>
                    {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
                </div>
            </div>
        );
    };

    if (!user) return <div className="p-8 text-center text-gray-500">No se encontró el usuario</div>;

    return (
        <>
            {showRolesModal && (
                <UserRolesModal
                    user={user}
                    onClose={() => setShowRolesModal(false)}
                    onUpdate={onUpdate}
                />
            )}
            {showHorarioEditor && horarioData && (
                <HorarioEditor
                    empleado={empleadoData}
                    horario={horarioData}
                    onSave={handleGuardarHorario}
                    onCancel={() => setShowHorarioEditor(false)}
                />
            )}
            <div className="bg-[#FBFBFD] min-h-screen pb-10">
                <div className="w-full pt-6">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors px-6">
                    <ArrowLeft size={20} />
                    <span>Volver a la lista</span>
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden w-full">
                    <div className="h-40 bg-blue-600 w-full relative"></div>

                    <div className="px-8 pb-8">
                        <div className="flex flex-col xl:flex-row items-start xl:items-end gap-6 -mt-12 mb-10 relative">
                            <div className="relative group shrink-0">
                                <div className="w-32 h-32 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center">
                                    {previewImage ? (
                                        <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white">
                                            <span className="text-5xl font-bold">
                                                {user.nombre?.charAt(0).toUpperCase() || 'U'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {editingUser && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-2 right-2 p-2 bg-gray-900 text-white rounded-full hover:bg-black transition-colors shadow-lg"
                                    >
                                        <Camera size={16} />
                                    </button>
                                )}
                                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </div>

                            <div className="flex-1 w-full xl:w-auto">
                                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
                                    <div className="mb-2 xl:mb-0">
                                        <h1 className="text-3xl font-bold text-gray-900 mb-1">{user.nombre}</h1>
                                        <p className="text-gray-500 font-medium">@{user.username || 'sin_usuario'}</p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        {!editingUser && !editingEmpleado && (
                                            <>
                                                {empleadoData && (
                                                    <button
                                                        onClick={handleEditarHorario}
                                                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
                                                    >
                                                        <Calendar size={18} className="text-purple-500" />
                                                        Horario
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setShowRolesModal(true)}
                                                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
                                                >
                                                    <Users size={18} className="text-indigo-500" />
                                                    Roles
                                                </button>
                                            </>
                                        )}
                                        <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>
                                        <div className={`px-4 py-2 rounded-xl border text-sm font-light tracking-wide shadow-sm ${getActivoBadgeColor(user.activo)}`}>
                                            {user.activo}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-10">
                            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900">Información de Usuario</h3>
                                {!editingUser ? (
                                    <button onClick={() => setEditingUser(true)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-semibold flex items-center gap-2">
                                        <Edit size={16} /> Editar
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingUser(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold">Cancelar</button>
                                        <button onClick={handleSaveUser} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold flex items-center gap-2"><Save size={16} /> Guardar</button>
                                    </div>
                                )}
                            </div>

                            {editingUser ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-light text-gray-700 mb-1">Nombre Completo</label>
                                        <input type="text" value={userForm.nombre} onChange={e => setUserForm({ ...userForm, nombre: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-light text-gray-700 mb-1">Email</label>
                                        <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-light text-gray-700 mb-1">Teléfono</label>
                                        <input type="text" value={userForm.telefono} onChange={e => setUserForm({ ...userForm, telefono: formatPhoneNumber(e.target.value) })} maxLength={12} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-light text-gray-700 mb-1">Estado</label>
                                        <select value={userForm.activo} onChange={e => setUserForm({ ...userForm, activo: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                            <option value="ACTIVO">Activo</option>
                                            <option value="SUSPENDIDO">Suspendido</option>
                                            <option value="BAJA">Baja</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                    <InfoField icon={Mail} label="Email" value={user.email} variant="blue" />
                                    <InfoField icon={Phone} label="Teléfono" value={user.telefono} variant="green" />
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-2 border-b border-gray-100 gap-4">
                                <h3 className="text-lg font-light text-gray-900">Información de Empleado</h3>
                                <div>
                                    {!editingEmpleado ? (
                                        <button onClick={() => setEditingEmpleado(true)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-semibold flex items-center gap-2">
                                            <Edit size={16} /> Editar
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingEmpleado(false); cargarDatosEmpleado(); }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold">Cancelar</button>
                                            <button onClick={handleSaveEmpleado} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold flex items-center gap-2"><Save size={16} /> Guardar</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {loadingEmpleado ? (
                                <div className="py-8 text-center text-gray-400">Cargando datos...</div>
                            ) : !empleadoData && !editingEmpleado ? (
                                <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                    <Briefcase className="mx-auto text-gray-300 mb-2" size={32} />
                                    <p className="text-gray-500">Este usuario no tiene perfil de empleado.</p>
                                    <button onClick={() => setEditingEmpleado(true)} className="mt-2 text-blue-600 font-medium hover:underline">Crear perfil de empleado</button>
                                </div>
                            ) : editingEmpleado ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">NSS</label>
                                        <input
                                            type="text"
                                            value={formatNSS(empleadoForm.nss)}
                                            onChange={e => {
                                                const clean = e.target.value.replace(/\D/g, '');
                                                setEmpleadoForm({ ...empleadoForm, nss: clean });
                                                setValidation(prev => ({ ...prev, nss: validateNSS(clean) }));
                                            }}
                                            maxLength={15}
                                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${!validation.nss.valid && 'border-red-500'}`}
                                        />
                                        {!validation.nss.valid && <p className="text-xs text-red-500 mt-1">{validation.nss.message}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
                                        <input
                                            type="text"
                                            value={empleadoForm.rfc}
                                            onChange={e => {
                                                const val = e.target.value.toUpperCase().slice(0, 13);
                                                setEmpleadoForm({ ...empleadoForm, rfc: val });
                                                setValidation(prev => ({ ...prev, rfc: validateRFC(val) }));
                                            }}
                                            maxLength={13}
                                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${!validation.rfc.valid && 'border-red-500'}`}
                                        />
                                        {!validation.rfc.valid && <p className="text-xs text-red-500 mt-1">{validation.rfc.message}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">PIN de Acceso</label>
                                        <input
                                            type="password"
                                            value={empleadoForm.pin || ''}
                                            onChange={e => {
                                                const val = formatPIN(e.target.value);
                                                setEmpleadoForm({ ...empleadoForm, pin: val });
                                                setValidation(prev => ({ ...prev, pin: validatePIN(val) }));
                                            }}
                                            placeholder="••••"
                                            maxLength={4}
                                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none tracking-widest ${!validation.pin.valid && 'border-red-500'}`}
                                        />
                                        {!validation.pin.valid && <p className="text-xs text-red-500 mt-1">{validation.pin.message}</p>}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                    <InfoField icon={CreditCard} label="NSS" value={formatNSS(empleadoData.nss)} variant="blue" />
                                    <InfoField icon={Shield} label="RFC" value={empleadoData.rfc} variant="green" />
                                    <InfoField icon={Key} label="PIN de Acceso" value={empleadoData.pin ? '••••' : 'No configurado'} variant="purple" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </>
    );
};

export default UserProfileEnhanced2;