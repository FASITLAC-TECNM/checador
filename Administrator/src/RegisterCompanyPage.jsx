import { useState } from 'react';
import { Building2, ArrowRight, Check } from 'lucide-react';

function RegisterCompanyPage({ onNext }) {
    const [formData, setFormData] = useState({
        nombreEmpresa: '',
        rfc: '',
        direccion: '',
        telefono: '',
        email: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.nombreEmpresa && formData.rfc && formData.email) {
            onNext(formData);
        } else {
            alert('Por favor completa los campos obligatorios');
        }
    };

    return (
        <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl border border-gray-100 h-[90vh] flex flex-col overflow-hidden">
                {/* Contenedor scrolleable interno */}
                <div className="overflow-y-auto px-1">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4">
                            <Building2 size={32} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Registrar Empresa</h1>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Nombre de la Empresa *
                            </label>
                            <input
                                type="text"
                                name="nombreEmpresa"
                                value={formData.nombreEmpresa}
                                onChange={handleChange}
                                className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="Ej: LE FLEUR"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                RFC *
                            </label>
                            <input
                                type="text"
                                name="rfc"
                                value={formData.rfc}
                                onChange={handleChange}
                                className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="Ej: ABC123456XYZ"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Dirección
                            </label>
                            <input
                                type="text"
                                name="direccion"
                                value={formData.direccion}
                                onChange={handleChange}
                                className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="Calle, Número, Colonia"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Teléfono
                                </label>
                                <input
                                    type="tel"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="(000) 000-0000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Email Corporativo *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="empresa@ejemplo.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="space-y-3 pt-4">
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3.5 text-sm rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                Continuar
                                <ArrowRight size={18} />
                            </button>

                            <button
                                type="button"
                                onClick={() => onNext(null, true)}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3.5 text-sm rounded-xl transition-all"
                            >
                                ¿Ya tienes empresa?
                            </button>
                        </div>

                        {/* Step Indicator */}
                        <div className="mt-8 flex items-center justify-center gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mb-2">
                                    <Check size={20} />
                                </div>
                                <span className="text-xs font-medium text-gray-600 text-center">
                                    Configurar<br />Empresa
                                </span>
                            </div>

                            <div className="w-12 h-0.5 bg-gray-300 mb-8"></div>

                            <div className="flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold mb-2">
                                    2
                                </div>
                                <span className="text-xs font-medium text-gray-400 text-center">
                                    Configurar<br />Admin
                                </span>
                            </div>

                            <div className="w-12 h-0.5 bg-gray-300 mb-8"></div>

                            <div className="flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold mb-2">
                                    3
                                </div>
                                <span className="text-xs font-medium text-gray-400 text-center">
                                    Finalizar
                                </span>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default RegisterCompanyPage;
