import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiGlobe, FiActivity, FiShield, FiAlertTriangle, FiImage, FiUsers, FiMapPin, FiCheckCircle } from 'react-icons/fi';
import { API_CONFIG } from '../config/Apiconfig';
import DynamicLoader from '../components/common/DynamicLoader';

const ConfigurarEmpresaSaaS = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    const [empresa, setEmpresa] = useState({
        nombre: '',
        logo: '',
        es_activo: true,
        telefono: '',
        correo: '',
        limite_empleados: '',
        limite_dispositivos: '',
        fecha_vencimiento: '',
        total_usuarios: 0,
        total_departamentos: 0,
        configuracion_reportes: {
            modulos: {
                asistencia: true,
                horarios: true,
                avisos: true,
                dispositivos: true,
                reconocimiento_facial: false,
                geocercas: false,
                notificaciones_push: false,
                importacion_masiva: true
            }
        }
    });

    const API_URL = API_CONFIG.BASE_URL;

    useEffect(() => {
        fetchEmpresaDetails();
    }, [id]);

    const fetchEmpresaDetails = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/empresas/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al obtener detalles de la empresa');
            }

            if (data.success && data.data) {
                // Asegurar que configuracion_reportes tenga la estructura de modulos
                const configBase = data.data.configuracion_reportes || {};
                if (!configBase.modulos) {
                    configBase.modulos = {
                        asistencia: true,
                        horarios: true,
                        avisos: true,
                        dispositivos: true,
                        reconocimiento_facial: false,
                        geocercas: false,
                        notificaciones_push: false,
                        importacion_masiva: true
                    };
                }

                setEmpresa({
                    nombre: data.data.nombre || '',
                    logo: data.data.logo || '',
                    es_activo: data.data.es_activo ?? true,
                    telefono: data.data.telefono || '',
                    correo: data.data.correo || '',
                    limite_empleados: data.data.limite_empleados || '',
                    limite_dispositivos: data.data.limite_dispositivos || '',
                    fecha_vencimiento: data.data.fecha_vencimiento ? data.data.fecha_vencimiento.split('T')[0] : '',
                    total_usuarios: parseInt(data.data.total_usuarios) || 0,
                    total_departamentos: parseInt(data.data.total_departamentos) || 0,
                    configuracion_reportes: configBase
                });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEmpresa(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleModuleToggle = (modulo) => {
        setEmpresa(prev => ({
            ...prev,
            configuracion_reportes: {
                ...prev.configuracion_reportes,
                modulos: {
                    ...prev.configuracion_reportes.modulos,
                    [modulo]: !prev.configuracion_reportes.modulos[modulo]
                }
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            setSuccessMsg('');

            const dataToSubmit = { ...empresa };
            if (dataToSubmit.limite_empleados === '') dataToSubmit.limite_empleados = null;
            if (dataToSubmit.limite_dispositivos === '') dataToSubmit.limite_dispositivos = null;
            if (dataToSubmit.fecha_vencimiento === '') dataToSubmit.fecha_vencimiento = null;

            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/empresas/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dataToSubmit)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al actualizar la configuración');
            }

            setSuccessMsg('Configuración actualizada correctamente');

            // Ocultar mensaje despues de 3 seg
            setTimeout(() => setSuccessMsg(''), 3000);

        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <DynamicLoader text="Obteniendo configuración del Tenant..." />;

    const consumoEmpleados = empresa.limite_empleados ? (empresa.total_usuarios / empresa.limite_empleados) * 100 : 0;
    const progresoEmpleados = Math.min(consumoEmpleados, 100);
    const colorProgreso = progresoEmpleados > 90 ? 'bg-red-500 shadow-sm' : progresoEmpleados > 75 ? 'bg-amber-500 shadow-sm' : 'bg-blue-600 shadow-sm';

    return (
        <div className="min-h-screen bg-[#f1f5f9] py-8 px-4 sm:px-6 lg:px-8 text-slate-700 font-sans">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">

                {/* Cabecera / Navegacion */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-2">
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => navigate('/empresas')}
                            className="p-3 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-2xl hover:border-blue-200 transition-all shadow-sm hover:shadow-md group"
                        >
                            <FiArrowLeft className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                                Admin. Instancia
                            </h1>
                            <p className="text-sm text-blue-600/60 font-mono mt-1 flex items-center gap-2 font-bold">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                {id}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] border shadow-sm
                            ${empresa.es_activo 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {empresa.es_activo ? 'Instancia Operativa' : 'Instancia Suspendida'}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-5 bg-red-50 text-red-700 font-bold rounded-2xl border border-red-200 flex items-center gap-4 animate-in slide-in-from-top-4 shadow-sm">
                        <div className="bg-red-100 p-2 rounded-lg text-red-600"><FiAlertTriangle className="w-6 h-6" /></div>
                        <p>{error}</p>
                    </div>
                )}

                {successMsg && (
                    <div className="p-5 bg-emerald-50 text-emerald-700 font-bold rounded-2xl border border-emerald-200 flex items-center gap-4 animate-in slide-in-from-top-4 shadow-sm">
                        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><FiCheckCircle className="w-6 h-6" /></div>
                        <p>{successMsg}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Columna Izquierda: Identidad y Estadísticas */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Tarjeta de Identidad */}
                        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 flex flex-col items-center text-center shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-50 blur-[80px] rounded-full transition-all group-hover:bg-blue-100 duration-1000"></div>
                            
                            <div className="w-36 h-36 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-center p-4 mb-8 relative z-10 shadow-inner overflow-hidden">
                                {empresa.logo ? (
                                    <img src={empresa.logo} alt="Logo Prev" className="max-w-full max-h-full object-contain transition-transform group-hover:scale-110 duration-500" />
                                ) : (
                                    <FiGlobe className="w-16 h-16 text-slate-300" />
                                )}
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 leading-tight break-words max-w-full relative z-10 tracking-tight">
                                {empresa.nombre || 'Sin Nombre'}
                            </h2>
                            <p className="text-blue-500 text-xs font-bold uppercase tracking-widest mt-4 relative z-10 flex items-center justify-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm"></span>
                                Entidad Registrada
                            </p>
                        </div>

                        {/* Tarjeta de Estadísticas de Consumo */}
                        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                            <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-3 mb-8">
                                <span className="p-1.5 bg-blue-50 rounded-lg"><FiActivity className="text-blue-600 w-4 h-4" /></span>
                                Métricas de Uso
                            </h3>

                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-tighter">Usuarios en BD</span>
                                        <span className="text-slate-900 font-mono text-xl font-black">{empresa.total_usuarios}<span className="text-slate-300 text-xs font-normal"> / {empresa.limite_empleados || '∞'}</span></span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200 overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-1000 ${colorProgreso}`} style={{ width: `${progresoEmpleados}%` }}></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center group/item hover:bg-white hover:shadow-md transition-all">
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 group-hover/item:text-blue-600 transition-colors">Dptos.</p>
                                        <p className="text-3xl font-black text-slate-900 tracking-tighter">{empresa.total_departamentos}</p>
                                    </div>
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center group/item hover:bg-white hover:shadow-md transition-all">
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 group-hover/item:text-blue-600 transition-colors">Activos</p>
                                        <p className="text-3xl font-black text-slate-900 tracking-tighter">{empresa.total_usuarios}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Control Maestro (Kill Switch) */}
                        <div className="bg-white border-2 border-red-50 rounded-[2rem] p-8 shadow-xl shadow-red-100 relative group">
                            <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-3 mb-3">
                                <span className="p-1.5 bg-red-50 rounded-lg"><FiShield className="text-red-600 w-4 h-4" /></span>
                                Estado de Servicio
                            </h3>
                            <p className="text-[10px] text-slate-400 mb-8 leading-relaxed font-medium uppercase tracking-wider">
                                La suspensión bloquea el acceso total a la instancia.
                            </p>

                            <label className="flex items-center justify-between cursor-pointer group/toggle bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-red-200 transition-all">
                                <span className="font-black text-xs text-slate-500 group-toggle-hover:text-red-600 transition-colors uppercase">
                                    {empresa.es_activo ? 'SUSPENDER' : 'RESTAURAR'}
                                </span>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        name="es_activo"
                                        className="sr-only"
                                        checked={empresa.es_activo}
                                        onChange={handleChange}
                                    />
                                    <div className={`block w-14 h-7 rounded-full transition-all ${empresa.es_activo ? 'bg-emerald-100 border border-emerald-200' : 'bg-red-100 border border-red-200'}`}></div>
                                    <div className={`absolute left-1.5 top-1.5 w-4 h-4 rounded-full transition-all duration-500 ${empresa.es_activo ? 'bg-emerald-600 translate-x-7' : 'bg-red-600 translate-x-0'}`}></div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Columna Derecha: Formulario y Configuraciones */}
                    <div className="lg:col-span-3 space-y-8 font-sans">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* Datos Generales */}
                                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 sm:p-10 shadow-xl shadow-slate-200/50 space-y-8 group">
                                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-4">
                                        <span className="p-2.5 bg-blue-50 rounded-2xl border border-blue-100"><FiGlobe className="text-blue-600 w-6 h-6" /></span>
                                        Identidad
                                    </h3>

                                    <div className="space-y-8">
                                        <div className="group/field">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 group-field-focus-within:text-blue-600 transition-colors">Nombre Comercial / Razón Social <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                name="nombre"
                                                required
                                                value={empresa.nombre}
                                                onChange={handleChange}
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-800 placeholder-slate-300"
                                                placeholder="Ej. Corporativo FASITLAC"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="group/field">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Teléfono</label>
                                                <input
                                                    type="tel"
                                                    name="telefono"
                                                    value={empresa.telefono}
                                                    onChange={handleChange}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-800"
                                                    placeholder="999 999 9999"
                                                />
                                            </div>
                                            <div className="group/field">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">E-mail</label>
                                                <input
                                                    type="email"
                                                    name="correo"
                                                    value={empresa.correo}
                                                    onChange={handleChange}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-800"
                                                    placeholder="admin@empresa.com"
                                                />
                                            </div>
                                        </div>

                                        <div className="group/field">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">URL Logotipo (Alta Definición)</label>
                                            <div className="relative">
                                                <FiImage className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 pointer-events-none" />
                                                <input
                                                    type="url"
                                                    name="logo"
                                                    value={empresa.logo}
                                                    onChange={handleChange}
                                                    className="w-full pl-16 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-mono font-bold text-slate-500 text-xs shadow-sm"
                                                    placeholder="https://cdn.empresa.com/logo.png"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Configuración de Licencia */}
                                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 sm:p-10 shadow-xl shadow-slate-200/50 space-y-8">
                                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-4">
                                        <span className="p-2.5 bg-amber-50 rounded-2xl border border-amber-100"><FiShield className="text-amber-600 w-6 h-6" /></span>
                                        Suscripción SaaS
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div className="group/field">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Límite Empleados</label>
                                            <input
                                                type="number"
                                                name="limite_empleados"
                                                min="1"
                                                value={empresa.limite_empleados}
                                                onChange={handleChange}
                                                className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-amber-50 focus:border-amber-500 outline-none transition-all font-black text-slate-900 text-xl text-center"
                                                placeholder="∞"
                                            />
                                        </div>
                                        <div className="group/field">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Límite Dispositivos</label>
                                            <input
                                                type="number"
                                                name="limite_dispositivos"
                                                min="1"
                                                value={empresa.limite_dispositivos}
                                                onChange={handleChange}
                                                className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-amber-50 focus:border-amber-500 outline-none transition-all font-black text-slate-900 text-xl text-center"
                                                placeholder="∞"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Fecha de Expiración</label>
                                        <input
                                            type="date"
                                            name="fecha_vencimiento"
                                            value={empresa.fecha_vencimiento}
                                            onChange={handleChange}
                                            className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-amber-50 border-transparent outline-none transition-all font-black text-slate-900 text-center uppercase tracking-widest cursor-pointer hover:bg-slate-100"
                                        />
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-[10px] text-amber-700 font-bold uppercase tracking-widest text-center">
                                        EL SISTEMA SUSPENDERÁ LA INSTANCIA AUTOMÁTICAMENTE.
                                    </div>
                                </div>
                            </div>

                            {/* Nueva Sección: Módulos Activos (Estética Bata Blanca) */}
                            <div className="bg-white border-2 border-blue-50 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl shadow-blue-100/50 group">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-5">
                                        <span className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200"><FiCheckCircle className="text-white w-7 h-7" /></span>
                                        Módulos Disponibles
                                    </h3>
                                    <span className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] rounded-full">
                                        Control Configuraciones de App
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {Object.entries(empresa.configuracion_reportes?.modulos || {}).map(([key, val]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => handleModuleToggle(key)}
                                            className={`flex flex-col gap-4 p-7 rounded-[2rem] border-2 transition-all duration-300 text-left group/mod
                                                ${val 
                                                    ? 'bg-white border-blue-600 shadow-xl shadow-blue-50' 
                                                    : 'bg-slate-50 border-slate-100 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 hover:bg-white hover:border-slate-200'}`}
                                        >
                                            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all duration-500
                                                ${val ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-200 border-slate-200 text-slate-400'}`}>
                                                <FiActivity className="w-6 h-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className={`text-[10px] font-black uppercase tracking-widest ${val ? 'text-blue-600' : 'text-slate-400'}`}>
                                                    {val ? 'ACTIVO' : 'INACTIVO'}
                                                </p>
                                                <p className="text-base font-black text-slate-900 capitalize leading-tight">
                                                    {key.replace(/_/g, ' ')}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Botón de Acción Final */}
                            <div className="flex justify-center sm:justify-end pb-12">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="group relative px-14 py-6 bg-slate-900 hover:bg-blue-600 text-white font-black rounded-[2rem] shadow-2xl transition-all flex items-center gap-5 disabled:opacity-50 hover:-translate-y-1 overflow-hidden"
                                >
                                    {saving ? <FiActivity className="animate-spin w-7 h-7" /> : <FiSave className="w-7 h-7" />}
                                    <span className="text-xl tracking-tight uppercase">
                                        {saving ? 'SINCRONIZANDO...' : 'ACTUALIZAR CONFIGURACIÓN DE INSTANCIA'}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfigurarEmpresaSaaS;
