import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BiometricReader from "./BiometricReader";

function LoginModal({ isOpen = true, onClose, onFacialLogin, onLoginSuccess }) {
    const { loginByPin, loginByFingerprint, loading, error: authError } = useAuth();
    const [formData, setFormData] = useState({
        usuario: '',
        contrasena: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [showBiometricModal, setShowBiometricModal] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState(null);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.usuario.trim()) {
            setError('El usuario o correo es requerido');
            return;
        }

        if (!formData.contrasena) {
            setError('La contrasena es requerida');
            return;
        }

        if (formData.contrasena.length < 6) {
            setError('La contrasena debe tener al menos 6 caracteres');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // Usar loginByPin para autenticar con usuario y PIN
            const result = await loginByPin(formData.usuario, formData.contrasena);

            if (result.success) {
                // Cerrar inmediatamente sin mostrar mensaje de confirmación
                if (onLoginSuccess) {
                    onLoginSuccess(result.usuario);
                }
                onClose();
            } else {
                setError(result.message || 'Error al iniciar sesion');
            }
        } catch (err) {
            setError('Error al conectar con el servidor');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleBiometricLogin = () => {
        setShowBiometricModal(true);
    };

    const handleBiometricSuccess = async (empleadoData) => {
        console.log("✅ Autenticación biométrica exitosa:", empleadoData);

        // Usar loginByFingerprint para guardar la sesión correctamente en el contexto
        const result = await loginByFingerprint(empleadoData);

        if (result.success) {
            // Cerrar modales inmediatamente y pasar al SessionScreen
            setShowBiometricModal(false);
            if (onLoginSuccess) {
                onLoginSuccess(result.usuario);
            }
            onClose();
        } else {
            console.error("Error en login biométrico:", result.message);
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                onClick={handleBackdropClick}
            >
                <div className="bg-bg-primary rounded-2xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-800 dark:to-blue-900 px-6 py-5 text-center relative">
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="w-12 h-12 bg-white/20 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-white mb-0.5">Checador</h1>
                        <p className="text-white/80 dark:text-white/70 text-xs">Sistema de Control de Asistencias</p>
                    </div>

                    {/* Form */}
                    <div className="px-6 py-4">
                        {loginSuccess ? (
                            /* Success message */
                            <div className="py-6 text-center">
                                <div className="w-16 h-16 bg-green-500/20 dark:bg-green-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-400 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-lg font-semibold text-text-primary mb-1">
                                    Bienvenido!
                                </h2>
                                <p className="text-green-400 dark:text-green-300 text-base mb-0.5">
                                    {loggedInUser?.nombre || 'Usuario'}
                                </p>
                                <p className="text-text-secondary text-xs">
                                    Sesion iniciada correctamente
                                </p>
                            </div>
                        ) : (
                            <>
                        <h2 className="text-lg font-semibold text-text-primary mb-4 text-center">
                            Iniciar Sesion
                        </h2>

                        {/* Error message */}
                        {(error || authError) && (
                            <div className="mb-3 p-2 bg-red-500/20 dark:bg-red-500/30 border border-red-500/50 dark:border-red-500/60 rounded-lg flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-400 dark:text-red-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-xs text-red-300 dark:text-red-200">{error || authError}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-3">
                            {/* Usuario field */}
                            <div>
                                <label htmlFor="usuario" className="block text-xs font-medium text-text-secondary mb-1">
                                    Usuario o Correo
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        id="usuario"
                                        name="usuario"
                                        value={formData.usuario}
                                        onChange={handleChange}
                                        className="w-full bg-bg-secondary border border-border-subtle rounded-lg py-2 pl-9 pr-3 text-sm text-text-primary placeholder-text-disabled focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                        placeholder="tu.usuario o correo@ejemplo.com"
                                        autoComplete="username"
                                        autoFocus
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            {/* Password field */}
                            <div>
                                <label htmlFor="contrasena" className="block text-xs font-medium text-text-secondary mb-1">
                                    Contrasena
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="contrasena"
                                        name="contrasena"
                                        value={formData.contrasena}
                                        onChange={handleChange}
                                        className="w-full bg-bg-secondary border border-border-subtle rounded-lg py-2 pl-9 pr-10 text-sm text-text-primary placeholder-text-disabled focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-tertiary hover:text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-tertiary hover:text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={isSubmitting || loading}
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-700 dark:to-blue-800 text-white py-2.5 rounded-lg font-semibold text-sm hover:from-purple-700 hover:to-blue-700 dark:hover:from-purple-600 dark:hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                {isSubmitting || loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Iniciando sesion...
                                    </span>
                                ) : (
                                    'Iniciar Sesion'
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border-subtle"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-3 bg-bg-primary text-text-tertiary">
                                    o inicia con
                                </span>
                            </div>
                        </div>

                        {/* Biometric buttons */}
                        <div className="space-y-2">
                            {/* Fingerprint button */}
                            <button
                                type="button"
                                onClick={handleBiometricLogin}
                                disabled={isSubmitting || loading}
                                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-800 hover:from-indigo-700 hover:to-purple-700 dark:hover:from-indigo-600 dark:hover:to-purple-700 text-white rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                                </svg>
                                Iniciar con Huella Digital
                            </button>

                            {/* Facial recognition button */}
                            {onFacialLogin && (
                                <button
                                    type="button"
                                    onClick={onFacialLogin}
                                    disabled={isSubmitting || loading}
                                    className="w-full py-2.5 bg-bg-secondary hover:bg-bg-tertiary border border-border-subtle text-text-secondary hover:text-text-primary rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Iniciar con Reconocimiento Facial
                                </button>
                            )}
                        </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3 bg-bg-secondary border-t border-border-divider">
                        <p className="text-center text-xs text-text-tertiary">
                            FASITLAC © 2026 - Sistema Checador v2.0
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal Biométrico */}
            {showBiometricModal && (
                <BiometricReader
                    isOpen={showBiometricModal}
                    onClose={() => setShowBiometricModal(false)}
                    onAuthSuccess={handleBiometricSuccess}
                    mode="auth"
                />
            )}
        </>
    );
}

export default LoginModal;
