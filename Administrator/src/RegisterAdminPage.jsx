import { useState } from 'react';
import { UserCircle, ArrowRight, Check } from 'lucide-react';

function RegisterAdminPage({ companyData, onNext }) {
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert('Las contraseñas no coinciden');
            return;
        }

        if (formData.nombre && formData.email && formData.username && formData.password) {
            onNext(formData);
        } else {
            alert('Por favor completa los campos obligatorios');
        }
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 overflow-hidden">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl border border-gray-100 h-full flex flex-col justify-between">
                <div>
                    {/* Header */}
                    <div className="text-center mb-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4">
                            <UserCircle size={32} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">Registrar Administrador</h1>
                        <p className="text-sm text-gray-600">Paso 2 de 3</p>
                        <p className="text-xs text-gray-500 mt-1">Empresa: {companyData?.nombreEmpresa}</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange}
                                    className="w-full px-4 py-2 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Juan" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Apellido *</label>
                                <input type="text" name="apellido" value={formData.apellido} onChange={handleChange}
                                    className="w-full px-4 py-2 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Pérez" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange}
                                className="w-full px-4 py-2 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="admin@ejemplo.com" required />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Usuario *</label>
                            <input type="text" name="username" value={formData.username} onChange={handleChange}
                                className="w-full px-4 py-2 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="admin" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña *</label>
                                <input type="password" name="password" value={formData.password} onChange={handleChange}
                                    className="w-full px-4 py-2 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="••••••••" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmar *</label>
                                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                                    className="w-full px-4 py-2 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="••••••••" required />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Buttons + Steps */}
                <div>
                    <div className="space-y-2 pt-4">
                        <button type="submit" onClick={handleSubmit}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 text-sm rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                            Continuar
                            <ArrowRight size={18} />
                        </button>

                        <button type="button" onClick={() => onNext(null, true)}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 text-sm rounded-xl transition-all">
                            ¿Ya tienes empresa?
                        </button>
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-4">
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white mb-1">
                                <Check size={16} />
                            </div>
                            <span className="text-[10px] font-medium text-gray-600 text-center">Empresa</span>
                        </div>
                        <div className="w-8 h-0.5 bg-green-500 mb-6"></div>
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white mb-1">2</div>
                            <span className="text-[10px] font-medium text-gray-600 text-center">Admin</span>
                        </div>
                        <div className="w-8 h-0.5 bg-gray-300 mb-6"></div>
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 mb-1">3</div>
                            <span className="text-[10px] font-medium text-gray-400 text-center">Finalizar</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterAdminPage;
