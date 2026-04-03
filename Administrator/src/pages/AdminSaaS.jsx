import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_CONFIG } from '../config/Apiconfig';
import { FiUser, FiMail, FiLock, FiPlus, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import DynamicLoader from '../components/common/DynamicLoader';

const AdminSaaS = () => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        usuario: '',
        correo: '',
        contraseña: '',
        nombre: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.usuario || !formData.correo || !formData.contraseña || !formData.nombre) {
            setError('Todos los campos son obligatorios.');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/super-administradores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al crear el  Super Administrador.');
            }

            setSuccess(data.message);
            setFormData({ usuario: '', correo: '', contraseña: '', nombre: '' });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user?.esPropietarioSaaS) {
        return (
            <div className="flex items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-red-200">
                <div className="text-center space-y-4">
                    <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                    <h2 className="text-2xl font-bold text-gray-800">Acceso Denegado</h2>
                    <p className="text-gray-600">Esta área es exclusiva para los Propietarios del Sistema (SaaS).</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-slate-200 dark:border-gray-700 shadow-sm flex items-start gap-4">
                <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiLock className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Panel Maestro de Seguridad</h1>
                    <p className="text-slate-500 dark:text-gray-400 max-w-2xl leading-relaxed">
                        Otorga credenciales de acceso total a nuevos propietarios del sistema. Podrán gestionar infraestructuras y todas las empresas cliente vinculadas al entorno SaaS.
                    </p>
                </div>
            </div>

            <div className="card">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Registrar Nuevo Propietario</h2>
                        <p className="text-sm text-slate-500 mt-1">Configura las credenciales primarias.</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 border border-red-100 dark:border-red-900/30">
                        <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="font-semibold text-sm">{error}</span>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-xl flex items-center gap-2">
                        <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium text-sm">{success}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="label">Nombre Completo</label>
                        <div className="relative">
                            <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                            <input
                                type="text"
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                className="input pl-11"
                                placeholder="Ej. Juan Pérez"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="label">Usuario de Ingreso Root</label>
                        <div className="relative">
                            <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                            <input
                                type="text"
                                name="usuario"
                                value={formData.usuario}
                                onChange={handleChange}
                                className="input pl-11"
                                placeholder="Ej. jperez_master"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="label">Correo Electrónico Principal</label>
                        <div className="relative">
                            <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                            <input
                                type="email"
                                name="correo"
                                value={formData.correo}
                                onChange={handleChange}
                                className="input pl-11"
                                placeholder="maestro@fasitlac.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="label">Contraseña de Acceso Global</label>
                        <div className="relative">
                            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                            <input
                                type="password"
                                name="contraseña"
                                value={formData.contraseña}
                                onChange={handleChange}
                                className="input pl-11"
                                placeholder="Mínimo 8 caracteres..."
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 pt-6 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex items-center gap-2"
                        >
                            {loading ? (
                                <DynamicLoader text="Creando..." size="tiny" color="white" />
                            ) : (
                                <>
                                    <FiPlus className="w-5 h-5" />
                                    <span>Registrar Propietario SaaS</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div >
    );
};

export default AdminSaaS;
