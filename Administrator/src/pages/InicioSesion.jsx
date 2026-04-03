import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DynamicLoader from '../components/common/DynamicLoader';
import {
    FiUser,
    FiLock,
    FiEye,
    FiEyeOff,
    FiAlertCircle,
    FiArrowRight,
    FiChevronLeft,
    FiBriefcase
} from 'react-icons/fi';


/**
 * Componente de Login rediseñado estilo App Móvil
 */
const Login = () => {
    const { login, loading, error: authError } = useAuth();
    const [formData, setFormData] = useState({
        usuario: '',
        contraseña: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [empresas, setEmpresas] = useState(null); // lista de empresas si multi-tenant
    const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);

    // Manejar cambios en los inputs
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        // Limpiar error al escribir
        if (error) setError('');
    };

    const [isSuccess, setIsSuccess] = useState(false);
    
    // Re-enviar login con empresa_id seleccionado (multi-tenant)
    const handleSubmitWithEmpresa = async (empresaId) => {
        setIsSubmitting(true);
        setError('');
        try {
            const result = await login(formData.usuario, formData.contraseña, true, empresaId);
            if (!result.success) {
                setError(result.message || 'Error al iniciar sesión');
                setIsSubmitting(false);
            } else {
                setIsSuccess(true);
                setTimeout(() => {
                    if (result.confirmLogin) result.confirmLogin();
                }, 600);
            }
        } catch (err) {
            setError('Error al conectar con el servidor');
            setIsSubmitting(false);
        }
    };

    // Manejar submit del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones
        if (!formData.usuario.trim()) {
            setError('El usuario o correo es requerido');
            return;
        }

        if (!formData.contraseña) {
            setError('La contraseña es requerida');
            return;
        }

        if (formData.contraseña.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const empresaId = empresaSeleccionada || null;
            const result = await login(formData.usuario, formData.contraseña, true, empresaId);

            // Multi-tenant: mostrar selector de empresas
            if (result.multiTenant) {
                setEmpresas(result.empresas);
                setIsSubmitting(false);
                return;
            }

            if (!result.success) {
                setError(result.message || 'Error al iniciar sesión');
                setIsSubmitting(false);
            } else {
                setIsSuccess(true);
                setTimeout(() => {
                    if (result.confirmLogin) {
                        result.confirmLogin();
                    }
                }, 600);
            }
        } catch (err) {
            setError('Error al conectar con el servidor');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 overflow-hidden relative font-sans flex items-center justify-center">

            {/* Overlay de Éxito Profesional */}
            <div className={`fixed inset-0 z-[9999] bg-white dark:bg-gray-900 transition-all duration-500 ease-in-out flex items-center justify-center pointer-events-none ${isSuccess ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                }`}>
                <div className="flex flex-col items-center">
                    <DynamicLoader text="Accediendo..." size="large" />
                </div>
            </div>

            {/* Contenedor del Contenido */}
            <div
                className={`flex flex-col items-center justify-center w-full max-w-md transition-all duration-500 ease-out transform ${isSuccess ? 'scale-95 opacity-0 blur-sm' : 'scale-100 opacity-100 blur-0'
                    }`}
            >
                {/* Sección de Logo y Marca */}
                <div className="flex flex-col items-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-800 dark:text-white tracking-wide">FASITLAC™</h1>
                    <p className="text-slate-500 dark:text-gray-400 text-sm mt-2 font-medium">Fábrica de Software del ITLAC</p>
                </div>

                {/* Card del Formulario */}
                <div className="w-full card overflow-hidden relative z-10 p-0">
                    <div className="p-8">

                        {/* ─── SELECTOR DE EMPRESA (multi-tenant) ─── */}
                        {empresas ? (
                            <div className="space-y-6">
                                <button
                                    type="button"
                                    onClick={() => { setEmpresas(null); setEmpresaSeleccionada(null); setError(''); }}
                                    className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                                >
                                    <FiChevronLeft className="w-4 h-4" /> Volver
                                </button>

                                <div className="text-center">
                                    <h2 className="text-2xl font-bold text-gray-800">Selecciona tu empresa</h2>
                                    <p className="text-sm text-gray-500 mt-2">Tu cuenta está registrada en varias empresas</p>
                                </div>

                                <div className="space-y-3">
                                    {empresas.map((emp) => (
                                        <button
                                            key={emp.empresa_id}
                                            type="button"
                                            onClick={() => {
                                                setEmpresaSeleccionada(emp.empresa_id);
                                                // Re-enviar login automáticamente con la empresa elegida
                                                setEmpresas(null);
                                                setTimeout(() => {
                                                    // Disparar submit con empresa_id
                                                    const fakeEvent = { preventDefault: () => { } };
                                                    // Seteamos empresaSeleccionada y hacemos submit
                                                    handleSubmitWithEmpresa(emp.empresa_id);
                                                }, 50);
                                            }}
                                            className="w-full p-4 bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-[#1a73e8] rounded-xl transition-all duration-200 flex items-center gap-4 group"
                                        >
                                            <div className="w-12 h-12 bg-primary-50 group-hover:bg-primary-100 rounded-xl flex items-center justify-center transition-colors">
                                                <FiBriefcase className="w-6 h-6 text-primary-600" />
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className="font-bold text-gray-800 group-hover:text-[#1a73e8] transition-colors">{emp.nombre}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">Clic para ingresar</p>
                                            </div>
                                            <FiArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#1a73e8] transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* ─── FORMULARIO DE LOGIN NORMAL ─── */
                            <>
                                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                                    Iniciar Sesión
                                </h2>

                                {/* Mensaje de error */}
                                {(error || authError) && (
                                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                                        <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-600 font-medium">
                                            {error || authError}
                                        </p>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Usuario */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-600 ml-1">
                                            Usuario o Correo
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <FiUser className="w-5 h-5 text-slate-400 group-focus-within:text-primary-600" />
                                            </div>
                                            <input
                                                type="text"
                                                name="usuario"
                                                value={formData.usuario}
                                                onChange={handleChange}
                                                className="input pl-12"
                                                placeholder="usuario o correo"
                                                autoComplete="username"
                                            />
                                        </div>
                                    </div>

                                    {/* Contraseña */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-600 ml-1">
                                            Contraseña
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <FiLock className="w-5 h-5 text-slate-400 group-focus-within:text-primary-600" />
                                            </div>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="contraseña"
                                                value={formData.contraseña}
                                                onChange={handleChange}
                                                className="input pl-12 pr-12"
                                                placeholder="••••••••"
                                                autoComplete="current-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Olvidaste contraseña */}
                                    <div className="flex justify-end pt-1">
                                        <a href="#" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                                            ¿Olvidaste tu contraseña?
                                        </a>
                                    </div>

                                    {/* Botón Submit */}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || loading}
                                        className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting || loading ? (
                                            <DynamicLoader text="Iniciando..." size="tiny" />
                                        ) : (
                                            <>
                                                <span>Iniciar Sesión</span>
                                                <FiArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>

                                    {/* Footer en Card */}
                                    <div className="pt-4 text-center">
                                        <p className="text-sm text-gray-500">
                                            ¿No tienes cuenta?{' '}
                                            <a href="#" className="text-primary-600 font-bold hover:underline">
                                                Contacta al admin
                                            </a>
                                        </p>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>

                {/* Copyright Footer */}
                <div className="mt-8 text-center text-slate-400 text-xs font-semibold">
                    © 2026 FASITLAC™
                </div>
            </div>
        </div>
    );
};

export default Login;